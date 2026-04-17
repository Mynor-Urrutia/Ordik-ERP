from datetime import timedelta

from django.http import HttpResponse
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors

from .models import Cotizacion
from .serializers import CotizacionSerializer


class CotizacionViewSet(viewsets.ModelViewSet):
    queryset = (
        Cotizacion.objects.select_related("cliente")
        .prefetch_related("items")
        .all()
    )
    serializer_class = CotizacionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["cliente"]
    search_fields = ["cliente__razon_social", "estatus"]

    @action(detail=True, methods=["get"], url_path="pdf")
    def generar_pdf(self, request, pk=None):
        from apps.maestros.models import EmpresaConfig

        cot     = self.get_object()
        empresa = EmpresaConfig.objects.first()
        cliente = cot.cliente
        items   = list(cot.items.all())
        numero  = f"COT-{cot.pk:04d}"

        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{numero}.pdf"'

        p = canvas.Canvas(response, pagesize=A4)
        W, H = A4
        M = 45

        # ── Paleta ──────────────────────────────────────────────────────────
        C_NAVY      = colors.HexColor("#1e3a8a")
        C_BLUE      = colors.HexColor("#1d4ed8")
        C_BLUE_LT   = colors.HexColor("#dbeafe")
        C_BLUE_XL   = colors.HexColor("#eff6ff")
        C_SKY       = colors.HexColor("#93c5fd")
        C_MIST      = colors.HexColor("#bfdbfe")
        C_DARK      = colors.HexColor("#1f2937")
        C_GRAY      = colors.HexColor("#6b7280")
        C_GRAY_LT   = colors.HexColor("#f3f4f6")
        C_GRAY_LINE = colors.HexColor("#e5e7eb")
        C_AMBER_LT  = colors.HexColor("#fffbeb")
        C_AMBER     = colors.HexColor("#92400e")
        C_WHITE     = colors.white

        ESTATUS_CONF = {
            "Borrador":  (colors.HexColor("#f3f4f6"), colors.HexColor("#374151")),
            "Enviada":   (colors.HexColor("#dbeafe"), colors.HexColor("#1e40af")),
            "Aprobada":  (colors.HexColor("#dcfce7"), colors.HexColor("#166534")),
            "Rechazada": (colors.HexColor("#fee2e2"), colors.HexColor("#991b1b")),
            "Vencida":   (colors.HexColor("#fef3c7"), colors.HexColor("#92400e")),
        }

        # ── Helpers ─────────────────────────────────────────────────────────
        def hline(y_pos, lw=0.4, color=C_GRAY_LINE):
            p.setStrokeColor(color)
            p.setLineWidth(lw)
            p.line(M, y_pos, W - M, y_pos)

        def draw_info_box(bx, by, bw, bh, label, label_color, bg_color, border_color, lines):
            p.setFillColor(bg_color)
            p.roundRect(bx, by - bh, bw, bh, 3, fill=1, stroke=0)
            p.setStrokeColor(border_color)
            p.setLineWidth(0.5)
            p.roundRect(bx, by - bh, bw, bh, 3, fill=0, stroke=1)
            p.setFillColor(label_color)
            p.setFont("Helvetica-Bold", 7)
            p.drawString(bx + 8, by - 11, label)
            row_y = by - 24
            for (fname, fsize, fcolor, text) in lines:
                if text:
                    p.setFillColor(fcolor)
                    p.setFont(fname, fsize)
                    p.drawString(bx + 8, row_y, str(text)[:int(bw / 4.8)])
                    row_y -= (fsize + 3)

        def draw_table_header(y_th):
            p.setFillColor(C_NAVY)
            p.rect(M, y_th - 20, W - 2 * M, 20, fill=1, stroke=0)
            p.setFillColor(C_WHITE)
            p.setFont("Helvetica-Bold", 7.5)
            p.drawString(M + 6,          y_th - 14, "#")
            p.drawString(M + 22,         y_th - 14, "DESCRIPCIÓN DEL PRODUCTO / SERVICIO")
            p.drawString(M + 258,        y_th - 14, "U/M")
            p.drawRightString(M + 310,   y_th - 14, "CANT.")
            p.drawRightString(M + 360,   y_th - 14, "P. UNIT.")
            p.drawRightString(M + 400,   y_th - 14, "DSCTO.")
            p.drawRightString(M + 432,   y_th - 14, "IVA%")
            p.drawRightString(M + 462,   y_th - 14, "ISR%")
            p.drawRightString(W - M - 2, y_th - 14, "TOTAL")

        # ════════════════════════════════════════════════════════════════════
        # 1. ENCABEZADO
        # ════════════════════════════════════════════════════════════════════
        HEADER_H = 95
        p.setFillColor(C_NAVY)
        p.rect(0, H - HEADER_H, W, HEADER_H, fill=1, stroke=0)
        p.setFillColor(C_BLUE)
        p.rect(0, H - HEADER_H - 3, W, 3, fill=1, stroke=0)

        emp_nombre = (empresa.nombre_comercial or empresa.razon_social or "ORDIK") if empresa else "ORDIK"
        p.setFillColor(C_WHITE)
        p.setFont("Helvetica-Bold", 17)
        p.drawString(M, H - 30, emp_nombre.upper())

        ly = H - 46
        if empresa and empresa.giro_comercial:
            p.setFillColor(C_SKY)
            p.setFont("Helvetica", 8)
            p.drawString(M, ly, empresa.giro_comercial[:70])
            ly -= 13
        if empresa and empresa.nit:
            p.setFillColor(C_MIST)
            p.setFont("Helvetica", 8)
            p.drawString(M, ly, f"NIT: {empresa.nit}")
            ly -= 11
        if empresa and empresa.telefono:
            p.setFont("Helvetica", 8)
            parts = [empresa.telefono]
            if empresa.email:
                parts.append(empresa.email)
            p.drawString(M, ly, "  ·  ".join(parts))

        p.setFillColor(C_WHITE)
        p.setFont("Helvetica-Bold", 22)
        p.drawRightString(W - M, H - 28, "COTIZACIÓN")

        p.setFillColor(C_SKY)
        p.setFont("Helvetica-Bold", 13)
        p.drawRightString(W - M, H - 46, numero)

        p.setFillColor(C_MIST)
        p.setFont("Helvetica", 8.5)
        p.drawRightString(W - M, H - 59, f"Fecha: {cot.fecha_creacion.strftime('%d/%m/%Y')}")

        est = cot.estatus or "Borrador"
        est_bg, est_fg = ESTATUS_CONF.get(est, (C_GRAY_LT, C_GRAY))
        BADGE_W = 82
        p.setFillColor(est_bg)
        p.roundRect(W - M - BADGE_W, H - HEADER_H + 10, BADGE_W, 17, 4, fill=1, stroke=0)
        p.setFillColor(est_fg)
        p.setFont("Helvetica-Bold", 7.5)
        p.drawCentredString(W - M - BADGE_W / 2, H - HEADER_H + 19, est.upper())

        # ════════════════════════════════════════════════════════════════════
        # 2. CLIENTE + CONDICIONES
        # ════════════════════════════════════════════════════════════════════
        y = H - HEADER_H - 10
        BOX_H = 100
        BOX_W = (W - 2 * M - 12) / 2

        cliente_lines = [
            ("Helvetica-Bold", 10, C_DARK, cliente.razon_social),
            ("Helvetica",       8, C_GRAY, f"NIT: {cliente.nit}"),
        ]
        if cliente.direccion_comercial:
            cliente_lines.append(("Helvetica", 8, C_GRAY, cliente.direccion_comercial))
        loc = ", ".join(filter(None, [cliente.municipio, cliente.departamento]))
        if loc:
            cliente_lines.append(("Helvetica", 8, C_GRAY, loc))
        if cliente.telefono:
            cliente_lines.append(("Helvetica", 8, C_GRAY, f"Tel: {cliente.telefono}"))
        if cliente.email:
            cliente_lines.append(("Helvetica", 8, C_GRAY, cliente.email))

        draw_info_box(M, y, BOX_W, BOX_H, "CLIENTE:", C_BLUE, C_BLUE_XL, C_BLUE_LT, cliente_lines)

        cond_lines = []
        if cot.condiciones_pago:
            cond_lines += [
                ("Helvetica",      8,   C_GRAY, "Condiciones de pago:"),
                ("Helvetica-Bold", 8.5, C_DARK, cot.condiciones_pago),
            ]
        if cot.tiempo_entrega:
            cond_lines += [
                ("Helvetica",      8,   C_GRAY, "Tiempo de entrega:"),
                ("Helvetica-Bold", 8.5, C_DARK, cot.tiempo_entrega),
            ]
        if cot.lugar_entrega:
            cond_lines += [
                ("Helvetica",      8,   C_GRAY, "Lugar de entrega:"),
                ("Helvetica-Bold", 8.5, C_DARK, cot.lugar_entrega),
            ]

        draw_info_box(M + BOX_W + 12, y, BOX_W, BOX_H,
                      "CONDICIONES:", C_GRAY, C_GRAY_LT, C_GRAY_LINE, cond_lines)

        y -= (BOX_H + 8)

        # ════════════════════════════════════════════════════════════════════
        # 3. BARRA DE DETALLES
        # ════════════════════════════════════════════════════════════════════
        BAR_H = 42
        p.setFillColor(C_NAVY)
        p.rect(M, y - BAR_H, W - 2 * M, BAR_H, fill=1, stroke=0)

        COL_W = (W - 2 * M) / 4
        p.setStrokeColor(colors.HexColor("#2d4fad"))
        p.setLineWidth(0.5)
        for i in range(1, 4):
            lx = M + COL_W * i
            p.line(lx, y - BAR_H + 6, lx, y - 6)

        def bar_col(bx, label, value, sub=None):
            p.setFillColor(C_SKY)
            p.setFont("Helvetica-Bold", 7)
            p.drawString(bx + 8, y - 12, label)
            p.setFillColor(C_WHITE)
            p.setFont("Helvetica-Bold", 9)
            p.drawString(bx + 8, y - 26, str(value) if value else "—")
            if sub:
                p.setFillColor(C_MIST)
                p.setFont("Helvetica", 7.5)
                p.drawString(bx + 8, y - 37, str(sub))

        valida_hasta = (cot.fecha_creacion + timedelta(days=cot.validez_dias)).strftime("%d/%m/%Y") if cot.validez_dias else "—"

        bar_col(M,               "TIPO DE COTIZACIÓN", cot.tipo or "—")
        bar_col(M + COL_W,       "ASESOR",             cot.asesor or "—")
        bar_col(M + COL_W * 2,   "VÁLIDA HASTA",       valida_hasta,
                f"{cot.validez_dias} días de validez" if cot.validez_dias else None)
        bar_col(M + COL_W * 3,   "REFERENCIA OT",      cot.ot_referencia or "—")

        y -= (BAR_H + 10)

        # ════════════════════════════════════════════════════════════════════
        # 4. TABLA DE ÍTEMS
        # ════════════════════════════════════════════════════════════════════
        ROW_H  = 18
        ROW_HD = 11   # altura extra para descripción

        draw_table_header(y)
        y -= 20

        subtotal_base = 0.0
        iva_total     = 0.0
        isr_total     = 0.0

        for i, item in enumerate(items):
            has_desc = bool(item.descripcion)
            row_total_h = ROW_H + (ROW_HD if has_desc else 0)

            if y < 190:
                p.showPage()
                y = H - 45
                draw_table_header(y)
                y -= 20

            precio_neto = float(item.precio_neto)
            base_line   = precio_neto * item.cantidad
            iva_line    = base_line * float(item.porcentaje_iva) / 100
            isr_line    = base_line * float(item.porcentaje_isr) / 100
            total_line  = base_line + iva_line + isr_line

            subtotal_base += base_line
            iva_total     += iva_line
            isr_total     += isr_line

            p.setFillColor(colors.HexColor("#f8fafc") if i % 2 == 0 else C_WHITE)
            p.rect(M, y - row_total_h, W - 2 * M, row_total_h, fill=1, stroke=0)

            p.setFillColor(C_GRAY)
            p.setFont("Helvetica", 7.5)
            p.drawString(M + 6, y - 13, str(i + 1))

            p.setFillColor(C_DARK)
            p.setFont("Helvetica-Bold", 8.5)
            p.drawString(M + 22, y - 13, item.nombre_producto[:44])

            if has_desc:
                p.setFillColor(C_GRAY)
                p.setFont("Helvetica-Oblique", 7.5)
                p.drawString(M + 22, y - 24, item.descripcion[:66])

            p.setFillColor(C_GRAY)
            p.setFont("Helvetica", 8)
            p.drawString(M + 258, y - 13, str(item.unidad_medida)[:10])

            p.setFillColor(C_DARK)
            p.setFont("Helvetica-Bold", 8.5)
            p.drawRightString(M + 310, y - 13, str(item.cantidad))

            p.setFont("Helvetica", 8.5)
            p.drawRightString(M + 360, y - 13, f"Q {float(item.precio_unitario):,.2f}")

            # Descuento
            tiene_dscto = float(item.descuento_porcentaje) > 0 or float(item.descuento_monto) > 0
            if tiene_dscto:
                if float(item.descuento_porcentaje) > 0:
                    dscto_str = f"{float(item.descuento_porcentaje):.1f}%"
                else:
                    dscto_str = f"Q {float(item.descuento_monto):,.2f}"
                p.setFillColor(colors.HexColor("#dc2626"))
                p.setFont("Helvetica-Bold", 8)
            else:
                dscto_str = "—"
                p.setFillColor(C_GRAY)
                p.setFont("Helvetica", 8)
            p.drawRightString(M + 400, y - 13, dscto_str)

            p.setFillColor(C_GRAY)
            p.setFont("Helvetica", 8)
            p.drawRightString(M + 432, y - 13, f"{float(item.porcentaje_iva):.0f}%")
            isr_str = f"{float(item.porcentaje_isr):.0f}%" if float(item.porcentaje_isr) > 0 else "—"
            p.drawRightString(M + 462, y - 13, isr_str)

            p.setFillColor(C_DARK)
            p.setFont("Helvetica-Bold", 8.5)
            p.drawRightString(W - M - 2, y - 13, f"Q {total_line:,.2f}")

            p.setStrokeColor(C_GRAY_LINE)
            p.setLineWidth(0.3)
            p.line(M, y - row_total_h, W - M, y - row_total_h)

            y -= row_total_h

        y -= 4

        # ════════════════════════════════════════════════════════════════════
        # 5. TOTALES
        # ════════════════════════════════════════════════════════════════════
        total_general = subtotal_base + iva_total + isr_total
        TOT_W = 205
        tx    = W - M - TOT_W

        def tot_row(label, value, bold=False, big=False, bg=None, fg=C_DARK):
            nonlocal y
            rh = 22 if big else 17
            if bg:
                p.setFillColor(bg)
                p.rect(tx, y - rh, TOT_W, rh, fill=1, stroke=0)
            p.setFillColor(fg)
            p.setFont("Helvetica-Bold" if bold else "Helvetica", 10 if big else 8.5)
            p.drawString(tx + 8, y - rh + 5, label)
            p.drawRightString(W - M - 2, y - rh + 5, value)
            y -= rh

        hline(y, lw=0.8, color=C_BLUE_LT)
        y -= 4
        tot_row("Subtotal (sin impuestos):", f"Q {subtotal_base:,.2f}")
        tot_row("IVA:", f"Q {iva_total:,.2f}")
        if isr_total > 0:
            tot_row("ISR (retención):", f"Q {isr_total:,.2f}")
        hline(y + 2, lw=1, color=C_NAVY)
        y -= 2
        tot_row("TOTAL:", f"Q {total_general:,.2f}", bold=True, big=True, bg=C_NAVY, fg=C_WHITE)

        # ════════════════════════════════════════════════════════════════════
        # 6. NOTAS / TÉRMINOS
        # ════════════════════════════════════════════════════════════════════
        if cot.notas:
            y -= 14
            max_chars = 105
            note_lines = [
                cot.notas[i: i + max_chars]
                for i in range(0, min(len(cot.notas), 320), max_chars)
            ]
            note_h = 22 + len(note_lines) * 13
            p.setFillColor(C_AMBER_LT)
            p.rect(M, y - note_h, W - 2 * M, note_h, fill=1, stroke=0)
            p.setStrokeColor(colors.HexColor("#fde68a"))
            p.setLineWidth(0.5)
            p.rect(M, y - note_h, W - 2 * M, note_h, fill=0, stroke=1)
            p.setFillColor(C_AMBER)
            p.setFont("Helvetica-Bold", 7.5)
            p.drawString(M + 8, y - 12, "NOTAS, TÉRMINOS Y CONDICIONES:")
            ny = y - 25
            p.setFont("Helvetica", 8)
            for line in note_lines:
                p.drawString(M + 8, ny, line)
                ny -= 13
            y -= (note_h + 8)

        # ════════════════════════════════════════════════════════════════════
        # 7. ÁREA DE FIRMAS
        # ════════════════════════════════════════════════════════════════════
        y -= 16
        SIG_H = 58
        SIG_W = (W - 2 * M - 20) / 3
        FIRMAS = [
            ("Asesor Comercial",        cot.asesor or "", "Nombre y firma"),
            ("Autorizado por",          "",               "Nombre y firma"),
            ("Aceptado por el Cliente", "",               "Firma y sello"),
        ]
        for i, (titulo, nombre, sub) in enumerate(FIRMAS):
            sx = M + i * (SIG_W + 10)
            p.setFillColor(C_GRAY_LT)
            p.roundRect(sx, y - SIG_H, SIG_W, SIG_H, 3, fill=1, stroke=0)
            p.setStrokeColor(C_GRAY_LINE)
            p.setLineWidth(0.5)
            p.roundRect(sx, y - SIG_H, SIG_W, SIG_H, 3, fill=0, stroke=1)
            p.setFillColor(C_GRAY)
            p.setFont("Helvetica-Bold", 7.5)
            p.drawCentredString(sx + SIG_W / 2, y - 12, titulo)
            if nombre:
                p.setFillColor(C_DARK)
                p.setFont("Helvetica", 8)
                p.drawCentredString(sx + SIG_W / 2, y - 24, nombre)
            p.setStrokeColor(colors.HexColor("#9ca3af"))
            p.setLineWidth(0.5)
            p.line(sx + 12, y - 38, sx + SIG_W - 12, y - 38)
            p.setFillColor(C_GRAY)
            p.setFont("Helvetica", 7)
            p.drawCentredString(sx + SIG_W / 2, y - SIG_H + 7, sub)

        # ════════════════════════════════════════════════════════════════════
        # 8. PIE DE PÁGINA
        # ════════════════════════════════════════════════════════════════════
        p.setFillColor(C_NAVY)
        p.rect(0, 0, W, 30, fill=1, stroke=0)
        p.setFillColor(C_SKY)
        p.setFont("Helvetica", 7)
        p.drawString(M, 11, f"Documento generado por ORDIK ERP — {numero} — Este documento no tiene validez fiscal.")
        p.drawRightString(W - M, 11, f"{cot.fecha_creacion.strftime('%d/%m/%Y')}  ·  Pág. 1")

        p.showPage()
        p.save()
        return response
