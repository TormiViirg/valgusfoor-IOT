window.feIntersectionId = 0;
window.foorietapid = null;
window.serverResponse = null;
window.cleanedResponse = null;

document.addEventListener('DOMContentLoaded', function () {

  const img = document.getElementById("intersectionImg");
  const buttons = document.querySelectorAll("button[data-img]");

  buttons.forEach(btn => {
    btn.addEventListener("click", async () => {

        //stopBlinkScheduler();
        const match = btn.id.match(/intersection(\d+)/);
        if (match) window.feIntersectionId = parseInt(match[1], 10);

        if (btn.dataset.img) img.src = btn.dataset.img;

        console.log('feIntersectionId =', window.feIntersectionId);

        try {
            const { response, cleanedResponse } = await read(window.feIntersectionId);

            window.serverResponse = response;
            window.cleanedResponse = cleanedResponse;

            updateGridAreasCSSVar(cleanedResponse);
            window.foorietapid = buildFooriEtapidFromBackend(cleanedResponse);
            updateIntersectionStateMachine(cleanedResponse);

        } catch (err) {
            console.error("Failed to load intersection data:", err);
        }
    });
  });
});