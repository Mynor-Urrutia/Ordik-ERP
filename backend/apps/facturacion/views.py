from decimal import Decimal
from django.http import HttpResponse
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors

from .models import Factura
from .serializers import FacturaSerializer


class FacturaViewSet(viewsets.ModelViewSet):
    queryset = Factura.objects.select_related("cliente", "cotizacion", "orden_trabajo").prefetch_related("items").all()
    serializer_class = FacturaSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["cliente", "estatus"]
    search_fields = ["correlativo", "cliente__razon_social"]
    ordering_fields = ["fecha_emision", "fecha_creacion"]

    @action(detail=True, methods=["get"], url_path="pdf")
    def generar_pdf(self, request, pk=None):
        from apps.maestros.models import EmpresaConfig

        factura = self.get_object()
        empresa = EmpresaConfig.objects.first()
        cliente = factura.cliente

        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{factura.correlativo}.pdf"'

        p = canvas.Canvas(response, pagesize=A4)
        W, H = A4
        M = 45

        # ── Paleta ──────────────────────────────────────────────────────────
        C_NAVY    = colors.HexColor("#0f172a")
        C_BLUE    = colors.HexColor("#1d4ed8")
        C_BLUE_LT = colors.HexColor("#dbeafe")
        C_BLUE_XL = colors.HexColor("#eff6ff")
        C_TEAL    = colors.HexColor("#0d9488")
        C_TEAL_LT = colors.HexColor("#ccfbf1")
        C_RED_LT  = colors.HexColor("#fee2e2")
        C_RED     = colors.HexColor("#991b1b")
        C_GREEN   = colors.HexColor("#166534")
        C_GREEN_LT= colors.HexColor("#dcfce7")
        C_AMBER   = colors.HexColor("#92400e")
        C_AMBER_LT= colors.HexColor("#fffbeb")
        C_DARK    = colors.HexColor("#1f2937")
        C_MID     = colors.HexColor("#374151")
        C_MUTED   = colors.HexColor("#6b7280")
        C_LIGHT   = colors.HexColor("#f9fafb")
        C_BORDER  = colors.HexColor("#e5e7eb")
        WHITE     = colors.white

        # ── Helpers ──────────────────────────────────────────────────────────
        def rect_fill(x, y, w, h, fill, stroke=None, radius=3):
            p.setFillColor(fill)
            if stroke:
                p.setStrokeColor(stroke)
                p.roundRect(x, y, w, h, radius, fill=1, stroke=1)
            else:
                p.roundRect(x, y, w, h, radius, fill=1, stroke=0)

        def text_at(x, y, txt, size=9, color=C_DARK, bold=False):
            p.setFont("Helvetica-Bold" if bold else "Helvetica", size)
            p.setFillColor(color)
            p.drawString(x, y, str(txt))

        def text_right(x, y, txt, size=9, color=C_DARK, bold=False):
            p.setFont("Helvetica-Bold" if bold else "Helvetica", size)
            p.setFillColor(color)
            p.drawRightString(x, y, str(txt))

        def fmt_q(val):
            try:
                return f"Q {Decimal(str(val)):.2f}"
            except Exception:
                return "Q 0.00"

        # ── HEADER ───────────────────────────────────────────────────────────
        rect_fill(0, H - 80, W, 80, C_NAVY)

        nombre_empresa = (empresa.nombre if empresa else "ERP — Mi Empresa")
        p.setFont("Helvetica-Bold", 18)
        p.setFillColor(WHITE)
        p.drawString(M, H - 38, nombre_empresa)

        p.setFont("Helvetica", 9)
        p.setFillColor(colors.HexColor("#94a3b8"))
        if empresa and empresa.nit:
            p.drawString(M, H - 52, f"NIT: {empresa.nit}")
        if empresa and empresa.telefono:
            p.drawString(M, H - 63, f"Tel: {empresa.telefono}")

        # Badge estatus
        estatus_cfg = {
            "borrador": (C_AMBER_LT,  C_AMBER,  "BORRADOR"),
            "emitida":  (C_BLUE_LT,   C_BLUE,   "EMITIDA"),
            "pagada":   (C_GREEN_LT,  C_GREEN,  "PAGADA"),
            "anulada":  (C_RED_LT,    C_RED,    "ANULADA"),
        }
        bg, fg, label = estatus_cfg.get(factura.estatus, (C_BLUE_LT, C_BLUE, factura.estatus.upper()))
        rect_fill(W - M - 90, H - 58, 90, 22, bg, radius=4)
        p.setFont("Helvetica-Bold", 9)
        p.setFillColor(fg)
        p.drawCentredString(W - M - 45, H - 44, label)

        # ── TÍTULO + CORRELATIVO ──────────────────────────────────────────────
        y = H - 100
        text_at(M, y, "FACTURA", size=22, color=C_NAVY, bold=True)
        text_right(W - M, y, factura.correlativo, size=14, color=C_BLUE, bold=True)

        # ── DATOS FACTURA / CLIENTE ───────────────────────────────────────────
        y -= 8
        box_h = 80
        half = (W - 2 * M - 10) / 2

        # Caja izquierda — datos factura
        rect_fill(M, y - box_h, half, box_h, C_BLUE_XL, C_BLUE_LT)
        rect_fill(M, y - 16, half, 16, C_BLUE_LT, radius=3)
        text_at(M + 8, y - 12, "DATOS DE LA FACTURA", size=8, color=C_BLUE, bold=True)

        fy = y - 28
        text_at(M + 8, fy, "Emisión:", size=8, color=C_MUTED)
        text_at(M + 70, fy, str(factura.fecha_emision), size=8, color=C_DARK, bold=True)
        fy -= 13
        text_at(M + 8, fy, "Vencimiento:", size=8, color=C_MUTED)
        text_at(M + 70, fy, str(factura.fecha_vencimiento) if factura.fecha_vencimiento else "—", size=8, color=C_DARK, bold=True)
        fy -= 13
        if factura.cotizacion:
            text_at(M + 8, fy, "Cotización ref.:", size=8, color=C_MUTED)
            text_at(M + 80, fy, str(factura.cotizacion), size=8, color=C_DARK, bold=True)
            fy -= 13
        if factura.orden_trabajo:
            text_at(M + 8, fy, "OT ref.:", size=8, color=C_MUTED)
            text_at(M + 80, fy, f"OT-{factura.orden_trabajo.pk:04d}", size=8, color=C_DARK, bold=True)

        # Caja derecha — cliente
        cx = M + half + 10
        rect_fill(cx, y - box_h, half, box_h, C_TEAL_LT, C_TEAL)
        rect_fill(cx, y - 16, half, 16, C_TEAL, radius=3)
        text_at(cx + 8, y - 12, "CLIENTE", size=8, color=WHITE, bold=True)

        cy = y - 28
        text_at(cx + 8, cy, cliente.razon_social, size=9, color=C_DARK, bold=True)
        cy -= 13
        text_at(cx + 8, cy, f"NIT: {cliente.nit}", size=8, color=C_MUTED)
        cy -= 13
        if cliente.telefono:
            text_at(cx + 8, cy, f"Tel: {cliente.telefono}", size=8, color=C_MUTED)
            cy -= 13
        if cliente.correo:
            text_at(cx + 8, cy, cliente.correo, size=8, color=C_MUTED)

        # ── TABLA DE ÍTEMS ────────────────────────────────────────────────────
        y -= box_h + 18

        # Encabezado tabla
        col_x    = M
        col_desc = M + 14
        col_cant = W - M - 280
        col_pu   = W - M - 210
        col_dsc  = W - M - 145
        col_neto = W - M - 90
        col_tot  = W - M

        rect_fill(M, y - 16, W - 2 * M, 16, C_NAVY)
        for label, x, right in [
            ("#",        col_x + 4, False),
            ("DESCRIPCIÓN", col_desc, False),
            ("CANT",     col_cant,  True),
            ("P. UNIT",  col_pu,    True),
            ("DSCTO.",   col_dsc,   True),
            ("P. NETO",  col_neto,  True),
            ("TOTAL",    col_tot,   True),
        ]:
            if right:
                text_right(x, y - 11, label, size=7, color=WHITE, bold=True)
            else:
                text_at(x, y - 11, label, size=7, color=WHITE, bold=True)
        y -= 16

        # Filas
        items = list(factura.items.all())
        for i, it in enumerate(items):
            row_h = 22
            bg_row = C_LIGHT if i % 2 == 0 else WHITE
            rect_fill(M, y - row_h, W - 2 * M, row_h, bg_row)

            mid_y = y - row_h / 2 - 4
            text_at(col_x + 4, mid_y, str(i + 1), size=8, color=C_MUTED)
            nombre = it.nombre[:45] if len(it.nombre) > 45 else it.nombre
            text_at(col_desc, mid_y, nombre, size=8, color=C_DARK)
            text_right(col_cant, mid_y, str(it.cantidad), size=8, color=C_DARK)
            text_right(col_pu, mid_y, fmt_q(it.precio_unitario), size=8, color=C_DARK)

            if it.descuento_porcentaje > 0:
                text_right(col_dsc, mid_y, f"{it.descuento_porcentaje:.1f}%", size=8, color=C_RED)
            else:
                text_right(col_dsc, mid_y, "—", size=8, color=C_MUTED)

            text_right(col_neto, mid_y, fmt_q(it.precio_neto), size=8, color=C_DARK)
            text_right(col_tot, mid_y, fmt_q(it.total), size=8, color=C_DARK, bold=True)
            y -= row_h

            # Descripción adicional
            if it.descripcion:
                text_at(col_desc, y - 10, it.descripcion[:80], size=7, color=C_MUTED)
                y -= 14

        # ── TOTALES ────────────────────────────────────────────────────────────
        y -= 10
        tw = 200
        tx = W - M - tw

        subtotal = sum(it.precio_neto * it.cantidad for it in items)
        total_iva = sum(it.precio_neto * it.cantidad * (it.porcentaje_iva / Decimal("100")) for it in items)
        total_isr = sum(it.precio_neto * it.cantidad * (it.porcentaje_isr / Decimal("100")) for it in items)
        total_final = factura.total

        for label, val, highlight in [
            ("Subtotal:", subtotal, False),
            ("IVA (12%):", total_iva, False),
            ("ISR:", total_isr, False),
        ]:
            if val > 0 or label == "Subtotal:":
                rect_fill(tx, y - 14, tw, 14, C_LIGHT)
                text_at(tx + 8, y - 10, label, size=8, color=C_MUTED)
                text_right(W - M, y - 10, fmt_q(val), size=8, color=C_DARK)
                y -= 14

        rect_fill(tx, y - 18, tw, 18, C_NAVY)
        text_at(tx + 8, y - 13, "TOTAL:", size=10, color=WHITE, bold=True)
        text_right(W - M, y - 13, fmt_q(total_final), size=10, color=WHITE, bold=True)
        y -= 18

        # ── NOTAS ──────────────────────────────────────────────────────────────
        if factura.notas:
            y -= 16
            rect_fill(M, y - 40, W - 2 * M, 40, C_LIGHT, C_BORDER)
            text_at(M + 8, y - 12, "NOTAS", size=8, color=C_MUTED, bold=True)
            text_at(M + 8, y - 26, factura.notas[:120], size=8, color=C_DARK)

        # ── FOOTER ─────────────────────────────────────────────────────────────
        rect_fill(0, 0, W, 30, C_NAVY)
        p.setFont("Helvetica", 7)
        p.setFillColor(colors.HexColor("#94a3b8"))
        if empresa:
            p.drawCentredString(W / 2, 18, f"{nombre_empresa}  ·  {empresa.direccion or ''}  ·  {empresa.correo or ''}")
        p.drawCentredString(W / 2, 8, f"Documento generado electrónicamente — {factura.correlativo}")

        p.showPage()
        p.save()
        return response
