from django.http import HttpResponse
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

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
        cotizacion = self.get_object()
        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="cotizacion_{cotizacion.pk}.pdf"'
        )

        p = canvas.Canvas(response, pagesize=A4)
        width, height = A4

        # Header
        p.setFont("Helvetica-Bold", 18)
        p.drawString(50, height - 60, "COTIZACIÓN")

        p.setFont("Helvetica-Bold", 10)
        p.drawRightString(width - 50, height - 40, f"N° COT-{cotizacion.pk:04d}")
        p.drawRightString(
            width - 50, height - 55,
            f"Fecha: {cotizacion.fecha_creacion.strftime('%d/%m/%Y')}",
        )
        p.drawRightString(
            width - 50, height - 70,
            f"Estado: {cotizacion.estatus}",
        )

        # Client block
        p.setFont("Helvetica-Bold", 11)
        p.drawString(50, height - 110, "CLIENTE")
        p.setFont("Helvetica", 10)
        p.drawString(50, height - 125, f"Razón Social: {cotizacion.cliente.razon_social}")
        p.drawString(50, height - 140, f"NIT: {cotizacion.cliente.nit}")
        p.drawString(50, height - 155, f"Email: {cotizacion.cliente.email}")

        # Table header
        y = height - 195
        p.setFillColorRGB(0.18, 0.35, 0.62)
        p.rect(50, y - 4, width - 100, 18, fill=1)
        p.setFillColorRGB(1, 1, 1)
        p.setFont("Helvetica-Bold", 9)
        p.drawString(55, y, "Producto")
        p.drawString(255, y, "Cant.")
        p.drawString(300, y, "P. Unit.")
        p.drawString(370, y, "IVA %")
        p.drawString(415, y, "ISR %")
        p.drawString(460, y, "Total")
        p.setFillColorRGB(0, 0, 0)

        y -= 22
        p.setFont("Helvetica", 9)
        for i, item in enumerate(cotizacion.items.all()):
            if i % 2 == 0:
                p.setFillColorRGB(0.95, 0.95, 0.95)
                p.rect(50, y - 4, width - 100, 16, fill=1)
                p.setFillColorRGB(0, 0, 0)
            p.drawString(55, y, str(item.nombre_producto)[:38])
            p.drawString(255, y, str(item.cantidad))
            p.drawString(300, y, f"${item.precio_unitario:,.2f}")
            p.drawString(370, y, f"{item.porcentaje_iva}%")
            p.drawString(415, y, f"{item.porcentaje_isr}%")
            p.drawString(460, y, f"${item.total:,.2f}")
            y -= 20

        # Total
        y -= 10
        p.setFont("Helvetica-Bold", 12)
        p.drawRightString(width - 50, y, f"TOTAL:  ${cotizacion.total:,.2f}")

        p.showPage()
        p.save()
        return response
