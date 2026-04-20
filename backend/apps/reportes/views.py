from decimal import Decimal
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.usuarios.permissions import (
    IsAdminSupervisorOrContador,
    IsAdminSupervisorBodegueroOrContador,
    IsAnyAuthenticated,
)


# ── helpers ───────────────────────────────────────────────────────────────────

def _parse_date(val):
    """Return None if val is empty/None, otherwise the string (Django accepts ISO)."""
    return val if val else None


# ── Ventas ────────────────────────────────────────────────────────────────────

class ReporteVentasView(APIView):
    """Ventas: admin, supervisor, contador."""
    permission_classes = [IsAuthenticated, IsAdminSupervisorOrContador]

    def get(self, request):
        from apps.facturacion.models import Factura

        fecha_desde = _parse_date(request.query_params.get("fecha_desde"))
        fecha_hasta = _parse_date(request.query_params.get("fecha_hasta"))

        qs = Factura.objects.prefetch_related("items").select_related("cliente")
        if fecha_desde:
            qs = qs.filter(fecha_emision__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha_emision__lte=fecha_hasta)
        qs = qs.order_by("-fecha_emision")

        facturas = list(qs)

        # ventas por mes (sólo emitidas/pagadas para el gráfico)
        ventas_dict = {}
        total_ingresos = Decimal("0")
        for f in facturas:
            if f.estatus in ("emitida", "pagada"):
                key = f.fecha_emision.strftime("%Y-%m")
                t = f.total
                ventas_dict[key] = ventas_dict.get(key, Decimal("0")) + t
                total_ingresos += t

        ventas_por_mes = [
            {"mes": k, "total": float(v)}
            for k, v in sorted(ventas_dict.items())
        ]

        cantidad_cobradas = sum(1 for f in facturas if f.estatus in ("emitida", "pagada"))
        promedio = float(total_ingresos / cantidad_cobradas) if cantidad_cobradas else 0

        tabla = [
            {
                "correlativo": f.correlativo,
                "cliente": f.cliente.razon_social,
                "fecha": str(f.fecha_emision),
                "estatus": f.estatus,
                "total": float(f.total),
            }
            for f in facturas[:200]
        ]

        return Response({
            "kpis": {
                "total_ingresos": float(total_ingresos),
                "cantidad_facturas": len(facturas),
                "promedio_factura": round(promedio, 2),
            },
            "ventas_por_mes": ventas_por_mes,
            "tabla": tabla,
        })


# ── Compras ───────────────────────────────────────────────────────────────────

class ReporteComprasView(APIView):
    """Compras: admin, supervisor, bodeguero, contador."""
    permission_classes = [IsAuthenticated, IsAdminSupervisorBodegueroOrContador]

    def get(self, request):
        from apps.compras.models import Compra, CompraItem

        fecha_desde = _parse_date(request.query_params.get("fecha_desde"))
        fecha_hasta = _parse_date(request.query_params.get("fecha_hasta"))

        qs = Compra.objects.prefetch_related("items").select_related("proveedor")
        if fecha_desde:
            qs = qs.filter(fecha_despacho__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha_despacho__lte=fecha_hasta)
        qs = qs.order_by("-fecha_despacho")

        compras = list(qs)

        def _total_compra(c):
            return sum(
                float(it.cantidad) * float(it.costo_unitario)
                for it in c.items.all()
            )

        compras_dict = {}
        total_general = 0
        for c in compras:
            if c.estatus in ("Confirmada", "Recibida"):
                key = c.fecha_despacho.strftime("%Y-%m")
                t = _total_compra(c)
                compras_dict[key] = compras_dict.get(key, 0) + t
                total_general += t

        compras_por_mes = [
            {"mes": k, "total": round(v, 2)}
            for k, v in sorted(compras_dict.items())
        ]

        tabla = [
            {
                "correlativo": c.correlativo,
                "proveedor": c.proveedor.razon_social,
                "fecha": str(c.fecha_despacho),
                "estatus": c.estatus,
                "total": round(_total_compra(c), 2),
            }
            for c in compras[:200]
        ]

        return Response({
            "kpis": {
                "total_comprado": round(total_general, 2),
                "cantidad_ordenes": len(compras),
                "promedio_orden": round(total_general / len(compras), 2) if compras else 0,
            },
            "compras_por_mes": compras_por_mes,
            "tabla": tabla,
        })


