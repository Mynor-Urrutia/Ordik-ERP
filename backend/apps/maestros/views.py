from rest_framework import viewsets, filters
from rest_framework.generics import RetrieveUpdateAPIView
from django_filters.rest_framework import DjangoFilterBackend
from .models import Marca, Modelo, TipoPago, TipoTrabajo, TipoEstatus, TipoServicio, Personal, TipoCliente, TipoProducto, EmpresaConfig
from .serializers import (
    MarcaSerializer, ModeloSerializer, TipoPagoSerializer, TipoTrabajoSerializer,
    TipoEstatusSerializer, TipoServicioSerializer, PersonalSerializer, TipoClienteSerializer,
    TipoProductoSerializer, EmpresaConfigSerializer,
)


class MarcaViewSet(viewsets.ModelViewSet):
    queryset = Marca.objects.all()
    serializer_class = MarcaSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["activo"]
    search_fields = ["nombre"]
    ordering_fields = ["nombre"]


class ModeloViewSet(viewsets.ModelViewSet):
    queryset = Modelo.objects.select_related("marca").all()
    serializer_class = ModeloSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["activo", "marca"]
    search_fields = ["nombre", "marca__nombre"]
    ordering_fields = ["nombre", "marca__nombre"]


class TipoPagoViewSet(viewsets.ModelViewSet):
    queryset = TipoPago.objects.all()
    serializer_class = TipoPagoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["activo"]
    search_fields = ["nombre"]


class TipoTrabajoViewSet(viewsets.ModelViewSet):
    queryset = TipoTrabajo.objects.all()
    serializer_class = TipoTrabajoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["activo"]
    search_fields = ["nombre"]


class TipoEstatusViewSet(viewsets.ModelViewSet):
    queryset = TipoEstatus.objects.all()
    serializer_class = TipoEstatusSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["activo", "modulo"]
    search_fields = ["nombre"]


class TipoServicioViewSet(viewsets.ModelViewSet):
    queryset = TipoServicio.objects.all()
    serializer_class = TipoServicioSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["activo"]
    search_fields = ["nombre"]


class PersonalViewSet(viewsets.ModelViewSet):
    queryset = Personal.objects.all()
    serializer_class = PersonalSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["activo"]
    search_fields = ["nombre", "cargo", "email"]


class TipoClienteViewSet(viewsets.ModelViewSet):
    queryset = TipoCliente.objects.all()
    serializer_class = TipoClienteSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["activo"]
    search_fields = ["nombre"]


class TipoProductoViewSet(viewsets.ModelViewSet):
    queryset = TipoProducto.objects.all()
    serializer_class = TipoProductoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["activo"]
    search_fields = ["nombre"]


class EmpresaConfigView(RetrieveUpdateAPIView):
    serializer_class = EmpresaConfigSerializer

    def get_object(self):
        obj, _ = EmpresaConfig.objects.get_or_create(pk=1)
        return obj
