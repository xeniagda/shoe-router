const DIT = ".";
const DAH = "-";
const LETTER_SEPARATOR = "LET";
const WORD_SEPARATOR = "WORD";

const DITS_PER_WORD = 50; // paris

const TUNE = [
    0, 0, 0, 12, 7, 6, 5, 3, 0, 3, 5,
    -2, -2, 12, 7, 6, 5, 3, 0, 3, 5,
    -4, -4, 12, 7, 6, 5, 3, 0, 3, 5,
    -5, -5, 12, 7, 6, 5, 3, 0, 3, 5,
    3, 3, 3, 3, 3, 0, 0,
    3, 3, 3, 3, 5, 6, 5, 3, 0, 3, 5,
    3, 3, 3, 5, 7, 10, 10, 7,
    12, 12, 12, 7, 12, 10, 12+5
];

function event_span(ev) {
    let el = document.createElement("span");
    if (ev == DIT) {
        el.innerText = "·";
        el.classList.add("dot");
    } else if (ev == DAH) {
        el.innerText = "–";
        el.classList.add("dot");
    } else if (ev == LETTER_SEPARATOR) {
        el.innerText = "-";
        el.classList.add("space");
    } else if (ev == WORD_SEPARATOR) {
        el.innerText = "␣";
        el.classList.add("space");
    }
    return el;
}

function span_with_class(text, ...clss) {
    let el = document.createElement("span");

    el.innerText = text;

    for (let cls of clss)
        el.classList.add(cls);
    return el;
}

function get_letter(ev) {
    for (var i = 0; i < MORSE.length; i++) {
        let l = MORSE[i];
        if (l.length == 0)
            continue;
        let sequence = l[1];
        if (sequence.length != ev.length)
            continue;

        let bad = false;
        for (var j = 0; j < sequence.length; j++) {
            if ((sequence[j] == ".") != (ev[j] == DIT))
                bad = true;
        }
        if (!bad)
            return l[0];
    }
    return "?";
}

function get_word(events, use_real_spaces) {
    let letters = [];
    let current_letter = [];
    for (var i = 0; i < events.length; i++) {
        let current_ev = events[i];
        if (current_ev == DIT || current_ev == DAH) {
            current_letter.push(current_ev);
        } else if (current_ev == LETTER_SEPARATOR || current_ev == WORD_SEPARATOR) {
            letters.push(get_letter(current_letter));
            if (current_ev == WORD_SEPARATOR)
                letters.push(use_real_spaces ? " " : "␣");
            current_letter = [];
        }
    }
    return letters.join("");
}

// empty element = space in table
const MORSE = [
    ["A", ".-"],
    ["B", "-..."],
    ["C", "-.-."],
    ["D", "-.."],
    ["E", "."],
    ["F", "..-."],
    ["G", "--."],
    ["H", "...."],
    ["I", ".."],
    ["J", ".---"],
    ["K", "-.-"],
    ["L", ".-.."],
    ["M", "--"],
    ["N", "-."],
    ["O", "---"],
    ["P", ".--."],
    ["Q", "--.-"],
    ["R", ".-."],
    ["S", "..."],
    ["T", "-"],
    ["U", "..-"],
    ["V", "...-"],
    ["W", ".--"],
    ["X", "-..-"],
    ["Y", "-.--"],
    ["Z", "--.."],

    [],

    ["1", ".----"],
    ["2", "..---"],
    ["3", "...--"],
    ["4", "....-"],
    ["5", "....."],
    ["6", "-...."],
    ["7", "--..."],
    ["8", "---.."],
    ["9", "----."],
    ["0", "-----"],

    [],

    [".", ".-.-.-"],
    [",", "--..--"],
    ["?", "..--.."],
    ["!", "-.-.--"],
];

class Morse {
    // draw_callback(typed, typing, morse_spans, current_word)
    constructor(default_wpm, draw_callback) {
        this.draw_callback = draw_callback;

        this.last_press_start = null;
        this.last_press_end = null;
        this.events = [];

        this.typed_text = "";

        this.force_update = false;

        this.DIT_DURATION = 0;
        this.DAH_DURATION = 0;
        this.SYMBOL_SEP = 0;
        this.LETTER_SEP = 0;
        this.WORD_SEP = 0;

        this.set_speed_char(default_wpm);
        this.set_speed_word(default_wpm);

        let self = this;
        this.redraw_int = setInterval(() => self.redraw(), 10);

        this.last_displayed_events = null;
    }

    // All sets and gets are in wpm unless specified as other
    set_speed_char(wpm) {
        let dit_speed_s = 1 / (wpm / 60 * DITS_PER_WORD);

        this.DIT_DURATION = dit_speed_s;
        this.DAH_DURATION = 3 * dit_speed_s;
        this.SYMBOL_SEP = dit_speed_s;
    }

    set_speed_word(wpm) {
        let dit_speed_s = 1 / (wpm / 60 * DITS_PER_WORD);

        this.LETTER_SEP = 3 * dit_speed_s;
        this.WORD_SEP = 7 * dit_speed_s;
    }

    get_speed_char() {
        let wpm = (1 / this.DIT_DURATION) / DITS_PER_WORD * 60;
        return Math.round(wpm * 1000) / 1000;
    }

