from rest_framework.routers import DefaultRouter
from .views import (
    MarcaViewSet, ModeloViewSet, TipoPagoViewSet, TipoTrabajoViewSet,
    TipoEstatusViewSet, TipoServicioViewSet, PersonalViewSet, TipoClienteViewSet,
    TipoProductoViewSet,
)

router = DefaultRouter()
router.register("marcas", MarcaViewSet, basename="marca")
router.register("modelos", ModeloViewSet, basename="modelo")
router.register("tipos-pago", TipoPagoViewSet, basename="tipo-pago")
router.register("tipos-trabajo", TipoTrabajoViewSet, basename="tipo-trabajo")
router.register("tipos-estatus", TipoEstatusViewSet, basename="tipo-estatus")
router.register("tipos-servicio", TipoServicioViewSet, basename="tipo-servicio")
router.register("personal", PersonalViewSet, basename="personal")
router.register("tipos-cliente", TipoClienteViewSet, basename="tipo-cliente")
router.register("tipos-producto", TipoProductoViewSet, basename="tipo-producto")

urlpatterns = router.urls
