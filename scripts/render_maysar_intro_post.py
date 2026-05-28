from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "imagegen"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH = OUT_DIR / "maysar-intro-post.png"

W, H = 1080, 1350


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    font_path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(font_path), size=size)


FONT_HEAD = load_font("bahnschrift.ttf", 96)
FONT_HEAD_LG = load_font("bahnschrift.ttf", 110)
FONT_SUB = load_font("arial.ttf", 24)
FONT_BODY = load_font("arial.ttf", 20)
FONT_SMALL = load_font("arial.ttf", 12)
FONT_META = load_font("arialbd.ttf", 12)
FONT_LABEL = load_font("arialbd.ttf", 15)
FONT_CARD = load_font("bahnschrift.ttf", 30)
FONT_CARD_SM = load_font("bahnschrift.ttf", 24)
FONT_PHONE = load_font("bahnschrift.ttf", 38)
FONT_PHONE_SM = load_font("arial.ttf", 13)
FONT_METRIC = load_font("bahnschrift.ttf", 24)


def add_vertical_gradient(image: Image.Image, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(image)
    for y in range(H):
        t = y / (H - 1)
        color = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        draw.line((0, y, W, y), fill=color)


def add_glow(base: Image.Image, bbox: tuple[int, int, int, int], color: tuple[int, int, int, int], blur: int) -> None:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse(bbox, fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def add_arc(base: Image.Image, bbox: tuple[int, int, int, int], color: tuple[int, int, int, int], width: int) -> None:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse(bbox, outline=color, width=width)
    layer = layer.filter(ImageFilter.GaussianBlur(1))
    base.alpha_composite(layer)


def rounded_card(
    base: Image.Image,
    bbox: tuple[int, int, int, int],
    fill: tuple[int, int, int, int],
    outline: tuple[int, int, int, int],
    radius: int,
    shadow_alpha: int = 80,
    shadow_blur: int = 32,
    shadow_offset: tuple[int, int] = (0, 20),
) -> None:
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sx0, sy0, sx1, sy1 = bbox
    dx, dy = shadow_offset
    sdraw.rounded_rectangle((sx0 + dx, sy0 + dy, sx1 + dx, sy1 + dy), radius=radius, fill=(0, 0, 0, shadow_alpha))
    shadow = shadow.filter(ImageFilter.GaussianBlur(shadow_blur))
    base.alpha_composite(shadow)

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=2)
    base.alpha_composite(layer)


def draw_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font, fill, spacing: int = 4) -> None:
    draw.text(xy, text, font=font, fill=fill, spacing=spacing)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_pill(base: Image.Image, xy: tuple[int, int], text: str, fill, outline, text_fill, padding_x=18, padding_y=10) -> tuple[int, int, int, int]:
    draw = ImageDraw.Draw(base)
    bbox = draw.textbbox((0, 0), text, font=FONT_META)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x, y = xy
    rect = (x, y, x + tw + padding_x * 2, y + th + padding_y * 2)
    rounded_card(base, rect, fill, outline, radius=(rect[3] - rect[1]) // 2, shadow_alpha=20, shadow_blur=14, shadow_offset=(0, 8))
    draw.text((x + padding_x, y + padding_y - 1), text, font=FONT_META, fill=text_fill)
    return rect


base = Image.new("RGBA", (W, H), rgba("#08131C"))
add_vertical_gradient(base, (6, 17, 28), (8, 14, 20))

add_glow(base, (-120, -40, 360, 440), rgba("#F2B24F", 80), 90)
add_glow(base, (640, -60, 1120, 360), rgba("#69D7D1", 70), 90)
add_glow(base, (620, 740, 1180, 1260), rgba("#4A86C8", 60), 120)
add_glow(base, (-180, 800, 420, 1420), rgba("#102941", 90), 110)

add_arc(base, (540, -180, 1240, 520), rgba("#FFFFFF", 18), 2)
add_arc(base, (530, 300, 1450, 1220), rgba("#FFFFFF", 14), 2)
add_arc(base, (-420, 620, 420, 1460), rgba("#FFFFFF", 12), 2)

noise = Image.effect_noise((W, H), 10).convert("L")
noise_layer = Image.new("RGBA", (W, H), (255, 255, 255, 0))
noise_layer.putalpha(noise.point(lambda p: int(p * 0.07)))
base.alpha_composite(noise_layer)

draw = ImageDraw.Draw(base)

# Top bar
mark_rect = (72, 54, 130, 112)
rounded_card(base, mark_rect, rgba("#F2B24F", 245), rgba("#FFF2D8", 110), 18, shadow_alpha=50, shadow_blur=24, shadow_offset=(0, 12))
draw.text((87, 67), "M", font=FONT_CARD, fill=rgba("#102230"))
draw.text((148, 60), "MAYSAR", font=FONT_LABEL, fill=rgba("#F6F2EA"), spacing=2)
draw.text((148, 86), "DIGITAL COMMUNITY TRADE NETWORK", font=FONT_SMALL, fill=rgba("#F6F2EA", 150), spacing=2)

launch_pill = (818, 58, 1008, 102)
rounded_card(base, launch_pill, rgba("#FFFFFF", 15), rgba("#FFFFFF", 28), 22, shadow_alpha=10, shadow_blur=14, shadow_offset=(0, 6))
draw.text((845, 73), "MARKET INTRODUCTION", font=FONT_META, fill=rgba("#FFDCA0"))

# Left content
eyebrow = (72, 172, 304, 210)
rounded_card(base, eyebrow, rgba("#FFFFFF", 12), rgba("#FFFFFF", 20), 20, shadow_alpha=12, shadow_blur=12, shadow_offset=(0, 6))
draw.ellipse((88, 185, 98, 195), fill=rgba("#6ED6D1"))
draw.text((112, 182), "NOW LIVE FOR MODERN TRADE", font=FONT_META, fill=rgba("#6ED6D1"))

draw.text((72, 242), "Introducing", font=FONT_HEAD, fill=rgba("#FFDCA0"))
draw.text((72, 338), "Maysar", font=FONT_HEAD_LG, fill=rgba("#F6F2EA"))

subcopy = (
    "The trust-first commerce platform built to connect buyers, sellers, "
    "suppliers, couriers, enablers, and growth teams in one powerful network."
)
sub_lines = wrap_text(draw, subcopy, FONT_SUB, 430)
y = 470
for line in sub_lines:
    draw.text((72, y), line, font=FONT_SUB, fill=rgba("#F6F2EA", 190))
    y += 34

pill_x = 72
pill_y = 612
for text in ["BUYERS", "SELLERS", "SUPPLIERS", "COURIERS", "ENABLERS"]:
    rect = draw_pill(base, (pill_x, pill_y), text, rgba("#FFFFFF", 12), rgba("#FFFFFF", 18), rgba("#F6F2EA", 228))
    pill_x = rect[2] + 10
    if pill_x > 420:
        pill_x = 72
        pill_y += 52

statement = (72, 730, 496, 930)
rounded_card(base, statement, rgba("#102030", 195), rgba("#FFFFFF", 28), 32, shadow_alpha=70, shadow_blur=34, shadow_offset=(0, 20))
draw.text((100, 760), "WHY IT MATTERS", font=FONT_META, fill=rgba("#FFDCA0"))
body_copy = (
    "Maysar turns fragmented trade into one connected journey with smarter "
    "product discovery, safer cash-on-delivery, faster payouts, visible "
    "logistics, and attributable growth across every role."
)
body_lines = wrap_text(draw, body_copy, FONT_BODY, 350)
y = 800
for line in body_lines:
    draw.text((100, y), line, font=FONT_BODY, fill=rgba("#F6F2EA", 225))
    y += 30

# Right phone area
add_glow(base, (650, 170, 1040, 900), rgba("#0B1E2C", 120), 90)
for pos, label in [
    ((468, 184), "CONNECTED TRADE"),
    ((520, 418), "SAFER COD"),
    ((872, 764), "FASTER PAYOUTS"),
    ((604, 1028), "VISIBLE DELIVERY"),
]:
    rect = draw_pill(base, pos, label, rgba("#FFFFFF", 18), rgba("#FFFFFF", 24), rgba("#F6F2EA", 228), 18, 9)

phone = (660, 156, 1048, 952)
rounded_card(base, phone, rgba("#162432", 250), rgba("#FFFFFF", 32), 48, shadow_alpha=110, shadow_blur=44, shadow_offset=(0, 28))

screen = (674, 170, 1034, 938)
rounded_card(base, screen, rgba("#09131B", 255), rgba("#FFFFFF", 18), 38, shadow_alpha=0, shadow_blur=0, shadow_offset=(0, 0))
add_glow(base, (690, 184, 890, 372), rgba("#F2B24F", 58), 50)
add_glow(base, (848, 186, 1030, 364), rgba("#6ED6D1", 52), 50)

draw.rounded_rectangle((784, 182, 926, 208), radius=13, fill=rgba("#04090D", 210), outline=rgba("#FFFFFF", 14), width=1)
draw.text((700, 232), "Maysar", font=FONT_PHONE, fill=rgba("#F6F2EA"))
draw.text((700, 280), "TRADE MOVES TOGETHER", font=FONT_SMALL, fill=rgba("#F6F2EA", 150))
draw_pill(base, (894, 230), "BUILT FOR SCALE", rgba("#FFFFFF", 16), rgba("#FFFFFF", 20), rgba("#FFDCA0"), 14, 8)

hero = (698, 326, 1010, 556)
rounded_card(base, hero, rgba("#FFFFFF", 12), rgba("#FFFFFF", 26), 30, shadow_alpha=58, shadow_blur=28, shadow_offset=(0, 16))

# Hero grid
grid = Image.new("RGBA", base.size, (0, 0, 0, 0))
gdraw = ImageDraw.Draw(grid)
for gx in range(700, 1011, 40):
    gdraw.line((gx, 326, gx, 556), fill=rgba("#FFFFFF", 12), width=1)
for gy in range(326, 557, 40):
    gdraw.line((698, gy, 1010, gy), fill=rgba("#FFFFFF", 12), width=1)
grid = grid.filter(ImageFilter.GaussianBlur(0.6))
base.alpha_composite(grid)

draw.text((724, 354), "MARKETPLACE IN MOTION", font=FONT_SMALL, fill=rgba("#F6F2EA", 150))
draw.text((724, 385), "From discovery", font=FONT_CARD, fill=rgba("#F6F2EA"))
draw.text((724, 418), "to delivery", font=FONT_CARD, fill=rgba("#F6F2EA"))

route_points = [(738, 500), (774, 460), (824, 470), (878, 520), (934, 498), (982, 472)]
for idx in range(len(route_points) - 1):
    draw.line((route_points[idx], route_points[idx + 1]), fill=rgba("#8BE2FF"), width=5)
draw.line((route_points[0], route_points[1]), fill=rgba("#F2B24F"), width=5)
draw.line((route_points[-2], route_points[-1]), fill=rgba("#6ED6D1"), width=5)
for i, p in enumerate(route_points):
    color = rgba("#F2B24F") if i == 0 else rgba("#6ED6D1") if i == len(route_points) - 1 else rgba("#8BE2FF")
    draw.ellipse((p[0] - 8, p[1] - 8, p[0] + 8, p[1] + 8), fill=color)

draw.text((728, 532), "Order", font=FONT_SMALL, fill=rgba("#F6F2EA", 150))
draw.text((810, 448), "Seller", font=FONT_SMALL, fill=rgba("#F6F2EA", 150))
draw.text((900, 530), "Courier", font=FONT_SMALL, fill=rgba("#F6F2EA", 150))
draw.text((946, 446), "Delivered", font=FONT_SMALL, fill=rgba("#F6F2EA", 150))

payout = (698, 588, 874, 726)
rounded_card(base, payout, rgba("#08131A", 220), rgba("#FFFFFF", 24), 24, shadow_alpha=50, shadow_blur=26, shadow_offset=(0, 16))
draw.text((718, 610), "SELLER PAYOUT", font=FONT_SMALL, fill=rgba("#F6F2EA", 150))
draw.text((718, 640), "24h", font=FONT_PHONE, fill=rgba("#F6F2EA"))
draw.text((718, 690), "Faster liquidity.", font=FONT_PHONE_SM, fill=rgba("#F6F2EA", 180))
draw.text((718, 708), "More merchant confidence.", font=FONT_PHONE_SM, fill=rgba("#F6F2EA", 180))

cod = (888, 620, 1010, 748)
rounded_card(base, cod, rgba("#08131A", 220), rgba("#FFFFFF", 24), 24, shadow_alpha=50, shadow_blur=26, shadow_offset=(0, 16))
draw.text((906, 642), "COD STATUS", font=FONT_SMALL, fill=rgba("#F6F2EA", 150))
draw.text((906, 674), "Verified", font=FONT_CARD_SM, fill=rgba("#F6F2EA"))
draw.text((906, 716), "Locked. Confirmed.", font=FONT_PHONE_SM, fill=rgba("#F6F2EA", 180))

seller = (698, 782, 1010, 906)
rounded_card(base, seller, rgba("#08131A", 220), rgba("#FFFFFF", 24), 24, shadow_alpha=50, shadow_blur=26, shadow_offset=(0, 16))
draw.text((720, 808), "One network. Every role aligned.", font=FONT_CARD_SM, fill=rgba("#F6F2EA"))
seller_lines = wrap_text(draw, "Catalog, payment, logistics, commissions, and support working from the same truth.", FONT_PHONE_SM, 170)
y = 846
for line in seller_lines:
    draw.text((720, y), line, font=FONT_PHONE_SM, fill=rgba("#F6F2EA", 180))
    y += 18
for idx, tag in enumerate(["DISCOVER", "DELIVER", "GROW"]):
    draw_pill(base, (898, 806 + idx * 34), tag, rgba("#FFFFFF", 14), rgba("#FFFFFF", 22), rgba("#F6F2EA", 225), 12, 6)

metrics = [
    ("Matching", "Sharper discovery. Better conversion."),
    ("Logistics", "Route visibility. COD checks."),
    ("Enabler", "Attributed growth. Fair commissions."),
]
mx = 698
for title, body in metrics:
    rect = (mx, 912, mx + 96, 912)  # placeholder
    box = (mx, 912, mx + 96, 912)
    rounded_card(base, (mx, 912, mx + 96, 912), rgba("#000000", 0), rgba("#000000", 0), 18, shadow_alpha=0, shadow_blur=0)
    mx += 0

metric_boxes = [(698, 914, 794, 1010), (804, 914, 900, 1010), (910, 914, 1006, 1010)]
for (title, body), box in zip(metrics, metric_boxes):
    rounded_card(base, box, rgba("#FFFFFF", 12), rgba("#FFFFFF", 20), 18, shadow_alpha=18, shadow_blur=18, shadow_offset=(0, 10))
    draw.text((box[0] + 12, box[1] + 14), title, font=FONT_META, fill=rgba("#F6F2EA"))
    lines = wrap_text(draw, body, FONT_SMALL, box[2] - box[0] - 24)
    ty = box[1] + 38
    for line in lines:
        draw.text((box[0] + 12, ty), line, font=FONT_SMALL, fill=rgba("#F6F2EA", 155))
        ty += 16

# Bottom features
feature_boxes = [
    (72, 1070, 392, 1278),
    (408, 1070, 728, 1278),
    (744, 1070, 1008, 1278),
]
feature_titles = [
    ("01", "Trust-first payments", "Safer cash-on-delivery, wallet-backed payment control, and clear financial state from checkout to settlement."),
    ("02", "Growth for every role", "Sellers, enablers, and suppliers operate in one connected ecosystem with better visibility, attribution, and momentum."),
    ("03", "Operations you can see", "Traceable delivery, cleaner support workflows, and auditable platform actions that make commerce feel dependable."),
]
for box, (num, title, body) in zip(feature_boxes, feature_titles):
    rounded_card(base, box, rgba("#0B1721", 230), rgba("#FFFFFF", 24), 28, shadow_alpha=70, shadow_blur=32, shadow_offset=(0, 20))
    add_glow(base, (box[2] - 100, box[1] - 40, box[2] + 90, box[1] + 140), rgba("#FFFFFF", 18), 40)
    draw.text((box[0] + 24, box[1] + 24), num, font=FONT_META, fill=rgba("#F6F2EA", 140))
    draw.text((box[0] + 24, box[1] + 52), title, font=FONT_CARD_SM, fill=rgba("#F6F2EA"))
    lines = wrap_text(draw, body, FONT_BODY, box[2] - box[0] - 48)
    ty = box[1] + 100
    for line in lines:
        draw.text((box[0] + 24, ty), line, font=FONT_BODY, fill=rgba("#F6F2EA", 170))
        ty += 25

base = base.convert("RGB")
base.save(OUT_PATH, quality=95)
print(OUT_PATH)
