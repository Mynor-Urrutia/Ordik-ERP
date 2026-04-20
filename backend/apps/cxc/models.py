from decimal import Decimal
from django.db import models


ESTATUS_CXC = [
    ("pendiente", "Pendiente"),
    ("parcial",   "Parcial"),
    ("pagada",    "Pagada"),
    ("vencida",   "Vencida"),
]

METODO_PAGO_CHOICES = [
    ("efectivo",      "Efectivo"),
    ("transferencia", "Transferencia"),
    ("cheque",        "Cheque"),
    ("tarjeta",       "Tarjeta"),
    ("otro",          "Otro"),
]


class CuentaPorCobrar(models.Model):
    factura           = models.OneToOneField(
        "facturacion.Factura", on_delete=models.PROTECT, related_name="cxc"
    )
    cliente           = models.ForeignKey(
        "clientes.Cliente", on_delete=models.PROTECT, related_name="cuentas_por_cobrar"
    )
    monto_original    = models.DecimalField(max_digits=14, decimal_places=2)
    saldo_pendiente   = models.DecimalField(max_digits=14, decimal_places=2)
    fecha_vencimiento = models.DateField()
    estatus           = models.CharField(max_length=20, choices=ESTATUS_CXC, default="pendiente")
    notas             = models.TextField(blank=True)
    fecha_creacion    = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["fecha_vencimiento"]
        verbose_name = "Cuenta por Cobrar"
        verbose_name_plural = "Cuentas por Cobrar"

    def __str__(self):
        return f"CxC-{self.factura.correlativo} | {self.cliente} | Q{self.saldo_pendiente}"

    def recalcular_saldo(self):
        pagado = self.pagos.aggregate(total=models.Sum("monto"))["total"] or Decimal("0")
        self.saldo_pendiente = max(Decimal("0"), self.monto_original - pagado)
        if self.saldo_pendiente == Decimal("0"):
            self.estatus = "pagada"
        elif pagado > Decimal("0"):
            self.estatus = "parcial"
        else:
            self.estatus = "pendiente"
        self.save(update_fields=["saldo_pendiente", "estatus", "fecha_actualizacion"])

        if self.estatus == "pagada" and self.factura.estatus not in ("pagada", "anulada"):
            self.factura.estatus = "pagada"
            self.factura.save(update_fields=["estatus"])


class PagoCxC(models.Model):
    cuenta         = models.ForeignKey(CuentaPorCobrar, on_delete=models.CASCADE, related_name="pagos")
    monto          = models.DecimalField(max_digits=14, decimal_places=2)
    fecha_pago     = models.DateField()
    metodo_pago    = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES)
    referencia     = models.CharField(max_length=100, blank=True)
    notas          = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_pago"]

    def __str__(self):
        return f"Pago Q{self.monto} → {self.cuenta}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.cuenta.recalcular_saldo()

    def delete(self, *args, **kwargs):
        cuenta = self.cuenta
        super().delete(*args, **kwargs)
        cuenta.recalcular_saldo()
