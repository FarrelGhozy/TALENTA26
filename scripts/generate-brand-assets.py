#!/usr/bin/env python3
"""Generator aset merek deterministik untuk UNIDA Student Championship (USC).

Membaca dua sumber master asli di `docs/design/logo-usc-2026-11/sources/`:
1. `usc-emblem-blue-master.png` (emblem biru transparan dari pengguna)
2. `usc-wordmark-source.png` (Wordmark UNIDA STUDENT CHAMPIONSHIP berlatar #F7F7F7)

Menghasilkan seluruh turunan produksi yang optimal (WebP, PNG, multi-size ICO,
Apple Touch Icon, PWA & maskable icons, OG social card, serta lembar QA visual).
"""

from __future__ import annotations

import io
import struct
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SOURCES_DIR = ROOT / "docs" / "design" / "logo-usc-2026-11" / "sources"
QA_OUT = ROOT / "docs" / "design" / "logo-usc-2026-11" / "usc-brand-qa.png"
PUBLIC_DIR = ROOT / "frontend" / "public"
IMAGES_DIR = PUBLIC_DIR / "images"

NAVY_INK = (8, 42, 70)         # #082A46
NAVY_DEEP = (5, 33, 63)        # #05213F
NAVY_MID = (0, 96, 160)       # #0060A0
ACCENT_PRIMARY = (0, 143, 192) # #008FC0
ACCENT_LIGHT = (119, 220, 238) # #77DCEE
SURFACE_LIGHT = (248, 250, 252) # #F8FAFC
WHITE = (255, 255, 255)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        [
            "/usr/share/fonts/google-noto/NotoSans-Bold.ttf",
            "/usr/share/fonts/google-noto/NotoSans-SemiBold.ttf",
            "/usr/share/fonts/liberation-sans-fonts/LiberationSans-Bold.ttf",
            "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf",
        ]
        if bold
        else [
            "/usr/share/fonts/google-noto/NotoSans-Regular.ttf",
            "/usr/share/fonts/liberation-sans-fonts/LiberationSans-Regular.ttf",
            "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf",
        ]
    )
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def trim_rgba(img: Image.Image, alpha_threshold: int = 8) -> Image.Image:
    rgba = img.convert("RGBA")
    arr = np.array(rgba)
    ys, xs = np.where(arr[:, :, 3] > alpha_threshold)
    if len(xs) == 0:
        raise ValueError("Gambar sumber tidak memiliki piksel terlihat.")
    return rgba.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def rounded_rect_rgba(size: int, color: tuple[int, int, int], radius_ratio: float) -> Image.Image:
    """Render rounded rectangle halus dengan supersampling 4x."""
    scale = 4
    big = size * scale
    radius = max(1, round(big * radius_ratio))
    canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((0, 0, big - 1, big - 1), radius=radius, fill=(*color, 255))
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def make_square_emblem(
    emblem_trimmed: Image.Image,
    size: int,
    pad_ratio: float = 0.05,
    bg_color: tuple[int, int, int] | None = None,
    rounded_radius_ratio: float = 0.0,
) -> Image.Image:
    if bg_color is None:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    elif rounded_radius_ratio > 0:
        canvas = rounded_rect_rgba(size, bg_color, rounded_radius_ratio)
    else:
        canvas = Image.new("RGBA", (size, size), (*bg_color, 255))

    inner = max(1, round(size * (1.0 - 2.0 * pad_ratio)))
    ew, eh = emblem_trimmed.size
    scale = min(inner / ew, inner / eh)
    nw = max(1, round(ew * scale))
    nh = max(1, round(eh * scale))
    resized = emblem_trimmed.resize((nw, nh), Image.Resampling.LANCZOS)

    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def extract_wordmark_variants(source_path: Path) -> tuple[Image.Image, Image.Image]:
    """Ekstrak wordmark monokrom berlatar #F7F7F7 ke alpha matte bebas halo."""
    rgb = np.array(Image.open(source_path).convert("RGB"), dtype=np.float32)
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]

    # Ambang latar 236 berada di bawah riak kompresi tepi (243-250) sehingga latar 100% bersih.
    bg_lum = 236.0
    ink_lum = 42.0
    alpha = np.clip((bg_lum - lum) / (bg_lum - ink_lum), 0.0, 1.0)
    alpha[alpha < 0.04] = 0.0
    alpha_u8 = np.round(alpha * 255.0).astype(np.uint8)

    ys, xs = np.where(alpha_u8 > 10)
    if len(xs) == 0:
        raise ValueError("Wordmark sumber tidak memiliki tinta terlihat.")

    pad = 2
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(alpha_u8.shape[1], int(xs.max()) + 1 + pad)
    y1 = min(alpha_u8.shape[0], int(ys.max()) + 1 + pad)
    cropped_alpha = alpha_u8[y0:y1, x0:x1]

    h, w = cropped_alpha.shape

    def colorize(color: tuple[int, int, int]) -> Image.Image:
        out = np.zeros((h, w, 4), dtype=np.uint8)
        out[:, :, 0] = color[0]
        out[:, :, 1] = color[1]
        out[:, :, 2] = color[2]
        out[:, :, 3] = cropped_alpha
        return Image.fromarray(out, mode="RGBA")

    return colorize(NAVY_INK), colorize(WHITE)


