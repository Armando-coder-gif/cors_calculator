document.addEventListener("DOMContentLoaded", () => {

    const stepperElement = document.querySelector("#stepper");

    if (!stepperElement) {
        return;
    }

    window.stepper = new Stepper(stepperElement);

    document.querySelectorAll(".next").forEach(btn => {
        btn.addEventListener("click", () => {
            window.stepper.next();
        });
    });

    document.querySelectorAll(".previous").forEach(btn => {
        btn.addEventListener("click", () => {
            window.stepper.previous();
        });
    });

});