    get_speed_word() {
        let dit_word = this.WORD_SEP / 7;
        let wpm = (1 / dit_word) / DITS_PER_WORD * 60;
        // round because floating point inprecision
        return Math.round(wpm * 1000) / 1000;
    }

    // set_speeds_ms(dit_speed_ms) {
    //     this.DIT_DURATION = dit_speed_ms / 1000;
    //     this.DAH_DURATION = 3 * this.DIT_DURATION;
    //     this.SYMBOL_SEP = this.DIT_DURATION;
    //     this.LETTER_SEP = 3 * this.DIT_DURATION;
    //     this.WORD_SEP = 7 * this.DIT_DURATION;
    // }

    // set_speeds_wpm(wpm) {
    //     let s_per_dit = 1 / (wpm / 60 * DITS_PER_WORD);
    //     this.set_speeds_ms(1000 * s_per_dit);
    // }

    // get_dit_speed_ms() {
    //     return 0 | (this.DIT_DURATION * 1000);
    // }

    // get_dit_speed_wpm() {
    //     let wpm = (1 / this.DIT_DURATION) / DITS_PER_WORD * 60;

    //     return (0 | (10 * wpm)) / 10;
    // }

    get_space() {
        if (this.last_press_end == null) {
            return null;
        }
        let delta = (Date.now() - this.last_press_end) / 1000;
        if (delta > (this.WORD_SEP + this.LETTER_SEP) / 2) {
            return WORD_SEPARATOR;
        } else if (delta > (this.LETTER_SEP + this.SYMBOL_SEP) / 2) {
            return LETTER_SEPARATOR;
        }
        return null;
    }

    get_dot() {
        if (this.last_press_start == null) {
            return null;
        }
        let delta = (Date.now() - this.last_press_start) / 1000;
        if (delta > (this.DAH_DURATION + this.DIT_DURATION) / 2) {
            return DAH;
        } else {
            return DIT;
        }
    }

    push_word() {
        let word = get_word(this.events, true);
        this.typed_text += word;
        this.events = [];
    }

    press() {
        this.last_press_start = Date.now();

        let space = this.get_space();
        if (space != null)
            this.events.push(space);

        this.last_press_end = null;

        if (space == WORD_SEPARATOR) {
            this.push_word();
        }

        this.redraw();
    }

    submit_word() {
        let space = this.get_space();
        if (space != null)
            this.events.push(space);
        this.push_word();

        this.events = [];
        this.last_press_start = null;
        this.last_press_end = null;
    }

    release() {
        this.last_press_end = Date.now();

        let dot = this.get_dot();
        if (dot != null)
            this.events.push(dot);

        this.last_press_start = null;

        if (this.events.length == 0)
            this.last_press_end = null;

        this.redraw();
    }

    clear() {
        this.events = [];
        this.last_press_start = null;
        this.last_press_end = null;
        this.force_update = true;
    }

    clear_all() {
        this.typed_text = "";
        this.clear();
    }

    redraw() {
        let current_events = this.events.slice();

        let dot = this.get_dot();
        if (dot != null)
            current_events.push(dot);

        let space = this.get_space();
        if (space != null)
            current_events.push(space);

        if (!this.force_update && this.last_displayed_events != null && current_events.join(" ") == this.last_displayed_events.join(" "))
            return;
        this.force_update = false;
        this.last_displayed_events = current_events;


        let content = [];
        for (var i = 0; i < current_events.length; i++) {
            let thing = current_events[i];
            content.push(event_span(thing));
        }
        let current_word = get_word(current_events, false);

        this.draw_callback(this.typed_text, get_word(current_events, false), content, current_word);
    }
}

function bind_speed_input(morse, split_cb, wpm_inp, cwpm_inp, wwpm_inp) {
    if (localStorage.getItem("speed-char") != null && localStorage.getItem("speed-word")) {
        morse.set_speed_char(+localStorage.getItem("speed-char"));
        morse.set_speed_word(+localStorage.getItem("speed-word"));
    } else {
        morse.set_speed_char(+cwpm_inp.value);
        morse.set_speed_word(+wwpm_inp.value);
    }

    if (morse.get_speed_char() === morse.get_speed_word()) {
        wpm_inp.value = cwpm_inp.value = wwpm_inp.value = morse.get_speed_char();
        split_cb.checked = false;
    } else {
        split_cb.checked = true;
        cwpm_inp.value = morse.get_speed_char();
        wwpm_inp.value = morse.get_speed_word();
        wpm_inp.value = morse.get_speed_word(); // idk
    }

    function set_same() {
        morse.set_speed_char(+wpm_inp.value);
        morse.set_speed_word(+wpm_inp.value);

        localStorage.setItem("speed-char", +wpm_inp.value);
        localStorage.setItem("speed-word", +wpm_inp.value);
    }

    function set_split() {
        morse.set_speed_char(+cwpm_inp.value);
        morse.set_speed_word(+wwpm_inp.value);

        localStorage.setItem("speed-char", +cwpm_inp.value);
        localStorage.setItem("speed-word", +wwpm_inp.value);
    }

    wpm_inp.addEventListener("change", e => set_same());
    cwpm_inp.addEventListener("change", e => set_split());
    wwpm_inp.addEventListener("change", e => set_split());
    split_cb.addEventListener("change", e => {
        if (split_cb.checked) {
            set_split();
        } else {
            set_same();
        }
    });

}

