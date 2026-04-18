from rest_framework import serializers
from .models import Factura, FacturaItem


class FacturaItemSerializer(serializers.ModelSerializer):
    precio_neto = serializers.ReadOnlyField()
    total       = serializers.ReadOnlyField()

    class Meta:
        model  = FacturaItem
        fields = [
            "id", "nombre", "descripcion", "unidad_medida",
            "cantidad", "precio_unitario",
            "descuento_porcentaje", "precio_neto",
            "porcentaje_iva", "porcentaje_isr", "total",
        ]


class FacturaSerializer(serializers.ModelSerializer):
    items          = FacturaItemSerializer(many=True)
    total          = serializers.ReadOnlyField()
    cliente_nombre = serializers.CharField(source="cliente.razon_social", read_only=True)

    class Meta:
        model  = Factura
        fields = [
            "id", "correlativo", "cliente", "cliente_nombre",
            "cotizacion", "orden_trabajo",
            "fecha_emision", "fecha_vencimiento",
            "estatus", "notas", "fecha_creacion",
            "items", "total",
        ]
        read_only_fields = ["correlativo", "fecha_creacion"]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        factura = Factura.objects.create(**validated_data)
        for item in items_data:
            FacturaItem.objects.create(factura=factura, **item)
        return factura

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                FacturaItem.objects.create(factura=instance, **item)
        return instance
