from rest_framework import viewsets, filters
from .models import OrdenTrabajo
from .serializers import OrdenTrabajoSerializer


class OrdenTrabajoViewSet(viewsets.ModelViewSet):
    queryset = OrdenTrabajo.objects.select_related("cotizacion").all()
    serializer_class = OrdenTrabajoSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["tecnico_asignado", "descripcion"]
