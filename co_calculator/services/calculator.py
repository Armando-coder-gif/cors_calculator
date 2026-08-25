from ..constants.crops import CROPS, MAX_TONS, MAX_HECTARES
from ..constants.economic import (
    CORC_PRICE, BIOCHAR_MIX_RATIO, BAG_WEIGHT, FBB_PRICE,
    AGROCOGNITIVE_SUBSCRIPTION,
    HARDWARE_COST_PER_TON, LOGISTICS_COST_PER_TON,
    FBB_INOCULATION_COST_PER_TON,
    SOLAR_PV_ABATEMENT_COST, FORESTRY_ABATEMENT_COST,
    FEE_MANAGEMENT_PER_TON, FEE_DMRV_PER_TCO2
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

        # AC Fees
        fee_saas = hectares * AGROCOGNITIVE_SUBSCRIPTION
        fee_management = biochar * FEE_MANAGEMENT_PER_TON
        fee_dmrv = co2_removed * FEE_DMRV_PER_TCO2
        agrocognitive_cost = fee_saas + fee_management + fee_dmrv

        # OpEx (mano de obra + logística + insumos orgánicos)
        opex_est = biochar * (HARDWARE_COST_PER_TON + LOGISTICS_COST_PER_TON + FBB_INOCULATION_COST_PER_TON)

        # Cash Flow anual (ROI)
        annual_net_profit = (corcs_value + fbb_value) - (fee_saas + fee_management + fee_dmrv + opex_est)

        # Ganancia neta
        net_gain = corcs_value - agrocognitive_cost

        # Dinero total dejado en el campo
        money_left = corcs_value + fbb_value

        # Kiln recommendation
        recommended = self._recommend_kiln(tons)
        kiln_capex = recommended["capex"]
        amortization_years = recommended["amortization_years"]

        # ROI projection (año 0 = inversión inicial)
        roi_projection = [{"year": 0, "accumulated_profit": 0, "roi_pct": 0}]
        for year in range(1, amortization_years + 1):
            accumulated = annual_net_profit * year
            roi_pct = (accumulated / kiln_capex) * 100 if kiln_capex > 0 else 0
            roi_projection.append({
                "year": year,
                "accumulated_profit": round(accumulated, 2),
                "roi_pct": round(roi_pct, 1),
            })

        breakeven_months = (kiln_capex / (annual_net_profit / 12)) if annual_net_profit > 0 else None

        # --- Abatement Cost (BCR Path) ---
        service_cost = agrocognitive_cost
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
                "net_gain": round(net_gain, 2),
                "fee_saas": round(fee_saas, 2),
                "fee_management": round(fee_management, 2),
                "fee_dmrv": round(fee_dmrv, 2),
            },
            "roi": {
                "income_corcs": round(corcs_value, 2),
                "income_fbb": round(fbb_value, 2),
                "fee_saas": round(fee_saas, 2),
                "fee_management": round(fee_management, 2),
                "fee_dmrv": round(fee_dmrv, 2),
                "opex_est": round(opex_est, 2),
                "annual_net_profit": round(annual_net_profit, 2),
                "breakeven_months": round(breakeven_months, 1) if breakeven_months else None,
                "projection": roi_projection,
                "fast_payback": breakeven_months is not None and breakeven_months < 18,
                "kiln_name": recommended["name"],
                "kiln_capex": kiln_capex,
                "amortization_years": amortization_years,
            },
            "abatement": {
                "fee_saas": round(fee_saas, 2),
                "fee_management": round(fee_management, 2),
                "fee_dmrv": round(fee_dmrv, 2),
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

     def _recommend_kiln(self, tons_per_year):
        from ..constants.economic import KILNS
        tons_per_month = tons_per_year / 12
        for kiln in KILNS:
            if tons_per_month <= kiln["max_tons_month"]:
                return kiln
        return KILNS[-1]
