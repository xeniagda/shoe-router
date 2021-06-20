import os

import sys
import time
import threading
import random

import flask
from PIL import Image

import generate

IMAGES = [generate.image_to_png(Image.open("background.png"))]

def generate_all_images():
    global IMAGES

    last_progress = time.time()

    print("Generating")
    words = [x.strip() for x in open("frees.txt", "r").readlines()]
    for i, word in enumerate(words):
        if time.time() - last_progress > 5:
            last_progress = time.time()
            print(i, "/", len(words))

        png_data = generate.image_to_png(generate.generate_splash(word))

        IMAGES.append(png_data)

    print("Generated all images")

im_gen_thread = threading.Thread(target=generate_all_images, daemon=True)
im_gen_thread.start()

def make_png_response(data):
    return flask.Response(
        response=data,
        status=200,
        content_type="image/png",
        headers={
            "Cache-Control": "max-age=0",
        }
    )

app = flask.Flask("apioform nest")

@app.route("/splash.png")
def splash():
    if random.random() < 0.1:
        return make_png_response(random.choice(IMAGES))
    else:
        return make_png_response(IMAGES[0])

@app.route("/profile.png")
def profile(update=True):
    count = 0
    try:
        if os.path.isfile("count.txt"):
            with open("count.txt", "r") as f:
                count = int(f.read())
    except ValueError as _:
        pass

    if update:
        count += 1

        with open("count.txt", "w") as f:
            f.write(str(count))

    return make_png_response(generate.image_to_png(generate.generate_profile(count)))

@app.route("/profile-quiet.png")
def quiet():
    return profile(update=False)

# TODO: Use a good server instead of flask dev server lmao
app.run(host="0.0.0.0", port=8080)
