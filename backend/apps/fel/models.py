import uuid as _uuid
from django.db import models


ESTATUS_FEL = [
    ("pendiente",   "Pendiente"),
    ("certificada", "Certificada"),
    ("error",       "Error"),
    ("anulada",     "Anulada"),
]


class FelCertificacion(models.Model):
    factura             = models.OneToOneField(
        "facturacion.Factura", on_delete=models.PROTECT, related_name="fel"
    )
    uuid                = models.UUIDField(unique=True, null=True, blank=True)
    serie               = models.CharField(max_length=20, blank=True)
    numero              = models.CharField(max_length=20, blank=True)
    fecha_certificacion = models.DateTimeField(null=True, blank=True)
    estatus             = models.CharField(max_length=20, choices=ESTATUS_FEL, default="pendiente")
    # XML raw — almacenamos para auditoría
    xml_enviado         = models.TextField(blank=True)
    xml_respuesta       = models.TextField(blank=True)
    error_mensaje       = models.TextField(blank=True)
    fecha_creacion      = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-fecha_creacion"]
        verbose_name = "Certificación FEL"
        verbose_name_plural = "Certificaciones FEL"

    def __str__(self):
        return f"FEL-{self.factura.correlativo} [{self.estatus}]"
