#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
resolve_gallery_probe3.py
Tests gallery album creation and management:
  - CreateGalleryStillAlbum()
  - SetCurrentStillAlbum()
  - SetAlbumName() / GetAlbumName()
  - CreateGalleryPowerGradeAlbum()
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
    log(f"  OK  {label:<40} {str(value)[:80]}")

def warn(label, value=""):
    log(f"  ??  {label:<40} {str(value)[:80]}")

def fail(label, value=""):
    log(f"  XX  {label:<40} {str(value)[:80]}")

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
    out = Path(__file__).parent / "resolve_gallery_probe3_report.txt"
    try:
        with open(out, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        log(f"\nReport saved: {out}")
    except Exception as e:
        log(f"\nCould not save report: {e}")

# ---------------------------------------------------------------------------

def main():
    log(f"resolve_gallery_probe3.py  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

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
    section("A. ALBUM INVENTORY BEFORE")
    # -------------------------------------------------------------------------

    albums_before = probe("GetGalleryStillAlbums() before", lambda: gallery.GetGalleryStillAlbums())
    if albums_before:
        log(f"\n  {len(albums_before)} still album(s) exist before test:")
        for i, a in enumerate(albums_before):
            name = gallery.GetAlbumName(a)
            log(f"    [{i}] {name}")

    current_before = probe("GetCurrentStillAlbum() before", lambda: gallery.GetCurrentStillAlbum())
    if current_before:
        log(f"  Current album: {gallery.GetAlbumName(current_before)}")

    # -------------------------------------------------------------------------
    section("B. CREATE STILL ALBUM")
    # -------------------------------------------------------------------------

    sub("CreateGalleryStillAlbum()")
    new_album = probe("gallery.CreateGalleryStillAlbum()", 
                      lambda: gallery.CreateGalleryStillAlbum())

    if new_album:
        log("\n  Album object created. Checking name...")
        name_after_create = probe("GetAlbumName(new_album) after create",
                                  lambda: gallery.GetAlbumName(new_album))

        # -------------------------------------------------------------------------
        section("C. NAMING THE NEW ALBUM")
        # -------------------------------------------------------------------------

        sub("Try gallery.SetAlbumName(album, name)")
        set_result = probe("gallery.SetAlbumName(new_album, 'GradeShare Test')",
                           lambda: gallery.SetAlbumName(new_album, "GradeShare Test"))

        name_after_set = probe("GetAlbumName after SetAlbumName",
                               lambda: gallery.GetAlbumName(new_album))

        sub("Try album.SetLabel(name)")
        label_result = probe("new_album.SetLabel('GradeShare Test')",
                             lambda: new_album.SetLabel("GradeShare Test"))
        label_after = probe("new_album.GetLabel() after SetLabel",
                            lambda: new_album.GetLabel())
        name_after_label = probe("GetAlbumName after SetLabel",
                                 lambda: gallery.GetAlbumName(new_album))

        # -------------------------------------------------------------------------
        section("D. SET AS CURRENT ALBUM")
        # -------------------------------------------------------------------------

        sub("SetCurrentStillAlbum(new_album)")
        set_current = probe("gallery.SetCurrentStillAlbum(new_album)",
                            lambda: gallery.SetCurrentStillAlbum(new_album))

        current_after = probe("GetCurrentStillAlbum() after set",
                              lambda: gallery.GetCurrentStillAlbum())

        if current_after:
            current_name = gallery.GetAlbumName(current_after)
            log(f"  Current album is now: {current_name}")
            if "GradeShare" in str(current_name):
                ok("SetCurrentStillAlbum confirmed active in Resolve", current_name)
            else:
                warn("Current album name doesn't match", current_name)

        # -------------------------------------------------------------------------
        section("E. ALBUM INVENTORY AFTER")
        # -------------------------------------------------------------------------

        albums_after = probe("GetGalleryStillAlbums() after", 
                             lambda: gallery.GetGalleryStillAlbums())
        if albums_after:
            log(f"\n  {len(albums_after)} still album(s) now exist:")
            for i, a in enumerate(albums_after):
                name = gallery.GetAlbumName(a)
                log(f"    [{i}] {name}")

        log(f"\n  Albums before: {len(albums_before) if albums_before else 0}")
        log(f"  Albums after:  {len(albums_after) if albums_after else 0}")
        if albums_after and albums_before:
            diff = len(albums_after) - len(albums_before)
            if diff > 0:
                ok(f"New album appeared in gallery list ({diff} added)")
            else:
                warn("Album count did not increase -- may not be visible in Resolve UI")

        # -------------------------------------------------------------------------
        section("F. RESTORE -- SET ORIGINAL ALBUM AS CURRENT")
        # -------------------------------------------------------------------------

        if current_before:
            restore = probe("Restore original current album",
                            lambda: gallery.SetCurrentStillAlbum(current_before))
            restored_name = gallery.GetAlbumName(gallery.GetCurrentStillAlbum())
            log(f"  Restored to: {restored_name}")

    else:
        fail("CreateGalleryStillAlbum returned nothing -- cannot test further")

    # -------------------------------------------------------------------------
    section("G. CREATE POWERGRADE ALBUM")
    # -------------------------------------------------------------------------

    sub("CreateGalleryPowerGradeAlbum()")
    new_pg = probe("gallery.CreateGalleryPowerGradeAlbum()",
                   lambda: gallery.CreateGalleryPowerGradeAlbum())

    if new_pg:
        probe("GetAlbumName(new_pg)", lambda: gallery.GetAlbumName(new_pg))
        probe("gallery.SetAlbumName(new_pg, 'GradeShare PG Test')",
              lambda: gallery.SetAlbumName(new_pg, "GradeShare PG Test"))
        probe("GetAlbumName after set", lambda: gallery.GetAlbumName(new_pg))

        pg_albums_after = probe("GetGalleryPowerGradeAlbums() after create",
                                lambda: gallery.GetGalleryPowerGradeAlbums())
        if pg_albums_after:
            log(f"\n  {len(pg_albums_after)} PowerGrade album(s) now exist")

    # -------------------------------------------------------------------------
    section("SUMMARY")
    # -------------------------------------------------------------------------
    log("  Probe 3 complete.")
    log("  Key questions answered:")
    log("  A/E. Does CreateGalleryStillAlbum() add to album list?")
    log("  B.   Does the new album appear in Resolve UI?")
    log("  C.   Which naming method works -- SetAlbumName or SetLabel?")
    log("  D.   Does SetCurrentStillAlbum() activate it in Resolve?")
    log("  G.   Does CreateGalleryPowerGradeAlbum() work the same way?")
    log()
    log("  NOTE: Check Resolve's gallery panel during/after this run")
    log("  to confirm new albums are visible in the UI.")

    save_report()

if __name__ == "__main__":
    main()
