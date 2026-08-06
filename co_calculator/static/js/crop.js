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

document.addEventListener("DOMContentLoaded", loadCountries);
