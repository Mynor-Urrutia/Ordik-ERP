from django.http import HttpResponse
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors

from .models import OrdenTrabajo
from .serializers import OrdenTrabajoSerializer


class OrdenTrabajoViewSet(viewsets.ModelViewSet):
    queryset = OrdenTrabajo.objects.select_related("cliente", "cotizacion").all()
    serializer_class = OrdenTrabajoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["cliente"]
    search_fields = ["tecnico_asignado", "descripcion"]

    @action(detail=True, methods=["get"], url_path="pdf")
    def generar_pdf(self, request, pk=None):
        from apps.maestros.models import EmpresaConfig

        ot      = self.get_object()
        empresa = EmpresaConfig.objects.first()
        cliente = ot.cliente
        numero  = f"OT-{ot.pk:04d}"

        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{numero}.pdf"'

        p = canvas.Canvas(response, pagesize=A4)
        W, H = A4
        M = 45

        # ── Paleta ──────────────────────────────────────────────────────────
        C_NAVY      = colors.HexColor("#0f172a")
        C_BLUE      = colors.HexColor("#1d4ed8")
        C_BLUE_LT   = colors.HexColor("#dbeafe")
        C_BLUE_XL   = colors.HexColor("#eff6ff")
        C_SKY       = colors.HexColor("#93c5fd")
        C_MIST      = colors.HexColor("#bfdbfe")
        C_TEAL      = colors.HexColor("#0d9488")
        C_TEAL_LT   = colors.HexColor("#ccfbf1")
        C_TEAL_XL   = colors.HexColor("#f0fdfa")
        C_GREEN     = colors.HexColor("#166534")
        C_GREEN_LT  = colors.HexColor("#dcfce7")
        C_AMBER_LT  = colors.HexColor("#fffbeb")
        C_AMBER     = colors.HexColor("#92400e")
        C_DARK      = colors.HexColor("#1f2937")
        C_GRAY      = colors.HexColor("#6b7280")
        C_GRAY_LT   = colors.HexColor("#f3f4f6")
        C_GRAY_LINE = colors.HexColor("#e5e7eb")
        C_WHITE     = colors.white

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

        # ════════════════════════════════════════════════════════════════════
        # 1. ENCABEZADO
        # ════════════════════════════════════════════════════════════════════
        HEADER_H = 95
        p.setFillColor(C_NAVY)
        p.rect(0, H - HEADER_H, W, HEADER_H, fill=1, stroke=0)
        p.setFillColor(C_TEAL)
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
        p.drawRightString(W - M, H - 28, "ORDEN DE TRABAJO")

        p.setFillColor(C_SKY)
        p.setFont("Helvetica-Bold", 13)
        p.drawRightString(W - M, H - 46, numero)

        p.setFillColor(C_MIST)
        p.setFont("Helvetica", 8.5)
        fecha_str = ot.fecha_creacion.strftime("%d/%m/%Y") if ot.fecha_creacion else "—"
        p.drawRightString(W - M, H - 59, f"Creación: {fecha_str}")

        # Badge estatus
        es_finalizado = bool(ot.fecha_finalizado)
        es_en_curso   = bool(ot.fecha_inicio) and not es_finalizado
        if es_finalizado:
            est_label, est_bg, est_fg = "FINALIZADO", C_GREEN_LT, C_GREEN
        elif es_en_curso:
            est_label, est_bg, est_fg = "EN CURSO", C_BLUE_LT, C_BLUE
        else:
            est_label, est_bg, est_fg = "PENDIENTE", colors.HexColor("#fef9c3"), colors.HexColor("#713f12")

        BADGE_W = 90
        p.setFillColor(est_bg)
        p.roundRect(W - M - BADGE_W, H - HEADER_H + 10, BADGE_W, 17, 4, fill=1, stroke=0)
        p.setFillColor(est_fg)
        p.setFont("Helvetica-Bold", 7.5)
        p.drawCentredString(W - M - BADGE_W / 2, H - HEADER_H + 19, est_label)

        # ════════════════════════════════════════════════════════════════════
        # 2. CLIENTE + DETALLES OT
        # ════════════════════════════════════════════════════════════════════
        y = H - HEADER_H - 10
        BOX_H = 105
        BOX_W = (W - 2 * M - 12) / 2

        if cliente:
            cliente_lines = [
                ("Helvetica-Bold", 10, C_DARK, cliente.razon_social),
                ("Helvetica",       8, C_GRAY, f"NIT: {cliente.nit}"),
            ]
            if getattr(cliente, "direccion_comercial", None):
                cliente_lines.append(("Helvetica", 8, C_GRAY, cliente.direccion_comercial))
            loc = ", ".join(filter(None, [
                getattr(cliente, "municipio", ""),
                getattr(cliente, "departamento", ""),
            ]))
            if loc:
                cliente_lines.append(("Helvetica", 8, C_GRAY, loc))
            if getattr(cliente, "telefono", None):
                cliente_lines.append(("Helvetica", 8, C_GRAY, f"Tel: {cliente.telefono}"))
        else:
            cliente_lines = [("Helvetica", 8, C_GRAY, "Sin cliente asignado")]

        draw_info_box(M, y, BOX_W, BOX_H, "CLIENTE:", C_BLUE, C_BLUE_XL, C_BLUE_LT, cliente_lines)

        ot_lines = []
        if ot.tipo_trabajo:
            ot_lines += [("Helvetica", 7, C_GRAY, "Tipo de trabajo:"),
                         ("Helvetica-Bold", 8.5, C_DARK, ot.tipo_trabajo)]
        if ot.tipo_cliente:
            ot_lines += [("Helvetica", 7, C_GRAY, "Tipo de cliente:"),
                         ("Helvetica-Bold", 8.5, C_DARK, ot.tipo_cliente)]
        if ot.tecnico_asignado:
            ot_lines += [("Helvetica", 7, C_GRAY, "Técnico asignado:"),
                         ("Helvetica-Bold", 8.5, C_DARK, ot.tecnico_asignado)]

        draw_info_box(M + BOX_W + 12, y, BOX_W, BOX_H,
                      "DETALLES:", C_TEAL, C_TEAL_XL, C_TEAL_LT, ot_lines)

        y -= (BOX_H + 8)

        # ════════════════════════════════════════════════════════════════════
        # 3. BARRA DE FECHAS
        # ════════════════════════════════════════════════════════════════════
        BAR_H = 42
        p.setFillColor(C_NAVY)
        p.rect(M, y - BAR_H, W - 2 * M, BAR_H, fill=1, stroke=0)

        COL_W = (W - 2 * M) / 4
        p.setStrokeColor(colors.HexColor("#2d3748"))
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

        fecha_inicio_str     = ot.fecha_inicio.strftime("%d/%m/%Y") if ot.fecha_inicio else "—"
        fecha_finalizado_str = ot.fecha_finalizado.strftime("%d/%m/%Y") if ot.fecha_finalizado else "—"
        cotizacion_ref       = f"COT-{ot.cotizacion.pk:04d}" if ot.cotizacion else "—"
        estatus_label        = ot.estatus or "—"

        bar_col(M,             "FECHA INICIO",     fecha_inicio_str)
        bar_col(M + COL_W,     "FECHA FINALIZADO", fecha_finalizado_str)
        bar_col(M + COL_W * 2, "ESTATUS",          estatus_label)
        bar_col(M + COL_W * 3, "COTIZACIÓN REF.",  cotizacion_ref)

        y -= (BAR_H + 14)

        # ════════════════════════════════════════════════════════════════════
        # 4. DESCRIPCIÓN DEL TRABAJO
        # ════════════════════════════════════════════════════════════════════
        if ot.descripcion:
            desc_text  = ot.descripcion
            max_chars  = 100
            desc_lines = []
            # Preservar saltos de línea del texto
            for raw_line in desc_text.split("\n"):
                raw_line = raw_line.strip()
                if not raw_line:
                    desc_lines.append("")
                    continue
                while len(raw_line) > max_chars:
                    desc_lines.append(raw_line[:max_chars])
                    raw_line = raw_line[max_chars:]
                desc_lines.append(raw_line)
            desc_lines = desc_lines[:18]  # máximo 18 líneas

            desc_h = 22 + len(desc_lines) * 13
            p.setFillColor(C_GRAY_LT)
            p.roundRect(M, y - desc_h, W - 2 * M, desc_h, 3, fill=1, stroke=0)
            p.setStrokeColor(C_GRAY_LINE)
            p.setLineWidth(0.5)
            p.roundRect(M, y - desc_h, W - 2 * M, desc_h, 3, fill=0, stroke=1)

            p.setFillColor(C_NAVY)
            p.setFont("Helvetica-Bold", 7.5)
            p.drawString(M + 8, y - 12, "DESCRIPCIÓN DEL TRABAJO:")

            dy = y - 25
            p.setFont("Helvetica", 8.5)
            for line in desc_lines:
                p.setFillColor(C_DARK)
                p.drawString(M + 8, dy, line)
                dy -= 13

            y -= (desc_h + 10)

        # ════════════════════════════════════════════════════════════════════
        # 5. SECCIÓN DE CIERRE (solo si está finalizado)
        # ════════════════════════════════════════════════════════════════════
        if es_finalizado:
            cierre_lines = []
            if ot.observaciones_cierre:
                cierre_lines.append(("obs", ot.observaciones_cierre))
            if ot.horas_trabajadas:
                cierre_lines.append(("dato", f"Horas trabajadas: {ot.horas_trabajadas}"))
            if ot.nombre_receptor:
                cierre_lines.append(("dato", f"Recibido por: {ot.nombre_receptor}"))
            firma_txt = "Sí — firma obtenida" if ot.firma_obtenida else "Pendiente de firma"
            cierre_lines.append(("dato", f"Firma del cliente: {firma_txt}"))

            # Calcular altura
            n_lines = sum(
                len(v.split("\n")) if k == "obs" else 1
                for k, v in cierre_lines
            ) + 2
            cierre_h = 22 + n_lines * 13

            p.setFillColor(C_TEAL_XL)
            p.roundRect(M, y - cierre_h, W - 2 * M, cierre_h, 3, fill=1, stroke=0)
            p.setStrokeColor(C_TEAL_LT)
            p.setLineWidth(0.8)
            p.roundRect(M, y - cierre_h, W - 2 * M, cierre_h, 3, fill=0, stroke=1)

            p.setFillColor(C_TEAL)
            p.setFont("Helvetica-Bold", 7.5)
            p.drawString(M + 8, y - 12, "INFORME DE CIERRE:")

            cy = y - 26
            for kind, text in cierre_lines:
                if kind == "dato":
                    p.setFillColor(C_GRAY)
                    p.setFont("Helvetica-Bold", 8)
                    p.drawString(M + 8, cy, text[:105])
                    cy -= 14
                else:
                    max_chars = 100
                    for raw in text.split("\n"):
                        raw = raw.strip()
                        if not raw:
                            cy -= 6
                            continue
                        while len(raw) > max_chars:
                            p.setFillColor(C_DARK)
                            p.setFont("Helvetica", 8.5)
                            p.drawString(M + 8, cy, raw[:max_chars])
                            raw = raw[max_chars:]
                            cy -= 13
                        p.setFillColor(C_DARK)
                        p.setFont("Helvetica", 8.5)
                        p.drawString(M + 8, cy, raw)
                        cy -= 13

            y -= (cierre_h + 14)

        # ════════════════════════════════════════════════════════════════════
        # 6. ÁREA DE FIRMAS
        # ════════════════════════════════════════════════════════════════════
        y -= 8
        SIG_H = 62
        SIG_W = (W - 2 * M - 20) / 3
        FIRMAS = [
            ("Técnico Responsable",  ot.tecnico_asignado or "", "Nombre y firma"),
            ("Supervisado por",       "",                        "Nombre y firma"),
            ("Recibido conforme",     ot.nombre_receptor or "",  "Firma del cliente"),
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
            p.line(sx + 12, y - 40, sx + SIG_W - 12, y - 40)
            p.setFillColor(C_GRAY)
            p.setFont("Helvetica", 7)
            p.drawCentredString(sx + SIG_W / 2, y - SIG_H + 7, sub)

        # ════════════════════════════════════════════════════════════════════
        # 7. PIE DE PÁGINA
        # ════════════════════════════════════════════════════════════════════
        p.setFillColor(C_NAVY)
        p.rect(0, 0, W, 30, fill=1, stroke=0)
        p.setFillColor(C_SKY)
        p.setFont("Helvetica", 7)
        p.drawString(M, 11, f"Documento generado por ORDIK ERP — {numero} — Este documento no tiene validez fiscal.")
        p.drawRightString(W - M, 11, f"{fecha_str}  ·  Pág. 1")

        p.showPage()
        p.save()
        return response
