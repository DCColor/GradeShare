#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
resolve_gallery_probe2.py
Targeted second-pass probe based on first run results:
  - album.ExportStills() called correctly on the album object
  - gallery.GetAlbumName(album) for name retrieval
  - gallery.GetGalleryPowerGradeAlbums() with correct method name
  - PowerGrade album enumeration and still export
"""

import sys
import os
from pathlib import Path
from datetime import datetime

POSSIBLE_API_PATHS = [
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules",
    os.path.expanduser("~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules"),
]
for p in POSSIBLE_API_PATHS:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

lines = []

def log(msg=""):
    print(msg)
    lines.append(msg)

def section(title):
    log()
    log("=" * 60)
    log(f"  {title}")
    log("=" * 60)

def sub(title):
    log()
    log(f"  -- {title}")
    log("  " + "-" * 40)

def ok(label, value=""):
    log(f"  OK  {label:<38} {str(value)[:80]}")

def warn(label, value=""):
    log(f"  ??  {label:<38} {str(value)[:80]}")

def fail(label, value=""):
    log(f"  XX  {label:<38} {str(value)[:80]}")

def probe(label, fn):
    try:
        val = fn()
        if val is None:
            warn(label, "None")
        elif val in ([], {}):
            warn(label, "empty")
        else:
            ok(label, val)
        return val
    except Exception as e:
        fail(label, e)
        return None

def save_report():
    out = Path(__file__).parent / "resolve_gallery_probe2_report.txt"
    try:
        with open(out, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        log(f"\nReport saved: {out}")
    except Exception as e:
        log(f"\nCould not save report: {e}")

# ---------------------------------------------------------------------------

def main():
    log(f"resolve_gallery_probe2.py  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        import DaVinciResolveScript as dvr
        ok("Import DaVinciResolveScript")
    except ImportError as e:
        fail("Import DaVinciResolveScript", e)
        save_report(); sys.exit(1)

    resolve = probe("dvr.scriptapp('Resolve')", lambda: dvr.scriptapp("Resolve"))
    if not resolve: save_report(); sys.exit(1)

    pm      = probe("GetProjectManager", lambda: resolve.GetProjectManager())
    project = probe("GetCurrentProject", lambda: pm.GetCurrentProject())
    if not project: save_report(); sys.exit(1)

    probe("project.GetName()", lambda: project.GetName())

    gallery = probe("project.GetGallery()", lambda: project.GetGallery())
    if not gallery: save_report(); sys.exit(1)

    # -------------------------------------------------------------------------
    section("A. STILL ALBUM NAMING")
    # -------------------------------------------------------------------------

    albums = probe("GetGalleryStillAlbums()", lambda: gallery.GetGalleryStillAlbums())
    if not albums:
        fail("No still albums found"); save_report(); sys.exit(1)

    log(f"\n  {len(albums)} still album(s) found")

    for i, album in enumerate(albums):
        sub(f"Still Album [{i}] -- naming methods")

        # Method 1: GetLabel on album
        probe(f"album[{i}].GetLabel()", lambda a=album: a.GetLabel())

        # Method 2: gallery.GetAlbumName(album) -- gallery-level, album as arg
        probe(f"gallery.GetAlbumName(album[{i}])", lambda a=album: gallery.GetAlbumName(a))

        # Method 3: SetLabel then GetLabel -- see if round-trip works
        try:
            current_label = album.GetLabel()
            if current_label is None:
                log(f"  -- GetLabel() is None, trying SetLabel round-trip...")
                set_result = album.SetLabel(f"ProbeAlbum{i}")
                ok(f"album[{i}].SetLabel('ProbeAlbum{i}')", set_result)
                new_label = album.GetLabel()
                probe(f"album[{i}].GetLabel() after SetLabel", lambda a=album: a.GetLabel())
                # Restore if it was None originally
                if current_label is None:
                    album.SetLabel("")
        except Exception as e:
            fail(f"SetLabel round-trip [{i}]", e)

    # -------------------------------------------------------------------------
    section("B. ALBUM.EXPORTSTILLS() -- CALLED ON ALBUM OBJECT")
    # -------------------------------------------------------------------------

    export_base = Path.home() / "Desktop" / "resolve_probe_export"
    export_base.mkdir(parents=True, exist_ok=True)
    log(f"  Export target: {export_base}")

    for i, album in enumerate(albums):
        stills = None
        try:
            stills = album.GetStills()
        except Exception as e:
            fail(f"album[{i}].GetStills()", e)
            continue

        if not stills:
            warn(f"album[{i}] has no stills, skipping export test")
            continue

        log(f"\n  album[{i}] has {len(stills)} still(s) -- testing ExportStills formats")

        # Try each format -- album.ExportStills(stills, path, prefix, format)
        for fmt in ["jpg", "png", "tif", "dpx"]:
            export_path = str(export_base / fmt)
            os.makedirs(export_path, exist_ok=True)
            try:
                result = album.ExportStills(stills, export_path, f"probe_{fmt}", fmt)
                if result:
                    files = list(Path(export_path).iterdir())
                    ok(f"album.ExportStills(..., '{fmt}')", f"returned {result} -- {len(files)} file(s) on disk")
                    for f in files:
                        log(f"    -> {f.name}  ({f.stat().st_size} bytes)")
                else:
                    warn(f"album.ExportStills(..., '{fmt}')", f"returned {result}")
            except Exception as e:
                fail(f"album.ExportStills(..., '{fmt}')", e)

        # Only need to test one album for export
        break

    # -------------------------------------------------------------------------
    section("C. POWERGRADE ALBUMS")
    # -------------------------------------------------------------------------

    pg_albums = probe("gallery.GetGalleryPowerGradeAlbums()", 
                      lambda: gallery.GetGalleryPowerGradeAlbums())

    if pg_albums:
        log(f"\n  {len(pg_albums)} PowerGrade album(s) found")

        for i, pg in enumerate(pg_albums):
            sub(f"PowerGrade Album [{i}]")

            pg_methods = [m for m in dir(pg) if not m.startswith("_")]
            log(f"  Methods: {', '.join(pg_methods)}")

            probe(f"pg[{i}].GetLabel()",  lambda p=pg: p.GetLabel())
            probe(f"gallery.GetAlbumName(pg[{i}])", lambda p=pg: gallery.GetAlbumName(p))

            pg_stills = probe(f"pg[{i}].GetStills()", lambda p=pg: p.GetStills())

            if pg_stills:
                log(f"  {len(pg_stills)} PowerGrade still(s) in album [{i}]")

                # Try export from PowerGrade album
                pg_export = str(export_base / f"powergrade_{i}")
                os.makedirs(pg_export, exist_ok=True)
                for fmt in ["jpg", "png"]:
                    try:
                        result = pg.ExportStills(pg_stills, pg_export, f"pg_{fmt}", fmt)
                        files = list(Path(pg_export).iterdir())
                        ok(f"pg.ExportStills(..., '{fmt}')", f"{result} -- {len(files)} file(s)")
                        for f in files:
                            log(f"    -> {f.name}  ({f.stat().st_size} bytes)")
                    except Exception as e:
                        fail(f"pg.ExportStills(..., '{fmt}')", e)
    else:
        warn("GetGalleryPowerGradeAlbums()", 
             "None/empty -- do you have PowerGrade folders in this project?")
        log("  Note: Create at least one PowerGrade folder in Resolve gallery")
        log("  and re-run to test PowerGrade album access.")

    # -------------------------------------------------------------------------
    section("D. STILL METADATA -- WHAT'S ON THE STILL OBJECT?")
    # -------------------------------------------------------------------------

    # The first probe showed Still only has 'Print' -- but let's dig harder
    # by trying common attribute names directly

    sub("Brute-force attribute probe on first still")
    try:
        stills = albums[0].GetStills()
        if stills:
            still = stills[0]
            log(f"  dir(still): {[m for m in dir(still) if not m.startswith('_')]}")

            # Try common Resolve metadata attribute names
            attr_attempts = [
                "GetMetadata", "metadata", "GetTimecode", "timecode",
                "GetClipName", "clipName", "GetUniqueId", "uniqueId",
                "GetPath", "path", "GetFilePath", "filePath",
                "GetReelName", "reelName", "GetScene", "GetShot",
                "GetTake", "GetFlags", "GetKeywords", "GetMarkers",
            ]
            for attr in attr_attempts:
                try:
                    val = getattr(still, attr)
                    if callable(val):
                        result = val()
                        ok(f"still.{attr}()", result)
                    else:
                        ok(f"still.{attr}", val)
                except Exception as e:
                    fail(f"still.{attr}", e)
    except Exception as e:
        fail("Still metadata probe", e)

    # -------------------------------------------------------------------------
    section("SUMMARY")
    # -------------------------------------------------------------------------
    log("  Probe 2 complete.")
    log("  Key questions answered:")
    log("  A. How to get album name (GetLabel vs GetAlbumName)?")
    log("  B. Does album.ExportStills() work and what formats?")
    log("  C. Are PowerGrade albums accessible?")
    log("  D. Does the Still object expose any metadata?")

    save_report()

if __name__ == "__main__":
    main()
