document.addEventListener("DOMContentLoaded", () => {

    const calculateBtn = document.getElementById("calculateBtn");

    if (!calculateBtn) return;

    calculateBtn.addEventListener("click", calculate);

});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

async function calculate() {

    try {

        const crop = document.getElementById("cropType").value;
        const tons = document.getElementById("tons").value;
        const hectares = document.getElementById("hectares").value;

        if (!crop || !tons || !hectares) {

            alert("Todos los campos son obligatorios.");

            return;

        }

        const formData = new FormData();

        formData.append("crop", crop);
        formData.append("tons", tons);
        formData.append("hectares", hectares);

        const response = await fetch("/calculate/", {

            method: "POST",

            headers: {

                "X-CSRFToken": getCookie("csrftoken")

            },

            body: formData

        });

        if (!response.ok) {

            throw new Error("Error al calcular.");

        }

        const result = await response.json();

        renderResults(result);

        window.stepper.next();

    }
    catch (error) {

        console.error(error);

        alert(error.message);

    }

}
function renderResults(result) {

    const calc = result.calculations;
    const hectares = result.inputs.hectares;

    document.getElementById("moneyLeft").textContent =
        `$${calc.corcs_value.toLocaleString()} USD/Año`;

    document.getElementById("hectaresResult").textContent =
        `${hectares} Ha`;

    document.getElementById("co2Removed").textContent =
        `${calc.co2_removed} tCO₂e`;

    renderFomoChart(calc);

}

let fomoChartInstance = null;

function renderFomoChart(calculations) {

    const ctx = document.getElementById("fomoChart").getContext("2d");

    if (fomoChartInstance) {
        fomoChartInstance.destroy();
    }

    const corcsValue = calculations.corcs_value;
    const agroCost = calculations.agrocognitive_cost;
    const netGain = corcsValue - agroCost;

    fomoChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Ingresos Por Créditos De Carbono", "Servicio AgroCognitive", "Ganancia Neta"],
            datasets: [{
                label: "$",
                data: [corcsValue, agroCost, netGain],
                backgroundColor: [
                    "rgba(108, 117, 125, 0.6)",
                    "rgba(156, 203, 59, 0.5)",
                    "rgba(123, 174, 34, 0.7)"
                ],
                borderColor: [
                    "rgba(108, 117, 125, 1)",
                    "rgba(156, 203, 59, 1)",
                    "rgba(123, 174, 34, 1)"
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: "Dinero perdido vs Dinero ganado",
                    font: { size: 16 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `$${value.toLocaleString()}`
                    }
                }
            }
        }
    });

}
