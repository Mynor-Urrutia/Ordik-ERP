import datetime
from django.db import models


class Compra(models.Model):
    correlativo = models.CharField(max_length=20, unique=True, blank=True, editable=False)
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
    notas = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_creacion"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.correlativo:
            fecha_str = self.fecha_creacion.strftime("%Y%m%d")
            self.correlativo = f"OC-{fecha_str}-{self.pk:07d}"
            super().save(update_fields=["correlativo"])

    def __str__(self):
        return self.correlativo or f"Compra #{self.pk}"


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
