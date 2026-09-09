// Función para sobreescribir las cookies y que no fuercen español
function setLanguageCookie(lang) {
    document.cookie = `django_language=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
}

const getInitialLanguage = () => {
    // 1. La URL manda por encima de todo
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get("lang");
    if (urlLang) {
        localStorage.setItem("lang", urlLang);
        setLanguageCookie(urlLang);
        return urlLang;
    }

    // 2. Cookie como respaldo
    const match = document.cookie.match(/(?:^|;\s*)(?:django_language|lang)=([^;]+)/);
    const cookieLang = match ? match[1] : null;

    return cookieLang || (window.APP_URLS && window.APP_URLS.initialLang) || localStorage.getItem("lang") || "es";
};

const i18n = {
    _lang: getInitialLanguage(),
    _translations: {},

    async init() {
        this._lang = getInitialLanguage();
        await this.load(this._lang);
        this.apply();
        this._updateToggle();
    },

    async load(lang) {
        const res = await fetch(`${window.APP_URLS.staticUrl}i18n/${lang}.json`);
        this._translations = await res.json();
        this._lang = lang;
        localStorage.setItem("lang", lang);
        setLanguageCookie(lang);
    },

    t(key) {
        return this._translations[key] || key;
    },

    async setLang(lang) {
        await this.load(lang);
        this.apply();
        this._updateToggle();
    },

    toggle() {
        return this.setLang(this._lang === "es" ? "en" : "es");
    },

    getLang() {
        return this._lang;
    },

    apply() {
        document.querySelectorAll("[data-i18n]").forEach(el => {
            el.textContent = this.t(el.dataset.i18n);
        });
        document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
            el.placeholder = this.t(el.dataset.i18nPlaceholder);
        });
        document.querySelectorAll("[data-i18n-title]").forEach(el => {
            el.setAttribute("title", this.t(el.dataset.i18nTitle));
            const existing = bootstrap.Tooltip.getInstance(el);
            if (existing) existing.dispose();
            new bootstrap.Tooltip(el);
        });
        if (window._lastCalc) {
            const calc = window._lastCalc;
            document.getElementById("moneyLeft").innerHTML =
                `$${fmtNum(calc.corcs_value)} ${this.t("money_suffix")}<span data-bs-toggle="tooltip" data-bs-placement="top" title="${this.t("asterisk_tooltip")}" style="cursor:help">*</span>`;
            new bootstrap.Tooltip(document.querySelector('#moneyLeft [data-bs-toggle="tooltip"]'));
            document.getElementById("fbbResult").textContent =
                `${fmtNum(calc.fertilizer_mix)} ${this.t("unit_tons")}`;
            document.getElementById("co2Removed").textContent =
                `${fmtNum(calc.co2_removed)} ${this.t("unit_tons")} CO₂ₑ`;
            const humidityEl = document.querySelector('[data-i18n="results_legend_humidity"]');
            if (humidityEl) {
                humidityEl.textContent = this.t("results_legend_humidity").replace("{moisture_pct}", calc.moisture);
            }
        }
        if (window._lastAbatement) {
            const bcr = window._lastAbatement.abatement_cost_bcr;
            const solar = window._lastAbatement.solar_pv_cost;
            const forestry = window._lastAbatement.forestry_cost;
            const savingsSolar = Math.round((1 - bcr / solar) * 100);
            const savingsForestry = Math.round((1 - bcr / forestry) * 100);
            document.getElementById("abatementCostDisplay").textContent =
                `$${fmtNum(bcr)} / ${this.t("unit_tons")} CO₂ₑ`;
            const txtAbatement = document.getElementById("abatementSupportText");
            if (txtAbatement) {
                txtAbatement.textContent = this
                    .t("abatement_support_text")
                    .replace("{solar_pct}", savingsSolar)
                    .replace("{forestry_pct}", savingsForestry);
            }
        }
    },

    _updateToggle() {
        const btn = document.getElementById("langToggle");
        if (!btn) return;
        const text = btn.querySelector(".lang-text");
        if (text) {
            text.textContent = this._lang === "es" ? "EN" : "ES";
        }
    }
};

window.i18n = i18n;