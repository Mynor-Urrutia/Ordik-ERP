from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompraViewSet, CotizacionProveedorViewSet

router = DefaultRouter()
router.register(r"cotizaciones-proveedor", CotizacionProveedorViewSet, basename="cotizacion-proveedor")
router.register(r"", CompraViewSet, basename="compra")

urlpatterns = [
    path("", include(router.urls)),
]
