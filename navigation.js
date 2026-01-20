window.feIntersectionId = 0;
window.foorietapid = null;
window.serverResponse = null;
window.cleanedResponse = null;

window.__SYSTEM_READY__ = false;

window.whenSystemReady = whenSystemReady;


function whenSystemReady(fn) {
  if (window.__SYSTEM_READY__) {
    fn();
    return;
  }

  const id = setInterval(() => {
    if (window.__SYSTEM_READY__) {
      clearInterval(id);
      fn();
    }
  }, 0);
}


document.addEventListener('DOMContentLoaded', function () {

  const img = document.getElementById("intersectionImg");
  const buttons = document.querySelectorAll("button[data-img]");

    buttons.forEach(btn => {
        btn.addEventListener("click", async () => {

            whenSystemReady(() => {
                if (typeof window.stopBlinkScheduler === "function") {
                    window.stopBlinkScheduler();
                }
            });

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

                window.__SYSTEM_READY__ = true;
                console.log("Core system ready");

            } catch (err) {
                console.error("Failed to load intersection data:", err);
            }
        });
    });
});