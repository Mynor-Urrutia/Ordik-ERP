from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Compra, CompraHistorial
from .serializers import CompraSerializer


class CompraViewSet(viewsets.ModelViewSet):
    queryset = (
        Compra.objects
        .select_related("proveedor", "tipo_pago")
        .prefetch_related("items__producto", "historial")
    )
    serializer_class = CompraSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["proveedor", "tipo_pago"]
    search_fields = ["correlativo", "proveedor__razon_social"]
    ordering_fields = ["fecha_creacion", "fecha_despacho"]

    @action(detail=True, methods=["post"], url_path="cambiar-estatus")
    def cambiar_estatus(self, request, pk=None):
        compra = self.get_object()
        nuevo = request.data.get("estatus", "").strip()

        estatus_validos = [c[0] for c in Compra.ESTATUS_CHOICES]
        if nuevo not in estatus_validos:
            return Response(
                {"error": f"Estatus inválido. Opciones: {', '.join(estatus_validos)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if nuevo == compra.estatus:
            return Response(CompraSerializer(compra).data)

        anterior = compra.estatus
        compra.estatus = nuevo
        compra.save(update_fields=["estatus"])

        CompraHistorial.objects.create(
            compra=compra,
            tipo="estatus",
            descripcion=f"Estatus cambiado: {anterior} → {nuevo}",
            valor_anterior=anterior,
            valor_nuevo=nuevo,
        )

        compra.refresh_from_db()
        return Response(CompraSerializer(compra).data)
