from django.db import models


class Compra(models.Model):
    TIPO_PAGO_CHOICES = [
        ("contado", "Contado"),
        ("credito", "Crédito"),
    ]

    proveedor = models.ForeignKey(
        "proveedores.Proveedor",
        on_delete=models.PROTECT,
        related_name="compras",
    )
    fecha_despacho = models.DateField()
    tipo_pago = models.CharField(max_length=10, choices=TIPO_PAGO_CHOICES)
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
