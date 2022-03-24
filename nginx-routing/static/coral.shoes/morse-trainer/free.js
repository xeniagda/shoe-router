morse = new Morse(100, update_display);
audio = new MorseAudio();

bind_speed_input(morse, document.getElementById("speed"));
bind_volume_input(audio, document.getElementById("volume"));

document.body.addEventListener("keydown", e => {
    if (e.key == " " && !event.repeat) {
        morse.press();
        audio.on();
    }
    if (e.key == "Backspace") {
        morse.clear();
    }
});

document.body.addEventListener("keyup", e => {
    if (e.key == " ") {
        morse.release();
        audio.off();
    }
});

const button = document.getElementById("button");

function update_display(typed, typing, event_spans) {
    console.log({"typed": typed, "typing": typing, "event_spans": event_spans});

    button.replaceChildren(...event_spans);
    document.getElementById("typed").innerText = typed;
    document.getElementById("typing").innerText = typing;
}

