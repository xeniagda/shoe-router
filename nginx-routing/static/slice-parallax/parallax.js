document.getElementById("perspective-amount").onchange = e => {
    console.log(e.target.value);
    document.body.style.setProperty("--depth", Math.exp(e.target.value));
};
