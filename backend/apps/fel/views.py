from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.usuarios.permissions import IsAdminSupervisorOrContador, IsAdmin
from apps.facturacion.models import Factura
from . import services
from .models import FelCertificacion
from .serializers import FelCertificacionSerializer


class FelViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated, IsAdminSupervisorOrContador]
    queryset = FelCertificacion.objects.select_related("factura").all()
    serializer_class = FelCertificacionSerializer

    @action(detail=False, methods=["post"], url_path="certificar")
    def certificar(self, request):
        factura_id = request.data.get("factura_id")
        if not factura_id:
            return Response({"detail": "Se requiere factura_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            factura = Factura.objects.get(pk=factura_id)
        except Factura.DoesNotExist:
            return Response({"detail": "Factura no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        try:
            fel = services.certificar(factura)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(FelCertificacionSerializer(fel).data, status=status.HTTP_200_OK)

    @action(
        detail=False, methods=["post"], url_path="anular",
        permission_classes=[IsAuthenticated, IsAdmin],
    )
    def anular(self, request):
        factura_id = request.data.get("factura_id")
        motivo     = request.data.get("motivo", "Anulación solicitada")

        if not factura_id:
            return Response({"detail": "Se requiere factura_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            factura = Factura.objects.get(pk=factura_id)
        except Factura.DoesNotExist:
            return Response({"detail": "Factura no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        try:
            fel = services.anular(factura, motivo)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(FelCertificacionSerializer(fel).data, status=status.HTTP_200_OK)
