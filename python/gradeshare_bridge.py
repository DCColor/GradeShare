#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GradeShare — gradeshare_bridge.py
Python sidecar process. Spawned by Electron main.js on launch.
Communicates via stdin/stdout JSON lines.

Message format (both directions):
  Request:  { "id": int, "command": str, "payload": {} }
  Response: { "id": int, "result": any } | { "id": int, "error": str }
  Event:    { "event": str, "data": {} }
"""

import sys
import os
import json
import tempfile
import traceback
from pathlib import Path

# ── Resolve scripting API path ────────────────────────────────────────────

POSSIBLE_API_PATHS = [
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules",
    os.path.expanduser("~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules"),
    "C:\\ProgramData\\Blackmagic Design\\DaVinci Resolve\\Support\\Developer\\Scripting\\Modules",
]
for p in POSSIBLE_API_PATHS:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

# Import DRX parser from same directory
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))
from gradeshare_drx_parser import parse_drx, parse_drx_folder, StillMetadata

# ── State ─────────────────────────────────────────────────────────────────

resolve      = None
pm           = None
project      = None
gallery      = None
still_albums      = []   # list of GalleryStillAlbum objects
powergrade_albums = []   # list of GalleryStillAlbum objects (PowerGrade)

# ── Messaging ─────────────────────────────────────────────────────────────

def send(obj):
    """Send a JSON line to Electron."""
    sys.stdout.write(json.dumps(obj) + '\n')
    sys.stdout.flush()

def send_event(event, data=None):
    send({'event': event, 'data': data or {}})

def respond(request_id, result=None, error=None):
    if error:
        send({'id': request_id, 'error': str(error)})
    else:
        send({'id': request_id, 'result': result})

def log(msg):
    """Write to stderr (shown in Electron DevTools console)."""
    sys.stderr.write(f'[Bridge] {msg}\n')
    sys.stderr.flush()

# ── Resolve helpers ───────────────────────────────────────────────────────

def ensure_resolve():
    global resolve, pm, project, gallery
    if resolve is None:
        raise RuntimeError('Not connected to Resolve')
    if project is None:
        raise RuntimeError('No project loaded in Resolve')

def album_name(album):
    try:
        return gallery.GetAlbumName(album) or 'Untitled'
    except:
        return 'Untitled'

def album_still_count(album):
    try:
        stills = album.GetStills()
        return len(stills) if stills else 0
    except:
        return 0

def still_metadata_to_dict(meta: StillMetadata) -> dict:
    """Convert StillMetadata dataclass to JSON-serializable dict."""
    return {
        'drxPath':        meta.drx_path,
        'imagePath':      meta.image_path,
        'stillId':        meta.still_id,
        'recordTc':       meta.record_tc,
        'sourceTc':       meta.source_tc,
        'mediaStartTc':   meta.media_start_tc,
        'conformStartTc': meta.conform_start_tc,
        'conformEndTc':   meta.conform_end_tc,
        'timelineName':   meta.timeline_name,
        'label':          meta.label,
        'reelName':       meta.reel_name,
        'width':          meta.width,
        'height':         meta.height,
        'bitDepth':       meta.bit_depth,
        'resolutionLabel':meta.resolution_label,
        'hdrCandidate':   meta.hdr_candidate,
        'colorSpaceHint': meta.color_space_hint,
        'createTime':     meta.create_time,
        'displayLabel':   meta.display_label(),
        'techLine':       meta.tech_line(),
    }

# ── Command handlers ──────────────────────────────────────────────────────

def cmd_connect(payload):
    global resolve, pm, project, gallery, still_albums, powergrade_albums

    try:
        import DaVinciResolveScript as dvr
    except ImportError:
        raise RuntimeError(
            'DaVinciResolveScript not found. '
            'Make sure DaVinci Resolve is installed and running.'
        )

    resolve = dvr.scriptapp('Resolve')
    if not resolve:
        raise RuntimeError('Could not connect to Resolve. Is it running?')

    pm = resolve.GetProjectManager()
    if not pm:
        raise RuntimeError('Could not get Project Manager from Resolve.')

    project = pm.GetCurrentProject()
    if not project:
        raise RuntimeError('No project is open in Resolve.')

    gallery = project.GetGallery()
    if not gallery:
        raise RuntimeError('Could not access Gallery.')

    # Load albums
    still_albums      = gallery.GetGalleryStillAlbums() or []
    powergrade_albums = gallery.GetGalleryPowerGradeAlbums() or []

    timeline = project.GetCurrentTimeline()
    timeline_name = timeline.GetName() if timeline else None

    return {
        'version':        resolve.GetVersionString(),
        'productName':    resolve.GetProductName(),
        'projectName':    project.GetName(),
        'projectId':      project.GetUniqueId(),
        'timelineName':   timeline_name,
        'stillAlbumCount':      len(still_albums),
        'powerGradeAlbumCount': len(powergrade_albums),
    }


def cmd_get_project(payload):
    ensure_resolve()
    timeline = project.GetCurrentTimeline()
    return {
        'name':       project.GetName(),
        'uniqueId':   project.GetUniqueId(),
        'timeline':   timeline.GetName() if timeline else None,
    }


def cmd_get_albums(payload):
    ensure_resolve()

    # Refresh album lists
    global still_albums, powergrade_albums
    still_albums      = gallery.GetGalleryStillAlbums() or []
    powergrade_albums = gallery.GetGalleryPowerGradeAlbums() or []

    return {
        'stillAlbums': [
            {
                'index':      i,
                'name':       album_name(a),
                'stillCount': album_still_count(a),
                'type':       'still',
                'health':     'unknown',
            }
            for i, a in enumerate(still_albums)
        ],
        'powerGradeAlbums': [
            {
                'index':      i,
                'name':       album_name(a),
                'stillCount': album_still_count(a),
                'type':       'powergrade',
                'health':     'unknown',
            }
            for i, a in enumerate(powergrade_albums)
        ],
    }


def cmd_get_stills(payload):
    """
    Export stills from an album to a temp folder,
    parse DRX metadata, return metadata list.
    """
    ensure_resolve()

    album_index = payload.get('albumIndex', 0)
    album_type  = payload.get('albumType', 'still')

    # Always fetch a fresh album list so newly grabbed stills are visible
    # without requiring a reconnect.
    if album_type == 'still':
        albums = gallery.GetGalleryStillAlbums() or []
    else:
        albums = gallery.GetGalleryPowerGradeAlbums() or []

    if album_index >= len(albums):
        raise ValueError(f'Album index {album_index} out of range')

    album  = albums[album_index]
    stills = album.GetStills()

    # Export to temp folder as JPG for preview.
    # ExportStills return value is unreliable — ignore it entirely and
    # check what actually landed on disk instead.
    tmp_dir = tempfile.mkdtemp(prefix='gradeshare_preview_')
    prefix  = 'gs_preview'

    log(f'[get_stills] Exporting stills → {tmp_dir}')
    if stills:
        album.ExportStills(stills, tmp_dir, prefix, 'jpg')

    # Count what actually landed on disk — this is the authoritative export count.
    try:
        dir_entries  = os.listdir(tmp_dir)
        jpg_count    = sum(1 for f in dir_entries if f.lower().endswith('.jpg'))
        drx_count    = sum(1 for f in dir_entries if f.lower().endswith('.drx'))
    except Exception as e:
        log(f'[get_stills] Could not list tmp_dir: {e}')
        jpg_count = drx_count = 0

    log(f'[get_stills] Files on disk after export — jpg: {jpg_count}, drx: {drx_count}')

    if jpg_count == 0:
        log('[get_stills] No jpg files found — media may not be available on this workstation')
        return {
            'stills':       [],
            'exportPath':   tmp_dir,
            'health':       'red',
            'totalCount':   0,
            'loadedCount':  0,
            'missingCount': 0,
            'count':        0,
            'message':      'No stills could be exported — media may not be available on this workstation',
        }

    # Parse DRX metadata files
    parsed = parse_drx_folder(tmp_dir)
    log(f'[get_stills] Parsed {len(parsed)} DRX files from {tmp_dir}')

    # Validate each exported image exists and has content
    valid = []
    for m in parsed:
        img = m.image_path
        try:
            img_path = Path(img) if img else None
            if img_path and img_path.exists() and img_path.stat().st_size > 0:
                valid.append(m)
            else:
                log(f'[get_stills] Skipping invalid image: {img}')
        except Exception as e:
            log(f'[get_stills] Error checking image {img}: {e}')

    total  = jpg_count  # authoritative: what was actually exported
    loaded = len(valid)
    log(f'[get_stills] {loaded} of {total} stills loaded successfully')

    if loaded == total:
        health  = 'green'
        message = ''
    elif loaded > 0:
        health  = 'yellow'
        message = f'{loaded} of {total} stills loaded — {total - loaded} may be stored on another workstation'
    else:
        health  = 'red'
        message = 'Images unavailable — still data may be stored on another workstation'

    log(f'[get_stills] Health: {health}')

    return {
        'stills':       [still_metadata_to_dict(m) for m in valid],
        'exportPath':   tmp_dir,
        'health':       health,
        'totalCount':   total,
        'loadedCount':  loaded,
        'missingCount': total - loaded,
        'count':        loaded,
        'message':      message,
    }


def cmd_refresh(payload):
    """Re-fetch albums fresh and return the same structure as get_albums."""
    return cmd_get_albums(payload)


def cmd_create_album(payload):
    ensure_resolve()
    name = payload.get('name', 'GradeShare')

    new_album = gallery.CreateGalleryStillAlbum()
    if not new_album:
        raise RuntimeError('CreateGalleryStillAlbum returned nothing')

    gallery.SetAlbumName(new_album, name)
    gallery.SetCurrentStillAlbum(new_album)

    # Refresh
    global still_albums
    still_albums = gallery.GetGalleryStillAlbums() or []

    return {
        'name':  gallery.GetAlbumName(new_album),
        'index': len(still_albums) - 1,
        'type':  'still',
    }


def cmd_export_stills(payload):
    ensure_resolve()

    album_index  = payload.get('albumIndex', 0)
    album_type   = payload.get('albumType', 'still')
    export_path  = payload.get('exportPath', '')
    fmt          = payload.get('format', 'jpg').lower()
    prefix       = payload.get('prefix', 'GradeShare')

    # Fetch fresh so the export includes any stills grabbed since last connect
    if album_type == 'still':
        albums = gallery.GetGalleryStillAlbums() or []
    else:
        albums = gallery.GetGalleryPowerGradeAlbums() or []

    if album_index >= len(albums):
        raise ValueError(f'Album index {album_index} out of range')

    album  = albums[album_index]
    stills = album.GetStills()
    if not stills:
        raise RuntimeError('No stills in album')

    os.makedirs(export_path, exist_ok=True)
    success = album.ExportStills(stills, export_path, prefix, fmt)

    if not success:
        raise RuntimeError(f'ExportStills failed for format: {fmt}')

    # Parse exported DRX files
    parsed = parse_drx_folder(export_path)

    return {
        'exportPath': export_path,
        'count':      len(stills),
        'stills':     [still_metadata_to_dict(m) for m in parsed],
        'format':     fmt,
    }

# ── Command dispatch ──────────────────────────────────────────────────────

COMMANDS = {
    'connect':       cmd_connect,
    'get_project':   cmd_get_project,
    'get_albums':    cmd_get_albums,
    'refresh':       cmd_refresh,
    'get_stills':    cmd_get_stills,
    'create_album':  cmd_create_album,
    'export_stills': cmd_export_stills,
}

# ── Main loop ─────────────────────────────────────────────────────────────

def main():
    log('GradeShare Python bridge starting...')
    send_event('ready')

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            msg = json.loads(line)
        except json.JSONDecodeError as e:
            log(f'JSON decode error: {e} | line: {line}')
            continue

        request_id = msg.get('id')
        command    = msg.get('command')
        payload    = msg.get('payload', {})

        log(f'Received command: {command} (id={request_id})')

        handler = COMMANDS.get(command)
        if not handler:
            respond(request_id, error=f'Unknown command: {command}')
            continue

        try:
            result = handler(payload)
            respond(request_id, result=result)
        except Exception as e:
            log(f'Error in {command}: {traceback.format_exc()}')
            respond(request_id, error=str(e))


if __name__ == '__main__':
    main()
