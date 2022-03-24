morse = new Morse(100, update_display);
bind_speed_input(morse, document.getElementById("speed"));

document.body.addEventListener("keydown", e => {
    if (e.key == " " && !event.repeat) {
        morse.press();
    }
    if (e.key == "Backspace") {
        morse.clear();
    }
});

document.body.addEventListener("keyup", e => {
    if (e.key == " ") {
        morse.release();
    }
});

function update_display(typed, typing, event_spans) {
    console.log({"typed": typed, "typing": typing, "event_spans": event_spans});
    let button = document.getElementById("button");
    let text = document.getElementById("text");

    button.replaceChildren(...event_spans);
    text.replaceChildren(span_with_class(typed, "type-bright"), span_with_class(typing, "type-highlight"), span_with_class("|", "type-dark"));

}

update_display();
setInterval(update_display, 0.010);
