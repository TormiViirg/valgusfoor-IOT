    document.addEventListener('DOMContentLoaded', function () {
        let feIntersectionId = 0;

        const img = document.getElementById("intersectionImg");
        const buttons = document.querySelectorAll("button[data-img]");

        buttons.forEach(btn => {
            btn.addEventListener("click", () => {

                const match = btn.id.match(/intersection(\d+)/);
                if (match) feIntersectionId = parseInt(match[1], 10);

                if (btn.dataset.img) img.src = btn.dataset.img;

                console.log('feIntersectionId =', feIntersectionId);
            });
        });
    });
