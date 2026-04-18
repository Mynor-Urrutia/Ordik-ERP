from rest_framework import viewsets, filters
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from apps.usuarios.permissions import ReadOrAdminSupervisor, IsAdmin
from .models import (
    Marca, Modelo, TipoPago, TipoTrabajo, TipoEstatus, TipoServicio,
    Personal, TipoCliente, TipoProducto, EmpresaConfig,
    CategoriaProducto, UnidadMedida, MotivoSalida,
)
from .serializers import (
    MarcaSerializer, ModeloSerializer, TipoPagoSerializer, TipoTrabajoSerializer,
    TipoEstatusSerializer, TipoServicioSerializer, PersonalSerializer, TipoClienteSerializer,
    TipoProductoSerializer, EmpresaConfigSerializer,
    CategoriaProductoSerializer, UnidadMedidaSerializer, MotivoSalidaSerializer,
)

_PERM = [IsAuthenticated, ReadOrAdminSupervisor]


class MarcaViewSet(viewsets.ModelViewSet):
    queryset           = Marca.objects.all()
    serializer_class   = MarcaSerializer
    permission_classes = _PERM
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["activo"]
    search_fields      = ["nombre"]
    ordering_fields    = ["nombre"]


class ModeloViewSet(viewsets.ModelViewSet):
    queryset           = Modelo.objects.select_related("marca").all()
    serializer_class   = ModeloSerializer
    permission_classes = _PERM
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["activo", "marca"]
    search_fields      = ["nombre", "marca__nombre"]
    ordering_fields    = ["nombre", "marca__nombre"]


class TipoPagoViewSet(viewsets.ModelViewSet):
    queryset           = TipoPago.objects.all()
    serializer_class   = TipoPagoSerializer
    permission_classes = _PERM
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["activo"]
    search_fields      = ["nombre"]


class TipoTrabajoViewSet(viewsets.ModelViewSet):
    queryset           = TipoTrabajo.objects.all()
    serializer_class   = TipoTrabajoSerializer
    permission_classes = _PERM
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["activo"]
    search_fields      = ["nombre"]


class TipoEstatusViewSet(viewsets.ModelViewSet):
    queryset           = TipoEstatus.objects.all()
    serializer_class   = TipoEstatusSerializer
    permission_classes = _PERM
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["activo", "modulo"]
    search_fields      = ["nombre"]


class TipoServicioViewSet(viewsets.ModelViewSet):
    queryset           = TipoServicio.objects.all()
    serializer_class   = TipoServicioSerializer
    permission_classes = _PERM
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["activo"]
    search_fields      = ["nombre"]


class PersonalViewSet(viewsets.ModelViewSet):
    queryset           = Personal.objects.all()
    serializer_class   = PersonalSerializer
    permission_classes = _PERM
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["activo"]
    search_fields      = ["nombre", "cargo", "email"]


class TipoClienteViewSet(viewsets.ModelViewSet):
    queryset           = TipoCliente.objects.all()
    serializer_class   = TipoClienteSerializer
    permission_classes = _PERM
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["activo"]
    search_fields      = ["nombre"]


class TipoProductoViewSet(viewsets.ModelViewSet):
    queryset           = TipoProducto.objects.all()
    serializer_class   = TipoProductoSerializer
    permission_classes = _PERM
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["activo"]
    search_fields      = ["nombre"]


class CategoriaProductoViewSet(viewsets.ModelViewSet):
    queryset           = CategoriaProducto.objects.all()
    serializer_class   = CategoriaProductoSerializer
    permission_classes = _PERM
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["activo"]
    search_fields      = ["nombre"]


class UnidadMedidaViewSet(viewsets.ModelViewSet):
    queryset           = UnidadMedida.objects.all()
    serializer_class   = UnidadMedidaSerializer
    permission_classes = _PERM
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["activo"]
    search_fields      = ["nombre", "abreviatura"]


class MotivoSalidaViewSet(viewsets.ModelViewSet):
    queryset           = MotivoSalida.objects.all()
    serializer_class   = MotivoSalidaSerializer
    permission_classes = _PERM
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["activo"]
    search_fields      = ["nombre"]


class EmpresaConfigView(RetrieveUpdateAPIView):
    serializer_class   = EmpresaConfigSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_object(self):
        obj, _ = EmpresaConfig.objects.get_or_create(pk=1)
        return obj
