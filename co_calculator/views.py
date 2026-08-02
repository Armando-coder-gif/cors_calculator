import io
import json
from datetime import date

from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from xhtml2pdf import pisa

from .services.calculator import CalculatorService
from .constants.crops import CROPS


def index(request):
   return render(request, "../templates/index.html", {
        "crops": CROPS
    })

def calculate(request):

    crop = request.POST["crop"]

    tons = float(request.POST["tons"])

    hectares = float(request.POST["hectares"])


    service = CalculatorService()

    result = service.calculate(
        crop,
        tons,
        hectares
    )

    return JsonResponse(result)


def _build_pdf(data):
    crop = data["crop"]
    tons = float(data["tons"])
    hectares = float(data["hectares"])

    service = CalculatorService()
    result = service.calculate(crop, tons, hectares)
    calc = result["calculations"]

    context = {
        "company_name": data.get("company_name", ""),
        "company_email": data.get("company_email", ""),
        "company_country": data.get("company_country", ""),
        "crop": crop,
        "tons": tons,
        "hectares": hectares,
        "co2_removed": calc["co2_removed"],
        "dry_biomass": calc["dry_biomass"],
        "biochar": calc["biochar"],
        "corcs_value": f"{calc['corcs_value']:,.2f}",
        "agrocognitive_cost": f"{calc['agrocognitive_cost']:,.2f}",
        "net_gain": f"{calc['net_gain']:,.2f}",
        "chart_image": data.get("chart_image", ""),
        "date": date.today().strftime("%d/%m/%Y"),
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
