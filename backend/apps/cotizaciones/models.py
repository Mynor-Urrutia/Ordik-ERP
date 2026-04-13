from decimal import Decimal
from django.db import models


class Cotizacion(models.Model):
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.PROTECT,
        related_name="cotizaciones",
    )
    tipo = models.CharField(max_length=100)
    estatus = models.CharField(max_length=100, default="Borrador")
    asesor = models.CharField(max_length=100, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"COT-{self.pk:04d} — {self.cliente}"

    @property
    def total(self):
        return sum((item.total for item in self.items.all()), Decimal("0"))


class CotizacionItem(models.Model):
    cotizacion = models.ForeignKey(
        Cotizacion, on_delete=models.CASCADE, related_name="items"
    )
    nombre_producto = models.CharField(max_length=200)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    porcentaje_iva = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("19.00")
    )
    porcentaje_isr = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0.00")
    )
    cantidad = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.nombre_producto} x{self.cantidad}"

    @property
    def subtotal_unitario(self):
        factor = (
            Decimal("1")
            + self.porcentaje_iva / Decimal("100")
            + self.porcentaje_isr / Decimal("100")
        )
        return self.precio_unitario * factor

    @property
    def total(self):
        return self.subtotal_unitario * self.cantidad
