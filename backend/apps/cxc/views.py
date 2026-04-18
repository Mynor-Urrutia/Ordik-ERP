from rest_framework import viewsets, mixins, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.usuarios.permissions import IsAdminSupervisorOrContador, ReadOrAdminSupervisorOrContador
from .models import CuentaPorCobrar, PagoCxC
from .serializers import CuentaPorCobrarSerializer, PagoCxCSerializer


class CuentaPorCobrarViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated, ReadOrAdminSupervisorOrContador]
    queryset = (
        CuentaPorCobrar.objects
        .select_related("factura", "cliente")
        .prefetch_related("pagos")
        .all()
    )
    serializer_class = CuentaPorCobrarSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["estatus", "cliente"]
    search_fields = ["factura__correlativo", "cliente__razon_social"]
    ordering_fields = ["fecha_vencimiento", "saldo_pendiente", "fecha_creacion"]

    @action(detail=True, methods=["post"], url_path="pagar")
    def pagar(self, request, pk=None):
        cuenta = self.get_object()
        serializer = PagoCxCSerializer(data={**request.data, "cuenta": cuenta.pk})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        cuenta = CuentaPorCobrar.objects.prefetch_related("pagos").get(pk=cuenta.pk)
        return Response(CuentaPorCobrarSerializer(cuenta).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="resumen")
    def resumen(self, request):
        from django.db.models import Sum, Q
        from decimal import Decimal
        import datetime

        qs = CuentaPorCobrar.objects.all()
        hoy = datetime.date.today()

        total_pendiente = qs.filter(estatus__in=["pendiente", "parcial"]).aggregate(
            s=Sum("saldo_pendiente")
        )["s"] or Decimal("0")

        total_vencido = qs.filter(
            estatus__in=["pendiente", "parcial"],
            fecha_vencimiento__lt=hoy,
        ).aggregate(s=Sum("saldo_pendiente"))["s"] or Decimal("0")

        total_cobrado_mes = (
            PagoCxC.objects.filter(
                fecha_pago__year=hoy.year,
                fecha_pago__month=hoy.month,
            ).aggregate(s=Sum("monto"))["s"] or Decimal("0")
        )

        return Response({
            "total_pendiente":    total_pendiente,
            "total_vencido":      total_vencido,
            "total_cobrado_mes":  total_cobrado_mes,
            "cantidad_pendientes": qs.filter(estatus__in=["pendiente", "parcial"]).count(),
        })
