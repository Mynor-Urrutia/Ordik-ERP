import datetime
from django.db import models


class CotizacionProveedor(models.Model):
    """Cotización recibida de un proveedor, previa a la compra."""

    correlativo = models.CharField(max_length=20, unique=True, blank=True, editable=False)
    proveedor = models.ForeignKey(
        "proveedores.Proveedor",
        on_delete=models.PROTECT,
        related_name="cotizaciones",
    )
    fecha = models.DateField(default=datetime.date.today)
    notas = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_creacion"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.correlativo:
            fecha_str = self.fecha.strftime("%Y%m%d")
            self.correlativo = f"OC-{fecha_str}-{self.pk:07d}"
            super().save(update_fields=["correlativo"])

    def __str__(self):
        return self.correlativo or f"CotProv #{self.pk}"


class CotizacionProveedorItem(models.Model):
    cotizacion = models.ForeignKey(
        CotizacionProveedor,
        on_delete=models.CASCADE,
        related_name="items",
    )
    producto = models.ForeignKey(
        "inventario.Producto",
        on_delete=models.PROTECT,
        related_name="cotizacion_proveedor_items",
    )
    cantidad = models.PositiveIntegerField()
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    @property
    def subtotal(self):
        return self.cantidad * self.precio_unitario

    def __str__(self):
        return f"{self.producto} x{self.cantidad}"


class Compra(models.Model):
    proveedor = models.ForeignKey(
        "proveedores.Proveedor",
        on_delete=models.PROTECT,
        related_name="compras",
    )
    fecha_despacho = models.DateField()
    tipo_pago = models.ForeignKey(
        "maestros.TipoPago",
        on_delete=models.PROTECT,
        related_name="compras",
        null=True,
        blank=True,
    )
    cotizacion_proveedor = models.ForeignKey(
        CotizacionProveedor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="compras",
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"Compra #{self.pk} — {self.proveedor}"


class CompraItem(models.Model):
    compra = models.ForeignKey(
        Compra,
        on_delete=models.CASCADE,
        related_name="items",
    )
    producto = models.ForeignKey(
        "inventario.Producto",
        on_delete=models.PROTECT,
        related_name="compra_items",
    )
    cantidad = models.PositiveIntegerField()
    costo_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    @property
    def subtotal(self):
        return self.cantidad * self.costo_unitario

    def __str__(self):
        return f"{self.producto} x{self.cantidad}"
