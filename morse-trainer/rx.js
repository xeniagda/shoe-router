let morse = new Morse(100, update_display);
let audio = new MorseAudio(morse, document.getElementById("key"));
audio.on_play_ends.push(on_audio_off);

let history = new SessionHistory();
history.render();
history.bind_reset_button(document.getElementById("history-reset"));

let last_played_idx = 0;
audio.on_play_letters.push(idx => last_played_idx = idx);

bind_speed_input(
    morse,
    document.getElementById("split-speed-cb"),
    document.getElementById("speed-wpm"),
    document.getElementById("speed-wpm-char"),
    document.getElementById("speed-wpm-word"),
);

bind_volume_input(audio, document.getElementById("volume"));
bind_enable_light(audio, document.getElementById("enable-light"));
bind_frequency_input(audio, document.getElementById("freq"));

let settings_screen = document.getElementById("settings");
document.getElementById("settings-switch").addEventListener("click", e => {
    e.preventDefault();
    settings_screen.classList.toggle("active");
});

document.getElementById("test-tone").addEventListener("mousedown", e => {
    audio.init_user();
    audio.on();
});

document.getElementById("test-tone").addEventListener("mouseup", e => {
    audio.init_user();
    audio.off();
});

const MODE_WORD = 'word';
const MODE_WORD_EL = document.getElementById("button-select-word");

const MODE_SENTENCE = 'sentence';
const MODE_SENTENCE_EL = document.getElementById("button-select-sentence");

var current_mode = null;

function set_mode(new_mode) {
    current_mode = new_mode;
    localStorage.setItem("mode", current_mode);
    MODE_WORD_EL.classList.remove("selected");
    MODE_SENTENCE_EL.classList.remove("selected");
    if (new_mode === MODE_WORD) {
        MODE_WORD_EL.classList.add("selected");
    } else if (new_mode === MODE_SENTENCE) {
        MODE_SENTENCE_EL.classList.add("selected");
    } else {
        console.error("Unknown mode: " + new_mode);
    }
}
set_mode(localStorage.getItem("mode") || MODE_WORD);
MODE_WORD_EL.addEventListener("click", e => set_mode(MODE_WORD));
MODE_SENTENCE_EL.addEventListener("click", e => set_mode(MODE_SENTENCE));

let sentence_loader = new SentenceLoader(
    document.getElementById("sentence-config")
);

function did_win() {
    return document.getElementById("under-text").classList.contains("won");
}

let current_text = null; // Object generated from sentence_loader

sentence_loader.load_from_localstorage().then(() => {
    current_text = sentence_loader.next_text();
    morse.force_update = true;
});

function win() {
    if (did_win())
        return;

    document.getElementById("accuracy").innerText = "";

    document.getElementById("under-text").classList.add("won");

    let s = stats();

    let acc = Math.round(s.accuracy_overall * 10000) / 100;
    document.getElementById("accuracy-result").innerText = acc + "%";
    document.getElementById("wpm-result").innerText = morse.get_speed_char() + "/" + morse.get_speed_word();
    document.getElementById("chars-result").innerText = current_text.text.length;
    document.getElementById("mode-result").innerText = sentence_loader.current_generator.describe();

    history.add_commit_and_rerender({
        "complete": s.done,
        "accuracy": s.accuracy_overall,
        "missed": s.missed,
        "incorrect": s.incorrect,
        "extra": s.extra,
        "name_short": sentence_loader.current_generator.describe_short(),
        "name_long": sentence_loader.current_generator.describe(),
    });

    audio.stop();

    if (s.accuracy_overall > 0.90) {
        sentence_loader.completed(current_text);

        let fw = make_fireworks();
    }
}

function focus_key() {
    document.getElementById("text-inp").focus();
}

function unwin() {
    document.getElementById("under-text").classList.remove("won");
}

let waiting_confirm = false;

let reset_warning = document.getElementById("reset-confirm");

function new_sentence() {
    if (!waiting_confirm && !did_win()) {
        reset_warning.classList.add("active");
        waiting_confirm = true;
    } else {
        reset_warning.classList.remove("active");
        waiting_confirm = false;
        if (did_win()) {
            current_text = sentence_loader.next_text();
            last_played_idx = 0;
            morse.typed_text = "";
            morse.force_update = true;
            audio.stop();
            unwin();
            focus_key();
        } else {
            win();
        }
    }
}

function unconfirm_reset() {
    reset_warning.classList.remove("active");
    waiting_confirm = false;
}

let button_play = document.getElementById("button-play-outer");
let button_stop = document.getElementById("button-stop-outer");
let button_next = document.getElementById("button-next-outer");

button_play.addEventListener("click", e => {
    unconfirm_reset();
    audio.init_user();
    play_current();
    focus_key();
});

button_stop.addEventListener("click", e => {
    unconfirm_reset();
    audio.init_user();
    audio.stop()
});

button_next.addEventListener("click", e => {
    new_sentence();
});

document.body.addEventListener("keydown", e => {
    audio.init_user();
    if (e.key == "Tab") {
        new_sentence();
        e.preventDefault();
    }
    if (e.key == "Escape") {
        unconfirm_reset();
        audio.stop();
    }
    if (e.key == " " && did_win()) {
        new_sentence();
        e.preventDefault();
    }
});

document.getElementById("key").addEventListener("click", e => {
    unconfirm_reset();
    audio.init_user();
    document.getElementById("text-inp").focus();
});

document.getElementById("text-inp").addEventListener("input", e => {
    unconfirm_reset();
    audio.init_user();
    e.target.value = e.target.value.toUpperCase();
});

