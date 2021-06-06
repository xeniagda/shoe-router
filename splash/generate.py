import io
from PIL import Image, ImageFont, ImageDraw


fo = ImageFont.truetype("impact.ttf", 27)

tilt_factor = 0.3

def generate_text(word):
    w, h = fo.getsize(word)
    w_ = int(w + tilt_factor * h)

    res_img = Image.new("RGBA", (w, h))

    draw = ImageDraw.Draw(res_img)
    draw.text((0, 0), word, font=fo, fill=(212, 0, 0))

    italicized = res_img.transform(
        (w_, h),
        Image.AFFINE,
        (1.1, tilt_factor, -h * tilt_factor,
        0, 1, 0),
        resample=Image.BILINEAR,
    )

    return italicized


def generate_image(word):

    im = Image.open("background_no_text.png")

    text = generate_text(word)

    im.alpha_composite(text, (447, 535))

    return im

def image_to_png(im):
    out = io.BytesIO()
    im.save(out, "png")
    return out.getvalue()

if __name__ == "__main__":
    word = "Freezer"
    generate_image(word).show()
