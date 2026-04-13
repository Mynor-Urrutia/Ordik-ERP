from rest_framework import viewsets, filters
from .models import Proveedor
from .serializers import ProveedorSerializer


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["razon_social", "nit", "nombre_comercial"]
