from django.http import HttpResponse
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
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

    @action(detail=True, methods=["get"], url_path="pdf")
    def generar_pdf(self, request, pk=None):
        from apps.maestros.models import EmpresaConfig

        compra  = self.get_object()
        empresa = EmpresaConfig.objects.first()
        prov    = compra.proveedor

        response = HttpResponse(content_type="application/pdf")
        correlativo = compra.correlativo or f"OC-{compra.pk:04d}"
        response["Content-Disposition"] = f'attachment; filename="{correlativo}.pdf"'

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
        C_GREEN_LT  = colors.HexColor("#f0fdf4")
        C_GREEN     = colors.HexColor("#166534")
        C_AMBER_LT  = colors.HexColor("#fffbeb")
        C_AMBER     = colors.HexColor("#92400e")
        C_WHITE     = colors.white

        ESTATUS_CONF = {
            "Pendiente":   (colors.HexColor("#fef3c7"), colors.HexColor("#92400e")),
            "Confirmada":  (colors.HexColor("#dbeafe"), colors.HexColor("#1e40af")),
            "En tránsito": (colors.HexColor("#ede9fe"), colors.HexColor("#5b21b6")),
            "Recibida":    (colors.HexColor("#dcfce7"), colors.HexColor("#166534")),
            "Cancelada":   (colors.HexColor("#fee2e2"), colors.HexColor("#991b1b")),
        }

        # ── Helpers ─────────────────────────────────────────────────────────
        def hline(y_pos, lw=0.4, color=C_GRAY_LINE):
            p.setStrokeColor(color)
            p.setLineWidth(lw)
            p.line(M, y_pos, W - M, y_pos)

        def draw_table_header(y_th):
            p.setFillColor(C_NAVY)
            p.rect(M, y_th - 20, W - 2 * M, 20, fill=1, stroke=0)
            p.setFillColor(C_WHITE)
            p.setFont("Helvetica-Bold", 7.5)
            p.drawString(M + 6,              y_th - 14, "#")
            p.drawString(M + 22,             y_th - 14, "CÓDIGO")
            p.drawString(M + 90,             y_th - 14, "DESCRIPCIÓN DEL PRODUCTO / SERVICIO")
            p.drawString(M + 330,            y_th - 14, "U/M")
            p.drawRightString(M + 390,       y_th - 14, "CANT.")
            p.drawRightString(M + 445,       y_th - 14, "PRECIO UNIT.")
            p.drawRightString(W - M - 2,     y_th - 14, "SUBTOTAL")

        # ════════════════════════════════════════════════════════════════════
        # 1. ENCABEZADO
        # ════════════════════════════════════════════════════════════════════
        HEADER_H = 95
        p.setFillColor(C_NAVY)
        p.rect(0, H - HEADER_H, W, HEADER_H, fill=1, stroke=0)
        # Franja de acento
        p.setFillColor(C_BLUE)
        p.rect(0, H - HEADER_H - 3, W, 3, fill=1, stroke=0)

        # Nombre empresa – izquierda
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

        # Título OC – derecha
        p.setFillColor(C_WHITE)
        p.setFont("Helvetica-Bold", 22)
        p.drawRightString(W - M, H - 28, "ORDEN DE COMPRA")

        p.setFillColor(C_SKY)
        p.setFont("Helvetica-Bold", 13)
        p.drawRightString(W - M, H - 46, correlativo)

        p.setFillColor(C_MIST)
        p.setFont("Helvetica", 8.5)
        p.drawRightString(W - M, H - 59, f"Fecha de emisión: {compra.fecha_creacion.strftime('%d/%m/%Y')}")

        # Badge estatus
        est = compra.estatus or "Pendiente"
        est_bg, est_fg = ESTATUS_CONF.get(est, (C_GRAY_LT, C_GRAY))
        BADGE_W = 82
        p.setFillColor(est_bg)
        p.roundRect(W - M - BADGE_W, H - HEADER_H + 10, BADGE_W, 17, 4, fill=1, stroke=0)
        p.setFillColor(est_fg)
        p.setFont("Helvetica-Bold", 7.5)
        p.drawCentredString(W - M - BADGE_W / 2, H - HEADER_H + 19, est.upper())

        # ════════════════════════════════════════════════════════════════════
        # 2. BLOQUES FACTURAR A / PROVEEDOR
        # ════════════════════════════════════════════════════════════════════
        y = H - HEADER_H - 10
        BOX_H  = 100
        BOX_W  = (W - 2 * M - 12) / 2

        def draw_info_box(bx, by, bw, bh, label, label_color, bg_color, border_color, lines):
            """Dibuja un cuadro con etiqueta y líneas de texto."""
            p.setFillColor(bg_color)
            p.roundRect(bx, by - bh, bw, bh, 3, fill=1, stroke=0)
            p.setStrokeColor(border_color)
            p.setLineWidth(0.5)
            p.roundRect(bx, by - bh, bw, bh, 3, fill=0, stroke=1)
            # Etiqueta
            p.setFillColor(label_color)
            p.setFont("Helvetica-Bold", 7)
            p.drawString(bx + 8, by - 11, label)
            # Líneas
            row_y = by - 24
            for (font_name, font_size, color_val, text) in lines:
                if text:
                    p.setFillColor(color_val)
                    p.setFont(font_name, font_size)
                    p.drawString(bx + 8, row_y, str(text)[:int(bw / 5)])
                    row_y -= (font_size + 3)

        # — Facturar a (izquierda) —
        facturar_lines = [
            ("Helvetica-Bold", 10, C_DARK,  empresa.razon_social   if empresa else "—"),
            ("Helvetica",       8,  C_GRAY,  f"NIT: {empresa.nit}"  if empresa and empresa.nit else None),
        ]
        if empresa:
            if empresa.direccion:
                facturar_lines.append(("Helvetica", 8, C_GRAY, empresa.direccion))
            loc = ", ".join(filter(None, [empresa.municipio, empresa.departamento]))
            if loc:
                facturar_lines.append(("Helvetica", 8, C_GRAY, loc))
            if empresa.email_facturacion or empresa.email:
                facturar_lines.append(("Helvetica", 8, C_GRAY, empresa.email_facturacion or empresa.email))
            if empresa.representante_legal:
                facturar_lines.append(("Helvetica-Oblique", 7.5, C_GRAY, f"Representante: {empresa.representante_legal}"))

        draw_info_box(M, y, BOX_W, BOX_H,
                      "FACTURAR A:", C_BLUE, C_BLUE_XL, C_BLUE_LT,
                      facturar_lines)

        # — Proveedor (derecha) —
        prov_lines = [
            ("Helvetica-Bold", 10, C_DARK, prov.razon_social if prov else "—"),
            ("Helvetica",       8, C_GRAY, f"NIT: {prov.nit}" if prov and prov.nit else None),
        ]
        if prov:
            if prov.direccion_comercial:
                prov_lines.append(("Helvetica", 8, C_GRAY, prov.direccion_comercial))
            prov_loc = ", ".join(filter(None, [prov.municipio, prov.departamento]))
            if prov_loc:
                prov_lines.append(("Helvetica", 8, C_GRAY, prov_loc))
            if prov.telefono:
                prov_lines.append(("Helvetica", 8, C_GRAY, f"Tel: {prov.telefono}"))
            if prov.nombre_contacto:
                prov_lines.append(("Helvetica-Oblique", 7.5, C_GRAY, f"Contacto: {prov.nombre_contacto}"))

        draw_info_box(M + BOX_W + 12, y, BOX_W, BOX_H,
                      "PROVEEDOR:", C_GRAY, C_GRAY_LT, C_GRAY_LINE,
                      prov_lines)

        y -= (BOX_H + 8)

        # ════════════════════════════════════════════════════════════════════
        # 3. BARRA DE CONDICIONES
        # ════════════════════════════════════════════════════════════════════
        BAR_H  = 54
        COL_W  = (W - 2 * M) / 4

        p.setFillColor(C_NAVY)
        p.rect(M, y - BAR_H, W - 2 * M, BAR_H, fill=1, stroke=0)

        # Separadores verticales
        p.setStrokeColor(colors.HexColor("#2d4fad"))
        p.setLineWidth(0.5)
        for i in range(1, 4):
            lx = M + COL_W * i
            p.line(lx, y - BAR_H + 8, lx, y - 8)

        def bar_col(bx, label, value, sub=None):
            p.setFillColor(C_SKY)
            p.setFont("Helvetica-Bold", 7)
            p.drawString(bx + 8, y - 13, label)
            p.setFillColor(C_WHITE)
            p.setFont("Helvetica-Bold", 9.5)
            p.drawString(bx + 8, y - 27, str(value) if value else "—")
            if sub:
                p.setFillColor(C_MIST)
                p.setFont("Helvetica", 7.5)
                p.drawString(bx + 8, y - 40, str(sub))

        tp_nombre = ""
        tp_sub    = None
        if compra.tipo_pago:
            tp_nombre = compra.tipo_pago.nombre
            if compra.tipo_pago.dias_plazo:
                tp_sub = f"Plazo: {compra.tipo_pago.dias_plazo} días"

        moneda = (empresa.moneda if empresa and empresa.moneda else "GTQ")

        bar_col(M,               "FECHA DE EMISIÓN",  compra.fecha_creacion.strftime("%d/%m/%Y"))
        bar_col(M + COL_W,       "FECHA DE DESPACHO", compra.fecha_despacho.strftime("%d/%m/%Y") if compra.fecha_despacho else "—")
        bar_col(M + COL_W * 2,   "CONDICIÓN DE PAGO", tp_nombre or "Sin especificar", tp_sub)
        bar_col(M + COL_W * 3,   "MONEDA",            moneda,
                f"Ref. cot: {compra.num_cotizacion_proveedor}" if compra.num_cotizacion_proveedor else None)

        y -= (BAR_H + 6)

        # ════════════════════════════════════════════════════════════════════
        # 4. LUGAR DE ENTREGA
        # ════════════════════════════════════════════════════════════════════
        if empresa and (empresa.direccion or empresa.municipio):
            loc_parts = list(filter(None, [empresa.direccion, empresa.municipio, empresa.departamento]))
            loc_str   = ", ".join(loc_parts)
            p.setFillColor(C_GREEN_LT)
            p.rect(M, y - 26, W - 2 * M, 26, fill=1, stroke=0)
            p.setStrokeColor(colors.HexColor("#bbf7d0"))
            p.setLineWidth(0.5)
            p.rect(M, y - 26, W - 2 * M, 26, fill=0, stroke=1)
            p.setFillColor(C_GREEN)
            p.setFont("Helvetica-Bold", 7.5)
            p.drawString(M + 8, y - 11, "LUGAR DE ENTREGA:")
            p.setFont("Helvetica", 8.5)
            p.drawString(M + 105, y - 11, loc_str[:95])
            y -= 32

        # ════════════════════════════════════════════════════════════════════
        # 5. NOTAS / INSTRUCCIONES
        # ════════════════════════════════════════════════════════════════════
        if compra.notas:
            p.setFillColor(C_AMBER_LT)
            p.rect(M, y - 28, W - 2 * M, 28, fill=1, stroke=0)
            p.setStrokeColor(colors.HexColor("#fde68a"))
            p.setLineWidth(0.5)
            p.rect(M, y - 28, W - 2 * M, 28, fill=0, stroke=1)
            p.setFillColor(C_AMBER)
            p.setFont("Helvetica-Bold", 7.5)
            p.drawString(M + 8, y - 11, "NOTAS / INSTRUCCIONES ESPECIALES:")
            p.setFont("Helvetica", 8.5)
            p.drawString(M + 8, y - 22, compra.notas[:120])
            y -= 34

        y -= 8

        # ════════════════════════════════════════════════════════════════════
        # 6. TABLA DE PRODUCTOS
        # ════════════════════════════════════════════════════════════════════
        ROW_H = 17

        draw_table_header(y)
        y -= 20

        subtotal_neto = 0.0
        items_list    = list(compra.items.all())

        for i, item in enumerate(items_list):
            # Salto de página si queda poco espacio
            if y < 175:
                p.showPage()
                y = H - 45
                draw_table_header(y)
                y -= 20

            st = float(item.costo_unitario) * item.cantidad
            subtotal_neto += st

            # Fondo alterno
            p.setFillColor(colors.HexColor("#f8fafc") if i % 2 == 0 else C_WHITE)
            p.rect(M, y - ROW_H, W - 2 * M, ROW_H, fill=1, stroke=0)

            # Número de línea
            p.setFillColor(C_GRAY)
            p.setFont("Helvetica", 7.5)
            p.drawString(M + 6, y - 12, str(i + 1))

            # Código
            p.setFillColor(C_BLUE)
            p.setFont("Helvetica-Bold", 8)
            cod = item.producto.cod_producto if item.producto else "—"
            p.drawString(M + 22, y - 12, cod[:12])

            # Descripción
            p.setFillColor(C_DARK)
            p.setFont("Helvetica", 8.5)
            nombre = item.producto.nombre if item.producto else f"#{item.producto_id}"
            p.drawString(M + 90, y - 12, nombre[:40])

            # Unidad de medida
            p.setFillColor(C_GRAY)
            p.setFont("Helvetica", 8)
            um = getattr(item.producto, "unidad_medida", None) if item.producto else None
            p.drawString(M + 330, y - 12, str(um)[:5] if um else "UND")

            # Cantidad
            p.setFillColor(C_DARK)
            p.setFont("Helvetica-Bold", 8.5)
            p.drawRightString(M + 390, y - 12, str(item.cantidad))

            # Precio unitario
            p.setFont("Helvetica", 8.5)
            p.drawRightString(M + 445, y - 12, f"Q {float(item.costo_unitario):,.2f}")

            # Subtotal
            p.setFont("Helvetica-Bold", 8.5)
            p.drawRightString(W - M - 2, y - 12, f"Q {st:,.2f}")

            # Línea inferior
            p.setStrokeColor(C_GRAY_LINE)
            p.setLineWidth(0.3)
            p.line(M, y - ROW_H, W - M, y - ROW_H)

            y -= ROW_H

        y -= 4

        # ════════════════════════════════════════════════════════════════════
        # 7. TOTALES
        # ════════════════════════════════════════════════════════════════════
        iva         = subtotal_neto * 0.12
        total_final = subtotal_neto + iva
        TOT_W       = 195
        tx          = W - M - TOT_W

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
        tot_row("Subtotal (sin IVA):", f"Q {subtotal_neto:,.2f}")
        tot_row("IVA (12%):", f"Q {iva:,.2f}")
        hline(y + 2, lw=1, color=C_NAVY)
        y -= 2
        tot_row("TOTAL:", f"Q {total_final:,.2f}", bold=True, big=True, bg=C_NAVY, fg=C_WHITE)

        y -= 6
        p.setFillColor(C_GRAY)
        p.setFont("Helvetica-Oblique", 7)
        p.drawString(M, y, "* IVA estimado al 12%. El monto final estará sujeto a la factura emitida por el proveedor.")

        # ════════════════════════════════════════════════════════════════════
        # 8. ÁREA DE FIRMAS
        # ════════════════════════════════════════════════════════════════════
        y -= 22
        SIG_H  = 62
        SIG_W  = (W - 2 * M - 20) / 3
        FIRMAS = [
            ("Elaborado por",            "Nombre y firma"),
            ("Autorizado por",           "Nombre y firma"),
            ("Recibido por (Proveedor)", "Firma, sello y fecha"),
        ]
        for i, (titulo, sub) in enumerate(FIRMAS):
            sx = M + i * (SIG_W + 10)
            p.setFillColor(C_GRAY_LT)
            p.roundRect(sx, y - SIG_H, SIG_W, SIG_H, 3, fill=1, stroke=0)
            p.setStrokeColor(C_GRAY_LINE)
            p.setLineWidth(0.5)
            p.roundRect(sx, y - SIG_H, SIG_W, SIG_H, 3, fill=0, stroke=1)
            # Título
            p.setFillColor(C_GRAY)
            p.setFont("Helvetica-Bold", 7.5)
            p.drawCentredString(sx + SIG_W / 2, y - 13, titulo)
            # Línea de firma
            p.setStrokeColor(colors.HexColor("#9ca3af"))
            p.setLineWidth(0.5)
            p.line(sx + 12, y - 38, sx + SIG_W - 12, y - 38)
            # Sublabel
            p.setFillColor(C_GRAY)
            p.setFont("Helvetica", 7)
            p.drawCentredString(sx + SIG_W / 2, y - SIG_H + 7, sub)

        # ════════════════════════════════════════════════════════════════════
        # 9. PIE DE PÁGINA
        # ════════════════════════════════════════════════════════════════════
        p.setFillColor(C_NAVY)
        p.rect(0, 0, W, 30, fill=1, stroke=0)
        p.setFillColor(C_SKY)
        p.setFont("Helvetica", 7)
        p.drawString(M, 11, f"Documento oficial — {correlativo} — Este documento no tiene validez fiscal como factura.")
        p.drawRightString(W - M, 11, f"{compra.fecha_creacion.strftime('%d/%m/%Y')}  ·  Pág. 1")

        p.showPage()
        p.save()
        return response
