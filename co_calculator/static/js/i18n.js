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
