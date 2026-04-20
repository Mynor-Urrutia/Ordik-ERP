from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Factura


def crear_cxc_para_factura(factura):
    """Crea CuentaPorCobrar + aplica anticipo de OT si corresponde.
    Llamado desde el serializer (después de crear ítems) y desde el signal
    cuando se cambia el estatus a 'emitida' en una factura ya existente."""
    from apps.cxc.models import CuentaPorCobrar, PagoCxC

    if hasattr(factura, "cxc"):
        return

    total = factura.total
    if not total:
        return

    cxc = CuentaPorCobrar.objects.create(
        factura           = factura,
        cliente           = factura.cliente,
        monto_original    = total,
        saldo_pendiente   = total,
        fecha_vencimiento = factura.fecha_vencimiento,
    )

    if factura.orden_trabajo_id:
        from django.utils import timezone
        ot = factura.orden_trabajo
        if ot.monto_anticipo:
            PagoCxC.objects.create(
                cuenta      = cxc,
                monto       = ot.monto_anticipo,
                fecha_pago  = ot.fecha_anticipo or timezone.now().date(),
                metodo_pago = ot.metodo_anticipo or "transferencia",
                referencia  = ot.referencia_anticipo,
                notas       = f"Anticipo registrado en OT-{ot.id:04d}",
            )


@receiver(post_save, sender=Factura)
def crear_cxc_al_emitir(sender, instance, **kwargs):
    """Aplica solo cuando se actualiza el estatus a 'emitida' en una factura
    ya existente (ej: cambio de borrador a emitida). La creación inicial vía
    serializer llama a crear_cxc_para_factura() directamente tras crear ítems."""
    if instance.estatus != "emitida" or not instance.fecha_vencimiento:
        return
    if not instance.total:
        return
    crear_cxc_para_factura(instance)
