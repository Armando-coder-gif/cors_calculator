import base64
import io
import json
from datetime import date
from pathlib import Path

import pycountry
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from xhtml2pdf import pisa

from .services.calculator import CalculatorService
from .constants.crops import CROPS
from .constants.economic import KILNS

from django.shortcuts import render
from django.views.decorators.clickjacking import xframe_options_exempt  # 1. Importar el decorador

_I18N_DIR = Path(settings.BASE_DIR) / "co_calculator" / "static" / "i18n"


def _load_translations(lang):
    path = _I18N_DIR / f"{lang}.json"
    if not path.exists():
        path = _I18N_DIR / "es.json"
    return json.loads(path.read_text(encoding="utf-8"))



@xframe_options_exempt
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

@csrf_exempt
def calculate(request):

    crop = request.POST.get("crop", "")
    kiln_id = request.POST.get("kiln_id", "")

    try:
        tons = float(request.POST.get("tons", 0))
        hectares = float(request.POST.get("hectares", 0))
    except (ValueError, TypeError):
        return JsonResponse({"error": "Valores numéricos inválidos."}, status=400)

    service = CalculatorService()

    try:
        result = service.calculate(crop, tons, hectares, kiln_id=kiln_id or None)
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse(result)


def _fmt(value):
    """Format number with dots as thousands separator and comma as decimal."""
    formatted = f"{value:,.2f}"
    # Swap: comma->X, dot->comma, X->dot
    return formatted.replace(",", "X").replace(".", ",").replace("X", ".")


def _get_logo_b64():
    logo_path = Path(settings.BASE_DIR) / "co_calculator" / "static" / "pics" / "AgroCognitive - Original Version White.jpg"
    if logo_path.exists():
        data = logo_path.read_bytes()
        return f"data:image/jpeg;base64,{base64.b64encode(data).decode()}"
    return ""


def _pdf_safe_translations(t):
    """Replace Unicode subscripts with HTML <sub> for xhtml2pdf compatibility."""
    result = {}
    for k, v in t.items():
        if isinstance(v, str):
            v = v.replace("CO₂ₑ", "CO<sub>2</sub>e").replace("CO₂", "CO<sub>2</sub>")
        result[k] = v
    return result


def _report_context(data):
    crop = data["crop"]
    tons = float(data["tons"])
    hectares = float(data["hectares"])
    kiln_id = data.get("kiln_id") or None
    t = _pdf_safe_translations(_load_translations(data.get("lang", "es")))

    service = CalculatorService()
    result = service.calculate(crop, tons, hectares, kiln_id=kiln_id)
    calc = result["calculations"]
    abat = result["abatement"]
    roi = result["roi"]

    # Replace dynamic legend placeholders
    t["results_legend_pyrolysis"] = t["results_legend_pyrolysis"].replace(
        "{yield_pct}", str(calc["pyrolysis_yield"]))
    t["results_legend_removal"] = t["results_legend_removal"].replace(
        "{co2_factor}", str(calc["co2_factor"]))
    t["results_legend_humidity"] = t["results_legend_humidity"].replace(
        "{moisture_pct}", str(calc["moisture"]))

    return {
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
        "fertilizer_mix": _fmt(calc["fertilizer_mix"]),
        "corcs_value": _fmt(calc["corcs_value"]),
        "agrocognitive_cost": _fmt(calc["agrocognitive_cost"]),
        "total_investment": _fmt(abat["total_investment"]),
        "subscription_cost": _fmt(abat["fee_saas"]),
        "management_cost": _fmt(abat["fee_management"]),
        "dmrv_cost": _fmt(abat["fee_dmrv"]),
        "onboarding_lca_cost": _fmt(abat["fee_onboarding_lca"]),
        "csink_cert_cost": _fmt(abat["fee_csink_cert"]),
        "kiln_name": abat["kiln_name"],
        "kiln_annual_cost": _fmt(abat["kiln_annual_cost"]),
        "amortization_years": abat["amortization_years"],
        "labor_cost": _fmt(abat["labor_cost"]),
        "logistics_cost": _fmt(abat["logistics_cost"]),
        "inoculation_cost": _fmt(abat["inoculation_cost"]),
        "potential_revenue": _fmt(abat["potential_revenue"]),
        "fbb_value": _fmt(calc["fbb_value"]),
        "annual_net_profit": _fmt(roi["annual_net_profit"]),
        "chart_image": data.get("chart_image", ""),
        "logo_b64": _get_logo_b64(),
        "date": date.today().strftime("%d/%m/%Y"),
        "t": t,
    }

@csrf_exempt
def _build_pdf(data):
    context = _report_context(data)

    html_string = render_to_string("pdf/report.html", context)
    buffer = io.BytesIO()
    pisa.CreatePDF(html_string, dest=buffer)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

@csrf_exempt
def download_pdf(request):
    data = json.loads(request.body)
    pdf = _build_pdf(data)

    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="diagnostico_agrocognitive.pdf"'
    return response

@csrf_exempt
def preview_report(request):
    data = json.loads(request.body)
    context = _report_context(data)

    html_string = render_to_string("pdf/report.html", context)
    return HttpResponse(html_string)

@csrf_exempt
def send_pdf_email(request):
    data = json.loads(request.body)
    email_to = data.get("company_email", "")

    if not email_to:
        return JsonResponse({"error": "Correo no proporcionado."}, status=400)

    pdf = _build_pdf(data)
    company_name = data.get("company_name", "Cliente")
    sender_email = (settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER or "").strip()
    cc_recipients = [sender_email] if sender_email and sender_email.lower() != email_to.lower() else []

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
        cc=cc_recipients,
    )
    email.attach("diagnostico_agrocognitive.pdf", pdf, "application/pdf")
    email.send()

    return JsonResponse({"ok": True})


@csrf_exempt
def send_report_to_sender(request):
    """Envío automático silencioso del diagnóstico al correo del remitente (AgroCognitive)."""
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({"error": "Payload JSON inválido."}, status=400)

    sender_email = (
        getattr(settings, "DEFAULT_FROM_EMAIL", None)
        or getattr(settings, "EMAIL_HOST_USER", None)
        or ""
    ).strip()

    if not sender_email:
        return JsonResponse({"error": "Sender email no configurado."}, status=500)

    try:
        pdf = _build_pdf(data)
    except Exception as e:
        return JsonResponse({"error": f"Error generando PDF: {str(e)}"}, status=500)

    company_name = data.get("company_name", "Cliente")
    person_name = data.get("person_name", "No especificado")
    person_phone = data.get("person_phone", "No indicado")
    company_email = data.get("company_email", "No indicado")

    email = EmailMessage(
        subject=f"Nuevo Diagnóstico Generado — {company_name}",
        body=(
            f"Se ha completado un nuevo diagnóstico en la calculadora ROI:\n\n"
            f"• Empresa: {company_name}\n"
            f"• Contacto: {person_name}\n"
            f"• Teléfono: {person_phone}\n"
            f"• Email cliente: {company_email}\n"
            f"• Cultivo: {data.get('crop', 'N/A')}\n"
            f"• Hectáreas: {data.get('hectares', 'N/A')}\n"
            f"• Toneladas: {data.get('tons', 'N/A')}\n\n"
            f"Adjunto se encuentra el diagnóstico financiero detallado."
        ),
        from_email=sender_email,
        to=["ajgu2001@yahoo.com"], #sender_email
    )
    email.attach("diagnostico_agrocognitive.pdf", pdf, "application/pdf")
    email.send(fail_silently=False)

    return JsonResponse({"ok": True})