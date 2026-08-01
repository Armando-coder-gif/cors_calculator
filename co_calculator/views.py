from django.shortcuts import render
from django.http import JsonResponse
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
