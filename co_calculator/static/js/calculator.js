document.addEventListener("DOMContentLoaded", async () => {

    await i18n.init();

    const calculateBtn = document.getElementById("calculateBtn");

    if (!calculateBtn) return;

    calculateBtn.addEventListener("click", calculate);

    document.getElementById("goToReportFromHook").addEventListener("click", loadReportPreview);
    document.getElementById("downloadPdfBtn").addEventListener("click", downloadPdf);
    document.getElementById("sendEmailBtn").addEventListener("click", sendPdfEmail);

    document.getElementById("hookToggle").addEventListener("change", function () {
        const card = document.getElementById("hookCard");
        card.style.display = this.checked ? "block" : "none";
    });

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
        const tonsRaw = document.getElementById("tons").value;
        const hectaresRaw = document.getElementById("hectares").value;

        if (!crop || !tonsRaw || !hectaresRaw) {
            alert(i18n.t("alert_required"));
            return;
        }

        const tons = parseFloat(tonsRaw);
        const hectares = parseFloat(hectaresRaw);

        if (isNaN(tons) || tons <= 0 || tons > 100000) {
            alert(i18n.t("alert_tons_invalid"));
            return;
        }

        if (isNaN(hectares) || hectares <= 0 || hectares > 50000) {
            alert(i18n.t("alert_hectares_invalid"));
            return;
        }

        const formData = new FormData();

        formData.append("crop", crop);
        formData.append("tons", tons);
        formData.append("hectares", hectares);

        const response = await fetch(window.APP_URLS.calculate, {

            method: "POST",

            headers: {

                "X-CSRFToken": getCookie("csrftoken")

            },

            body: formData

        });

        if (!response.ok) {

            throw new Error(i18n.t("alert_calc_error"));

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
    window._lastCalc = calc;

    document.getElementById("moneyLeft").innerHTML =
        `$${calc.corcs_value.toLocaleString("es-ES")} ${i18n.t("money_suffix")}<span data-bs-toggle="tooltip" data-bs-placement="top" title="${i18n.t("asterisk_tooltip")}" style="cursor:help">*</span>`;

    new bootstrap.Tooltip(document.querySelector('#moneyLeft [data-bs-toggle="tooltip"]'));

document.getElementById("fbbResult").textContent =
    `${calc.biochar.toLocaleString("es-ES")} ${i18n.t("unit_tons")}`;

document.getElementById("co2Removed").textContent =
    `${calc.co2_removed.toLocaleString("es-ES")} ${i18n.t("unit_tons")} CO₂ₑ`;

    document.getElementById("hookCost").textContent =
        `$${calc.agrocognitive_cost.toLocaleString("es-ES")} USD/${i18n.t("hook_year")}`;

    document.getElementById("hookNet").textContent =
        `$${calc.net_gain.toLocaleString("es-ES")} USD`;

    document.getElementById("hookToggle").checked = false;
    document.getElementById("hookCard").style.display = "none";

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
            labels: [i18n.t("chart_income"), i18n.t("chart_service"), i18n.t("chart_net")],
            datasets: [{
                label: "$",
                data: [corcsValue, agroCost, netGain],
                backgroundColor: [
                    "rgba(164, 198, 53, 0.6)",
                    "rgba(255, 152, 0, 0.6)",
                    "rgba(123, 174, 34, 0.7)"
                ],
                borderColor: [
                    "rgba(164, 198, 53, 1)",
                    "rgba(255, 152, 0, 1)",
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
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `$${ctx.raw.toLocaleString("es-ES")}`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `$${value.toLocaleString("es-ES")}`
                    },
                    grid: { display: false }
                },
                y: {
                    grid: { display: false }
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
        person_name: document.getElementById("personName").value,
        person_phone: document.getElementById("personPhone").value,
        company_name: document.getElementById("companyName").value,
        company_email: document.getElementById("companyEmail").value,
        company_country: document.getElementById("companyCountry").selectedOptions[0]?.text || "",
        chart_image: chartImage,
        lang: i18n.getLang(),
    };
}

async function loadReportPreview() {
    try {
        const response = await fetch(window.APP_URLS.previewReport, {
            method: "POST",
            headers: {
                "X-CSRFToken": getCookie("csrftoken"),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(_getReportData()),
        });

        if (!response.ok) throw new Error(i18n.t("alert_calc_error"));

        const html = await response.text();
        const iframe = document.getElementById("reportPreview");
        iframe.srcdoc = html;

        window.stepper.next();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function downloadPdf() {
    try {
        const response = await fetch(window.APP_URLS.downloadPdf, {
            method: "POST",
            headers: {
                "X-CSRFToken": getCookie("csrftoken"),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(_getReportData()),
        });

        if (!response.ok) throw new Error(i18n.t("alert_pdf_error"));

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
        alert(i18n.t("alert_email_missing"));
        return;
    }

    btn.disabled = true;
    btn.textContent = i18n.t("alert_email_sending");

    try {
        const response = await fetch(window.APP_URLS.sendPdfEmail, {
            method: "POST",
            headers: {
                "X-CSRFToken": getCookie("csrftoken"),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error(i18n.t("alert_email_error"));

        alert(i18n.t("alert_email_success"));
    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = i18n.t("results_send_email");
    }
}
