from ..constants.crops import CROPS, MAX_TONS, MAX_HECTARES
from ..constants.economic import *
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

        moisture = crop_data.get("moisture", 0.50)
        dry_biomass = tons * (1 - moisture)
        biochar = dry_biomass * PYROLYSIS_YIELD
        co2_removed = biochar * REMOVAL_FACTOR

        # CORCs
        corcs_value = co2_removed * CORC_PRICE

        # FBB
        fertilizer_mix = biochar / BIOCHAR_MIX_RATIO
        bags = fertilizer_mix / 0.02
        fbb_value = bags * FBB_PRICE

        # Inversión AgroCognitive
        agrocognitive_cost = hectares * AGROCOGNITIVE_SUBSCRIPTION

        # Ganancia neta
        net_gain = corcs_value - agrocognitive_cost

        # Dinero total dejado en el campo
        money_left = corcs_value + fbb_value

        return {

    "inputs": {

        "crop": crop_data["id"],

        "tons": tons,

        "hectares": hectares

    },

    "calculations": {

        "dry_biomass": round(dry_biomass, 2),

        "biochar": round(biochar, 2),

        "co2_removed": round(co2_removed, 2),

        "corcs_value": round(corcs_value, 2),

        "bags": round(bags),

        "fbb_value": round(fbb_value, 2),

        "money_left": round(money_left, 2),

        "agrocognitive_cost": round(agrocognitive_cost, 2),

        "net_gain": round(net_gain, 2)

    }

}
