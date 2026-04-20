from django.urls import path
from .views import (
    ResumenDashboardView,
    ReporteVentasView,
    ReporteComprasView,
    ReporteCxCView,
    ReporteInventarioView,
    ReporteOTsView,
)

urlpatterns = [
    path("resumen/",    ResumenDashboardView.as_view(),  name="reportes-resumen"),
    path("ventas/",     ReporteVentasView.as_view(),     name="reportes-ventas"),
    path("compras/",    ReporteComprasView.as_view(),    name="reportes-compras"),
    path("cxc/",        ReporteCxCView.as_view(),        name="reportes-cxc"),
    path("inventario/", ReporteInventarioView.as_view(), name="reportes-inventario"),
    path("ots/",        ReporteOTsView.as_view(),        name="reportes-ots"),
]
