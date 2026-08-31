function loadCountries() {
    const select = document.getElementById("companyCountry");
    fetch(window.APP_URLS.countriesApi)
        .then(r => r.json())
        .then(countries => {
            countries.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.code;
                opt.textContent = c.name;
                select.appendChild(opt);
            });
        })
        .catch(err => console.error("Error loading countries:", err));
}

let selectedKilnId = null;

function _fmtKilnNumber(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return value;
    return new Intl.NumberFormat("es-ES", {
        useGrouping: true,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
}

function formatKilnNumbers() {
    document.querySelectorAll(".kiln-capacity-value").forEach(el => {
        el.textContent = _fmtKilnNumber(el.dataset.value);
    });

    document.querySelectorAll(".kiln-capex-value").forEach(el => {
        el.textContent = _fmtKilnNumber(el.dataset.value);
    });
}

function initKilnSelector() {
    const tonsInput = document.getElementById("tons");
    const kilnCards = document.querySelectorAll(".kiln-card");

    tonsInput.addEventListener("input", () => {
        const tons = parseFloat(tonsInput.value);
        if (!tons || tons <= 0) return;
        updateKilnRecommendation(tons);
    });

    kilnCards.forEach(card => {
        card.addEventListener("click", () => selectKiln(card));
    });
}

function updateKilnRecommendation(tonsPerYear) {
    const tonsPerMonth = tonsPerYear / 12;
    const cards = document.querySelectorAll(".kiln-card");
    let recommendedCard = null;

    cards.forEach(card => {
        card.querySelector(".kiln-badge").style.display = "none";
        const maxTons = parseFloat(card.dataset.maxTons);
        if (!recommendedCard && tonsPerMonth <= maxTons) {
            recommendedCard = card;
        }
    });

    if (!recommendedCard) recommendedCard = cards[cards.length - 1];

    recommendedCard.querySelector(".kiln-badge").style.display = "inline-block";
    window._recommendedKilnMaxTons = parseFloat(recommendedCard.dataset.maxTons);

    if (selectedKilnId) checkKilnWarning();
}

function selectKiln(card) {
    document.querySelectorAll(".kiln-card").forEach(c => {
        c.classList.remove("border-success", "shadow");
        c.style.borderColor = "";
    });
    card.classList.add("border-success", "shadow");
    card.style.borderColor = "var(--primary)";
    selectedKilnId = card.dataset.kilnId;
    checkKilnWarning();
    checkCropFormReady();
}

function checkKilnWarning() {
    const warning = document.getElementById("kilnWarning");
    const selectedCard = document.querySelector(`.kiln-card[data-kiln-id="${selectedKilnId}"]`);
    if (!selectedCard) return;

    const selectedMax = parseFloat(selectedCard.dataset.maxTons);
    const recommendedMax = window._recommendedKilnMaxTons || 0;
    warning.style.display = selectedMax < recommendedMax ? "block" : "none";
}

function getSelectedKilnId() {
    return selectedKilnId;
}

function checkCropFormReady() {
    const crop = document.getElementById("cropType").value;
    const tons = parseFloat(document.getElementById("tons").value);
    const hectares = parseFloat(document.getElementById("hectares").value);
    const btn = document.getElementById("calculateBtn");
    if (!btn) return;
    btn.disabled = !(crop && tons > 0 && hectares > 0 && selectedKilnId);
}

document.addEventListener("DOMContentLoaded", () => {
    loadCountries();
    formatKilnNumbers();
    initKilnSelector();

    document.getElementById("cropType").addEventListener("change", checkCropFormReady);
    document.getElementById("tons").addEventListener("input", checkCropFormReady);
    document.getElementById("hectares").addEventListener("input", checkCropFormReady);
});
