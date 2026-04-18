from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Factura


@receiver(post_save, sender=Factura)
def crear_cxc_al_emitir(sender, instance, **kwargs):
    """Auto-crea CuentaPorCobrar cuando la factura pasa a estatus 'emitida'."""
    if instance.estatus != "emitida" or not instance.fecha_vencimiento:
        return

    from apps.cxc.models import CuentaPorCobrar

    if hasattr(instance, "cxc"):
        return

    CuentaPorCobrar.objects.create(
        factura           = instance,
        cliente           = instance.cliente,
        monto_original    = instance.total,
        saldo_pendiente   = instance.total,
        fecha_vencimiento = instance.fecha_vencimiento,
    )