# ── CxC ───────────────────────────────────────────────────────────────────────

class ReporteCxCView(APIView):
    """CxC: admin, supervisor, contador."""
    permission_classes = [IsAuthenticated, IsAdminSupervisorOrContador]

    def get(self, request):
        from apps.cxc.models import CuentaPorCobrar

        cuentas = list(
            CuentaPorCobrar.objects
            .select_related("cliente", "factura")
            .order_by("fecha_vencimiento")
        )

        total_pendiente = sum(
            c.saldo_pendiente for c in cuentas if c.estatus in ("pendiente", "parcial", "vencida")
        )
        total_vencido = sum(
            c.saldo_pendiente for c in cuentas if c.estatus == "vencida"
        )
        total_cobrado = sum(
            c.monto_original - c.saldo_pendiente for c in cuentas
        )

        por_estatus = {}
        for c in cuentas:
            por_estatus[c.estatus] = por_estatus.get(c.estatus, 0) + 1

        estatus_chart = [{"estatus": k, "total": v} for k, v in por_estatus.items()]

        tabla = [
            {
                "factura": c.factura.correlativo,
                "cliente": c.cliente.razon_social,
                "monto_original": float(c.monto_original),
                "saldo_pendiente": float(c.saldo_pendiente),
                "fecha_vencimiento": str(c.fecha_vencimiento),
                "estatus": c.estatus,
            }
            for c in cuentas[:200]
        ]

        return Response({
            "kpis": {
                "total_pendiente": float(total_pendiente),
                "total_vencido": float(total_vencido),
                "total_cobrado": float(total_cobrado),
                "cantidad_cuentas": len(cuentas),
            },
            "por_estatus": estatus_chart,
            "tabla": tabla,
        })


# ── Inventario ────────────────────────────────────────────────────────────────

class ReporteInventarioView(APIView):
    """Inventario: admin, supervisor, bodeguero, contador."""
    permission_classes = [IsAuthenticated, IsAdminSupervisorBodegueroOrContador]

    def get(self, request):
        from apps.inventario.models import Producto

        productos = list(
            Producto.objects.filter(activo=True).order_by("nombre")
        )

        sin_stock = sum(1 for p in productos if p.stock_actual <= 0)
        stock_bajo = sum(1 for p in productos if 0 < p.stock_actual < (p.stock_minimo or 5))
        valor_total = sum(
            float(p.stock_actual) * float(p.costo_unitario or 0)
            for p in productos
        )

        tabla = [
            {
                "nombre": p.nombre,
                "codigo": p.cod_producto or "",
                "stock_actual": p.stock_actual,
                "stock_minimo": p.stock_minimo,
                "costo_unitario": float(p.costo_unitario or 0),
                "estado": (
                    "sin_stock" if p.stock_actual <= 0
                    else "bajo" if p.stock_actual < (p.stock_minimo or 1)
                    else "ok"
                ),
            }
            for p in productos
        ]

        return Response({
            "kpis": {
                "total_productos": len(productos),
                "sin_stock": sin_stock,
                "stock_bajo": stock_bajo,
                "valor_inventario": round(valor_total, 2),
            },
            "tabla": tabla,
        })


# ── Órdenes de Trabajo ────────────────────────────────────────────────────────