function fill_morse_table(table, f) {
    let col_left = table.children[0];
    let children = [];
    for (var i = 0; i < MORSE.length / 2; i++) {
        if (MORSE[i].length == 0) {
            children.push(document.createElement("br"));
            continue;
        }
        let div = document.createElement("div");

        div.classList.add("morse-element");
        for (var j = 0; j < MORSE[i][1].length; j++)
            div.appendChild(event_span(MORSE[i][1][j]));

        div.appendChild(span_with_class(" " + MORSE[i][0]));

        children.push(div);

        if (f != undefined)
            f(div, MORSE[i]);
    }
    col_left.replaceChildren(...children);

    let col_right = table.children[2];
    children = [];
    for (; i < MORSE.length; i++) {
        if (MORSE[i].length == 0) {
            children.push(document.createElement("br"));
            continue;
        }
        let div = document.createElement("div");
        div.classList.add("morse-element");

        div.appendChild(span_with_class(MORSE[i][0] + " "));
        for (var j = 0; j < MORSE[i][1].length; j++)
            div.appendChild(event_span(MORSE[i][1][j]));


        children.push(div);

        if (f != undefined)
            f(div, MORSE[i]);
    }
    col_right.replaceChildren(...children);
}


const AudioContext = window.AudioContext || window.webkitAudioContext;

var HOLD_TIME = 0.03;
var RAMP_TIME = 0.012;

class MorseAudio {
    // lamp = document element to be given and ungiven .light class
    // may be undefined

    // as some browsers (firefox...) requires AudioContexts to be created
    // as a result of a "user action", we initially set audio_ctx to undefined.
    // Whenever a user action occurs, the controlling code should call the
    // init_user() method, which sets up the audio_ctx

    constructor(morse, lamp) {
        this.morse = morse;
        this.lamp = lamp;
        lamp.children[0].focus();

        this.audio_ctx = undefined;

        this._freq = 512;
        this.needs_freq_update = false;
        this._volume = 1;
        this.needs_volume_update = false;

        this.is_on = false;

        // Lists of functions
        this.on_play_ends = [];
        this.on_play_letters = [];

        this.playing = []; // [["on"|"off", "dit"|"dah"|"symb"|"let"|"word", idx]]
        this.is_playing = false;
        this.next_at = Date.now();

        let self = this;
        setInterval(() => self.tick(), 10);

        this.tune_enabled = false;
        this.tune_index = 0;
    }

    init_user() {
        if (this.audio_ctx !== undefined)
            return;

        this.audio_ctx = new AudioContext();

        this.base_osc = this.audio_ctx.createOscillator();
        this.base_osc.frequency.setValueAtTime(512, this.audio_ctx.currentTime);

        this.gain = this.audio_ctx.createGain();
        this.gain.gain.setValueAtTime(0, this.audio_ctx.currentTime);

        this.base_osc.connect(this.gain);
        this.gain.connect(this.audio_ctx.destination);
        this.base_osc.start();

        console.info("Audio initialized");

        if (this.is_on) {
            this.is_on = false;
            this.on();
        }
    }

    set_freq(freq_hz) {
        if (freq_hz === this._freq)
            return;
        this._freq = freq_hz;
        this.needs_freq_update = true;
    }

    set_volume(volume) {
        this._volume = volume / 100;
        if (this.is_on)
            this.on();
    }

    set_light_enabled(status) {
        if (status) {
            this.lamp_enabled = true;
        } else {
            this.lamp_enabled = false;
            if (this.lamp !== undefined)
                this.lamp.classList.remove("light");
        }
    }

    _freq_multiplier() {
        if (this.tune_enabled) {
            return Math.pow(2, TUNE[this.tune_index] / 12);
        } else {
            return 1;
        }
    }

    tick() {
        if (this.needs_freq_update && this.audio_ctx !== undefined) {
            this.base_osc.frequency.setValueAtTime(this._freq * this._freq_multiplier(), this.audio_ctx.currentTime);
            this.needs_freq_update = false;
        }
        if (this.next_at == null || Date.now() > this.next_at) {
            if (this.playing.length > 0) {
                let next = this.playing[0];
                this.playing = this.playing.slice(1);

                if (next[0] == "on")
                    this.on();
                else
                    this.off();

                let duration = null;
                if (next[1] == "dit")
                    duration = this.morse.DIT_DURATION;
                else if (next[1] == "dah")
                    duration = this.morse.DAH_DURATION;
                else if (next[1] == "symb")
                    duration = this.morse.SYMBOL_SEP;
                else if (next[1] == "let")
                    duration = this.morse.LETTER_SEP;
                else if (next[1] == "word")
                    duration = this.morse.WORD_SEP;

                if (duration == null) {
                    console.log(`Unknown duration for ${next}`);
                    return;
                }
                this.next_at = Date.now() + duration * 1000;
                for (let on_play_letter of this.on_play_letters)
                    on_play_letter(next[2]);
            } else {
                if (this.next_at != null) {
                    this.next_at = null;
                    this.off();

                    this.is_playing = false;
                    for (let on_play_end of this.on_play_ends)
                        on_play_end();
                }
            }
        }
    }

