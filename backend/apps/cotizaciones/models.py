from decimal import Decimal
from django.db import models


class Cotizacion(models.Model):
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.PROTECT,
        related_name="cotizaciones",
    )
    tipo              = models.CharField(max_length=100)
    estatus           = models.CharField(max_length=100, default="Borrador")
    asesor            = models.CharField(max_length=100, blank=True)
    fecha_creacion    = models.DateTimeField(auto_now_add=True)

    # Campos extendidos
    validez_dias      = models.PositiveIntegerField(default=30, help_text="Días de validez de la cotización")
    condiciones_pago  = models.CharField(max_length=200, blank=True, help_text="Ej: Contado, Crédito 30 días")
    tiempo_entrega    = models.CharField(max_length=200, blank=True, help_text="Ej: Inmediata, 1-2 semanas")
    lugar_entrega     = models.CharField(max_length=200, blank=True)
    ot_referencia     = models.CharField(max_length=50, blank=True, help_text="Número de OT relacionada")
    notas             = models.TextField(blank=True, help_text="Notas, términos y condiciones")

    class Meta:
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"COT-{self.pk:04d} — {self.cliente}"

    @property
    def total(self):
        return sum((item.total for item in self.items.all()), Decimal("0"))


class CotizacionItem(models.Model):
    cotizacion           = models.ForeignKey(Cotizacion, on_delete=models.CASCADE, related_name="items")
    nombre_producto      = models.CharField(max_length=200)
    descripcion          = models.TextField(blank=True, help_text="Descripción detallada del ítem")
    unidad_medida        = models.CharField(max_length=50, default="unidad")
    precio_unitario      = models.DecimalField(max_digits=12, decimal_places=2)
    descuento_porcentaje = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0.00"),
        help_text="Descuento en porcentaje sobre el precio unitario"
    )
    descuento_monto      = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"),
        help_text="Descuento en monto fijo por unidad"
    )
    porcentaje_iva       = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("12.00"))
    porcentaje_isr       = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    cantidad             = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.nombre_producto} x{self.cantidad}"

    @property
    def precio_neto(self):
        """Precio unitario después de aplicar descuentos."""
        precio_desc = self.precio_unitario * (
            Decimal("1") - self.descuento_porcentaje / Decimal("100")
        )
        return max(Decimal("0"), precio_desc - self.descuento_monto)

    @property
    def subtotal_unitario(self):
        factor = (
            Decimal("1")
            + self.porcentaje_iva / Decimal("100")
            + self.porcentaje_isr / Decimal("100")
        )
        return self.precio_neto * factor

    @property
    def total(self):
        return self.subtotal_unitario * self.cantidad
