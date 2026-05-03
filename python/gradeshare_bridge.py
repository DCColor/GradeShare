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

IMAGE_EXTS = ('.jpg', '.jpeg', '.tif', '.tiff', '.dpx', '.png', '.exr')

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
        'galleryPath':    meta.gallery_path,
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


def find_gallery_stills(album, gallery_path):
    """
    Search gallery_path recursively for DRX+image pairs.
    Each DRX file is expected to have a paired image (same stem, image extension).
    Returns a list of (drx_path, image_path) strings.
    """
    stills = album.GetStills()
    if not stills:
        log('[gallery] Album has no stills')
        return []

    gallery = Path(gallery_path)
    if not gallery.exists():
        log(f'[gallery] Path not accessible: {gallery_path}')
        return []

    results = []
    for drx_file in sorted(gallery.rglob('*.drx')):
        for ext in IMAGE_EXTS:
            img = drx_file.with_suffix(ext)
            if img.exists() and img.stat().st_size > 0:
                results.append((str(drx_file), str(img)))
                break

    log(f'[gallery] Found {len(results)} DRX+image pair(s) in {gallery_path}')
    return results


def _probe_gallery_path(album, stills):
    """
    Export the first still to a temp dir to read its DRX and extract GalleryPath.
    Returns the gallery path string, or None if it could not be determined.
    """
    if not stills:
        return None

    probe_dir = tempfile.mkdtemp(prefix='gradeshare_probe_')
    try:
        album.ExportStills(stills[:1], probe_dir, 'gs_probe', 'jpg')
        drx_files = list(Path(probe_dir).glob('*.drx'))
        if drx_files:
            meta = parse_drx(str(drx_files[0]))
            if meta and meta.gallery_path:
                log(f'[gallery_path] Probed: {meta.gallery_path}')
                return meta.gallery_path
    except Exception as e:
        log(f'[gallery_path] Probe failed: {e}')

    return None

# ── Command handlers ──────────────────────────────────────────────────────

