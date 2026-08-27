PYROLYSIS_YIELD = 0.30
REMOVAL_FACTOR = 2.5

# Per-kiln thermochemical specs: yield, fixed carbon, CO2e factor
# co2_factor = c_fix * 3.667 * 0.75 (permanence factor)
KILN_SPECS = {
    "artisan":    {"yield": 0.22, "c_fix": 0.65, "co2_factor": 1.78},
    "modular":    {"yield": 0.28, "c_fix": 0.75, "co2_factor": 2.06},
    "industrial": {"yield": 0.33, "c_fix": 0.85, "co2_factor": 2.33},
}
