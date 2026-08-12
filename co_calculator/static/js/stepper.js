document.addEventListener("DOMContentLoaded", () => {

    const stepperElement = document.querySelector("#stepper");

    if (!stepperElement) {
        return;
    }

    window.stepper = new Stepper(stepperElement);

    const content = stepperElement.querySelector(".bs-stepper-content");

    stepperElement.addEventListener("shown.bs-stepper", () => {
        if (content) content.scrollTop = 0;
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