document.getElementById("text-inp").addEventListener("keydown", e => {
    audio.init_user();
    if (e.key == " " || e.key == "Enter") {
        e.preventDefault();
        e.stopPropagation();

        if (current_mode === MODE_SENTENCE && !audio.is_playing && last_played_idx < current_text.text.length && !did_win() && e.target.value == "") {
            play_current();
            return;
        }

        let typed = e.target.value;
        e.target.value = "";

        if (did_win()) {
            waiting_confirm = true;
            new_sentence();
            return;
        }

        unconfirm_reset();

        morse.typed_text += typed + " ";
        cut_text();
        morse.force_update = true;

        if (current_mode === MODE_WORD) {
            play_current();
        }
    }
});

function on_audio_off() {
    console.log("done!");
    button_play.classList.add("active");
    button_stop.classList.remove("active");

    morse.force_update = true;
}

on_audio_off();

function play_current() {
    button_play.classList.remove("active");
    button_stop.classList.add("active");

    audio.off();

    if (current_mode === MODE_SENTENCE) {
        let remaining = current_text.text.slice(last_played_idx);
        audio.play(remaining);
    } else if (current_mode === MODE_WORD) {
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
}

function redact(text) {
    let redacted = "";
    for (let ch of text) {
        redacted += ch == " " ? " " : "?";
    }
    return redacted;
}

function cut_text() {
    if (current_text.text === null) {
        return
    }
    if (current_mode === MODE_WORD) {
        morse.typed_text += " ";
        for (let i = 0; i < morse.typed_text.length; i++) {
            if (morse.typed_text[i] != current_text.text[i]) {
                morse.typed_text = morse.typed_text.slice(0, i);
                typed = morse.typed_text;
                break;
            }
            if (i == current_text.text.length - 1) {
                win();
                return;
            }
        }
    } else {
        let units = distance(current_text.text, morse.typed_text.trim());
        if (units.length === 0) {
            console.error("No distance units?");
        }
        let last = units[units.length - 1];
        if (last.type !== "missing_end") {
            win();
        }
    }
}

function realize(ch) {
    if (ch === " ") {
        return "␣";
    }
    return ch;
}

// {
//    "done": bool,
//    "accuracy_current": float,
//    "accuracy_overall": float,
//    "missed": int,
//    "incorrect": int,
//    "extra": int,
// }
function stats() {
    let units = distance(current_text.text, morse.typed_text.trim());

    let n_correct_nonspace = 0;
    let n_nonspace = 0;
    let accuracy_current = null;

    let n_missed = 0;
    let n_incorrect = 0;
    let n_extra = 0;

    let done = true;

    for (let unit of units) {
        if (unit.type === "correct") {
            n_correct_nonspace++;
        }
        if (unit.type === "incorrect") {
            n_incorrect++;
        }
        if (unit.type === "extraneous") {
            n_extra++;
        }
        if (unit.type === "missing") {
            n_missed++;
        }
        if (unit.type === "missing_end") {
            accuracy_current = n_correct_nonspace / n_nonspace;
            done = false;
            n_nonspace = current_text.text.length;
            break;
        }
        n_nonspace++;
    }

    accuracy_overall = n_correct_nonspace / n_nonspace;

    if (accuracy_current === null) {
        accuracy_current = accuracy_overall;
    }

    return {
        "done": done,
        "accuracy_current": accuracy_current,
        "accuracy_overall": accuracy_overall,
        "missed": n_missed,
        "incorrect": n_incorrect,
        "extra": n_extra,
    };
}

function update_display(typed, typing, morse_spans, text) {
    // TODO: Handle line breaking? Can we group the letter-spans into word-spans/divs maybe?

    if (current_text === null) {
        // Does this ever happen?

        document.getElementById("author").innerText = "";
        document.getElementById("text").replaceChildren();
        document.getElementById("accuracy").innerText = "";
        return
    }

    if (current_text.author != null) {
        document.getElementById("author").innerText = "- " + current_text.author;
    } else {
        document.getElementById("author").innerText = "";
    }

    if (typed.length > 0) {
        let s = stats();
        let acc = Math.round(s.accuracy_current * 100);
        document.getElementById("accuracy").innerText = "(" + acc + "% accuracy so far)";
    } else {
        document.getElementById("accuracy").innerText = "";
    }

    let text_div = document.getElementById("text");

    let units = distance(current_text.text, did_win() ? typed.trim() : typed);
    let elements = [];
    for (let unit of units) {
        let el = document.createElement("span");
        el.classList.add("char");
        if (unit.type === "correct") {
            el.innerText = unit.char;
            el.classList.add("correct");
        } else if (unit.type === "missing") {
            el.innerText = realize(unit.char);
            el.classList.add("missing");
        } else if (unit.type === "extraneous") {
            el.innerText = realize(unit.char);
            el.classList.add("extraneous");
        } else if (unit.type === "incorrect") {
            el.innerText = realize(unit.typed);
            el.classList.add("incorrect");
            let corrected = document.createElement("span");
            corrected.classList.add("corrected");
            corrected.innerText = realize(unit.given);
            el.appendChild(corrected);
        } else if (unit.type === "missing_end") {
            let rest = current_text.text.slice(-unit.length);
            el.innerText = did_win() ? rest : redact(rest);
            el.classList.add("missing-end");
        } else if (unit.type === "extra_rest") {
            let rest = typed.slice(-unit.length);
            el.innerText = rest;
            el.classList.add("extra-rest"); // TODO: When would this happen? This should probably be the win condition
        }
        elements.push(el);
    }
    text_div.replaceChildren(...elements);
}
