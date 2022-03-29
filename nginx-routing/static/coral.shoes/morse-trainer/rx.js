morse = new Morse(100, update_display);
audio = new MorseAudio(morse);
audio.on_play_ends.push(on_audio_off);
audio.on_play_letters.push(highlight_letter);

let sentence = new SentenceLoader((s, a) => { morse.clear_all(); morse.force_update = true; });
sentence.load();

bind_speed_input(morse, document.getElementById("speed"));
bind_volume_input(audio, document.getElementById("volume"));

let did_win = false;

function win() {
    sentence.completed();
    sentence.select_new();
    let fw = make_fireworks();

    audio.stop();
    did_win = true;
}

let button_play = document.getElementById("button-play-outer");
let button_stop = document.getElementById("button-stop-outer");

button_play.addEventListener("click", play_current_word)
button_stop.addEventListener("click", () => audio.stop())

document.body.addEventListener("keydown", e => {
    if (e.key == "Tab") {
        sentence.select_new();
        e.preventDefault();
    }
});

document.getElementById("key").addEventListener("click", e => {
    document.getElementById("text-inp").focus();
});

document.getElementById("text-inp").addEventListener("input", e => {
    e.target.value = e.target.value.toUpperCase();
});

document.getElementById("text-inp").addEventListener("keydown", e => {
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

    let w = "";
    for (let ch of sentence.current_sentence.slice(morse.typed_text.length)) {
        if (ch == " ")
            break;
        w += ch;
    }

    audio.play(w);
}

function redacted_text() {
    let redacted = "";
    for (let ch of sentence.current_sentence.slice(morse.typed_text.length)) {
        redacted += ch == " " ? " " : "?";
    }
    return redacted;
}

function cut_text() {
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
}

function update_display(typed, typing, morse_spans, text) {
    document.getElementById("typed").innerText = typed;
    document.getElementById("typing").innerText = typing;
    if (sentence.current_sentence != null) {
        document.getElementById("totype").innerText = redacted_text();
    }

    if (sentence.author != null)
        document.getElementById("author").innerText = "- " + sentence.author;
}

function highlight_letter(idx) {
    let text = redacted_text();

    let before_highlight = document.createTextNode(text.slice(0, idx));
    let highlighted = span_with_class(text[idx], "type-highlight");
    let after_highlight = document.createTextNode(text.slice(idx + 1));

    document.getElementById("totype").replaceChildren(before_highlight, highlighted, after_highlight);
}
