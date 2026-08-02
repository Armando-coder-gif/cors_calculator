document.addEventListener("DOMContentLoaded", () => {

    const calculateBtn = document.getElementById("calculateBtn");

    if (!calculateBtn) return;

    calculateBtn.addEventListener("click", calculate);

    document.getElementById("downloadPdfBtn").addEventListener("click", downloadPdf);
    document.getElementById("sendEmailBtn").addEventListener("click", sendPdfEmail);

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
            indexAxis: "y",
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
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `$${value.toLocaleString()}`
                    }
                }
            }
        }
    });

}

function _getReportData() {
    const chartCanvas = document.getElementById("fomoChart");
    const chartImage = chartCanvas ? chartCanvas.toDataURL("image/png") : "";

    return {
        crop: document.getElementById("cropType").value,
        tons: document.getElementById("tons").value,
        hectares: document.getElementById("hectares").value,
        company_name: document.getElementById("companyName").value,
        company_email: document.getElementById("companyEmail").value,
        company_country: document.getElementById("companyCountry").selectedOptions[0]?.text || "",
        chart_image: chartImage,
    };
}

async function downloadPdf() {
    try {
        const response = await fetch("/download-pdf/", {
            method: "POST",
            headers: {
                "X-CSRFToken": getCookie("csrftoken"),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(_getReportData()),
        });

        if (!response.ok) throw new Error("Error al generar el PDF.");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "diagnostico_agrocognitive.pdf";
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function sendPdfEmail() {
    const btn = document.getElementById("sendEmailBtn");
    const data = _getReportData();

    if (!data.company_email) {
        alert("Ingresa un correo electrónico en el paso anterior.");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
        const response = await fetch("/send-pdf-email/", {
            method: "POST",
            headers: {
                "X-CSRFToken": getCookie("csrftoken"),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Error al enviar el correo.");

        alert("¡Correo enviado exitosamente!");
    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "✉️ Enviar por correo";
    }
}
