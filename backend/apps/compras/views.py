from rest_framework import viewsets
from .models import Compra
from .serializers import CompraSerializer


class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compra.objects.select_related("proveedor").prefetch_related("items__producto")
    serializer_class = CompraSerializer
