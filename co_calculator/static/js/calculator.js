function fmtNum(value) {
    return new Intl.NumberFormat('es-ES', { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function fmtK(value) {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (abs >= 1_000) return (value / 1_000).toFixed(1).replace('.0', '') + 'k';
    return Math.round(value).toString();
}

document.addEventListener("DOMContentLoaded", async () => {

    await i18n.init();

    const calculateBtn = document.getElementById("calculateBtn");

    if (!calculateBtn) return;

    calculateBtn.addEventListener("click", calculate);

    document.getElementById("goToReportFromRoi").addEventListener("click", loadReportPreview);
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

    document.getElementById("fbbCommercializeToggle").addEventListener("change", function () {
        const container = document.getElementById("fbbSalePctContainer");
        const desc = document.getElementById("fbbModeDescription");
        container.style.display = this.checked ? "block" : "none";
        desc.textContent = this.checked
            ? i18n.t("fbb_mode_income")
            : i18n.t("fbb_mode_savings");
        if (this.checked) updateFbbSliderSummary(parseInt(document.getElementById("fbbSalePct").value));
        recalcFbbScenario();
    });

    document.getElementById("fbbSalePct").addEventListener("input", function () {
        document.getElementById("fbbSalePctValue").textContent = this.value + "%";
        updateFbbSliderSummary(parseInt(this.value));
        recalcFbbScenario();
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
        formData.append("kiln_id", getSelectedKilnId() || "");

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
    `${fmtNum(calc.fertilizer_mix)} ${i18n.t("unit_tons")}`;

document.getElementById("co2Removed").textContent =
    `${fmtNum(calc.co2_removed)} ${i18n.t("unit_tons")}`;

    // Update dynamic legends based on kiln-specific specs
    const pyrolysisEl = document.querySelector('[data-i18n="results_legend_pyrolysis"]');
    if (pyrolysisEl) {
        pyrolysisEl.textContent = i18n.t("results_legend_pyrolysis").replace("{yield_pct}", calc.pyrolysis_yield);
    }
    const removalEl = document.querySelector('[data-i18n="results_legend_removal"]');
    if (removalEl) {
        removalEl.textContent = i18n.t("results_legend_removal").replace("{co2_factor}", calc.co2_factor);
    }

    const humidityEl = document.querySelector('[data-i18n="results_legend_humidity"]');
    if (humidityEl) {
        humidityEl.textContent = i18n.t("results_legend_humidity").replace("{moisture_pct}", calc.moisture);
    }

    renderFomoChart(calc, result.roi);
    renderRoi(result.roi);
    renderAbatement(result.abatement);

    window._lastRoi = result.roi;

    // Reset FBB commercialization toggle
    const toggle = document.getElementById("fbbCommercializeToggle");
    toggle.checked = false;
    document.getElementById("fbbSalePctContainer").style.display = "none";
    document.getElementById("fbbSalePct").value = 100;
    document.getElementById("fbbSalePctValue").textContent = "100%";
    document.getElementById("fbbModeDescription").textContent = i18n.t("fbb_mode_savings");
    recalcFbbScenario();

}

let fomoChartInstance = null;

function renderFomoChart(calculations, roi) {

    const ctx = document.getElementById("fomoChart").getContext("2d");

    if (fomoChartInstance) {
        fomoChartInstance.destroy();
    }

    const income = calculations.corcs_value;
    const fbb = calculations.fbb_value;

    fomoChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: [i18n.t("chart_income"), i18n.t("chart_fbb")],
            datasets: [{
                label: "$",
                data: [income, fbb],
                backgroundColor: [
                    "rgba(164, 198, 53, 0.6)",
                    "rgba(255, 152, 0, 0.6)"
                ],
                borderColor: [
                    "rgba(164, 198, 53, 1)",
                    "rgba(255, 152, 0, 1)"
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

let roiChartInstance = null;

function renderRoi(roi) {
    if (!roi) return;

    document.getElementById("roiKilnName").textContent = roi.kiln_name;
    document.getElementById("roiKilnCapex").textContent = `$${fmtNum(roi.kiln_capex)}`;

    const badge = document.getElementById("fastPaybackBadge");
    badge.style.display = roi.fast_payback ? "inline-block" : "none";

    const breakevenMsg = document.getElementById("roiBreakevenMsg");
    if (roi.breakeven_months) {
        const years = Math.floor(roi.breakeven_months / 12);
        const months = Math.round(roi.breakeven_months % 12);
        breakevenMsg.textContent = (i18n.t("roi_breakeven_msg") || "Punto de equilibrio en el mes {months}")
            .replace("{months}", Math.round(roi.breakeven_months))
            .replace("{years}", years)
            .replace("{m}", months);
        breakevenMsg.style.display = "block";
    } else {
        breakevenMsg.style.display = "none";
    }

    const projection = roi.projection;
    const headerRow = document.getElementById("roiTableHeader");
    const profitRow = document.getElementById("roiTableProfit");
    const roiRow = document.getElementById("roiTableRoi");

    headerRow.innerHTML = `<th>${i18n.t("roi_table_year") || "Año"}</th>`;
    profitRow.innerHTML = `<td class="fw-semibold">${i18n.t("roi_table_profit") || "Utilidad Neta"}</td>`;
    roiRow.innerHTML = `<td class="fw-semibold">ROI %</td>`;

    projection.forEach(p => {
        headerRow.innerHTML += `<th>${p.year}</th>`;
        profitRow.innerHTML += `<td>$${fmtK(p.accumulated_profit)}</td>`;
        roiRow.innerHTML += `<td>${fmtNum(p.roi_pct)}%</td>`;
    });

    const ctx = document.getElementById("roiChart").getContext("2d");
    if (roiChartInstance) roiChartInstance.destroy();

    const labels = projection.map(p => `${i18n.t("roi_year_label") || "Año"} ${p.year}`);
    const profitData = projection.map(p => p.accumulated_profit);
    const capexLine = projection.map(() => roi.kiln_capex);

    roiChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: i18n.t("roi_chart_profit") || "Utilidad Acumulada",
                    data: profitData,
                    borderColor: "rgba(123, 174, 34, 1)",
                    backgroundColor: "rgba(123, 174, 34, 0.1)",
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 5,
                },
                {
                    label: i18n.t("roi_chart_investment") || "Inversión (CAPEX)",
                    data: capexLine,
                    borderColor: "rgba(255, 87, 34, 0.8)",
                    borderDash: [8, 4],
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom" },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: $${fmtNum(ctx.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => `$${fmtNum(v)}` },
                    grid: { color: "rgba(0,0,0,0.05)" }
                },
                x: { grid: { display: false } }
            }
        }
    });

    const summaryMsg = document.getElementById("roiSummaryMsg");
    const lastYear = projection[projection.length - 1];
    if (lastYear && lastYear.roi_pct > 0) {
        summaryMsg.textContent = (i18n.t("roi_summary") || "Tu proyecto no solo es carbono neutral, es una unidad de negocio con un ROI del {roi_pct}% a {years} años.")
            .replace("{roi_pct}", fmtNum(lastYear.roi_pct))
            .replace("{years}", lastYear.year);
        summaryMsg.style.display = "block";
    } else {
        summaryMsg.style.display = "none";
    }
}

function getFbbSplit() {
    const commercialize = document.getElementById("fbbCommercializeToggle").checked;
    const salePct = commercialize ? parseInt(document.getElementById("fbbSalePct").value) : 0;
    return { commercialize, salePct };
}

function updateFbbSliderSummary(pct) {
    const el = document.getElementById("fbbSaleSummary");
    if (!el) return;
    const savingsPct = 100 - pct;
    el.textContent = (i18n.t("fbb_slider_summary") || "{sale}% se vende · {savings}% uso interno (ahorro)")
        .replace("{sale}", pct)
        .replace("{savings}", savingsPct);
}

function recalcFbbScenario() {
    const calc = window._lastCalc;
    const roi = window._lastRoi;
    const abatement = window._lastAbatement;
    if (!calc || !roi) return;

    const { commercialize, salePct } = getFbbSplit();
    const fbbTotal = calc.fbb_value;
    const fbbIncome = fbbTotal * (salePct / 100);
    const fbbSavings = fbbTotal - fbbIncome;

    // Recalculate ROI with adjusted FBB income
    const totalCosts = roi.fee_saas + roi.fee_management + roi.fee_dmrv
        + roi.fee_onboarding_lca + roi.fee_csink_cert + roi.opex_est;
    const adjustedAnnualProfit = (roi.income_corcs + fbbIncome) - totalCosts;
    const adjustedBreakeven = adjustedAnnualProfit > 0
        ? roi.kiln_capex / (adjustedAnnualProfit / 12) : null;

    const adjustedProjection = [{ year: 0, accumulated_profit: 0, roi_pct: 0 }];
    for (let y = 1; y <= roi.amortization_years; y++) {
        const acc = adjustedAnnualProfit * y;
        adjustedProjection.push({
            year: y,
            accumulated_profit: Math.round(acc * 100) / 100,
            roi_pct: roi.kiln_capex > 0 ? Math.round((acc / roi.kiln_capex) * 1000) / 10 : 0
        });
    }

    const adjustedRoi = {
        ...roi,
        annual_net_profit: adjustedAnnualProfit,
        breakeven_months: adjustedBreakeven ? Math.round(adjustedBreakeven * 10) / 10 : null,
        fast_payback: adjustedBreakeven !== null && adjustedBreakeven < 18,
        projection: adjustedProjection
    };

    renderRoi(adjustedRoi);

    // Update income breakdown cards
    const totalIncome = roi.income_corcs + fbbIncome;
    const breakdownEl = document.getElementById("roiIncomeBreakdown");
    breakdownEl.style.display = "flex";

    document.getElementById("roiTotalIncome").textContent = `$${fmtNum(totalIncome)}`;
    document.getElementById("roiCorcsIncome").textContent = `$${fmtNum(roi.income_corcs)}`;
    document.getElementById("roiCorcsPct").textContent = totalIncome > 0
        ? `${Math.round((roi.income_corcs / totalIncome) * 100)}%` : "0%";

    const fbbLabelEl = document.getElementById("roiFbbLabel");
    const fbbIncomeEl = document.getElementById("roiFbbIncome");
    const fbbPctEl = document.getElementById("roiFbbPct");

    if (!commercialize) {
        fbbLabelEl.textContent = i18n.t("roi_fbb_savings");
        fbbIncomeEl.textContent = `$${fmtNum(fbbSavings)}`;
        fbbIncomeEl.style.color = "rgba(76, 175, 80, 1)";
        fbbPctEl.textContent = i18n.t("roi_fbb_not_in_roi");
    } else {
        fbbLabelEl.textContent = i18n.t("roi_fbb_income");
        fbbIncomeEl.textContent = `$${fmtNum(fbbIncome)}`;
        fbbIncomeEl.style.color = "rgba(255, 152, 0, 1)";
        fbbPctEl.textContent = totalIncome > 0
            ? `${Math.round((fbbIncome / totalIncome) * 100)}%` : "0%";
    }

    // Re-render fomo chart with updated labels
    renderFomoChartWithFbb(calc, roi, fbbIncome, fbbSavings, commercialize);

    // Update revenue breakdown labels
    const fbbRevenueEl = document.getElementById("breakdownFbbRevenue");
    const fbbRevenueLabelEl = document.getElementById("breakdownFbbRevenueLabel");
    if (fbbRevenueEl) {
        if (!commercialize) {
            fbbRevenueEl.textContent = `$${fmtNum(fbbSavings)}`;
            if (fbbRevenueLabelEl) fbbRevenueLabelEl.textContent = i18n.t("fbb_revenue_savings_only");
        } else {
            fbbRevenueEl.textContent = `$${fmtNum(fbbIncome)}`;
            if (fbbRevenueLabelEl) fbbRevenueLabelEl.textContent = i18n.t("abatement_revenue_fbb");
        }
    }
}

function renderFomoChartWithFbb(calculations, roi, fbbIncome, fbbSavings, commercialize) {
    const ctx = document.getElementById("fomoChart").getContext("2d");
    if (fomoChartInstance) fomoChartInstance.destroy();

    const income = calculations.corcs_value;

    let labels, data, bgColors, borderColors;

    if (!commercialize) {
        labels = [i18n.t("chart_income"), i18n.t("chart_fbb_savings")];
        data = [income, fbbSavings];
        bgColors = ["rgba(164, 198, 53, 0.6)", "rgba(255, 152, 0, 0.6)"];
        borderColors = ["rgba(164, 198, 53, 1)", "rgba(255, 152, 0, 1)"];
    } else if (fbbSavings > 0) {
        labels = [i18n.t("chart_income"), i18n.t("chart_fbb"), i18n.t("chart_fbb_savings")];
        data = [income, fbbIncome, fbbSavings];
        bgColors = ["rgba(164, 198, 53, 0.6)", "rgba(255, 152, 0, 0.6)", "rgba(255, 152, 0, 0.4)"];
        borderColors = ["rgba(164, 198, 53, 1)", "rgba(255, 152, 0, 1)", "rgba(255, 152, 0, 0.8)"];
    } else {
        labels = [i18n.t("chart_income"), i18n.t("chart_fbb")];
        data = [income, fbbIncome];
        bgColors = ["rgba(164, 198, 53, 0.6)", "rgba(255, 152, 0, 0.6)"];
        borderColors = ["rgba(164, 198, 53, 1)", "rgba(255, 152, 0, 1)"];
    }

    fomoChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "$",
                data,
                backgroundColor: bgColors,
                borderColor: borderColors,
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
                        label: ctx => `$${fmtNum(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { callback: value => `$${fmtNum(value)}` },
                    grid: { display: false }
                },
                y: { grid: { display: false } }
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

    // Support text
    const supportCard = document.getElementById("abatementSupportCard");
    const warningMsg = document.getElementById("abatementWarningMsg");
    if (bcr >= solar || bcr >= forestry) {
        supportCard.classList.add("d-none");
        warningMsg.textContent = i18n.t("abatement_warning_text");
        warningMsg.classList.remove("d-none");
    } else {
        const savingsSolar = Math.round((1 - bcr / solar) * 100);
        const savingsForestry = Math.round((1 - bcr / forestry) * 100);
        const supportEl = document.getElementById("abatementSupportText");
        supportEl.textContent = i18n
            .t("abatement_support_text")
            .replace("{solar_pct}", savingsSolar)
            .replace("{forestry_pct}", savingsForestry);
        supportCard.classList.remove("d-none");
        warningMsg.classList.add("d-none");
    }

    // Arbitrage (hide if warning is showing)
    const arbitrageEl = document.getElementById("arbitrageMsg");
    const showWarning = bcr >= solar || bcr >= forestry;
    if (abatement.arbitrage && !showWarning) {
        arbitrageEl.classList.remove("d-none");
    } else {
        arbitrageEl.classList.add("d-none");
    }

    // Investment breakdown
    document.getElementById("breakdownServiceTotal").textContent = `$${fmtNum(abatement.service_cost)}`;
    document.getElementById("breakdownSubscription").textContent = `$${fmtNum(abatement.fee_saas)}`;
    document.getElementById("breakdownManagement").textContent = `$${fmtNum(abatement.fee_management)}`;
    document.getElementById("breakdownDmrv").textContent = `$${fmtNum(abatement.fee_dmrv)}`;
    document.getElementById("breakdownOnboardingLca").textContent = `$${fmtNum(abatement.fee_onboarding_lca)}`;
    document.getElementById("breakdownCsinkCert").textContent = `$${fmtNum(abatement.fee_csink_cert)}`;
    document.getElementById("breakdownHardware").textContent = `$${fmtNum(abatement.kiln_annual_cost)}`;
    document.getElementById("breakdownKilnName").textContent = abatement.kiln_name;
    document.getElementById("breakdownKilnAmortization").textContent = `$${fmtNum(abatement.kiln_annual_cost)}/año (${abatement.amortization_years} años)`;
    document.getElementById("breakdownLabor").textContent = `$${fmtNum(abatement.labor_cost)}`;
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
