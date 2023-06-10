// distance(given, typed) returns a list, where each element can either be a correctly typed char, incorrectly typed char, extra char or missing char

const MAX_DISTANCE = 10; // hopefully the user isn't too bad

// TODO: Ignore / handle spaces?

function distance(given, typed) {
    let lev_table = Array(given.length + 1).fill(Array(typed.length + 1).fill(-1)).map(a => a.slice());
    let edit_table = Array(given.length + 1).fill(Array(typed.length + 1).fill(null)).map(a => a.slice());
    // lev_table[i][j] = edit distance from given[i:] to typed[j:]
    function distance_fill(i, j) {
        let bail = Math.abs(i - j) > MAX_DISTANCE;
        if (i > given.length || j > typed.length) {
            return null;
        }
        if (lev_table[i][j] !== -1) {
            return edit_table[i][j].slice();
        }
        let result = +"Infinity";
        let edits = [];
        let optimal = false;

        if (i == given.length) {
            result = typed.length - j;
            if (result > 0) {
                edits = [{"type": "extra_rest", "length": result}];
            }
        } else if (j === typed.length) {
            result = 0.1 * (given.length - i);
            if (result > 0) {
                edits = [{"type": "missing_end", "length": given.length - i}];
            }
        } else {
            if (i < given.length && j < typed.length) {
                let edits_ = distance_fill(i + 1, j + 1);
                let result_ = lev_table[i + 1][j + 1];
                if (given[i] === typed[j]) {
                    edits_.unshift({"type": "correct", "char": given[i]});
                    optimal = true;
                } else {
                    edits_.unshift({"type": "incorrect", "given": given[i], "typed": typed[j]});
                    result_++;
                }
                if (result_ < result) {
                    result = result_;
                    edits = edits_;
                }
            }
            if (j < typed.length && !optimal && !bail) {
                let edits_ = distance_fill(i, j + 1);
                let result_ = 1 + lev_table[i][j + 1];
                edits_.unshift({"type": "extraneous", "char": typed[j]});
                if (result_ < result) {
                    result = result_;
                    edits = edits_;
                }
            }
            if (i < given.length && !optimal && !bail) {
                let edits_ = distance_fill(i + 1, j);
                let result_ = 1 + lev_table[i + 1][j];
                edits_.unshift({"type": "missing", "char": given[i]});
                if (result_ < result) {
                    result = result_;
                    edits = edits_;
                }
            }
        }

        lev_table[i][j] = result;
        edit_table[i][j] = edits;
        return edits.slice();
    }

    let edits = distance_fill(0, 0);
    return edits;
}
