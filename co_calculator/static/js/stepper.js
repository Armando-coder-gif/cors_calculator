document.addEventListener("DOMContentLoaded", () => {
    const stepperElement = document.querySelector("#stepper");

    if (!stepperElement) {
        return;
    }

    window.stepper = new Stepper(stepperElement);

    const content = stepperElement.querySelector(".bs-stepper-content");

    // Se dispara CADA VEZ que cambia el paso
    stepperElement.addEventListener("shown.bs-stepper", () => {
        if (content) content.scrollTop = 0;

        // 1. Notificar a Astro que suba el scroll de la página principal
        window.parent.postMessage({ action: "scrollToCalculator" }, "*");

        // 2. Notificar la nueva altura porque cada paso tiene un tamaño distinto
        setTimeout(() => {
            const height = document.documentElement.scrollHeight || document.body.scrollHeight;
            window.parent.postMessage({ frameHeight: height + 20 }, "*");
        }, 50);

        document.querySelectorAll(".form-check-input[role='switch']").forEach(sw => {
            sw.checked = false;
            sw.dispatchEvent(new Event("change"));
        });
    });

    document.querySelectorAll(".next").forEach(btn => {
        btn.addEventListener("click", () => {
            window.stepper.next();
        });
    });

    const acceptTerms = document.getElementById("acceptTerms");
    const nextToCalcBtn = document.getElementById("nextToCalcBtn");
    if (acceptTerms && nextToCalcBtn) {
        acceptTerms.addEventListener("change", () => {
            nextToCalcBtn.disabled = !acceptTerms.checked;
        });
    }

    document.querySelectorAll(".previous").forEach(btn => {
        btn.addEventListener("click", () => {
            window.stepper.previous();
        });
    });
});