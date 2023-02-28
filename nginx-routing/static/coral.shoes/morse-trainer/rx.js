morse = new Morse(100, update_display);
audio = new MorseAudio(morse, document.getElementById("key"));
audio.on_play_ends.push(on_audio_off);
audio.on_play_letters.push(highlight_letter);

bind_speed_input(morse, document.getElementById("speed-dit"), document.getElementById("speed-wpm"));
bind_volume_input(audio, document.getElementById("volume"));
bind_enable_light(audio, document.getElementById("enable-light"));
bind_frequency_input(audio, document.getElementById("freq"));

let sentence_loader = new SentenceLoader(
    document.getElementById("sentence-config")
);

let did_win = false;

let current_text = null; // Object generated from sentence_loader

sentence_loader.load_from_localstorage().then(() => {
    current_text = sentence_loader.next_text();
    morse.force_update = true;
});

function win() {
    sentence_loader.completed(current_text);
    current_text = sentence_loader.next_text();

    let fw = make_fireworks();

    audio.stop();
    did_win = true;
}

let button_play = document.getElementById("button-play-outer");
let button_stop = document.getElementById("button-stop-outer");

button_play.addEventListener("click", e => {
    audio.init_user();
    play_current_word()
});

button_stop.addEventListener("click", e => {
    audio.init_user();
    audio.stop()
});

document.body.addEventListener("keydown", e => {
    audio.init_user();
    if (e.key == "Tab") {
        current_text = sentence_loader.next_text();
        morse.force_update = true;
        e.preventDefault();
    }
    if (e.key == "Escape") {
        audio.stop();
    }
});

document.getElementById("key").addEventListener("click", e => {
    audio.init_user();
    document.getElementById("text-inp").focus();
});

document.getElementById("text-inp").addEventListener("input", e => {
    audio.init_user();
    e.target.value = e.target.value.toUpperCase();
});

document.getElementById("text-inp").addEventListener("keydown", e => {
    audio.init_user();
    if (e.key == " " || e.key == "Enter") {
        e.preventDefault();

        morse.typed_text += e.target.value;
        cut_text();
        morse.force_update = true;

        e.target.value = "";

        if (!did_win) {
            play_current_word();
        }
        did_win = false;
    }
});

function on_audio_off() {
    console.log("done!");
    button_play.classList.add("active");
    button_stop.classList.remove("active");

    morse.force_update = true;
}

on_audio_off();

function play_current_word() {
    button_play.classList.remove("active");
    button_stop.classList.add("active");

    audio.off();

    let pause = audio.next_at != null;

    let w = "";

    for (let ch of current_text.text.slice(morse.typed_text.length)) {
        if (ch == " ")
            break;
        w += ch;
    }

    audio.play(w);
    if (pause)
        audio.next_at = Date.now() + morse.WORD_SEP * 1000;
}

function redacted_text() {
    let redacted = "";
    for (let ch of current_text.text.slice(morse.typed_text.length)) {
        redacted += ch == " " ? " " : "?";
    }
    return redacted;
}

function cut_text() {
    if (current_text.text !== null) {
        morse.typed_text += " ";
        for (let i = 0; i < morse.typed_text.length; i++) {
            if (morse.typed_text[i] != current_text.text[i]) {
                morse.typed_text = morse.typed_text.slice(0, i);
                typed = morse.typed_text;
                break;
            }
            if (i == current_text.text.length - 1) {
                // TODO: Win screen?
                win();
            }
        }
    }
}

function update_display(typed, typing, morse_spans, text) {
    document.getElementById("typed").innerText = typed;
    document.getElementById("typing").innerText = typing;

    if (current_text !== null) {
        document.getElementById("totype").innerText = redacted_text();

        if (current_text.author != null) {
            document.getElementById("author").innerText = "- " + current_text.author;
        } else {
            document.getElementById("author").innerText = "";
        }
    }
}

function highlight_letter(idx) {
    let text = redacted_text();

    let before_highlight = document.createTextNode(text.slice(0, idx));
    let highlighted = span_with_class(text[idx], "type-highlight");
    let after_highlight = document.createTextNode(text.slice(idx + 1));

    document.getElementById("totype").replaceChildren(before_highlight, highlighted, after_highlight);
}
