from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductoViewSet, MovimientoInventarioViewSet, UnidadSeriadaViewSet

router = DefaultRouter()
router.register(r"productos", ProductoViewSet, basename="producto")
router.register(r"movimientos", MovimientoInventarioViewSet, basename="movimiento")
router.register(r"unidades-serie", UnidadSeriadaViewSet, basename="unidad-serie")

urlpatterns = [path("", include(router.urls))]
