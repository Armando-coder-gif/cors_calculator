CORC_PRICE = 150

BIOCHAR_MIX_RATIO = 0.2

BAG_WEIGHT = 40  # kg

FBB_PRICE = 20

AGROCOGNITIVE_SUBSCRIPTION = 15  # por hectárea/año
FEE_MANAGEMENT_PER_TON = 1

FEE_DMRV_PER_TCO2 = 1.5  # por hectárea/mes

ONBOARDING_LCA_TOTAL = 5000  # USD one-time
ONBOARDING_LCA_AMORTIZATION_YEARS = 10
ONBOARDING_LCA_ANNUAL = ONBOARDING_LCA_TOTAL / ONBOARDING_LCA_AMORTIZATION_YEARS  # 500/año
CSINK_CERTIFICATION_ANNUAL = 1000  # USD/año

# Abatement Cost - BCR Path
HARDWARE_COST_PER_TON = 10  # USD/ton (amortización horno Artisan $50k/5yr)
LOGISTICS_COST_PER_TON = 15  # USD/ton (transporte + mano de obra)
FBB_INOCULATION_COST_PER_TON = 20  # USD/ton (insumos orgánicos)

# Benchmark - competencia
SOLAR_PV_ABATEMENT_COST = 100  # USD/tCO2e (avoidance)
FORESTRY_ABATEMENT_COST = 55  # USD/tCO2e (sequestration, high risk)


# Hardware (variable por tipo de horno)
KILNS = [
    {"id": "artisan", "name": "Artisan C-Sink (Kon-Tiki)", "capex": 5000, "max_tons_month": 15, "amortization_years": 5, "image": "Artisan C-Sink (Kon-Tiki).jpeg"},
    {"id": "modular", "name": "Modular Reactor", "capex": 65000, "max_tons_month": 60, "amortization_years": 10, "image": "Modular_Portable_Reactor.png"},
    {"id": "industrial", "name": "Continuous Flow (Industrial)", "capex": 350000, "max_tons_month": 9999, "amortization_years": 10, "image": "ContinuousFlow.jpg"},
]
