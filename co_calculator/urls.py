"""
URL configuration for co_calculator project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path("", views.index, name="index"),
    path("api/countries/", views.countries, name="countries"),
    path("calculate/", views.calculate, name="calculate"),
    path("preview-report/", views.preview_report, name="preview_report"),
    path("download-pdf/", views.download_pdf, name="download_pdf"),
    path("send-pdf-email/", views.send_pdf_email, name="send_pdf_email"),
]
