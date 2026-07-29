from ..constants.crops import CROPS
from ..constants.economic import *

class CalculatorService:

     def calculate(self, crop, tons, hectares):

        crop_data = CROPS[crop]

        humidity_ratio = crop_data["humidity_ratio"]
        pyrolysis_yield = crop_data["pyrolysis_yield"]
        removal_factor = crop_data["removal_factor"]

        dry_biomass = tons * humidity_ratio
        biochar = dry_biomass * pyrolysis_yield
        co2_removed = biochar * removal_factor

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

        "crop": crop_data["name"],

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
