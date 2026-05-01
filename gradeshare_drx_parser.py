#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gradeshare_drx_parser.py
Parses DaVinci Resolve .drx sidecar files to extract still metadata
for use in GradeShare contact sheets and layout captions.

Usage:
    from gradeshare_drx_parser import parse_drx, parse_drx_folder

    meta = parse_drx("/path/to/still.drx")
    print(meta)

    # Parse all DRX files in a folder
    all_meta = parse_drx_folder("/path/to/export_folder")
"""

import os
import re
import struct
from pathlib import Path
from xml.etree import ElementTree as ET
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class StillMetadata:
    # File identity
    drx_path: str = ""
    image_path: str = ""          # paired image file (jpg/png/tif/dpx)
    still_id: str = ""            # DbId from XML

    # Timecodes
    record_tc: str = ""           # <RecTC> — position on timeline
    source_tc: str = ""           # <SrcTC> — position in source clip
    media_start_tc: str = ""      # from FieldsBlob
    conform_start_tc: str = ""    # from FieldsBlob
    conform_end_tc: str = ""      # from FieldsBlob

    # Clip / timeline
    timeline_name: str = ""       # <SrcHint>
    label: str = ""               # <Label>  e.g. "1.1"
    reel_name: str = ""           # <ReelName>

    # Technical
    width: int = 0
    height: int = 0
    bit_depth: int = 0
    dpx_descriptor: int = 0       # 50=RGB, 51=RGBA, 100=luma, etc.
    par: float = 1.0              # pixel aspect ratio
    create_time: str = ""

    # Inferred
    resolution_label: str = ""    # e.g. "4K UHD", "HD"
    hdr_candidate: bool = False   # True if 10/12-bit and wide gamut descriptor
    color_space_hint: str = ""    # best guess from bit depth + descriptor

    # Raw grade body (for future color science use)
    grade_body: str = ""

    def display_label(self) -> str:
        """Short label for contact sheet captions."""
        parts = []
        if self.label:
            parts.append(self.label)
        if self.timeline_name:
            parts.append(self.timeline_name)
        if self.record_tc:
            parts.append(self.record_tc)
        return "  |  ".join(parts) if parts else os.path.basename(self.image_path)

    def tech_line(self) -> str:
        """One-line technical summary for contact sheet footer."""
        parts = []
        if self.resolution_label:
            parts.append(self.resolution_label)
        elif self.width and self.height:
            parts.append(f"{self.width}x{self.height}")
        if self.bit_depth:
            parts.append(f"{self.bit_depth}-bit")
        if self.color_space_hint:
            parts.append(self.color_space_hint)
        return "  ·  ".join(parts)


# ---------------------------------------------------------------------------
# FieldsBlob decoder
# ---------------------------------------------------------------------------

def _decode_fields_blob(blob_hex: str) -> dict:
    """
    Decode the FieldsBlob binary structure.
    Format: repeated records of [name_len_u32][name_utf16le][value_type_u32][value_len_u32][value_bytes]
    Strings are UTF-16LE. Numeric values are doubles or ints.
    """
    fields = {}
    try:
        raw = bytes.fromhex(blob_hex)
    except Exception:
        return fields

    # Extract all UTF-16LE strings with their byte offsets
    # Pattern: sequence of (ascii_byte, 0x00) pairs of length >= 4
    i = 0
    strings_at = []  # (offset, string)
    while i < len(raw) - 1:
        if raw[i+1] == 0 and 32 <= raw[i] <= 126:
            start = i
            chars = []
            while i < len(raw) - 1 and raw[i+1] == 0 and 32 <= raw[i] <= 126:
                chars.append(chr(raw[i]))
                i += 2
            s = ''.join(chars)
            if len(s) >= 4:
                strings_at.append((start, s))
        else:
            i += 1

    # Pair up field names with their values
    # Field names we know: MediaStartTC, MediaFrameRate, GraphThumbnailBAVersion,
    #                      ConformStartSourceTC, ConformEndSourceTC
    known_tc_fields = {
        "MediaStartTC", "ConformStartSourceTC", "ConformEndSourceTC"
    }
    known_float_fields = {"MediaFrameRate"}

    for idx, (offset, name) in enumerate(strings_at):
        # Strip leading non-alpha chars that crept in from length bytes
        clean_name = re.sub(r'^[^A-Za-z]+', '', name)
        if not clean_name:
            continue

        # Value string is the next string entry
        if idx + 1 < len(strings_at):
            _, value_str = strings_at[idx + 1]
            clean_val = re.sub(r'^[^0-9:]+', '', value_str)
        else:
            clean_val = ""

        if clean_name in known_tc_fields and ':' in clean_val:
            fields[clean_name] = clean_val
        elif clean_name in known_float_fields:
            try:
                fields[clean_name] = float(clean_val)
            except ValueError:
                pass

    return fields


# ---------------------------------------------------------------------------
# Resolution labels
# ---------------------------------------------------------------------------

RESOLUTION_LABELS = [
    (7680, 4320, "8K"),
    (3840, 2160, "4K UHD"),
    (4096, 2160, "4K DCI"),
    (2048, 1080, "2K DCI"),
    (1920, 1080, "HD 1080"),
    (1280, 720,  "HD 720"),
    (720,  576,  "SD PAL"),
    (720,  486,  "SD NTSC"),
]

def _resolution_label(w: int, h: int) -> str:
    for rw, rh, label in RESOLUTION_LABELS:
        if w == rw and h == rh:
            return label
    if w >= 3840:
        return f"{w//1000}K+"
    return f"{w}×{h}"


# ---------------------------------------------------------------------------
# HDR / color space inference
# ---------------------------------------------------------------------------

DPX_DESCRIPTORS = {
    50: "RGB",
    51: "RGBA",
    52: "ABGR",
    100: "Luma",
    102: "CbYCrY",
    103: "CbYACrYA",
    104: "CbYCr",
    105: "CbYCrA",
}

def _infer_color_space(bit_depth: int, dpx_desc: int) -> tuple:
    """Returns (color_space_hint, hdr_candidate)."""
    desc_name = DPX_DESCRIPTORS.get(dpx_desc, f"Desc{dpx_desc}")

    if bit_depth >= 12:
        hint = f"HDR candidate ({bit_depth}-bit {desc_name})"
        hdr = True
    elif bit_depth == 10:
        # 10-bit could be Rec.709 or HDR — we can't tell without project settings
        hint = f"Rec.709/HDR ({bit_depth}-bit {desc_name})"
        hdr = True   # flag as candidate, app will confirm via project settings
    else:
        hint = f"SDR ({bit_depth}-bit {desc_name})"
        hdr = False

    return hint, hdr


# ---------------------------------------------------------------------------
# Core parser
# ---------------------------------------------------------------------------

def parse_drx(drx_path: str) -> Optional[StillMetadata]:
    """
    Parse a single .drx file and return a StillMetadata object.
    Returns None if the file cannot be parsed.
    """
    drx_path = str(drx_path)
    try:
        # Resolve embeds a malformed XML comment on line 2:
        #   <!--DbAppVer="20.3.1.0006" DbPrjVer="15"-->
        # The double quotes inside the comment trip up Python's XML parser.
        # Strip all XML comments before parsing to work around this.
        with open(drx_path, 'r', encoding='utf-8', errors='replace') as f:
            raw = f.read()
        # Strip XML comments (Resolve embeds non-standard ones)
        raw = re.sub(r'<!--.*?-->', '', raw, flags=re.DOTALL)
        # Fix invalid element names with double colons e.g. Gallery::GyStill, ListMgt::LmVersion
        raw = re.sub(r'<(/?)([A-Za-z][A-Za-z0-9]*)::', r'<\1\2__', raw)
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        print(f"[DRX] XML parse error in {drx_path}: {e}")
        return None

    meta = StillMetadata()
    meta.drx_path = drx_path

    # Paired image file — same stem, first non-.drx extension found
    stem = Path(drx_path).stem
    parent = Path(drx_path).parent
    for ext in [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".dpx", ".exr"]:
        candidate = parent / (stem + ext)
        if candidate.exists():
            meta.image_path = str(candidate)
            break

    # DbId
    meta.still_id = root.get("DbId", "")

    # Simple string fields
    def text(tag: str) -> str:
        el = root.find(tag)
        return el.text.strip() if el is not None and el.text else ""

    meta.record_tc     = text("RecTC")
    meta.source_tc     = text("SrcTC")
    meta.timeline_name = text("SrcHint")
    meta.label         = text("Label")
    meta.reel_name     = text("ReelName")
    meta.create_time   = text("CreateTime")
    meta.gallery_path  = text("GalleryPath")

    # Numeric fields
    try: meta.width   = int(text("Width"))
    except: pass
    try: meta.height  = int(text("Height"))
    except: pass
    try: meta.bit_depth = int(text("BitDepth"))
    except: pass
    try: meta.dpx_descriptor = int(text("DpxDescriptor"))
    except: pass
    try: meta.par = float(text("PAR"))
    except: pass

    # FieldsBlob
    blob_el = root.find("FieldsBlob")
    if blob_el is not None and blob_el.text:
        blob_fields = _decode_fields_blob(blob_el.text.strip())
        meta.media_start_tc   = blob_fields.get("MediaStartTC", "")
        meta.conform_start_tc = blob_fields.get("ConformStartSourceTC", "")
        meta.conform_end_tc   = blob_fields.get("ConformEndSourceTC", "")

    # Grade body (for future color science)
    clip_ver = root.find(".//pClipFullVer//Body")
    if clip_ver is not None and clip_ver.text:
        meta.grade_body = clip_ver.text.strip()

    # Inferred fields
    meta.resolution_label = _resolution_label(meta.width, meta.height)
    meta.color_space_hint, meta.hdr_candidate = _infer_color_space(
        meta.bit_depth, meta.dpx_descriptor
    )

    return meta


# ---------------------------------------------------------------------------
# Folder parser
# ---------------------------------------------------------------------------

def parse_drx_folder(folder_path: str) -> list:
    """
    Parse all .drx files in a folder.
    Returns a list of StillMetadata objects sorted by label then record_tc.
    """
    folder = Path(folder_path)
    drx_files = sorted(folder.glob("*.drx"))
    results = []
    for drx_file in drx_files:
        meta = parse_drx(str(drx_file))
        if meta:
            results.append(meta)

    # Sort by label (e.g. "1.1", "1.4", "1.7") then record_tc
    def sort_key(m):
        try:
            parts = [int(x) for x in m.label.split('.')]
        except:
            parts = [0]
        return (parts, m.record_tc)

    results.sort(key=sort_key)
    return results


# ---------------------------------------------------------------------------
# Quick test / report
# ---------------------------------------------------------------------------

def print_report(meta_list: list):
    print(f"\n{'='*60}")
    print(f"  GradeShare DRX Parser Report")
    print(f"  {len(meta_list)} still(s) found")
    print(f"{'='*60}")

    for i, m in enumerate(meta_list):
        print(f"\n  Still [{i+1}] — {m.label or m.still_id}")
        print(f"  {'Image':<22} {os.path.basename(m.image_path) or 'not found'}")
        print(f"  {'Timeline':<22} {m.timeline_name}")
        print(f"  {'Record TC':<22} {m.record_tc}")
        print(f"  {'Source TC':<22} {m.source_tc}")
        print(f"  {'Media Start TC':<22} {m.media_start_tc}")
        print(f"  {'Conform Start TC':<22} {m.conform_start_tc}")
        print(f"  {'Conform End TC':<22} {m.conform_end_tc}")
        print(f"  {'Resolution':<22} {m.resolution_label} ({m.width}x{m.height})")
        print(f"  {'Bit Depth':<22} {m.bit_depth}-bit")
        print(f"  {'Color Space':<22} {m.color_space_hint}")
        print(f"  {'HDR Candidate':<22} {'Yes' if m.hdr_candidate else 'No'}")
        print(f"  {'Created':<22} {m.create_time}")
        print(f"  {'Display Label':<22} {m.display_label()}")
        print(f"  {'Tech Line':<22} {m.tech_line()}")

    print(f"\n{'='*60}\n")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python3 gradeshare_drx_parser.py <folder_or_drx_file>")
        sys.exit(1)

    target = sys.argv[1]
    if os.path.isdir(target):
        results = parse_drx_folder(target)
    else:
        results = [parse_drx(target)]
        results = [r for r in results if r]

    print_report(results)
