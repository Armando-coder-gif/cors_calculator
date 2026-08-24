const i18n = {
    _lang: localStorage.getItem("lang") || "es",
    _translations: {},

    async init() {
        await this.load(this._lang);
        this.apply();
        this._updateToggle();
    },

    async load(lang) {
        const res = await fetch(`${window.APP_URLS.staticUrl}i18n/${lang}.json`);
        this._translations = await res.json();
        this._lang = lang;
        localStorage.setItem("lang", lang);
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
                `${fmtNum(calc.biochar)} ${this.t("unit_tons")}`;
            document.getElementById("co2Removed").textContent =
                `${fmtNum(calc.co2_removed)} ${this.t("unit_tons")} CO₂ₑ`;
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
        const flag = btn.querySelector(".lang-flag");
        const text = btn.querySelector(".lang-text");
        if (this._lang === "es") {
            text.textContent = "EN";
        } else {
            text.textContent = "ES";
        }
    }
};

window.i18n = i18n;