    play(text) {
        this.playing = [];
        let last_letter = false;
        for (var i = 0; i < text.length; i++) {
            let char_here = text[i];

            if (char_here == " " || char_here == "\n") {
                if (last_letter)
                    this.playing = this.playing.slice(0, this.playing.length-1); // remove last symbol separator
                this.playing.push(["off", "word", i]);
                last_letter = false;
            } else {
                let code = null;
                for (let m of MORSE) {
                    if (m.length == 0)
                        continue;
                    if (m[0] == char_here)
                        code = m[1];
                }
                if (code == null) {
                    console.warn(`unknown char ${char_here}`);
                    continue;
                }
                for (let ch of code) {
                    if (ch == DIT) {
                        this.playing.push(["on", "dit", i]);
                        this.playing.push(["off", "symb", i]);
                    } else {
                        this.playing.push(["on", "dah", i]);
                        this.playing.push(["off", "symb", i]);
                    }
                }
                // Remove last letter symbol separator
                this.playing = this.playing.slice(0, this.playing.length-1);
                this.playing.push(["off", "let", i]);
                last_letter = true;
            }
            this.is_playing = true;
        }
    }

    stop() {
        this.next_at = null;
        this.playing = [];
        this.off();

        this.is_playing = false;
        for (let on_play_end of this.on_play_ends)
            on_play_end();
    }

    on() {
        if (this.is_on)
            return;
        if (this.audio_ctx === undefined)
            return;
        this.gain.gain.setValueAtTime(0, this.audio_ctx.currentTime+HOLD_TIME);
        this.gain.gain.linearRampToValueAtTime(this._volume, this.audio_ctx.currentTime+HOLD_TIME+RAMP_TIME);
        if (this.lamp !== undefined && this.lamp_enabled)
            this.lamp.classList.add("light");

        this.is_on = true;

        if (this.tune_enabled) {
            this.tune_index += 1;
            this.tune_index %= TUNE.length;
            this.needs_freq_update = true;
        }
    }

    off() {
        if (!this.is_on)
            return;
        if (this.audio_ctx === undefined)
            return;
        this.gain.gain.setValueAtTime(this._volume, this.audio_ctx.currentTime+HOLD_TIME);
        this.gain.gain.linearRampToValueAtTime(0, this.audio_ctx.currentTime+HOLD_TIME+RAMP_TIME);
        if (this.lamp !== undefined)
            this.lamp.classList.remove("light");

        this.is_on = false;
    }
}

function bind_volume_input(audio, volume_inp) {
    if (localStorage.getItem("volume") != null) {
        audio.set_volume(+localStorage.getItem("volume"));
        volume_inp.value = localStorage.getItem("volume");
    } else {
        audio.set_volume(+volume_inp.value);
    }

    volume_inp.addEventListener("change", e => {
        audio.set_volume(+volume_inp.value);
        localStorage.setItem("volume", volume_inp.value);
    });
}

function bind_enable_light(audio, enable_light_checkbox) {
    if (localStorage.getItem("enable_light") != null) {
        audio.set_light_enabled(+localStorage.getItem("enable_light"));
        enable_light_checkbox.checked = localStorage.getItem("enable_light");
    } else {
        audio.set_light_enabled(0);
    }

    enable_light_checkbox.addEventListener("change", e => {
        audio.set_light_enabled(+enable_light_checkbox.checked);
        localStorage.setItem("enable_light", +enable_light_checkbox.checked);
    });
}

function bind_frequency_input(audio, freq_inp) {
    if (localStorage.getItem("freq") != null) {
        audio.set_freq(+localStorage.getItem("freq"));
        freq_inp.value = localStorage.getItem("freq");
    } else {
        audio.set_freq(+freq_inp.value);
    }

    freq_inp.addEventListener("change", e => {
        audio.set_freq(+freq_inp.value);
        localStorage.setItem("freq", freq_inp.value);
    });
}

class SelectionHandler {
    // play_start(text, start, end)
    // on_play_end()
    // on_play_letter(idx)
    constructor(audio, text_field, play_button, stop_button, on_play_start, on_play_end, on_play_letter) {
        this.audio = audio;

        this.text_field = text_field;
        this.play_button = play_button;
        this.stop_button = stop_button;


        this.on_play_start = on_play_start;
        this.on_play_end = on_play_end;
        this.on_play_letter = on_play_letter;

        this.selection_offset = null;

        let self = this;

        audio.on_play_ends.push(() => self.on_play_end());
        audio.on_play_letters.push((idx) => {
            self.on_play_letter(idx + self.selection_offset)
        });

        this.play_button.addEventListener("click", () => self.play());
        this.stop_button.addEventListener("click", () => self.stop());
        setInterval(() => self.check(), 10);

        this.last_selection = this.get_selection();
    }

    get_selection() {
        let sel = window.getSelection();

        let selected = true;
        if ((sel.focusNode == null) || (sel.anchorNode == null)) {
            selected = false;
        } else if (!sel.focusNode.parentElement.isEqualNode(this.text_field)) {
            selected = false;
        } else if (!sel.anchorNode.parentElement.isEqualNode(this.text_field))
            selected = false;
        else if (sel.toString().length == 0) {
            selected = false;
        }

        if (!selected)
            return null;

        let start = Math.min(sel.anchorOffset, sel.focusOffset);
        let end = Math.max(sel.anchorOffset, sel.focusOffset);

        return {"start": start, "end": end, "text": sel.toString()};
    }

