function fmtNum(value) {
    return new Intl.NumberFormat('es-ES', { useGrouping: true, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

document.addEventListener("DOMContentLoaded", async () => {

    await i18n.init();

    const calculateBtn = document.getElementById("calculateBtn");

    if (!calculateBtn) return;

    calculateBtn.addEventListener("click", calculate);

    document.getElementById("goToReportFromHook").addEventListener("click", loadReportPreview);
    document.getElementById("downloadPdfBtn").addEventListener("click", downloadPdf);
    document.getElementById("sendEmailBtn").addEventListener("click", sendPdfEmail);

    document.getElementById("investmentToggleBtn").addEventListener("change", function () {
        const el = document.getElementById("investmentBreakdown");
        el.style.display = this.checked ? "block" : "none";
    });

    document.getElementById("revenueToggleBtn").addEventListener("change", function () {
        const el = document.getElementById("revenueBreakdown");
        el.style.display = this.checked ? "block" : "none";
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
        `$${fmtNum(calc.corcs_value)} ${i18n.t("money_suffix")}<span data-bs-toggle="tooltip" data-bs-placement="top" title="${i18n.t("asterisk_tooltip")}" style="cursor:help">*</span>`;

    new bootstrap.Tooltip(document.querySelector('#moneyLeft [data-bs-toggle="tooltip"]'));

document.getElementById("fbbResult").textContent =
    `${fmtNum(calc.biochar)} ${i18n.t("unit_tons")}`;

document.getElementById("co2Removed").textContent =
    `${fmtNum(calc.co2_removed)} ${i18n.t("unit_tons")}`;

    const humidityEl = document.querySelector('[data-i18n="results_legend_humidity"]');
    if (humidityEl) {
        humidityEl.textContent = i18n.t("results_legend_humidity").replace("{moisture_pct}", calc.moisture);
    }

    renderFomoChart(calc);
    renderAbatement(result.abatement);

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
                        label: ctx => `$${fmtNum(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `$${fmtNum(value)}`
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

let abatementChartInstance = null;

function renderAbatement(abatement) {
    if (!abatement) return;
    window._lastAbatement = abatement;

    const bcr = abatement.abatement_cost_bcr;
    const solar = abatement.solar_pv_cost;
    const forestry = abatement.forestry_cost;

    // Financial summary
    const savingsSolar = Math.round((1 - bcr / solar) * 100);
    const savingsForestry = Math.round((1 - bcr / forestry) * 100);

    document.getElementById("savingsVsSolar").textContent = `${savingsSolar}%`;
    document.getElementById("savingsVsForestry").textContent = `${savingsForestry}%`;
    const supportText = i18n
        .t("abatement_support_text")
        .replace("{solar_pct}", savingsSolar)
        .replace("{forestry_pct}", savingsForestry);
    const supportEl = document.getElementById("abatementSupportText");
    if (supportEl) supportEl.textContent = supportText;
    document.getElementById("abatementCostDisplay").textContent = `$${fmtNum(bcr)}/${i18n.t("unit_tons")} CO₂ₑ`;

    // Arbitrage
    const arbitrageEl = document.getElementById("arbitrageMsg");
    if (abatement.arbitrage) {
        arbitrageEl.classList.remove("d-none");
    } else {
        arbitrageEl.classList.add("d-none");
    }

    // Investment breakdown
    document.getElementById("breakdownService").textContent = `$${fmtNum(abatement.service_cost)}`;
    document.getElementById("breakdownHardware").textContent = `$${fmtNum(abatement.hardware_cost)}`;
    document.getElementById("breakdownLogistics").textContent = `$${fmtNum(abatement.logistics_cost)}`;
    document.getElementById("breakdownFbb").textContent = `$${fmtNum(abatement.inoculation_cost)}`;
    document.getElementById("breakdownTotal").textContent = `$${fmtNum(abatement.total_investment)}`;
    document.getElementById("investmentBreakdown").style.display = "none";

    // Revenue breakdown
    const calc = window._lastCalc;
    document.getElementById("breakdownCorcs").textContent = `$${fmtNum(calc.corcs_value)}`;
    document.getElementById("breakdownFbbRevenue").textContent = `$${fmtNum(calc.fbb_value)}`;
    document.getElementById("breakdownRevenue").textContent = `$${fmtNum(abatement.potential_revenue)}`;
    document.getElementById("revenueBreakdown").style.display = "none";

    // Chart
    const ctx = document.getElementById("abatementChart").getContext("2d");
    if (abatementChartInstance) abatementChartInstance.destroy();

    abatementChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: [
                i18n.t("abatement_label_solar"),
                i18n.t("abatement_label_forestry"),
                i18n.t("abatement_label_bcr")
            ],
            datasets: [{
                label: "$",
                data: [solar, forestry, bcr],
                backgroundColor: [
                    "rgba(255, 152, 0, 0.6)",
                    "rgba(255, 152, 0, 0.4)",
                    "rgba(123, 174, 34, 0.7)"
                ],
                borderColor: [
                    "rgba(255, 152, 0, 1)",
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
                tooltip: {
                    callbacks: {
                        label: ctx => `$${fmtNum(ctx.raw)} USD/${i18n.t("unit_tons")} CO₂ₑ`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { callback: v => `$${v}` },
                    grid: { display: false }
                },
                y: { grid: { display: false } }
            }
        }
    });
}