class ReporteOTsView(APIView):
    """OTs: todos los roles autenticados."""
    permission_classes = [IsAuthenticated, IsAnyAuthenticated]

    def get(self, request):
        from apps.ordenes_trabajo.models import OrdenTrabajo

        from django.utils.timezone import make_aware
        from datetime import datetime

        fecha_desde = _parse_date(request.query_params.get("fecha_desde"))
        fecha_hasta = _parse_date(request.query_params.get("fecha_hasta"))

        qs = OrdenTrabajo.objects.select_related("cliente")
        if fecha_desde:
            qs = qs.filter(fecha_creacion__gte=make_aware(datetime.strptime(fecha_desde, "%Y-%m-%d")))
        if fecha_hasta:
            qs = qs.filter(fecha_creacion__lte=make_aware(datetime.strptime(fecha_hasta, "%Y-%m-%d").replace(hour=23, minute=59, second=59)))
        qs = qs.order_by("-fecha_creacion")

        ots = list(qs)

        por_estatus = {}
        for o in ots:
            key = o.estatus or "Sin estatus"
            por_estatus[key] = por_estatus.get(key, 0) + 1

        estatus_chart = [{"estatus": k, "total": v} for k, v in por_estatus.items()]

        abiertas = sum(1 for o in ots if not o.fecha_finalizado and o.estatus not in ("Cancelado", "cancelado"))
        en_curso = sum(1 for o in ots if o.fecha_inicio and not o.fecha_finalizado)
        finalizadas = sum(1 for o in ots if o.fecha_finalizado)

        tabla = [
            {
                "correlativo": f"OT-{o.id:04d}",
                "cliente": o.cliente.razon_social if o.cliente else "—",
                "tipo_trabajo": o.tipo_trabajo,
                "tecnico": o.tecnico_asignado or "—",
                "estatus": o.estatus or "—",
                "fecha_creacion": str(o.fecha_creacion.date()),
                "fecha_finalizado": str(o.fecha_finalizado) if o.fecha_finalizado else None,
            }
            for o in ots[:200]
        ]

        return Response({
            "kpis": {
                "total": len(ots),
                "abiertas": abiertas,
                "en_curso": en_curso,
                "finalizadas": finalizadas,
            },
            "por_estatus": estatus_chart,
            "tabla": tabla,
        })


# ── Legacy ────────────────────────────────────────────────────────────────────

class ResumenDashboardView(APIView):
    """Mantenido por compatibilidad — usar los endpoints específicos en su lugar."""
    permission_classes = [IsAuthenticated, IsAdminSupervisorOrContador]

    def get(self, request):
        from apps.facturacion.models import Factura
        from apps.ordenes_trabajo.models import OrdenTrabajo
        from apps.inventario.models import Producto
        from apps.compras.models import CompraItem

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

        ots_por_estatus = list(
            OrdenTrabajo.objects
            .values("estatus")
            .annotate(total=Count("id"))
            .order_by("-total")
        )

        stock_bajo = list(
            Producto.objects
            .filter(stock_actual__lt=5, activo=True)
            .values("nombre", "stock_actual", "stock_minimo")
            .order_by("stock_actual")[:20]
        )

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

        from apps.facturacion.models import Factura as F2
        facturas_estatus = list(
            F2.objects.values("estatus").annotate(total=Count("id"))
        )

        total_facturado = sum(v["total"] for v in ventas_por_mes)
        total_clientes = (
            F2.objects.filter(estatus__in=["emitida", "pagada"])
            .values("cliente").distinct().count()
        )

        return Response({
            "ventas_por_mes": ventas_por_mes,
            "ots_por_estatus": ots_por_estatus,
            "stock_bajo": stock_bajo,
            "compras_por_mes": compras_por_mes,
            "facturas_estatus": facturas_estatus,
            "kpis": {
                "total_facturado": round(total_facturado, 2),
                "clientes_activos": total_clientes,
                "ots_abiertas": OrdenTrabajo.objects.exclude(
                    estatus__in=["Finalizado", "Cancelado", "finalizado", "cancelado"]
                ).count(),
                "productos_stock_bajo": len(stock_bajo),
            },
        })