    check() {
        let selection = this.get_selection();
        if (selection == null) {
            this.play_button.classList.remove("active");
            if (!this.play_button.contains(window.getSelection().focusNode)) {
                this.last_selection = null;
            }
        } else {
            this.play_button.classList.add("active");
            this.last_selection = selection;
        }
    }

    play() {
        if (this.last_selection == null)
            return;

        this.selection_offset = this.last_selection["start"];

        this.audio.play(this.last_selection["text"]);

        this.on_play_start(this.last_selection["text"], this.last_selection["start"], this.last_selection["end"]);

        this.last_selection = null;
        this.stop_button.classList.add("active");
    }

    stop() {
        this.audio.stop();
        this.stop_button.classList.remove("active");
    }
}

function hue2rgb(hue) {
    let theta = 2 * Math.PI * hue;
    let r = Math.cos(theta);
    let g = Math.cos(theta + 2 * Math.PI / 3);
    let b = Math.cos(theta + 2 * 2 * Math.PI / 3);
    return [(r + 1) / 2, (g + 1) / 2, (b + 1) / 2];
}

class Fireworks {
    constructor(canvas_element) {
        this.canvas_element = canvas_element;
        this.ctx = this.canvas_element.getContext("2d");

        let self = this;

        this.particles = [];
        for (let i = 0; i < 5; i++) {
            let x = Math.random() * this.canvas_element.offsetWidth;
            let y = Math.random() * this.canvas_element.offsetHeight;

            this.particles.push([x, y, (Math.random() - 0.5) * 50, -50, Math.random(), 2, 0.2 + 0.5 * Math.random()]);
        }
        this.gravity = 100;
        this.dt = 0.01;
        this.render_internal = setInterval(() => self.render(), this.dt * 1000);
    }

    render() {
        this.canvas_element.width = this.canvas_element.offsetWidth;
        this.canvas_element.height = this.canvas_element.offsetHeight;

        this.ctx.clearRect(0, 0, this.canvas_element.width, this.canvas_element.height);

        let new_particles = [];
        for (let particle of this.particles) {
            let x = particle[0];
            let y = particle[1];
            let vx = particle[2];
            let vy = particle[3];
            let hue = particle[4];
            let count = particle[5];
            let timeLeft = particle[6];

            x += vx * this.dt;
            y += vy * this.dt;
            vy += this.gravity * this.dt;

            timeLeft -= this.dt;

            this.ctx.lineWidth = 2;

            let [r, g, b] = hue2rgb(particle[4]);
            this.ctx.beginPath();
            this.ctx.strokeStyle = `rgb(${256*r}, ${256*g}, ${256*b})`;
            this.ctx.lineWidth = 1.5 * count + 2;
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + vx * 0.1 * (count + 1), y + vy * 0.1 * (count + 1));
            this.ctx.stroke();

            particle[0] = x;
            particle[1] = y;
            particle[2] = vx;
            particle[3] = vy;
            particle[4] = hue;
            particle[5] = count;
            particle[6] = timeLeft;
            if (timeLeft > 0) {
                if (x > 0 && x < this.canvas_element.width && y > 0 && y < this.canvas_element.height)
                    new_particles.push(particle);
            } else if (count > 0) {
                for (let i = 0; i < 20;  i++) {
                    let u = Math.random();
                    let v = Math.random();

                    let z1 = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
                    let z2 = Math.sqrt(-2 * Math.log(u)) * Math.sin(2 * Math.PI * v);

                    let child_hue = hue + Math.random() / 5;

                    this.particles.push([x, y, z1 * 40, z2 * 40, child_hue, count - 1, Math.random()]);
                }
            }
        }
        this.particles = new_particles;

        if (this.particles.length == 0) {
            this.destroy();
        }
    }

    destroy() {
        this.canvas_element.remove();
        clearInterval(this.render_internal);
    }
}

function make_fireworks() {
    let fireworks_element = document.createElement("canvas");
    fireworks_element.classList.add("fireworks");

    document.getElementById("main-split").append(fireworks_element);

    return new Fireworks(fireworks_element);
}

// shamelessly stolen from https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript#comment111181647_8831937
function strhash(st) {
    return Array.from(st).reduce((hash, char) => 0 | (31 * hash + char.charCodeAt(0)), 0);
}

