from django.db import models


class Compra(models.Model):
    ESTATUS_CHOICES = [
        ("Pendiente", "Pendiente"),
        ("Confirmada", "Confirmada"),
        ("En tránsito", "En tránsito"),
        ("Recibida", "Recibida"),
        ("Cancelada", "Cancelada"),
    ]

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
    num_cotizacion_proveedor = models.CharField(
        max_length=100, blank=True,
        verbose_name="N° Cotización Proveedor",
        help_text="Número o código de la cotización entregada por el proveedor.",
    )
    notas = models.TextField(blank=True)
    estatus = models.CharField(max_length=20, choices=ESTATUS_CHOICES, default="Pendiente")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_creacion"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.correlativo:
            fecha_str = self.fecha_creacion.strftime("%Y%m%d")
            prefix = f"OC-{fecha_str}-"
            existing = (
                Compra.objects
                .filter(correlativo__startswith=prefix)
                .exclude(pk=self.pk)
                .values_list("correlativo", flat=True)
            )
            max_seq = 0
            for corr in existing:
                try:
                    seq = int(corr[len(prefix):])
                    if seq > max_seq:
                        max_seq = seq
                except (ValueError, IndexError):
                    pass
            self.correlativo = f"{prefix}{max_seq + 1:07d}"
            super().save(update_fields=["correlativo"])

    def __str__(self):
        return self.correlativo or f"Compra #{self.pk}"


class CompraHistorial(models.Model):
    TIPO_CHOICES = [
        ("creacion", "Creación"),
        ("estatus", "Cambio de estatus"),
        ("edicion", "Edición"),
    ]

    compra = models.ForeignKey(
        Compra,
        on_delete=models.CASCADE,
        related_name="historial",
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    descripcion = models.TextField()
    valor_anterior = models.CharField(max_length=200, blank=True)
    valor_nuevo = models.CharField(max_length=200, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha"]

    def __str__(self):
        return f"{self.get_tipo_display()} — {self.compra}"


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
