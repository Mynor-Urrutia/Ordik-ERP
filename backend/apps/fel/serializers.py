from rest_framework import serializers
from .models import FelCertificacion


class FelCertificacionSerializer(serializers.ModelSerializer):
    correlativo = serializers.CharField(source="factura.correlativo", read_only=True)

    class Meta:
        model  = FelCertificacion
        fields = [
            "id", "factura", "correlativo",
            "uuid", "serie", "numero",
            "fecha_certificacion", "estatus",
            "error_mensaje",
            "fecha_creacion", "fecha_actualizacion",
        ]
        read_only_fields = fields
