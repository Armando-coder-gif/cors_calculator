from ..constants.crops import CROPS, MAX_TONS, MAX_HECTARES
from ..constants.economic import (
    CORC_PRICE, BIOCHAR_MIX_RATIO, BAG_WEIGHT, FBB_PRICE,
    AGROCOGNITIVE_SUBSCRIPTION, DMRV_MONTHLY_PRICE,
    HARDWARE_COST_PER_TON, LOGISTICS_COST_PER_TON,
    FBB_INOCULATION_COST_PER_TON,
    SOLAR_PV_ABATEMENT_COST, FORESTRY_ABATEMENT_COST,
)
from ..constants.data_constants import *

class CalculatorService:

     def calculate(self, crop, tons, hectares):
        crop_data = next((c for c in CROPS if c["id"] == crop), None)
        if not crop_data:
            raise ValueError(f"Cultivo no válido: {crop}")

        if tons <= 0 or tons > MAX_TONS:
            raise ValueError(f"Toneladas fuera de rango: {tons}")
        if hectares <= 0 or hectares > MAX_HECTARES:
            raise ValueError(f"Hectáreas fuera de rango: {hectares}")

        moisture = crop_data["moisture"]
        dry_biomass = tons * (1 - moisture)
        biochar = dry_biomass * PYROLYSIS_YIELD
        co2_removed = biochar * REMOVAL_FACTOR

        # CORCs
        corcs_value = co2_removed * CORC_PRICE

        # FBB
        fertilizer_mix = biochar / BIOCHAR_MIX_RATIO
        bags = fertilizer_mix / 0.02
        fbb_value = bags * FBB_PRICE

        # Inversión AgroCognitive (suscripción + dMRV anual)
        agrocognitive_cost = hectares * (AGROCOGNITIVE_SUBSCRIPTION + DMRV_MONTHLY_PRICE * 12)

        # Ganancia neta
        net_gain = corcs_value - agrocognitive_cost

        # Dinero total dejado en el campo
        money_left = corcs_value + fbb_value

        # --- Abatement Cost (BCR Path) ---
        service_cost = AGROCOGNITIVE_SUBSCRIPTION * hectares

        hardware_cost = HARDWARE_COST_PER_TON * biochar
        logistics_cost = LOGISTICS_COST_PER_TON * biochar
        inoculation_cost = FBB_INOCULATION_COST_PER_TON * biochar
        total_investment = service_cost + hardware_cost + logistics_cost + inoculation_cost

        abatement_cost_bcr = total_investment / co2_removed if co2_removed > 0 else 0

        potential_revenue = corcs_value + fbb_value

        arbitrage = abatement_cost_bcr < CORC_PRICE

        return {
            "inputs": {
                "crop": crop_data["id"],
                "tons": tons,
                "hectares": hectares
            },
            "calculations": {
                "moisture": round(moisture * 100),
                "dry_biomass": round(dry_biomass, 2),
                "biochar": round(biochar, 2),
                "co2_removed": round(co2_removed, 2),
                "corcs_value": round(corcs_value, 2),
                "bags": round(bags),
                "fbb_value": round(fbb_value, 2),
                "money_left": round(money_left, 2),
                "agrocognitive_cost": round(agrocognitive_cost, 2),
                "net_gain": round(net_gain, 2)
            },
            "abatement": {
                "service_cost": round(service_cost, 2),
                "hardware_cost": round(hardware_cost, 2),
                "logistics_cost": round(logistics_cost, 2),
                "inoculation_cost": round(inoculation_cost, 2),
                "total_investment": round(total_investment, 2),
                "abatement_cost_bcr": round(abatement_cost_bcr, 2),
                "solar_pv_cost": SOLAR_PV_ABATEMENT_COST,
                "forestry_cost": FORESTRY_ABATEMENT_COST,
                "potential_revenue": round(potential_revenue, 2),
                "arbitrage": arbitrage
            }
        }