def cmd_connect(payload):
    global resolve, pm, project, gallery, still_albums, powergrade_albums

    # Reset all state before attempting a fresh connection so stale
    # references from a previous project never bleed in.
    resolve           = None
    pm                = None
    project           = None
    gallery           = None
    still_albums      = []
    powergrade_albums = []

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
    global still_albums, powergrade_albums
    ensure_resolve()

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
    Load stills from an album. Tries Resolve's gallery folder first (images are
    always present there regardless of whether original media is mounted), then
    falls back to ExportStills if the gallery path is not accessible.
    """
    global gallery, still_albums, powergrade_albums
    ensure_resolve()

    album_index = payload.get('albumIndex', 0)
    album_type  = payload.get('albumType', 'still')

    # Re-fetch the album list fresh every call so newly grabbed stills are
    # visible and the album object reference is never stale.
    if album_type == 'still':
        albums = gallery.GetGalleryStillAlbums() or []
    else:
        albums = gallery.GetGalleryPowerGradeAlbums() or []

    if album_index >= len(albums):
        raise ValueError(f'Album index {album_index} out of range')

    album  = albums[album_index]
    stills = album.GetStills()

    # ── Gallery path approach ─────────────────────────────────────────────
    # Export the first still to a small probe dir to extract the GalleryPath
    # embedded in its DRX file.  DRX files (pure metadata) are exported even
    # when original media is unavailable, so this probe is reliable.
    gallery_path = _probe_gallery_path(album, stills)

    if gallery_path and Path(gallery_path).exists():
        log(f'[get_stills] Gallery path accessible: {gallery_path}')
        pairs = find_gallery_stills(album, gallery_path)

        parsed = []
        if pairs:
            for drx_path, img_path in pairs:
                meta = parse_drx(drx_path)
                if meta:
                    meta.image_path = img_path
                    parsed.append(meta)

        # Explicitly count stills whose image file is present and non-empty.
        valid_gallery = [
            m for m in parsed
            if m.image_path and Path(m.image_path).exists() and Path(m.image_path).stat().st_size > 0
        ]
        log(f'[get_stills] Gallery path found {len(valid_gallery)} stills with valid images')

        if valid_gallery:
            total   = len(pairs)
            loaded  = len(valid_gallery)
            if loaded == total:
                health  = 'green'
                message = ''
            else:
                health  = 'yellow'
                message = f'{loaded} of {total} stills loaded from gallery'
            log(f'[get_stills] Health: {health}')
            return {
                'stills':       [still_metadata_to_dict(m) for m in valid_gallery],
                'exportPath':   gallery_path,
                'health':       health,
                'totalCount':   total,
                'loadedCount':  loaded,
                'missingCount': total - loaded,
                'count':        loaded,
                'message':      message,
            }

        # Gallery path accessible but yielded no usable images — fall through.
        log('[get_stills] Gallery path had no valid stills, falling back to ExportStills')
    else:
        log(f'[get_stills] Gallery path not accessible ({gallery_path!r}), falling back to ExportStills')

    # ── ExportStills fallback (per-still loop) ───────────────────────────────
    # Batch ExportStills fails silently for PowerGrade albums; exporting each
    # still individually is reliable for both album types.
    tmp_dir     = tempfile.mkdtemp(prefix='gradeshare_preview_')
    stills_list = stills or []
    total       = len(stills_list)

    log(f'[get_stills] ExportStills per-still → {tmp_dir} ({total} stills)')

    valid = []
    for i, still in enumerate(stills_list):
        log(f'[get_stills] Exporting still {i+1} of {total}...')
        try:
            result = album.ExportStills([still], tmp_dir, f'gs_still_{i}', 'jpg')
        except Exception as e:
            log(f'[get_stills] Still {i+1} export raised: {e}')
            result = False

        if not result:
            log(f'[get_stills] Still {i+1}: export failed (unavailable media)')
            continue

        # Resolve appends the still label to the prefix, e.g. gs_still_0_1.1.drx.
        # Glob for any DRX file whose name starts with this still's prefix.
        drx_candidates = sorted(Path(tmp_dir).glob(f'gs_still_{i}*.drx'))
        if not drx_candidates:
            log(f'[get_stills] Still {i+1}: exported (result=True) but no DRX found')
            continue

        meta = parse_drx(str(drx_candidates[0]))
        if not meta:
            log(f'[get_stills] Still {i+1}: DRX found but failed to parse')
            continue

        img = meta.image_path
        try:
            img_path = Path(img) if img else None
            if img_path and img_path.exists() and img_path.stat().st_size > 0:
                valid.append(meta)
            else:
                log(f'[get_stills] Still {i+1}: DRX parsed but image missing: {img}')
        except Exception as e:
            log(f'[get_stills] Still {i+1}: image check error: {e}')

    valid_count = len(valid)
    log(f'[get_stills] {valid_count} of {total} stills loaded successfully')

    if valid_count == 0:
        health  = 'red'
        message = 'No stills could be exported — media may not be available on this workstation'
    elif valid_count == total:
        health  = 'green'
        message = ''
    else:
        health  = 'yellow'
        message = f'{valid_count} of {total} stills loaded — {total - valid_count} may be stored on another workstation'

    log(f'[get_stills] Health: {health}')

    return {
        'stills':       [still_metadata_to_dict(m) for m in valid],
        'exportPath':   tmp_dir,
        'health':       health,
        'totalCount':   total,
        'loadedCount':  valid_count,
        'missingCount': total - valid_count,
        'count':        valid_count,
        'message':      message,
    }


def cmd_refresh(payload):
    """Re-fetch albums fresh and return the same structure as get_albums."""
    return cmd_get_albums(payload)


def cmd_refresh_albums(payload):
    """
    Force completely fresh object references from Resolve.
    Re-fetches gallery from project, then re-fetches both album lists.
    Returns the same structure as get_albums.
    """
    global gallery, still_albums, powergrade_albums
    ensure_resolve()

    gallery           = project.GetGallery()
    still_albums      = gallery.GetGalleryStillAlbums()      or []
    powergrade_albums = gallery.GetGalleryPowerGradeAlbums() or []

    log(f'[refresh_albums] still={len(still_albums)}, powergrade={len(powergrade_albums)}')

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
    'connect':         cmd_connect,
    'get_project':     cmd_get_project,
    'get_albums':      cmd_get_albums,
    'refresh':         cmd_refresh,
    'refresh_albums':  cmd_refresh_albums,
    'get_stills':      cmd_get_stills,
    'create_album':    cmd_create_album,
    'export_stills':   cmd_export_stills,
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