def write_png_in_ico(images: list[Image.Image], output_path: Path) -> None:
    """Kemas beberapa ukuran PNG 32-bit RGBA ke satu berkas ICO multi-resolusi."""
    png_blobs: list[tuple[int, bytes]] = []
    for im in images:
        buf = io.BytesIO()
        im.save(buf, format="PNG", optimize=True)
        png_blobs.append((im.width, buf.getvalue()))

    header = struct.pack("<HHH", 0, 1, len(png_blobs))
    entries = bytearray()
    payload = bytearray()
    offset = 6 + 16 * len(png_blobs)

    for size, blob in png_blobs:
        dim = 0 if size >= 256 else size
        entries.extend(
            struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(blob), offset)
        )
        payload.extend(blob)
        offset += len(blob)

    output_path.write_bytes(header + bytes(entries) + bytes(payload))


def build_og_image(emblem_trimmed: Image.Image, wordmark_light: Image.Image) -> Image.Image:
    """Bangun kartu Open Graph 1200x630 bergradien biru tua dengan aksen cyan."""
    width, height = 1200, 630

    # Gradien vertikal halus Deep Navy
    y_grad = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    x_dist = np.linspace(-1.0, 1.0, width, dtype=np.float32)[None, :]
    radial = np.clip(1.0 - (x_dist**2 * 0.55 + ((y_grad - 0.38) * 1.4) ** 2), 0.0, 1.0)

    r = np.clip(9 + y_grad * 11 + radial * 20, 0, 255).astype(np.uint8)
    g = np.clip(17 + y_grad * 19 + radial * 24, 0, 255).astype(np.uint8)
    b = np.clip(27 + y_grad * 24 + radial * 30, 0, 255).astype(np.uint8)
    bg_arr = np.dstack([r, g, b, np.full((height, width), 255, dtype=np.uint8)])
    canvas = Image.fromarray(bg_arr, mode="RGBA")

    draw = ImageDraw.Draw(canvas)
    # Garis aksen cyan tipis di sisi atas & bawah
    draw.rectangle((0, 0, width, 6), fill=(*ACCENT_PRIMARY, 255))
    draw.rectangle((0, height - 6, width, height), fill=(*ACCENT_PRIMARY, 255))

    # Garis tepi frame internal halus
    draw.rounded_rectangle(
        (36, 36, width - 36, height - 36),
        radius=28,
        outline=(*ACCENT_PRIMARY, 75),
        width=2,
    )

    # Medalion terang elegan untuk emblem 3D agar biru tetap kontras 100%
    medallion_size = 212
    mx = (width - medallion_size) // 2
    my = 76

    # Soft glow belakang medalion
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse(
        (mx - 40, my - 40, mx + medallion_size + 40, my + medallion_size + 40),
        fill=(*ACCENT_LIGHT, 48),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=34))
    canvas.alpha_composite(glow)

    medallion = make_square_emblem(
        emblem_trimmed,
        size=medallion_size,
        pad_ratio=0.11,
        bg_color=SURFACE_LIGHT,
        rounded_radius_ratio=0.22,
    )
    canvas.alpha_composite(medallion, (mx, my))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        (mx, my, mx + medallion_size - 1, my + medallion_size - 1),
        radius=round(medallion_size * 0.22),
        outline=(*ACCENT_LIGHT, 170),
        width=3,
    )

    # Wordmark putih terpusat di bawah emblem (proporsi optimal ~1.3x agar tepi tetap tajam)
    wm_target_w = 540
    wm_scale = wm_target_w / wordmark_light.width
    wm_resized = wordmark_light.resize(
        (wm_target_w, round(wordmark_light.height * wm_scale)),
        Image.Resampling.LANCZOS,
    )
    # Pertajam sedikit kanal alpha agar garis huruf & mata pena tetap renyah pada OG card
    wm_alpha = wm_resized.getchannel("A").filter(ImageFilter.UnsharpMask(radius=0.8, percent=120, threshold=2))
    wm_resized.putalpha(wm_alpha)
    wx = (width - wm_resized.width) // 2
    wy = my + medallion_size + 40
    canvas.alpha_composite(wm_resized, (wx, wy))

    # Garis pemisah cyan pendek
    div_y = wy + wm_resized.height + 32
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        (width // 2 - 72, div_y, width // 2 + 72, div_y + 4),
        radius=2,
        fill=(*ACCENT_PRIMARY, 230),
    )

    # Subjudul institusional
    subtitle_font = load_font(25, bold=False)
    campus_font = load_font(21, bold=True)
    subtitle = "Platform Pembinaan Lomba & Pendataan Prestasi Mahasiswa"
    campus = "UNIVERSITAS DARUSSALAM GONTOR  •  USC"

    sb_box = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    sb_w = sb_box[2] - sb_box[0]
    draw.text(
        ((width - sb_w) // 2, div_y + 20),
        subtitle,
        fill=(226, 232, 240, 245),
        font=subtitle_font,
    )

    cp_box = draw.textbbox((0, 0), campus, font=campus_font)
    cp_w = cp_box[2] - cp_box[0]
    draw.text(
        ((width - cp_w) // 2, div_y + 58),
        campus,
        fill=(*ACCENT_LIGHT, 245),
        font=campus_font,
    )

    return canvas.convert("RGB")


def build_qa_sheet(
    emblem_trimmed: Image.Image,
    wordmark_dark: Image.Image,
    wordmark_light: Image.Image,
    apple_icon: Image.Image,
    maskable_icon: Image.Image,
) -> Image.Image:
    """Bangun lembar QA visual untuk memeriksa keterbacaan ukuran kecil & latar gelap/terang."""
    sheet = Image.new("RGBA", (1280, 820), (*SURFACE_LIGHT, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = load_font(24, bold=True)
    label_font = load_font(15, bold=True)
    small_font = load_font(13, bold=False)

    draw.text(
        (36, 26),
        "QA Visual Aset Merek — UNIDA STUDENT CHAMPIONSHIP (USC)",
        fill=(*NAVY_INK, 255),
        font=title_font,
    )
    draw.text(
        (36, 58),
        "Pemeriksaan favicon (16/24/32/48/64 px), wordmark transparan gelap & terang, lockup navbar, serta ikon perangkat.",
        fill=(71, 85, 105, 255),
        font=small_font,
    )

    # Panel 1: Favicon di tab terang & tab gelap
    draw.rounded_rectangle((36, 98, 624, 344), radius=18, fill=(*WHITE, 255), outline=(226, 232, 240, 255), width=2)
    draw.text((56, 114), "1. Favicon (Rounded Square Putih) — Skala Asli & Zoom 4x", fill=(*NAVY_INK, 255), font=label_font)

    # Strip tab terang
    draw.rounded_rectangle((56, 146, 604, 232), radius=12, fill=(241, 245, 249, 255))
    # Strip tab gelap
    draw.rounded_rectangle((56, 244, 604, 330), radius=12, fill=(30, 41, 59, 255))

    x_cursor = 74
    for sz in (16, 24, 32, 48, 64):
        fav = make_square_emblem(emblem_trimmed, sz, pad_ratio=0.10, bg_color=WHITE, rounded_radius_ratio=0.20)
        sheet.alpha_composite(fav, (x_cursor, 146 + (86 - sz) // 2))
        sheet.alpha_composite(fav, (x_cursor, 244 + (86 - sz) // 2))
        draw.text((x_cursor, 148), f"{sz}px", fill=(100, 116, 139, 255), font=small_font)
        x_cursor += sz + 26

    # Zoom 4x untuk 16px
    fav16 = make_square_emblem(emblem_trimmed, 16, pad_ratio=0.10, bg_color=WHITE, rounded_radius_ratio=0.20)
    fav16_z = fav16.resize((64, 64), Image.Resampling.NEAREST)
    sheet.alpha_composite(fav16_z, (516, 158))
    sheet.alpha_composite(fav16_z, (516, 256))
    draw.text((512, 142), "16px 4x", fill=(100, 116, 139, 255), font=small_font)

    # Panel 2: Ikon Perangkat (Apple Touch & Android Maskable)
    draw.rounded_rectangle((648, 98, 1244, 344), radius=18, fill=(*WHITE, 255), outline=(226, 232, 240, 255), width=2)
    draw.text((668, 114), "2. Apple Touch Icon (180px) & Android Maskable (Safe Zone 80%)", fill=(*NAVY_INK, 255), font=label_font)

    at_preview = apple_icon.resize((136, 136), Image.Resampling.LANCZOS)
    mask_at = rounded_rect_rgba(136, WHITE, 0.22).split()[3]
    at_rounded = Image.new("RGBA", (136, 136), (0, 0, 0, 0))
    at_rounded.paste(at_preview, (0, 0), mask_at)
    sheet.alpha_composite(at_rounded, (704, 162))
    draw.rounded_rectangle((704, 162, 840, 298), radius=30, outline=(203, 213, 225, 255), width=2)
    draw.text((718, 306), "Apple Touch", fill=(71, 85, 105, 255), font=small_font)

    mk_preview = maskable_icon.resize((136, 136), Image.Resampling.LANCZOS)
    sheet.alpha_composite(mk_preview, (928, 162))
    draw.rectangle((928, 162, 1064, 298), outline=(203, 213, 225, 255), width=2)
    # Indikator lingkaran 80% safe-zone maskable
    pad_circle = round(136 * 0.10)
    draw.ellipse(
        (928 + pad_circle, 162 + pad_circle, 1064 - pad_circle, 298 - pad_circle),
        outline=(*ACCENT_PRIMARY, 220),
        width=2,
    )
    draw.text((926, 306), "Maskable (80% circle)", fill=(71, 85, 105, 255), font=small_font)

    # Panel 3: Wordmark & Lockup Navbar Terang vs Gelap
    draw.rounded_rectangle((36, 368, 1244, 788), radius=18, fill=(*WHITE, 255), outline=(226, 232, 240, 255), width=2)
    draw.text((56, 386), "3. Wordmark Transparan Bebas Halo & Simulasi Navbar (Terang vs Gelap)", fill=(*NAVY_INK, 255), font=label_font)

    # Simulasi Navbar Terang
    draw.rounded_rectangle((56, 422, 1224, 514), radius=14, fill=(*WHITE, 255), outline=(226, 232, 240, 255), width=2)
    em_nav = make_square_emblem(emblem_trimmed, 44, pad_ratio=0.04)
    wm_nav_dark = wordmark_dark.resize((round(wordmark_dark.width * (34 / wordmark_dark.height)), 34), Image.Resampling.LANCZOS)
    sheet.alpha_composite(em_nav, (80, 446))
    sheet.alpha_composite(wm_nav_dark, (136, 451))
    draw.text((950, 458), "Navbar Halaman Terang", fill=(100, 116, 139, 255), font=small_font)

    # Simulasi Navbar Gelap (Landing / Footer) dengan Medalion Kontras
    draw.rounded_rectangle((56, 534, 1224, 626), radius=14, fill=(*NAVY_DEEP, 255))
    em_med = make_square_emblem(emblem_trimmed, 44, pad_ratio=0.10, bg_color=WHITE, rounded_radius_ratio=0.22)
    wm_nav_light = wordmark_light.resize((round(wordmark_light.width * (34 / wordmark_light.height)), 34), Image.Resampling.LANCZOS)
    sheet.alpha_composite(em_med, (80, 558))
    sheet.alpha_composite(wm_nav_light, (136, 563))
    draw.text((915, 570), "Navbar Landing / Footer Gelap", fill=(203, 213, 225, 255), font=small_font)

    # Simulasi Wordmark Skala Besar di Latar Gelap & Terang (cek halo/artefak)
    draw.rounded_rectangle((56, 646, 630, 766), radius=14, fill=(*SURFACE_LIGHT, 255), outline=(226, 232, 240, 255), width=1)
    sheet.alpha_composite(wordmark_dark, (138, 666))
    draw.rounded_rectangle((650, 646, 1224, 766), radius=14, fill=(*NAVY_INK, 255))
    sheet.alpha_composite(wordmark_light, (732, 666))

    return sheet.convert("RGB")


def main() -> None:
    emblem_src = SOURCES_DIR / "usc-emblem-blue-master.png"
    wordmark_src = SOURCES_DIR / "usc-wordmark-source.png"

    if not emblem_src.exists() or not wordmark_src.exists():
        raise FileNotFoundError(
            f"Sumber master logo tidak ditemukan di {SOURCES_DIR}. "
            "Pastikan usc-emblem-blue-master.png dan usc-wordmark-source.png tersedia."
        )

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    QA_OUT.parent.mkdir(parents=True, exist_ok=True)

    emblem_trimmed = trim_rgba(Image.open(emblem_src))
    wordmark_dark, wordmark_light = extract_wordmark_variants(wordmark_src)

    # 1. Emblem UI (WebP primer + PNG fallback)
    emblem_192 = make_square_emblem(emblem_trimmed, 192, pad_ratio=0.04)
    emblem_192.save(IMAGES_DIR / "usc-emblem.webp", format="WEBP", quality=92, method=6)
    emblem_192.save(IMAGES_DIR / "usc-emblem.png", format="PNG", optimize=True)

    emblem_512 = make_square_emblem(emblem_trimmed, 512, pad_ratio=0.04)
    emblem_512.save(IMAGES_DIR / "usc-emblem-512.webp", format="WEBP", quality=92, method=6)
    emblem_512.save(IMAGES_DIR / "usc-emblem-512.png", format="PNG", optimize=True)

    # 2. Wordmark Transparan (Lossless WebP untuk tipografi tajam + PNG fallback)
    wordmark_dark.save(IMAGES_DIR / "usc-wordmark-dark.webp", format="WEBP", lossless=True, method=6)
    wordmark_dark.save(IMAGES_DIR / "usc-wordmark-dark.png", format="PNG", optimize=True)

    wordmark_light.save(IMAGES_DIR / "usc-wordmark-light.webp", format="WEBP", lossless=True, method=6)
    wordmark_light.save(IMAGES_DIR / "usc-wordmark-light.png", format="PNG", optimize=True)

    # 3. Kompatibilitas URL lama logo-icon.*
    logo_icon_png = make_square_emblem(emblem_trimmed, 512, pad_ratio=0.06)
    logo_icon_png.save(IMAGES_DIR / "logo-icon.png", format="PNG", optimize=True)

    logo_icon_jpg = make_square_emblem(emblem_trimmed, 512, pad_ratio=0.10, bg_color=WHITE).convert("RGB")
    logo_icon_jpg.save(IMAGES_DIR / "logo-icon.jpg", format="JPEG", quality=92, optimize=True)

    # 4. Favicons (multi-size PNG + multi-size ICO)
    fav_sizes = [16, 24, 32, 48, 64]
    fav_frames = [
        make_square_emblem(emblem_trimmed, sz, pad_ratio=0.10, bg_color=WHITE, rounded_radius_ratio=0.20)
        for sz in fav_sizes
    ]
    fav_by_size = dict(zip(fav_sizes, fav_frames))
    fav_by_size[16].save(PUBLIC_DIR / "favicon-16x16.png", format="PNG", optimize=True)
    fav_by_size[32].save(PUBLIC_DIR / "favicon-32x32.png", format="PNG", optimize=True)
    fav_by_size[64].save(PUBLIC_DIR / "favicon.png", format="PNG", optimize=True)
    write_png_in_ico(fav_frames, PUBLIC_DIR / "favicon.ico")

    # 5. Apple Touch Icon & PWA / Maskable Icons
    apple_icon = make_square_emblem(emblem_trimmed, 180, pad_ratio=0.12, bg_color=SURFACE_LIGHT)
    apple_icon.convert("RGB").save(PUBLIC_DIR / "apple-touch-icon.png", format="PNG", optimize=True)

    icon_192 = make_square_emblem(emblem_trimmed, 192, pad_ratio=0.12, bg_color=SURFACE_LIGHT)
    icon_192.convert("RGB").save(IMAGES_DIR / "usc-icon-192.png", format="PNG", optimize=True)

    icon_512 = make_square_emblem(emblem_trimmed, 512, pad_ratio=0.12, bg_color=SURFACE_LIGHT)
    icon_512.convert("RGB").save(IMAGES_DIR / "usc-icon-512.png", format="PNG", optimize=True)

    maskable_512 = make_square_emblem(emblem_trimmed, 512, pad_ratio=0.21, bg_color=SURFACE_LIGHT)
    maskable_512.convert("RGB").save(IMAGES_DIR / "usc-icon-maskable-512.png", format="PNG", optimize=True)

    # 6. Open Graph Social Card (1200x630)
    og_image = build_og_image(emblem_trimmed, wordmark_light)
    og_image.save(IMAGES_DIR / "usc-og-image.png", format="PNG", optimize=True)

    # 7. Lembar QA Visual
    qa_sheet = build_qa_sheet(emblem_trimmed, wordmark_dark, wordmark_light, apple_icon, maskable_512)
    qa_sheet.save(QA_OUT, format="PNG", optimize=True)

    generated = [
        IMAGES_DIR / "usc-emblem.webp",
        IMAGES_DIR / "usc-emblem.png",
        IMAGES_DIR / "usc-emblem-512.webp",
        IMAGES_DIR / "usc-emblem-512.png",
        IMAGES_DIR / "usc-wordmark-dark.webp",
        IMAGES_DIR / "usc-wordmark-dark.png",
        IMAGES_DIR / "usc-wordmark-light.webp",
        IMAGES_DIR / "usc-wordmark-light.png",
        IMAGES_DIR / "usc-icon-192.png",
        IMAGES_DIR / "usc-icon-512.png",
        IMAGES_DIR / "usc-icon-maskable-512.png",
        IMAGES_DIR / "usc-og-image.png",
        IMAGES_DIR / "logo-icon.png",
        IMAGES_DIR / "logo-icon.jpg",
        PUBLIC_DIR / "favicon-16x16.png",
        PUBLIC_DIR / "favicon-32x32.png",
        PUBLIC_DIR / "favicon.png",
        PUBLIC_DIR / "favicon.ico",
        PUBLIC_DIR / "apple-touch-icon.png",
        QA_OUT,
    ]
    print("Aset merek UNIDA Student Championship (USC) berhasil diekspor:")
    for path in generated:
        size_kb = path.stat().st_size / 1024
        rel = path.relative_to(ROOT)
        print(f"  - {rel} ({size_kb:.1f} KB)")
    print(f"Dimensi wordmark trimmed: {wordmark_dark.width}x{wordmark_dark.height} px")


if __name__ == "__main__":
    main()
