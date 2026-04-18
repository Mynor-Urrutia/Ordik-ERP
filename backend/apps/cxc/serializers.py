from rest_framework import serializers
from .models import CuentaPorCobrar, PagoCxC


class PagoCxCSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PagoCxC
        fields = [
            "id", "cuenta", "monto", "fecha_pago",
            "metodo_pago", "referencia", "notas", "fecha_creacion",
        ]
        read_only_fields = ["fecha_creacion"]


class CuentaPorCobrarSerializer(serializers.ModelSerializer):
    pagos          = PagoCxCSerializer(many=True, read_only=True)
    cliente_nombre = serializers.CharField(source="cliente.razon_social", read_only=True)
    correlativo    = serializers.CharField(source="factura.correlativo", read_only=True)

    class Meta:
        model  = CuentaPorCobrar
        fields = [
            "id", "correlativo", "factura", "cliente", "cliente_nombre",
            "monto_original", "saldo_pendiente",
            "fecha_vencimiento", "estatus", "notas",
            "fecha_creacion", "fecha_actualizacion", "pagos",
        ]
        read_only_fields = [
            "correlativo", "monto_original", "saldo_pendiente",
            "estatus", "fecha_creacion", "fecha_actualizacion",
        ]
