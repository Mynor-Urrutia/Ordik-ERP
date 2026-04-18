from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from apps.usuarios.views import CustomTokenObtainPairView, MeView, LogoutView

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth
    path("api/auth/login/",   CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(),          name="token_refresh"),
    path("api/auth/me/",      MeView.as_view(),                    name="me"),
    path("api/auth/logout/",  LogoutView.as_view(),                name="logout"),
    # Gestión de usuarios
    path("api/usuarios/", include("apps.usuarios.urls")),
    # Módulos
    path("api/clientes/", include("apps.clientes.urls")),
    path("api/proveedores/", include("apps.proveedores.urls")),
    path("api/ordenes-trabajo/", include("apps.ordenes_trabajo.urls")),
    path("api/cotizaciones/", include("apps.cotizaciones.urls")),
    path("api/inventario/", include("apps.inventario.urls")),
    path("api/compras/", include("apps.compras.urls")),
    path("api/maestros/", include("apps.maestros.urls")),
    path("api/facturas/", include("apps.facturacion.urls")),
    path("api/reportes/", include("apps.reportes.urls")),
]
