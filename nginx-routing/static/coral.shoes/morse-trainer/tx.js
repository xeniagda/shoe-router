morse = new Morse(100, update_display);
audio = new MorseAudio(morse);
select = new SelectionHandler(
    audio,
    document.getElementById("totype"),
    document.getElementById("button-play-outer"),
    document.getElementById("button-stop-outer"),
    (tx, st, en) => {},
    () => { morse.force_update = true; },
    highlight_letter,
);

let sentence = new SentenceLoader((s, a) => { morse.clear_all(); morse.force_update = true; });
sentence.load();

bind_speed_input(morse, document.getElementById("speed-dit"), document.getElementById("speed-wpm"));
bind_volume_input(audio, document.getElementById("volume"));
bind_frequency_input(audio, document.getElementById("freq"));

function win() {
    sentence.completed();
    sentence.select_new();
    let fw = make_fireworks();
}

document.body.addEventListener("keydown", e => {
    if (e.target.matches("input"))
        return;

    if (e.key == " ") {
        e.preventDefault();
        if (!e.repeat) {
            morse.press();
            audio.on();
        }
    }
    if (e.key == "Enter") {
        morse.submit_word();
        e.preventDefault();
    }
    if (e.key == "Backspace") {
        morse.clear();
        e.preventDefault();
    }
    if (e.key == "Tab") {
        sentence.select_new();
        e.preventDefault();
    }
});

document.body.addEventListener("keyup", e => {
    if (e.target.matches("input"))
        return;

    if (e.key == " ") {
        morse.release();
        audio.off();
    }
});

const button = document.getElementById("button");

const typed_len = 0;

function update_display(typed, typing, morse_spans, text) {
    if (sentence.current_sentence != null) {
        morse.typed_text += " ";
        for (let i = 0; i < morse.typed_text.length; i++) {
            if (morse.typed_text[i] != sentence.current_sentence[i]) {
                morse.typed_text = morse.typed_text.slice(0, i);
                typed = morse.typed_text;
                break;
            }
            if (i == sentence.current_sentence.length - 1) {
                // TODO: Win screen?
                win();
            }
        }
    }

    document.getElementById("key-morse").replaceChildren(...morse_spans);
    document.getElementById("key-text").innerText = text;

    document.getElementById("typed").innerText = typed;
    document.getElementById("typing").innerText = typing;
    if (sentence.current_sentence != null)
        document.getElementById("totype").innerText = sentence.current_sentence.slice(typed.length + text.length);

    if (sentence.author != null)
        document.getElementById("author").innerText = "- " + sentence.author;
}

function highlight_letter(idx) {
    let text = document.getElementById("totype").innerText;

    let before_highlight = document.createTextNode(text.slice(0, idx));
    let highlighted = span_with_class(text[idx], "type-highlight");
    let after_highlight = document.createTextNode(text.slice(idx + 1));

    document.getElementById("totype").replaceChildren(before_highlight, highlighted, after_highlight);
}

