from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from apps.usuarios.permissions import ReadOrAdminSupervisor
from .models import Proveedor
from .serializers import ProveedorSerializer


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset           = Proveedor.objects.all()
    serializer_class   = ProveedorSerializer
    permission_classes = [IsAuthenticated, ReadOrAdminSupervisor]
    filter_backends    = [filters.SearchFilter]
    search_fields      = ["razon_social", "nit", "nombre_comercial"]
