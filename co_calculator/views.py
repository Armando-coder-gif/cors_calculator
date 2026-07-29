from django.shortcuts import render
from django.http import JsonResponse
from .services.calculator import CalculatorService


def index(request):
   # TODO: VER SI SE PUEDE COLOCAR EN OTRO LUGAR
   crops = [
        {
            "id": "coffee",
            "name": "Café",
            "icon": "☕"
        },
        {
            "id": "cocoa",
            "name": "Cacao",
            "icon": "🍫"
        },
        {
            "id": "oil_palm",
            "name": "Palma",
            "icon": "🌴"
        },
        {
            "id": "sugarcane",
            "name": "Caña de azúcar",
            "icon": "🎋"
        },
        {
            "id": "citrus",
            "name": "Cítricos",
            "icon": "🍊"
        },
        {
            "id": "poultry",
            "name": "Avícola",
            "icon": "🐔"
        },
    ]
   return render(request, "../templates/index.html", {
        "crops": crops
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
