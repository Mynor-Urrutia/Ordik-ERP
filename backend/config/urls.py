from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/clientes/", include("apps.clientes.urls")),
    path("api/proveedores/", include("apps.proveedores.urls")),
    path("api/ordenes-trabajo/", include("apps.ordenes_trabajo.urls")),
    path("api/cotizaciones/", include("apps.cotizaciones.urls")),
    path("api/inventario/", include("apps.inventario.urls")),
    path("api/compras/", include("apps.compras.urls")),
    path("api/maestros/", include("apps.maestros.urls")),
]
