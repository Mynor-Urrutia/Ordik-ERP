from django.db import models


class OrdenTrabajo(models.Model):
    cliente = models.ForeignKey(
        "clientes.Cliente",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="ordenes",
    )
    tipo_cliente = models.CharField(max_length=100)
    tipo_trabajo = models.CharField(max_length=100)
    tecnico_asignado = models.CharField(max_length=100, blank=True)
    descripcion = models.TextField()
    estatus = models.CharField(max_length=100, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_finalizado = models.DateField(null=True, blank=True)
    cotizacion = models.ForeignKey(
        "cotizaciones.Cotizacion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordenes",
    )

    # ── Campos de cierre formal ──────────────────────────────────────────────
    observaciones_cierre = models.TextField(blank=True)
    horas_trabajadas = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    nombre_receptor = models.CharField(max_length=150, blank=True)
    firma_obtenida = models.BooleanField(default=False)

    class Meta:
        ordering = ["-fecha_creacion"]
        verbose_name = "Orden de Trabajo"
        verbose_name_plural = "Órdenes de Trabajo"

    def __str__(self):
        return f"OT-{self.pk:04d}"