const PRESETS = [
    {"id": "quotes", "name": "Quotes",      "type": "quotes"},
    // {"id": "hamgen", "name": "Fake ham",    "type": "hamgen"},
    null,
    {"id": "k10",    "name":  "Koch 10%",   "type": "markov", "subset": "KMRS"},
    {"id": "k20",    "name":  "Koch 20%",   "type": "markov", "subset": "KMRSAUPT"},
    {"id": "k30",    "name":  "Koch 30%",   "type": "markov", "subset": "KMRSAUPTLOWI"},
    {"id": "k40",    "name":  "Koch 40%",   "type": "markov", "subset": "KMRSAUPTLOWI.NJE"},
    {"id": "k50",    "name":  "Koch 50%",   "type": "markov", "subset": "KMRSAUPTLOWI.NJEF0YV"},
    {"id": "k60",    "name":  "Koch 60%",   "type": "markov", "subset": "KMRSAUPTLOWI.NJEF0YV,G5Q"},
    {"id": "k70",    "name":  "Koch 70%",   "type": "markov", "subset": "KMRSAUPTLOWI.NJEF0YV,G5Q9ZH3"},
    {"id": "k80",    "name":  "Koch 80%",   "type": "markov", "subset": "KMRSAUPTLOWI.NJEF0YV,G5Q9ZH38B42"},
    {"id": "k90",    "name":  "Koch 90%",   "type": "markov", "subset": "KMRSAUPTLOWI.NJEF0YV,G5Q9ZH38B427C1D"},
    {"id": "k100",   "name": "Koch 100%",   "type": "markov", "subset": "KMRSAUPTLOWI.NJEF0YV,G5Q9ZH38B427C1D6X?!"},
    null,
    {"id": "vow",    "name": "Vowels",      "type": "markov", "subset": "AOEUIY"},
    {"id": "cons",   "name": "Consonants",  "type": "markov", "subset": "PFGCRLDHTNSQJKXBMWVZ"},
    {"id": "nums",   "name": "Numbers",     "type": "markov", "subset": "0123456789"},
    {"id": "punct",  "name": "Punctuation", "type": "markov", "subset": ",.!?"},
    null,
    {"id": "a",      "name": "A's (·–)",    "type": "markov", "subset": "AJLPRW"},
    {"id": "i",      "name": "I's (··)",    "type": "markov", "subset": "FHISUV"},
    {"id": "i",      "name": "N's (–·)",    "type": "markov", "subset": "BCDKNXY"},
    {"id": "i",      "name": "M's (––)",    "type": "markov", "subset": "MOGQZ"},
];

class TextGenerator {
    async load_resources() { throw "Abstract method called" }

    // for result screen. returns string
    describe() { throw "Abstract method called" }

    // for history
    describe_short() { throw "Abstract method called" }

    // reteurns bool
    is_loaded() { throw "Abstract method called" }

    // returns {"text": "...", "author": <optional>}
    next_text() { throw "Abstract method called" }

    // argument text is what next_text returned
    // may return dict of attributes about the text to show after completion
    // might not be called after every next_text
    text_completed(sentence) { throw "Abstract method called" }

    // Called every "action" with a div below the mode selector
    // Element might contain previous content
    render_sidebar(sidebar) { throw "Abstract method called" }

    // Called when preset is loaded or from localStorage
    set_data(data) { throw "Abstract method called" }

    // set_data(get_data()) should not change the state meaningfully
    // should contain {"type": "..."}
    get_data() { throw "Abstract method called" }
}

class HamGen {
    async load_resources() { }
    describe() { return "HamGen"; }
    describe_short() { return "HamGen"; }
    is_loaded() { return true; }
    next_text() { return {"text": "73 DE SA6NYA"}; }
    text_completed(sentence) { }
    render_sidebar(sidebar) {
        sidebar.innerText = "mjau";
    }
    set_data(data) {}
    get_data(data) { return {"type": "hamgen"}; }
}

function normalized(arr) {
    let total = 0;
    for (let item of arr)
        total += item;
    return arr.map(x => x / total);
}

// Gives an index into the array
function weighted_pick(arr, noise) {
    if (Math.random() < noise) {
        return 0 | (Math.random() * arr.length);
    }
    arr = normalized(arr);
    let x = Math.random();
    for (let i = 0; i < arr.length; i++) {
        x -= arr[i];
        if (x < 0)
            return i;
    }
    console.log("OH NO");
    return arr.length - 1;
}

const MINIMUM_MARKOV_LENGTH = 30;
class MarkovGenerator extends TextGenerator {
    constructor() {
        super();
        this.min_word_len = 2;
        this.max_word_len = 5;
        this.noise = 0.5;

        this.symbols = [];
        this.forward = [];
        this.backward = [];
        this.initial = [];

        // Invariant: must always contain space
        this.subset = []; // contains numbers indexing this.symbols

        this.loaded = false;
    }

    describe() {
        let self = this;
        let letters = [...Array(this.subset.length).keys()].filter(l => !self._terminates(l));
        return "Koch " + this.symbolize(letters);
    }

    describe_short() {
        let count_percent = (this.subset.length - 1) / 40; // -1 = remove space, 40 = length of full
        return "Koch " + (0 | count_percent * 100) + "%";
    }

    get_subset(arr) {
        return this.subset.map(i => arr[i]);
    }

    async load_resources() {
        let self = this;

        await fetch("data/markov.json", {
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
        }).then(data =>
            data.json()
        ).then(data => {
            self.symbols = data["symbols"];
            self.forward = data["forward"];
            self.backward = data["backward"];
            self.initial = data["initial"];

            self.subset = [self.symbols.indexOf(" ")];
            self.is_loaded = true;
        });
    }

    is_loaded() { return this.is_loaded; }

    toggle(letter) {
        if (!this.symbols.includes(letter))
            return;

        let idx = this.symbols.indexOf(letter);
        if (this.subset.includes(idx)) {
            this.subset = this.subset.filter(a => a != idx);
        } else {
            this.subset.push(idx);
        }
    }

