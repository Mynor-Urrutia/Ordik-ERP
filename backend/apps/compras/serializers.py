from rest_framework import serializers
from .models import Compra, CompraItem


class CompraItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    producto_cod = serializers.CharField(source="producto.cod_producto", read_only=True)

    class Meta:
        model = CompraItem
        fields = ["id", "producto", "producto_nombre", "producto_cod", "cantidad", "costo_unitario", "subtotal"]


class CompraSerializer(serializers.ModelSerializer):
    items = CompraItemSerializer(many=True)
    tipo_pago_nombre = serializers.CharField(source="tipo_pago.nombre", read_only=True)
    proveedor_nombre = serializers.CharField(source="proveedor.razon_social", read_only=True)

    class Meta:
        model = Compra
        fields = [
            "id",
            "correlativo",
            "proveedor",
            "proveedor_nombre",
            "fecha_despacho",
            "tipo_pago",
            "tipo_pago_nombre",
            "notas",
            "fecha_creacion",
            "items",
        ]
        read_only_fields = ["correlativo", "fecha_creacion"]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        compra = Compra.objects.create(**validated_data)
        for item in items_data:
            CompraItem.objects.create(compra=compra, **item)
        return compra

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                CompraItem.objects.create(compra=instance, **item)
        return instance
