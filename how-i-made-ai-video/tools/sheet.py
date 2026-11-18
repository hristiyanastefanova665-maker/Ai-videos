import sys, glob
from PIL import Image, ImageDraw
fs = sys.argv[2:]; out = sys.argv[1]
ims = [Image.open(f).resize((270, 480)) for f in fs]
cols = min(4, len(ims)); rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * 275, rows * 500), 'white'); d = ImageDraw.Draw(S)
for i, (im, f) in enumerate(zip(ims, fs)):
    x, y = (i % cols) * 275, (i // cols) * 500; S.paste(im, (x, y + 18)); d.text((x + 4, y + 2), f.split('/')[-1], fill='black')
S.save(out, quality=85)