    has_letter(l) {
        return this.get_subset(this.symbols).includes(l);
    }

    is_on() {
        return this.subset.length > 1;
    }

    _terminates(i) {
        return this.symbols[this.subset[i]] == " ";
    }

    _generate_letter() {
        for (let i = 0; i < 10; i++) {
            let init = this.get_subset(this.initial);
            let letter = weighted_pick(init, this.noise);
            if (this._terminates(letter))
                continue;
            return letter;
        }
        return 0;
    }

    _generate_word(containing_letter) {
        while (true) {
            let after = [];
            let last_ch = containing_letter;
            for (let i = 0; i < 10; i++) {
                let weights = this.get_subset(this.get_subset(this.forward)[last_ch]);
                let pick = weighted_pick(weights, this.noise);
                if (this._terminates(pick))
                    break;

                after.push(pick);
                last_ch = pick;
            }

            let before = [];
            last_ch = containing_letter;
            for (let i = 0; i < 10; i++) {
                let weights = this.get_subset(this.get_subset(this.backward)[last_ch]);
                let pick = weighted_pick(weights, this.noise);
                if (this._terminates(pick))
                    break;

                before.push(pick);
                last_ch = pick;
            }
            let pick = before.reverse().concat([containing_letter]).concat(after);
            if (pick.length >= this.min_word_len && pick.length <= this.max_word_len) {
                return pick;
            }
        }
    }

    _generate_text() {
        let self = this;

        let text = [];

        let letters = [...Array(this.subset.length).keys()].filter(l => !self._terminates(l));

        let letters_left = [...letters];

        while (letters_left.length > 0) {
            let idx = 0 | (Math.random() * letters_left.length);
            let letter = letters_left[idx];
            let w = this._generate_word(letter);

            letters_left = letters_left.filter(l => !w.includes(l));
            text.push(...w);
            text.push(this.get_subset(this.symbols).indexOf(" "));
        }

        while (text.length < MINIMUM_MARKOV_LENGTH) {
            let idx = 0 | (Math.random() * letters.length);
            let letter = letters[idx];
            let w = this._generate_word(idx);

            text.push(...w);
            text.push(this.get_subset(this.symbols).indexOf(" "));
        }

        return text.slice(0, text.length - 1);
    }

    symbolize(seq) {
        let self = this;
        return seq.map(a => this.symbols[this.subset[a]]).join("");
    }

    matches(subset) {
        let subset_sorted = new Array(...subset).sort();
        let me = this.get_subset(this.symbols).filter(x => x != " ").slice().sort();
        return subset_sorted.join("") == me.join("");
    }

    next_text() {
        return {"text": this.symbolize(this._generate_text())};
    }

    set_data(data) {
        this.subset = new Array(...data["subset"]).map(x => this.symbols.indexOf(x));
        this.subset.push(this.symbols.indexOf(" "));
    }

    get_data() {
        let subset = new Array(...this.subset).map(x => this.symbols[x]).filter(x => x != " ").join("");
        return {"type": "markov", "subset": subset};
    }

    text_completed(text_obj) {}

    render_sidebar(sidebar) {
        let table = document.createElement("div");
        table.id = "morse-table";

        let col_left = document.createElement("div");
        col_left.id = "col-left";
        col_left.classList.add("morse-col");

        let col_mid = document.createElement("div");
        col_mid.id = "col-mid";

        let col_right = document.createElement("div");
        col_right.id = "col-right";
        col_right.classList.add("morse-col");

        table.replaceChildren(col_left, col_mid, col_right);
        sidebar.replaceChildren(table);

        let self = this;
        fill_morse_table(table, (el, morse_data) => {
            let [letter, _] = morse_data;
            let idx = this.symbols.indexOf(letter);

            if (self.subset.indexOf(idx) === -1) {
                el.classList.add("morse-inactive");
            }

            el.addEventListener("click", _ => {
                self.toggle(letter);
                self.render_sidebar(sidebar); // Maybe we should just toggle the class? This seems easier to guarantee to stay in sync
            });
        });
    }
}


class QuoteLoader extends TextGenerator {
    constructor() {
        super();
        this.quotes = [];
    }

    describe() {
        return "Quote";
    }

    describe_short() {
        return "Quote";
    }

    _set_completed(completed_hashes) {
        localStorage.setItem("completed-quotes", JSON.stringify(completed_hashes));
    }

    _get_completed() {
        try {
            let completed = JSON.parse(localStorage.getItem("completed-quotes"));
            if (completed === null) {
                this._set_completed([]);
                return [];
            }
            return completed;
        } catch (SyntaxError) {
            this._set_completed([]);
            return [];
        }
    }

    get_available_quotes() {
        let available_quotes = [];

        let hashes = this._get_completed();
        for (let quote of this.quotes) {
            let hash = strhash(quote["quote"]);
            if (hashes.indexOf(hash) === -1) {
                available_quotes.push(quote);
            }
        }

        return available_quotes;
    }

    async load_resources() {
        let self = this;

        await fetch("data/quotes.json", {
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
        }).then(data =>
            data.json()
        ).then(data => {
            self.quotes = data;
        });
    }

