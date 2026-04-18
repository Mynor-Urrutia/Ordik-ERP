from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class ResumenDashboardView(APIView):
    """Datos agregados para el módulo de Reportes."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.facturacion.models import Factura
        from apps.ordenes_trabajo.models import OrdenTrabajo
        from apps.inventario.models import Producto
        from apps.compras.models import Compra

        # ── Ventas por mes (últimos 12 meses) ───────────────────────────────
        ventas_mes = (
            Factura.objects
            .filter(estatus__in=["emitida", "pagada"])
            .annotate(mes=TruncMonth("fecha_emision"))
            .values("mes")
            .annotate(total=Sum("items__precio_unitario"))   # aproximado; el total real lo calcula Python
            .order_by("mes")
        )

        # Total real por factura (la propiedad .total es Python, no SQL)
        # Hacemos el aggregate por mes de forma correcta:
        from django.db.models import DecimalField, ExpressionWrapper, F
        from decimal import Decimal

        facturas_pagadas = (
            Factura.objects
            .filter(estatus__in=["emitida", "pagada"])
            .prefetch_related("items")
            .order_by("fecha_emision")
        )

        ventas_dict = {}
        for fac in facturas_pagadas:
            key = fac.fecha_emision.strftime("%Y-%m")
            ventas_dict[key] = ventas_dict.get(key, Decimal("0")) + fac.total

        ventas_por_mes = [
            {"mes": k, "total": float(v)}
            for k, v in sorted(ventas_dict.items())
        ][-12:]

        # ── OTs por estatus ──────────────────────────────────────────────────
        ots_por_estatus = list(
            OrdenTrabajo.objects
            .values("estatus")
            .annotate(total=Count("id"))
            .order_by("-total")
        )

        # ── Productos con stock bajo (stock < 5) ─────────────────────────────
        stock_bajo = list(
            Producto.objects
            .filter(stock_actual__lt=5, activo=True)
            .values("nombre", "stock_actual", "stock_minimo")
            .order_by("stock_actual")[:20]
        )

        # ── Compras por mes (últimos 6 meses) ─────────────────────────────────
        from apps.compras.models import CompraItem
        compras_dict = {}
        for item in CompraItem.objects.select_related("compra").filter(
            compra__estatus__in=["Recibida", "Confirmada"]
        ):
            key = item.compra.fecha_despacho.strftime("%Y-%m")
            monto = float(item.cantidad) * float(item.costo_unitario)
            compras_dict[key] = compras_dict.get(key, 0) + monto

        compras_por_mes = [
            {"mes": k, "total": round(v, 2)}
            for k, v in sorted(compras_dict.items())
        ][-6:]

        # ── Facturas por estatus ──────────────────────────────────────────────
        facturas_estatus = list(
            Factura.objects
            .values("estatus")
            .annotate(total=Count("id"))
        )

        # ── KPIs resumen ──────────────────────────────────────────────────────
        total_facturado = sum(v["total"] for v in ventas_por_mes)
        total_clientes  = (
            Factura.objects.filter(estatus__in=["emitida","pagada"])
            .values("cliente").distinct().count()
        )

        return Response({
            "ventas_por_mes":    ventas_por_mes,
            "ots_por_estatus":   ots_por_estatus,
            "stock_bajo":        stock_bajo,
            "compras_por_mes":   compras_por_mes,
            "facturas_estatus":  facturas_estatus,
            "kpis": {
                "total_facturado": round(total_facturado, 2),
                "clientes_activos": total_clientes,
                "ots_abiertas": OrdenTrabajo.objects.exclude(
                    estatus__in=["Finalizado", "Cancelado", "finalizado", "cancelado"]
                ).count(),
                "productos_stock_bajo": len(stock_bajo),
            },
        })
