from rest_framework import serializers
from .models import Cotizacion, CotizacionItem


class CotizacionItemSerializer(serializers.ModelSerializer):
    subtotal_unitario    = serializers.ReadOnlyField()
    total                = serializers.ReadOnlyField()
    unidad_medida_display = serializers.CharField(source="get_unidad_medida_display", read_only=True)

    class Meta:
        model  = CotizacionItem
        fields = [
            "id", "nombre_producto", "descripcion",
            "unidad_medida", "unidad_medida_display",
            "precio_unitario", "porcentaje_iva", "porcentaje_isr",
            "cantidad", "subtotal_unitario", "total",
        ]


class CotizacionSerializer(serializers.ModelSerializer):
    items          = CotizacionItemSerializer(many=True)
    total          = serializers.ReadOnlyField()
    cliente_nombre = serializers.CharField(source="cliente.razon_social", read_only=True)

    class Meta:
        model  = Cotizacion
        fields = [
            "id", "cliente", "cliente_nombre",
            "tipo", "estatus", "asesor",
            "validez_dias", "condiciones_pago", "tiempo_entrega",
            "lugar_entrega", "ot_referencia", "notas",
            "fecha_creacion", "items", "total",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        cotizacion = Cotizacion.objects.create(**validated_data)
        for item in items_data:
            CotizacionItem.objects.create(cotizacion=cotizacion, **item)
        return cotizacion

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                CotizacionItem.objects.create(cotizacion=instance, **item)
        return instance
