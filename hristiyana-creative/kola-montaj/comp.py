import sys, numpy as np
from PIL import Image, ImageFilter, ImageEnhance

S = sys.argv[1]

def load_cut(name, kill_red=False):
    im = Image.open(f"{S}/cut/{name}.png").convert("RGBA")
    a = np.array(im).astype(np.float32)
    if kill_red:  # remove photographer watermark remnants (red text) near the bottom
        h = a.shape[0]
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        red = (r > 120) & (g < 110) & (b < 120) & (r - b > 40)
        red[: int(h * 0.75)] = False
        a[red, 3] = 0
        # signature/phone area of the original photo: drop anything that is not blue tulle
        reg = np.zeros_like(red); reg[int(h * 0.9):, :int(a.shape[1] * 0.33)] = True
        a[reg & (r > b - 10), 3] = 0
    alpha = a[..., 3]
    alpha[alpha < 40] = 0
    a[..., 3] = alpha
    im = Image.fromarray(a.astype(np.uint8))
    # soften the edge a bit
    al = im.getchannel("A").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    im.putalpha(al)
    return im.crop(im.getbbox())

def match_color(fg, bg_region, strength=0.5, warm=(1.08, 1.0, 0.86)):
    f = np.array(fg).astype(np.float32)
    rgb, al = f[..., :3], f[..., 3]
    m = al > 128
    b = np.array(bg_region.convert("RGB")).astype(np.float32).reshape(-1, 3)
    out = rgb.copy()
    for c in range(3):
        fm, fs = rgb[..., c][m].mean(), rgb[..., c][m].std() + 1e-3
        bm, bs = b[:, c].mean(), b[:, c].std() + 1e-3
        t = (rgb[..., c] - fm) / fs * (fs * (1 - strength) + bs * strength) + (fm * (1 - strength) + bm * strength)
        out[..., c] = t * warm[c]
    f[..., :3] = np.clip(out, 0, 255)
    return Image.fromarray(f.astype(np.uint8))

def rim_light(fg, side="right", color=(255, 215, 165), width=5, amount=0.3):
    al = fg.getchannel("A")
    inner = al.filter(ImageFilter.MinFilter(width * 2 + 1))
    edge = np.clip(np.array(al, np.float32) - np.array(inner, np.float32), 0, 255) / 255
    h, w = edge.shape
    ramp = np.linspace(0, 1, w)[None, :] if side == "right" else np.linspace(1, 0, w)[None, :]
    edge = edge * (ramp ** 1.5) * amount
    edge = np.array(Image.fromarray((edge * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), np.float32) / 255
    f = np.array(fg).astype(np.float32)
    for c in range(3):
        f[..., c] = f[..., c] * (1 - edge) + color[c] * edge
    return Image.fromarray(np.clip(f, 0, 255).astype(np.uint8))

def add_shadow(bg, fg, x, y, kind="cast", opacity=0.4, squash=0.18, skew=0):
    al = fg.getchannel("A")
    W, H = bg.size
    sh = Image.new("L", bg.size, 0)
    if kind == "cast":  # sun behind subject -> shadow falls toward the camera (down)
        s = al.transpose(Image.FLIP_TOP_BOTTOM).resize((al.width, max(1, int(al.height * squash))))
        s = s.transform(s.size, Image.AFFINE, (1, skew, -skew * s.height, 0, 1, 0))
        sh.paste(s, (x, y + fg.height - 18))
    # contact shadow under the feet
    cs = Image.new("L", (int(fg.width * 0.9), max(6, int(fg.height * 0.05))), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(cs).ellipse([0, 0, cs.width - 1, cs.height - 1], fill=255)
    sh.paste(Image.composite(cs, Image.new("L", cs.size, 0), cs) , (x + int(fg.width * 0.05), y + fg.height - cs.height), cs)
    sh = sh.filter(ImageFilter.GaussianBlur(6))
    shade = Image.new("RGB", bg.size, (40, 28, 18))
    return Image.composite(shade, bg, sh.point(lambda v: int(v * opacity)))

def place(bg, fg, height, foot_x, foot_y, **shadow_kw):
    s = height / fg.height
    fg = fg.resize((int(fg.width * s), int(height)), Image.LANCZOS)
    x, y = int(foot_x - fg.width / 2), int(foot_y - fg.height)
    return fg, x, y

def finish(img, grain=4):
    a = np.array(img).astype(np.float32)
    a += np.random.normal(0, grain, a.shape)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def compose(bg_name, cut, height, foot, out, strength=0.45, warm=(1.08, 1.0, 0.86),
            rim="right", shadow=True, shadow_kw=None, region=None, bright=1.0, sat=1.0, haze=0.0):
    bg = Image.open(f"{S}/in/{bg_name}.jpg").convert("RGB")
    fg, x, y = place(bg, cut, height, *foot)
    reg = bg.crop(region) if region else bg
    fg = match_color(fg, reg, strength, warm)
    if bright != 1.0:
        a = fg.getchannel("A"); fg = ImageEnhance.Brightness(fg.convert("RGB")).enhance(bright).convert("RGBA"); fg.putalpha(a)
    a = fg.getchannel("A")
    rgb = ImageEnhance.Color(fg.convert("RGB")).enhance(sat)
    if haze:
        rgb = Image.blend(rgb, Image.new("RGB", rgb.size, (235, 215, 185)), haze)
    fg = rgb.convert("RGBA"); fg.putalpha(a)
    if rim:
        fg = rim_light(fg, rim)
    if shadow:
        bg = add_shadow(bg, fg, x, y, **(shadow_kw or {}))
    bg.paste(fg, (x, y), fg)
    # upscale 2x for a nicer result, then light grain to unify
    bg = bg.resize((bg.width * 2, bg.height * 2), Image.LANCZOS)
    finish(bg).save(f"{S}/out/{out}.jpg", quality=94)

d1 = load_cut("dress1")
d2 = load_cut("dress2", kill_red=True)
sf = load_cut("selfie2")

# 1. standing next to the front of the car (side view, sunset)
compose("car_side", d1, 360, (150, 575), "01_stoish_do_kolata",
        region=(100, 250, 1050, 560), sat=0.8, haze=0.12, shadow_kw=dict(squash=0.16, skew=0.3))
# 2. leaning on the rear door, dress 2 (side view)
compose("car_side", d2, 380, (900, 585), "02_oblegnata_na_kolata",
        region=(600, 250, 1100, 560), rim="left", sat=0.8, haze=0.12, shadow_kw=dict(squash=0.16, skew=-0.3))
# 3. selfie next to the headlight (front close-up)
compose("car_front", sf, 640, (250, 655), "03_selfi_do_farovete",
        region=(0, 0, 450, 641), strength=0.35, rim="right", shadow=False, bright=0.95)
# 4. half-body portrait in the dress next to the headlight (front close-up)
d2top = d2.crop((0, 0, d2.width, int(d2.height * 0.42)))
compose("car_front", d2top, 600, (270, 645), "04_portret_do_kolata",
        region=(0, 0, 450, 641), strength=0.35, rim="right", shadow=False)
print("done")