    next_text() {
        let available = this.get_available_quotes();
        if (available.length == 0) {
            // TODO: Alert user!
            this._set_completed([]);
            available = this.quotes;
        }

        let quote = available[0|Math.random()*available.length];
        return {"text": quote["quote"], "author": quote["author"]};
    }

    text_completed(text_obj) {
        let hashes = this._get_completed();
        hashes.push(strhash(text_obj["text"]));
        this._set_completed(hashes);
    }

    render_sidebar(sidebar) {
        let span = document.createElement("span");
        let n_quotes = this.quotes.length;
        let n_completed = this._get_completed().length;
        span.innerText = `Completed ${n_completed}/${n_quotes} quotes`;

        let real = document.createElement("span");
        real.innerText = "[None of the quotes presented here are real]";

        let table = document.createElement("div");
        table.id = "morse-table";

        let col_left = document.createElement("div");
        col_left.id = "col-left";
        col_left.classList.add("morse-col");

        let col_mid = document.createElement("div");
        col_mid.id = "col-mid";

        let col_right = document.createElement("div");
        col_right.id = "col-right";
        col_right.classList.add("morse-col");

        table.replaceChildren(col_left, col_mid, col_right);

        fill_morse_table(table, (el, morse_data) => {});

        sidebar.replaceChildren(span, table, document.createElement("br"), real);

    }

    set_data(data) {}

    get_data() { return { "type": "quotes" } }
}

class SentenceLoader {
    constructor(sentence_config_el) {
        this.sentence_config_el = sentence_config_el;

        // Are set in create_sidebar
        this.preset_selector_el = null;
        this.generator_sidebar = null;

        this.current_generator = null;

        this.sentence_up_to_date = true;
    }

    current_data() {
        if (this.current_generator === null) {
            let data = localStorage.getItem("sentence-loader-data");
            if (data !== null) {
                data = JSON.parse(data);
            } else {
                data = PRESETS[0];
            }
            return data;
        } else {
            return this.current_generator.get_data();
        }
    }

    create_sidebar() {
        this.preset_selector_el = document.createElement("select");

        let children = [];

        let found_match = false;

        this.assert_generator();
        let current_data = this.current_generator.get_data();
        for (let preset of PRESETS) {
            if (preset == null) {
                let brk = document.createElement("option");
                brk.disabled = true;
                brk.innerText = "—";
                children.push(brk);
                continue;
            }

            let option = document.createElement("option");
            option.value = preset["id"];
            option.innerText = preset["name"];

            let matches = true;
            for (let property of Object.getOwnPropertyNames(current_data)) {
                if (JSON.stringify(current_data[property]) !== JSON.stringify(preset[property])) {
                    matches = false;
                }
            }

            if (matches) {
                found_match = true;
                option.selected = true;
            }

            children.push(option);
        }
        if (!found_match) {
            let brk = document.createElement("option");
            brk.disabled = true;
            brk.innerText = "Custom";
            brk.selected = true;
            children.push(brk);
        }
        this.preset_selector_el.replaceChildren(...children);

        let self = this;
        this.preset_selector_el.addEventListener("change", e => {
            let chosen = e.target.value;
            for (let preset of PRESETS) {
                if (preset == null)
                    continue;

                if (preset["id"] == chosen) {
                    self.set_data(preset);
                    return;
                }
            }
            console.log("unknown value??");
            console.log(chosen);
        });

        this.generator_sidebar = document.createElement("div");

        this.sentence_config_el.replaceChildren(this.preset_selector_el, this.generator_sidebar);
    }

    async load_from_localstorage() {
        let data = PRESETS[0];

        let blob = localStorage.getItem("sentence-loader-data");
        if (blob !== null) {
            data = JSON.parse(blob);
        }

        await this.set_data(data).then(() => {
            this.create_sidebar();
            this.redraw();
        });
    }

    async set_data(data) {
        if (data["type"] === "quotes") {
            this.current_generator = new QuoteLoader();
        } else if (data["type"] === "markov") {
            this.current_generator = new MarkovGenerator();
        } else if (data["type"] === "hamgen") {
            this.current_generator = new HamGen();
        } else {
            console.log("No such type " + data["type"]);
            return;
        }

        this.sentence_up_to_date = false;

        localStorage.setItem("sentence-loader-data", JSON.stringify(data));

        await this.current_generator.load_resources();
        this.current_generator.set_data(data);

        if (this.generator_sidebar !== null)
            this.redraw();
    }

    assert_generator() {
        if (this.current_generator == null) {
            throw "SentenceLoader function called before initialization. Please call this.load(state)/this.load_from_localstorage()";
        }
    }

    redraw() {
        this.assert_generator();
        this.current_generator.render_sidebar(this.generator_sidebar);
        if (!this.sentence_up_to_date) {
            this.generator_sidebar.appendChild(document.createElement("br"));

            let note = document.createElement("span");
            note.classList.add("warning");
            note.innerText = "Current sentence is from previous mode.\nGenerate a new sentence with <Tab>."
            this.generator_sidebar.appendChild(note);
        }
    }

    completed(text) {
        this.current_generator.text_completed(text);
        this.redraw();
    }

    next_text() {
        this.sentence_up_to_date = true;
        this.redraw();
        return this.current_generator.next_text();
    }
}
