from rest_framework import serializers
from .models import Compra, CompraItem


class CompraItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CompraItem
        fields = ["id", "producto", "cantidad", "costo_unitario", "subtotal"]


class CompraSerializer(serializers.ModelSerializer):
    items = CompraItemSerializer(many=True)

    class Meta:
        model = Compra
        fields = [
            "id",
            "proveedor",
            "fecha_despacho",
            "tipo_pago",
            "fecha_creacion",
            "items",
        ]

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
