function determineTemporalSpecialRules(nightStart, nightEnd) {
    let aeg = new Date(new Date().getTime() - nihe);
    let hours = aeg.getHours();

    if (hours >= 8 && hours < 21) {
        kiht1.style.display = "block";
        kiht2.style.display = "block";

    } else {
        kiht1.style.display = "none";
        kiht2.style.display = "none";
    }
}