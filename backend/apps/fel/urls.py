from rest_framework.routers import DefaultRouter
from .views import FelViewSet

router = DefaultRouter()
router.register(r"", FelViewSet, basename="fel")

urlpatterns = router.urls
