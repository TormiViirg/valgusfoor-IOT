window.feIntersectionId = 0;

document.addEventListener('DOMContentLoaded', function () {

    const img = document.getElementById("intersectionImg");
    const buttons = document.querySelectorAll("button[data-img]");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {

            const match = btn.id.match(/intersection(\d+)/);
            if (match) window.feIntersectionId = parseInt(match[1], 10);

            if (btn.dataset.img) img.src = btn.dataset.img;

            console.log('feIntersectionId =', window.feIntersectionId);

            read(window.feIntersectionId).then(returnData => {
                if (returnData?.data) updateGridAreasCSSVar(returnData.data);
            });
        });
    });
});
