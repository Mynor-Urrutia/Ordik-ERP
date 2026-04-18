from rest_framework.routers import DefaultRouter
from .views import CuentaPorCobrarViewSet

router = DefaultRouter()
router.register(r"", CuentaPorCobrarViewSet, basename="cxc")

urlpatterns = router.urls
