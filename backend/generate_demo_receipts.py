"""
Generates demo receipt files for seeded expense data.
Uses Pillow (already installed via requirements) for fast image generation.
Falls back to writing a minimal valid PNG if Pillow is unavailable.
"""

import os
import struct
import zlib

DEMO_DIR = os.path.join("uploads", "receipts", "demo")
os.makedirs(DEMO_DIR, exist_ok=True)


def make_minimal_png(color_rgb=(99, 102, 241)) -> bytes:
    """Produces a tiny 4x4 solid-color PNG — fast, no deps."""
    W, H = 4, 4
    r, g, b = color_rgb
    raw = b""
    for _ in range(H):
        raw += b"\x00" + bytes([r, g, b] * W)
    compressed = zlib.compress(raw, 9)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)
    def chunk(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")


def make_receipt_png(vendor: str, amount: str, date: str, category: str,
                     color_rgb=(99, 102, 241)) -> bytes:
    """Try Pillow first, fall back to minimal PNG."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        W, H = 400, 560
        BG = (248, 248, 252)
        img = Image.new("RGB", (W, H), BG)
        draw = ImageDraw.Draw(img)

        # Header band
        draw.rectangle([0, 0, W, 80], fill=color_rgb)
        draw.rectangle([0, 72, W, 80], fill=tuple(min(255, c + 30) for c in color_rgb))

        # White card
        draw.rectangle([16, 96, W - 16, H - 16], fill=(255, 255, 255))

        # Try to use a system font, fall back to default
        try:
            font_lg = ImageFont.truetype("arial.ttf", 22)
            font_md = ImageFont.truetype("arial.ttf", 14)
            font_sm = ImageFont.truetype("arial.ttf", 11)
        except Exception:
            font_lg = ImageFont.load_default()
            font_md = font_lg
            font_sm = font_lg

        # Header text
        draw.text((W // 2, 28), "RECEIPT", font=font_lg, fill=(255, 255, 255), anchor="mm")
        draw.text((W // 2, 56), "FinanceOS Enterprise", font=font_sm, fill=(220, 220, 240), anchor="mm")

        # Vendor
        draw.text((32, 112), vendor, font=font_lg, fill=(20, 20, 36))
        draw.text((32, 142), category, font=font_sm, fill=(120, 120, 140))

        # Divider
        draw.line([(32, 168), (W - 32, 168)], fill=(220, 220, 228), width=1)

        # Amount
        draw.text((32, 182), "AMOUNT", font=font_sm, fill=(130, 130, 150))
        draw.text((32, 202), amount, font=font_lg, fill=color_rgb)

        # Divider
        draw.line([(32, 240), (W - 32, 240)], fill=(220, 220, 228), width=1)

        # Details table
        fields = [
            ("Date", date),
            ("Category", category),
            ("Payment", "Corporate Card"),
            ("Status", "Verified"),
        ]
        for i, (label, value) in enumerate(fields):
            y = 256 + i * 32
            draw.text((32, y), label, font=font_sm, fill=(130, 130, 150))
            draw.text((W - 32, y), value, font=font_sm, fill=(30, 30, 46), anchor="ra")
            draw.line([(32, y + 20), (W - 32, y + 20)], fill=(235, 235, 242), width=1)

        # Barcode simulation
        bar_y = 410
        draw.rectangle([32, bar_y, W - 32, bar_y + 50], fill=(248, 248, 252), outline=(220, 220, 228))
        for i in range(38):
            bx = 40 + i * 8
            bh = 30 if i % 3 != 0 else 40
            col = (30, 30, 46) if i % 2 == 0 else (200, 200, 210)
            draw.rectangle([bx, bar_y + 5, bx + (3 if i % 3 == 0 else 2), bar_y + 5 + bh], fill=col)

        # Footer
        draw.rectangle([16, H - 56, W - 16, H - 16], fill=(245, 245, 250))
        draw.text((W // 2, H - 36), "FinanceOS · Automated Expense Intelligence", font=font_sm, fill=(160, 160, 180), anchor="mm")
        draw.text((W // 2, H - 22), "This is a system-generated demo receipt", font=font_sm, fill=(190, 190, 200), anchor="mm")

        import io
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        return buf.getvalue()

    except Exception:
        return make_minimal_png(color_rgb)


def make_pdf_stub(vendor: str, amount: str, date: str, ref: str) -> bytes:
    lines = [
        f"RECEIPT",
        f"",
        f"Vendor:  {vendor}",
        f"Amount:  {amount}",
        f"Date:    {date}",
        f"Ref:     {ref}",
        f"",
        f"FinanceOS Enterprise Platform",
        f"This is a demo receipt document.",
    ]
    text_ops = "BT\n/F1 14 Tf\n60 520 Td\n"
    for line in lines:
        safe = line.replace("(", "\\(").replace(")", "\\)")
        text_ops += f"({safe}) Tj\n0 -22 Td\n"
    text_ops += "ET"

    text_bytes = text_ops.encode()
    stream_len = len(text_bytes)

    pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 420 595]"
        b"/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
        + f"4 0 obj<</Length {stream_len}>>\nstream\n".encode()
        + text_bytes
        + b"\nendstream endobj\n"
        b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        b"xref\n0 6\n0000000000 65535 f \n"
        b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n9\n%%EOF\n"
    )
    return pdf


# ── Receipt definitions ──────────────────────────────────────────────────────

RECEIPTS = [
    ("demo_meal.jpg",      "Marriott Restaurant",  "$68.50",  "2026-07-15", "Meals",         (99,  102, 241)),
    ("demo_uber.jpg",      "Uber Technologies",    "$45.20",  "2026-07-18", "Travel",         (59,  130, 246)),
    ("demo_hotel.jpg",     "Hilton Hotels",        "$320.00", "2026-07-20", "Accommodation",  (139,  92, 246)),
    ("demo_starbucks.jpg", "Starbucks Cafe",       "$22.40",  "2026-06-10", "Meals",          (16,  185, 129)),
    ("demo_flight.jpg",    "IndiGo Airlines",      "$480.00", "2026-05-22", "Travel",         (245, 158,  11)),
    ("demo_taxi.jpg",      "Ola Cabs",             "$38.00",  "2026-03-12", "Travel",         (59,  130, 246)),
    ("demo_lunch.jpg",     "Pizza Hut",            "$47.60",  "2026-02-20", "Meals",          (239,  68,  68)),
    ("demo_conf.jpg",      "React India 2026",     "$120.00", "2026-04-15", "Other",          (139,  92, 246)),
]

PDF_RECEIPTS = [
    ("demo_flight.pdf", "IndiGo Airlines",  "$480.00", "2026-05-22", "TXN-0890"),
    ("demo_conf.pdf",   "React India 2026", "$120.00", "2026-04-15", "TXN-0812"),
]

for filename, vendor, amount, date, category, color in RECEIPTS:
    path = os.path.join(DEMO_DIR, filename)
    data = make_receipt_png(vendor, amount, date, category, color)
    with open(path, "wb") as f:
        f.write(data)
    print(f"  ✓ {path}  ({len(data):,} bytes)")

for filename, vendor, amount, date, ref in PDF_RECEIPTS:
    path = os.path.join(DEMO_DIR, filename)
    data = make_pdf_stub(vendor, amount, date, ref)
    with open(path, "wb") as f:
        f.write(data)
    print(f"  ✓ {path}  ({len(data):,} bytes)")

print("\nAll demo receipts generated.")
