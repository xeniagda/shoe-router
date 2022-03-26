morse = new Morse(100, update_display);
audio = new MorseAudio();
select = new SelectionHandler(
    morse,
    audio,
    document.getElementById("typed"),
    document.getElementById("button-play-outer"),
    document.getElementById("button-stop-outer"),
    (tx, st, en) => {},
    () => { morse.force_update = true; },
    highlight_letter,
);

bind_speed_input(morse, document.getElementById("speed"));
bind_volume_input(audio, document.getElementById("volume"));

document.body.addEventListener("keydown", e => {
    if (e.key == " " && !event.repeat) {
        morse.press();
        audio.on();
    }
    if (e.key == "Backspace") {
        if (!morse.clear()) {
            morse.typed_text = morse.typed_text.slice(0, morse.typed_text.length - 2) + " ";
        }
    }
});

document.body.addEventListener("keyup", e => {
    if (e.key == " ") {
        morse.release();
        audio.off();
    }
});

const button = document.getElementById("button");

function update_display(typed, typing, morse_spans, text) {
    document.getElementById("key-morse").replaceChildren(...morse_spans);
    document.getElementById("key-text").innerText = text;
    document.getElementById("typed").innerText = typed;
    document.getElementById("typing").innerText = typing;
}

function highlight_letter(idx) {
    console.log(idx);
    let before_highlight = document.createTextNode(morse.typed_text.slice(0, idx));
    let highlighted = span_with_class(morse.typed_text[idx], "type-highlight");
    let after_highlight = document.createTextNode(morse.typed_text.slice(idx + 1));

    document.getElementById("typed").replaceChildren(before_highlight, highlighted, after_highlight);
}
