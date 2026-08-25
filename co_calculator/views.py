import io
import json
from datetime import date
from pathlib import Path

import pycountry
from django.shortcuts import render
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from xhtml2pdf import pisa

from .services.calculator import CalculatorService
from .constants.crops import CROPS
from .constants.economic import KILNS

_I18N_DIR = Path(settings.BASE_DIR) / "co_calculator" / "static" / "i18n"


def _load_translations(lang):
    path = _I18N_DIR / f"{lang}.json"
    if not path.exists():
        path = _I18N_DIR / "es.json"
    return json.loads(path.read_text(encoding="utf-8"))


def index(request):
   return render(request, "../templates/index.html", {
        "crops": CROPS,
        "kilns": KILNS
    })


def countries(request):
    data = [
        {"code": c.alpha_2, "name": c.name}
        for c in pycountry.countries
    ]
    data.sort(key=lambda c: c["name"])
    return JsonResponse(data, safe=False)


def calculate(request):

    crop = request.POST.get("crop", "")

    try:
        tons = float(request.POST.get("tons", 0))
        hectares = float(request.POST.get("hectares", 0))
    except (ValueError, TypeError):
        return JsonResponse({"error": "Valores numéricos inválidos."}, status=400)

    service = CalculatorService()

    try:
        result = service.calculate(crop, tons, hectares)
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse(result)


def _fmt(value):
    """Format number with dots as thousands separator and comma as decimal."""
    formatted = f"{value:,.2f}"
    # Swap: comma->X, dot->comma, X->dot
    return formatted.replace(",", "X").replace(".", ",").replace("X", ".")


def _pdf_safe_translations(t):
    """Replace Unicode subscripts with HTML <sub> for xhtml2pdf compatibility."""
    result = {}
    for k, v in t.items():
        if isinstance(v, str):
            v = v.replace("CO₂ₑ", "CO<sub>2</sub>e").replace("CO₂", "CO<sub>2</sub>")
        result[k] = v
    return result


def _build_pdf(data):
    crop = data["crop"]
    tons = float(data["tons"])
    hectares = float(data["hectares"])
    t = _pdf_safe_translations(_load_translations(data.get("lang", "es")))

    service = CalculatorService()
    result = service.calculate(crop, tons, hectares)
    calc = result["calculations"]
    abat = result["abatement"]

    context = {
        "person_name": data.get("person_name", ""),
        "person_phone": data.get("person_phone", ""),
        "company_name": data.get("company_name", ""),
        "company_email": data.get("company_email", ""),
        "company_country": data.get("company_country", ""),
        "crop": crop,
        "tons": _fmt(tons),
        "hectares": _fmt(hectares),
        "co2_removed": _fmt(calc["co2_removed"]),
        "dry_biomass": _fmt(calc["dry_biomass"]),
        "biochar": _fmt(calc["biochar"]),
        "corcs_value": _fmt(calc["corcs_value"]),
        "agrocognitive_cost": _fmt(calc["agrocognitive_cost"]),
        "total_investment": _fmt(abat["total_investment"]),
        "subscription_cost": _fmt(abat["subscription_cost"]),
        "dmrv_cost": _fmt(abat["dmrv_cost"]),
        "hardware_cost": _fmt(abat["hardware_cost"]),
        "logistics_cost": _fmt(abat["logistics_cost"]),
        "inoculation_cost": _fmt(abat["inoculation_cost"]),
        "potential_revenue": _fmt(abat["potential_revenue"]),
        "fbb_value": _fmt(calc["fbb_value"]),
        "chart_image": data.get("chart_image", ""),
        "date": date.today().strftime("%d/%m/%Y"),
        "t": t,
    }

    html_string = render_to_string("pdf/report.html", context)
    buffer = io.BytesIO()
    pisa.CreatePDF(html_string, dest=buffer)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf


def download_pdf(request):
    data = json.loads(request.body)
    pdf = _build_pdf(data)

    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="diagnostico_agrocognitive.pdf"'
    return response


def preview_report(request):
    data = json.loads(request.body)
    crop = data["crop"]
    tons = float(data["tons"])
    hectares = float(data["hectares"])
    t = _pdf_safe_translations(_load_translations(data.get("lang", "es")))

    service = CalculatorService()
    result = service.calculate(crop, tons, hectares)
    calc = result["calculations"]
    abat = result["abatement"]

    context = {
        "person_name": data.get("person_name", ""),
        "person_phone": data.get("person_phone", ""),
        "company_name": data.get("company_name", ""),
        "company_email": data.get("company_email", ""),
        "company_country": data.get("company_country", ""),
        "crop": crop,
        "tons": _fmt(tons),
        "hectares": _fmt(hectares),
        "co2_removed": _fmt(calc["co2_removed"]),
        "dry_biomass": _fmt(calc["dry_biomass"]),
        "biochar": _fmt(calc["biochar"]),
        "corcs_value": _fmt(calc["corcs_value"]),
        "agrocognitive_cost": _fmt(calc["agrocognitive_cost"]),
        "total_investment": _fmt(abat["total_investment"]),
        "subscription_cost": _fmt(abat["subscription_cost"]),
        "dmrv_cost": _fmt(abat["dmrv_cost"]),
        "hardware_cost": _fmt(abat["hardware_cost"]),
        "logistics_cost": _fmt(abat["logistics_cost"]),
        "inoculation_cost": _fmt(abat["inoculation_cost"]),
        "potential_revenue": _fmt(abat["potential_revenue"]),
        "fbb_value": _fmt(calc["fbb_value"]),
        "chart_image": data.get("chart_image", ""),
        "date": date.today().strftime("%d/%m/%Y"),
        "t": t,
    }

    html_string = render_to_string("pdf/report.html", context)
    return HttpResponse(html_string)


def send_pdf_email(request):
    data = json.loads(request.body)
    email_to = data.get("company_email", "")

    if not email_to:
        return JsonResponse({"error": "Correo no proporcionado."}, status=400)

    pdf = _build_pdf(data)
    company_name = data.get("company_name", "Cliente")

    email = EmailMessage(
        subject="Tu diagnóstico financiero — AgroCognitive",
        body=(
            f"Hola {company_name},\n\n"
            "Adjunto encontrarás tu diagnóstico financiero generado "
            "por la calculadora de créditos de carbono de AgroCognitive.\n\n"
            "¡Gracias por tu interés!\n"
            "— Equipo AgroCognitive"
        ),
        to=[email_to],
    )
    email.attach("diagnostico_agrocognitive.pdf", pdf, "application/pdf")
    email.send()

    return JsonResponse({"ok": True})
