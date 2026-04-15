from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import OrdenTrabajo
from .serializers import OrdenTrabajoSerializer


class OrdenTrabajoViewSet(viewsets.ModelViewSet):
    queryset = OrdenTrabajo.objects.select_related("cotizacion").all()
    serializer_class = OrdenTrabajoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["cliente"]
    search_fields = ["tecnico_asignado", "descripcion"]
