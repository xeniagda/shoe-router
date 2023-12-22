
// items in the form
// {
//   "complete": bool,
//   "accuracy": float,
//   "missed": int,
//   "incorrect": int,
//   "extra": int,
//   "name_short": str,
//   "name_long": str,
// }
class SessionHistory {
    constructor() {
        if (window.localStorage.getItem("session-history")) {
            let session_history_enc = window.localStorage.getItem("session-history");
            this.session_history = JSON.parse(atob(session_history_enc)) || [];
        } else {
            this.session_history = [];
        }
    }

    bind_reset_button(el) {
        let self = this;
        el.addEventListener("click", e => {
            if (!confirm("Reset history?"))
                return;
            this.session_history = [];
            this.commit(); this.render();
        });
    }

    commit() {
        window.localStorage.setItem("session-history", btoa(JSON.stringify(this.session_history)));
    }

    add_commit_and_rerender(entry) {
        this.session_history.push(entry);
        this.commit();
        this.render();
    }

    render() {
        let list = document.getElementById("history-list");
        let new_children = [];

        let idx_width_wanted = ("" + (this.session_history.length + 1)).length;

        let n_complete = 0;

        for (let index = 0; index < this.session_history.length; index++) {
            let item = this.session_history[index];

            if (item.complete)
                n_complete++;

            let attempt = document.createElement("div");
            attempt.classList.add("history-attempt");
            if (!item.complete)
                attempt.classList.add("fail");

            let history_idx = document.createElement("span");
            history_idx.classList.add("history-idx");
            history_idx.innerText = " ".repeat(idx_width_wanted - ("" + (index + 1)).length) + (index + 1) + ": ";
            attempt.appendChild(history_idx);

            let history_accuracy = document.createElement("span");
            history_accuracy.classList.add("history-accuracy");
            history_accuracy.innerText = (0 | item.accuracy * 100) + "%";
            if (!item.complete)
                history_accuracy.innerText = "DNF (" + history_accuracy.innerText + ")";
            history_accuracy.setAttribute("data-exact", ((0 | item.accuracy * 10000) / 100) + "%");
            attempt.appendChild(history_accuracy);

            attempt.appendChild(document.createTextNode(" "));

            let history_missed = document.createElement("span");
            history_missed.classList.add("history-missed");
            history_missed.innerText = "-" + item.missed;
            attempt.appendChild(history_missed);

            attempt.appendChild(document.createTextNode("/"));

            let history_incorrect = document.createElement("span");
            history_incorrect.classList.add("history-incorrect");
            history_incorrect.innerText = "?" + item.incorrect;
            attempt.appendChild(history_incorrect);

            attempt.appendChild(document.createTextNode("/"));

            let history_additional = document.createElement("span");
            history_additional.classList.add("history-additional");
            history_additional.innerText = "+" + item.extra;
            attempt.appendChild(history_additional);

            attempt.appendChild(document.createTextNode(" "));

            let history_name = document.createElement("span");
            history_name.classList.add("history-name");
            history_name.innerText = item.name_short;
            history_name.setAttribute("data-long", item.name_long);
            attempt.appendChild(history_name);

            new_children.unshift(attempt);
        }

        list.replaceChildren(...new_children);
        document.getElementById("history-count-success").innerText = n_complete + 1;
        document.getElementById("history-count-total").innerText = this.session_history.length + 1;

    }
}
