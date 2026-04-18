from decimal import Decimal
from django.db import models


ESTATUS_CHOICES = [
    ("borrador", "Borrador"),
    ("emitida",  "Emitida"),
    ("pagada",   "Pagada"),
    ("anulada",  "Anulada"),
]


def _siguiente_correlativo():
    ultimo = Factura.objects.order_by("-id").first()
    if ultimo and ultimo.correlativo:
        try:
            num = int(ultimo.correlativo.replace("FAC-", ""))
            return f"FAC-{num + 1:05d}"
        except ValueError:
            pass
    return "FAC-00001"


class Factura(models.Model):
    correlativo    = models.CharField(max_length=20, unique=True, blank=True)
    cliente        = models.ForeignKey(
        "clientes.Cliente", on_delete=models.PROTECT, related_name="facturas"
    )
    cotizacion     = models.ForeignKey(
        "cotizaciones.Cotizacion", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="facturas"
    )
    orden_trabajo  = models.ForeignKey(
        "ordenes_trabajo.OrdenTrabajo", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="facturas"
    )
    fecha_emision  = models.DateField()
    fecha_vencimiento = models.DateField(null=True, blank=True)
    estatus        = models.CharField(max_length=20, choices=ESTATUS_CHOICES, default="borrador")
    notas          = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_creacion"]
        verbose_name = "Factura"
        verbose_name_plural = "Facturas"

    def __str__(self):
        return self.correlativo

    def save(self, *args, **kwargs):
        if not self.correlativo:
            self.correlativo = _siguiente_correlativo()
        super().save(*args, **kwargs)

    @property
    def total(self):
        return sum((it.total for it in self.items.all()), Decimal("0"))


class FacturaItem(models.Model):
    factura         = models.ForeignKey(Factura, on_delete=models.CASCADE, related_name="items")
    nombre          = models.CharField(max_length=200)
    descripcion     = models.TextField(blank=True)
    unidad_medida   = models.CharField(max_length=50, default="unidad")
    cantidad        = models.PositiveIntegerField()
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    descuento_porcentaje = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0.00")
    )
    porcentaje_iva  = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("12.00"))
    porcentaje_isr  = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))

    @property
    def precio_neto(self):
        return max(
            Decimal("0"),
            self.precio_unitario * (Decimal("1") - self.descuento_porcentaje / Decimal("100"))
        )

    @property
    def total(self):
        factor = Decimal("1") + self.porcentaje_iva / Decimal("100") + self.porcentaje_isr / Decimal("100")
        return self.precio_neto * factor * self.cantidad

    def __str__(self):
        return f"{self.nombre} x{self.cantidad}"
