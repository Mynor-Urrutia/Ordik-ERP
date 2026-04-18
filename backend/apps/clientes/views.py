from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from apps.usuarios.permissions import ReadOrAdminSupervisorOrVendedor
from .models import Cliente
from .serializers import ClienteSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    queryset           = Cliente.objects.all()
    serializer_class   = ClienteSerializer
    permission_classes = [IsAuthenticated, ReadOrAdminSupervisorOrVendedor]
    filter_backends    = [filters.SearchFilter]
    search_fields      = ["razon_social", "nit", "nombre_comercial"]
