from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Compra
from .serializers import CompraSerializer


class CompraViewSet(viewsets.ModelViewSet):
    queryset = (
        Compra.objects
        .select_related("proveedor", "tipo_pago")
        .prefetch_related("items__producto")
    )
    serializer_class = CompraSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["proveedor", "tipo_pago"]
    search_fields = ["correlativo", "proveedor__razon_social"]
    ordering_fields = ["fecha_creacion", "fecha_despacho"]
