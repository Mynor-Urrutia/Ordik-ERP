"""
FEL Guatemala — servicio de certificación.

En producción este módulo envía el DTE-XML al certificador autorizado por SAT
(DIGIFACT, G4S, Infile, etc.) vía HTTPS y almacena el UUID de respuesta.

Por ahora es un mock completo que simula el flujo real sin llamadas externas:
  certificar() → genera UUID, marca factura como "emitida"
  anular()     → invalida el UUID ante el certificador, marca como "anulada"
"""
import uuid
from django.utils import timezone
from .models import FelCertificacion


def _generar_xml_dte(factura):
    items_xml = "".join(
        f"<Item><Descripcion>{it.nombre}</Descripcion>"
        f"<Cantidad>{it.cantidad}</Cantidad>"
        f"<PrecioUnitario>{it.precio_unitario}</PrecioUnitario>"
        f"<Total>{it.total}</Total></Item>"
        for it in factura.items.all()
    )
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f"<DTE xmlns=\"http://www.sat.gob.gt/dte/fel/0.2.0\">"
        f"<Encabezado>"
        f"<NumeroAcceso>{factura.correlativo}</NumeroAcceso>"
        f"<FechaHoraEmision>{factura.fecha_emision}</FechaHoraEmision>"
        f"<NIT>{factura.cliente.nit}</NIT>"
        f"<Receptor>{factura.cliente.razon_social}</Receptor>"
        f"</Encabezado>"
        f"<Items>{items_xml}</Items>"
        f"<Totales><GranTotal>{factura.total}</GranTotal></Totales>"
        f"</DTE>"
    )


def _generar_xml_respuesta(fel_uuid, fecha):
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f"<DTECertificado>"
        f"<UUID>{fel_uuid}</UUID>"
        f"<FechaCertificacion>{fecha.isoformat()}</FechaCertificacion>"
        f"<Resultado>CERTIFICADO</Resultado>"
        f"</DTECertificado>"
    )


def certificar(factura):
    """Certifica una factura ante SAT Guatemala (mock). Idempotente si ya está certificada."""
    fel, _ = FelCertificacion.objects.get_or_create(factura=factura)

    if fel.estatus == "certificada":
        return fel

    if fel.estatus == "anulada":
        raise ValueError("No se puede certificar una factura ya anulada.")

    numero = factura.correlativo.replace("FAC-", "")
    fel_uuid = uuid.uuid4()
    ahora = timezone.now()

    fel.uuid               = fel_uuid
    fel.serie              = "A"
    fel.numero             = numero
    fel.fecha_certificacion = ahora
    fel.estatus            = "certificada"
    fel.xml_enviado        = _generar_xml_dte(factura)
    fel.xml_respuesta      = _generar_xml_respuesta(fel_uuid, ahora)
    fel.error_mensaje      = ""
    fel.save()

    factura.estatus = "emitida"
    factura.save(update_fields=["estatus"])

    return fel


def anular(factura, motivo="Anulación solicitada"):
    """Anula una factura certificada ante SAT Guatemala (mock)."""
    try:
        fel = factura.fel
    except FelCertificacion.DoesNotExist:
        raise ValueError("Esta factura no tiene certificación FEL.")

    if fel.estatus != "certificada":
        raise ValueError(f"Solo se pueden anular facturas certificadas (estatus actual: {fel.estatus}).")

    fel.estatus       = "anulada"
    fel.error_mensaje = motivo
    fel.save(update_fields=["estatus", "error_mensaje", "fecha_actualizacion"])

    factura.estatus = "anulada"
    factura.save(update_fields=["estatus"])

    # Si existía CxC, marcarla como anulada/inactiva
    try:
        cxc = factura.cxc
        cxc.estatus = "vencida"
        cxc.notas   = f"Factura anulada FEL: {motivo}"
        cxc.save(update_fields=["estatus", "notas", "fecha_actualizacion"])
    except Exception:
        pass

    return fel
