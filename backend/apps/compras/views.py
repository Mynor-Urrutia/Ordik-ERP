from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Compra, CotizacionProveedor
from .serializers import CompraSerializer, CotizacionProveedorSerializer


class CotizacionProveedorViewSet(viewsets.ModelViewSet):
    queryset = CotizacionProveedor.objects.select_related("proveedor").prefetch_related("items__producto")
    serializer_class = CotizacionProveedorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["proveedor"]
    search_fields = ["correlativo", "proveedor__razon_social"]
    ordering_fields = ["fecha", "fecha_creacion"]


class CompraViewSet(viewsets.ModelViewSet):
    queryset = (
        Compra.objects
        .select_related("proveedor", "tipo_pago", "cotizacion_proveedor")
        .prefetch_related("items__producto")
    )
    serializer_class = CompraSerializer
