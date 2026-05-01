#!/usr/bin/env python3
"""
resolve_gallery_probe.py
Probes the DaVinci Resolve scripting API for gallery, stills, and PowerGrade access.
Run this while Resolve is open with a project loaded.

Output is written to resolve_gallery_probe_report.txt in the same directory as this script.
"""

import sys
import os
import json
import traceback
from pathlib import Path
from datetime import datetime

# ── Resolve scripting bootstrap ──────────────────────────────────────────────

RESOLVE_SCRIPT_API = None
RESOLVE_SCRIPT_LIB = None

POSSIBLE_API_PATHS = [
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules",
    os.path.expanduser("~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules"),
    "C:\\ProgramData\\Blackmagic Design\\DaVinci Resolve\\Support\\Developer\\Scripting\\Modules",
    "/opt/resolve/Developer/Scripting/Modules",
    "/home/resolve/Developer/Scripting/Modules",
]

for p in POSSIBLE_API_PATHS:
    if os.path.exists(p):
        RESOLVE_SCRIPT_API = p
        break

if not RESOLVE_SCRIPT_API:
    # Try env var
    env_path = os.environ.get("RESOLVE_SCRIPT_API")
    if env_path and os.path.exists(env_path):
        RESOLVE_SCRIPT_API = env_path

if RESOLVE_SCRIPT_API and RESOLVE_SCRIPT_API not in sys.path:
    sys.path.insert(0, RESOLVE_SCRIPT_API)

# ── Report builder ───────────────────────────────────────────────────────────

lines = []

def log(msg=""):
    print(msg)
    lines.append(msg)

def section(title):
    log()
    log("=" * 60)
    log(f"  {title}")
    log("=" * 60)

def subsection(title):
    log()
    log(f"  ── {title}")
    log("  " + "─" * 40)

def result(label, value):
    log(f"  {label:<35} {value}")

def ok(label, value=""):
    log(f"  ✓ {label:<33} {value}")

def warn(label, value=""):
    log(f"  ⚠ {label:<33} {value}")

def fail(label, value=""):
    log(f"  ✗ {label:<33} {value}")

def probe(label, fn):
    """Safely call fn(), log result, return value or None."""
    try:
        val = fn()
        if val is None:
            warn(label, "returned None")
        elif val == [] or val == {}:
            warn(label, "returned empty")
        else:
            ok(label, str(val)[:80])
        return val
    except Exception as e:
        fail(label, str(e)[:80])
        return None

# ── Main probe ───────────────────────────────────────────────────────────────

