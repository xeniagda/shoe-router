import io
from PIL import Image, ImageFont, ImageDraw


FONT_SPLASH = ImageFont.truetype("impact.ttf", 27)
FONT_PROFILE = ImageFont.truetype("OpenSans-Regular.ttf", 16) # Open sans light 300, thanks google


def generate_text(word, fo, color, tilt_factor=0):
    w, h = fo.getsize(word)
    w_ = int(w + tilt_factor * h)

    res_img = Image.new("RGBA", (w, h))

    draw = ImageDraw.Draw(res_img)
    draw.text((0, 0), word, font=fo, fill=color)

    italicized = res_img.transform(
        (w_, h),
        Image.AFFINE,
        (1.1, tilt_factor, -h * tilt_factor,
        0, 1, 0),
        resample=Image.BILINEAR,
    )

    return italicized


def generate_splash(word):
    im = Image.open("background_no_text.png")

    text = generate_text(word, fo=FONT_SPLASH, color=(212, 0, 0), tilt_factor = 0.3)

    im.alpha_composite(text, (447, 535))

    return im

def generate_profile(count):
    im = Image.open("profile.png")

    text = generate_text(str(count), fo=FONT_PROFILE, color=(0, 0, 0))

    im.alpha_composite(text, (139, 24))

    return im

def image_to_png(im):
    out = io.BytesIO()
    im.save(out, "png")
    return out.getvalue()

if __name__ == "__main__":
    word = "Freezer"
    generate_image(word).show()
