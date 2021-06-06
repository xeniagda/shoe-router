import io
from PIL import Image, ImageFont, ImageDraw


fo = ImageFont.truetype("padaloma.italic.ttf", 22)

def generate_image(word):
    im = Image.open("background_no_text.png")
    draw = ImageDraw.Draw(im)
    draw.text((447, 540), word, font=fo, fill=(212, 0, 0))

    return im

def image_to_png(im):
    out = io.BytesIO()
    im.save(out, "png")
    return out.getvalue()