def main():
    log(f"resolve_gallery_probe.py — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log(f"Python {sys.version}")
    log(f"Script API path: {RESOLVE_SCRIPT_API or 'NOT FOUND'}")

    # ── Connect to Resolve ───────────────────────────────────────────────────
    section("1. RESOLVE CONNECTION")

    try:
        import DaVinciResolveScript as dvr
        ok("Import DaVinciResolveScript")
    except ImportError as e:
        fail("Import DaVinciResolveScript", str(e))
        log()
        log("  Cannot continue — check that Resolve is running and the script")
        log("  API path is correct. Set RESOLVE_SCRIPT_API env var if needed.")
        log(f"  Tried: {RESOLVE_SCRIPT_API}")
        save_report()
        sys.exit(1)

    resolve = probe("dvr.scriptapp('Resolve')", lambda: dvr.scriptapp("Resolve"))
    if not resolve:
        log("  Cannot continue — Resolve not running or not responding.")
        save_report()
        sys.exit(1)

    probe("resolve.GetVersionString()", lambda: resolve.GetVersionString())
    probe("resolve.GetProductName()", lambda: resolve.GetProductName())

    # ── Project Manager ──────────────────────────────────────────────────────
    section("2. PROJECT MANAGER & CURRENT PROJECT")

    pm = probe("resolve.GetProjectManager()", lambda: resolve.GetProjectManager())
    if not pm:
        log("  Cannot continue — no ProjectManager.")
        save_report()
        sys.exit(1)

    project = probe("pm.GetCurrentProject()", lambda: pm.GetCurrentProject())
    if not project:
        log("  Cannot continue — no project loaded. Open a project in Resolve.")
        save_report()
        sys.exit(1)

    probe("project.GetName()", lambda: project.GetName())
    probe("project.GetUniqueId()", lambda: project.GetUniqueId())

    # ── Gallery ──────────────────────────────────────────────────────────────
    section("3. GALLERY OBJECT")

    gallery = probe("project.GetGallery()", lambda: project.GetGallery())

    if gallery:
        # Enumerate everything on the gallery object
        subsection("Gallery — available methods/attributes")
        gallery_methods = [m for m in dir(gallery) if not m.startswith("_")]
        for m in gallery_methods:
            log(f"  • {m}")

        subsection("Gallery — current still album")
        current_album = probe("gallery.GetCurrentStillAlbum()", lambda: gallery.GetCurrentStillAlbum())

        subsection("Gallery — all still albums")
        all_albums = probe("gallery.GetGalleryStillAlbums()", lambda: gallery.GetGalleryStillAlbums())

        if all_albums:
            log(f"\n  Found {len(all_albums)} album(s):")
            for i, album in enumerate(all_albums):
                subsection(f"Album [{i}]")
                album_methods = [m for m in dir(album) if not m.startswith("_")]
                log(f"  Methods: {', '.join(album_methods)}")

                probe(f"  album[{i}].GetLabel()", lambda a=album: a.GetLabel())
                probe(f"  album[{i}].GetName()", lambda a=album: a.GetName())

                # Try to get stills from this album
                stills = probe(f"  album[{i}].GetStills()", lambda a=album: a.GetStills())

                if stills:
                    log(f"\n  Album [{i}] has {len(stills)} still(s). Probing first still:")
                    still = stills[0]
                    still_methods = [m for m in dir(still) if not m.startswith("_")]
                    log(f"  Still methods: {', '.join(still_methods)}")

                    for method_name in still_methods:
                        try:
                            fn = getattr(still, method_name)
                            if callable(fn):
                                val = fn()
                                ok(f"  still.{method_name}()", str(val)[:80])
                        except Exception as e:
                            fail(f"  still.{method_name}()", str(e)[:60])

        # ── PowerGrade Folders ───────────────────────────────────────────────
        subsection("Gallery — PowerGrade folders")

        # Try various possible method names — API naming is inconsistent
        pg_attempts = [
            "GetPowerGradeFolders",
            "GetPowerGradeAlbums",
            "GetPowerGrades",
            "GetLookLibrary",
        ]
        for method_name in pg_attempts:
            if hasattr(gallery, method_name):
                probe(f"gallery.{method_name}()", lambda m=method_name: getattr(gallery, m)())
            else:
                warn(f"gallery.{method_name}", "method does not exist")

        # ── Export still test ────────────────────────────────────────────────
        subsection("Gallery — ExportStills test")

        if all_albums and all_albums[0]:
            test_album = all_albums[0]
            stills = None
            try:
                stills = test_album.GetStills()
            except:
                pass

            if stills:
                export_path = str(Path.home() / "Desktop" / "resolve_probe_export")
                os.makedirs(export_path, exist_ok=True)
                log(f"  Attempting ExportStills to: {export_path}")

                # Try gallery-level export
                export_attempts = [
                    ("gallery.ExportStills(stills, path, '', 'jpg')",
                     lambda: gallery.ExportStills(stills, export_path, "", "jpg")),
                    ("gallery.ExportStills(stills, path, 'probe', 'jpg')",
                     lambda: gallery.ExportStills(stills, export_path, "probe", "jpg")),
                    ("gallery.ExportStills(stills, path, '', 'tif')",
                     lambda: gallery.ExportStills(stills, export_path, "", "tif")),
                    ("gallery.ExportStills(stills, path, '', 'png')",
                     lambda: gallery.ExportStills(stills, export_path, "", "png")),
                ]
                for label, fn in export_attempts:
                    result_val = probe(label, fn)
                    if result_val:
                        # Check what actually landed on disk
                        exported_files = list(Path(export_path).iterdir())
                        log(f"  Files on disk after export: {[f.name for f in exported_files]}")
                        if exported_files:
                            ok("Files written to disk", str(exported_files[0]))
                        break
            else:
                warn("ExportStills test", "No stills in first album to test with")
        else:
            warn("ExportStills test", "No albums available")

    else:
        fail("Gallery", "project.GetGallery() returned nothing — cannot probe further")

    # ── Timeline context ─────────────────────────────────────────────────────
    section("4. CURRENT TIMELINE CONTEXT")

    timeline = probe("project.GetCurrentTimeline()", lambda: project.GetCurrentTimeline())
    if timeline:
        probe("timeline.GetName()", lambda: timeline.GetName())
        probe("timeline.GetStartFrame()", lambda: timeline.GetStartFrame())
        probe("timeline.GetTrackCount('video')", lambda: timeline.GetTrackCount("video"))

    # ── Wrap up ──────────────────────────────────────────────────────────────
    section("5. SUMMARY")
    log("  Probe complete. Review results above.")
    log("  Key things to check:")
    log("  • Did GetGalleryStillAlbums() return albums?")
    log("  • Did GetStills() return stills from an album?")
    log("  • What methods are available on the Still object?")
    log("  • Did ExportStills() succeed and write files?")
    log("  • Are PowerGrade methods present on the Gallery object?")

    save_report()


def save_report():
    out_path = Path(__file__).parent / "resolve_gallery_probe_report.txt"
    try:
        with open(out_path, "w") as f:
            f.write("\n".join(lines))
        print(f"\nReport saved to: {out_path}")
    except Exception as e:
        print(f"\nCould not save report: {e}")


if __name__ == "__main__":
    main()
