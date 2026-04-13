from rest_framework import serializers
from .models import Compra, CompraItem, CotizacionProveedor, CotizacionProveedorItem


class CotizacionProveedorItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CotizacionProveedorItem
        fields = ["id", "producto", "cantidad", "precio_unitario", "subtotal"]


class CotizacionProveedorSerializer(serializers.ModelSerializer):
    items = CotizacionProveedorItemSerializer(many=True)

    class Meta:
        model = CotizacionProveedor
        fields = ["id", "correlativo", "proveedor", "fecha", "notas", "fecha_creacion", "items"]
        read_only_fields = ["correlativo", "fecha_creacion"]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        cotizacion = CotizacionProveedor.objects.create(**validated_data)
        for item in items_data:
            CotizacionProveedorItem.objects.create(cotizacion=cotizacion, **item)
        return cotizacion

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                CotizacionProveedorItem.objects.create(cotizacion=instance, **item)
        return instance


class CompraItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CompraItem
        fields = ["id", "producto", "cantidad", "costo_unitario", "subtotal"]


class CompraSerializer(serializers.ModelSerializer):
    items = CompraItemSerializer(many=True)
    tipo_pago_nombre = serializers.CharField(source="tipo_pago.nombre", read_only=True)
    cotizacion_correlativo = serializers.CharField(source="cotizacion_proveedor.correlativo", read_only=True)

    class Meta:
        model = Compra
        fields = [
            "id",
            "proveedor",
            "fecha_despacho",
            "tipo_pago",
            "tipo_pago_nombre",
            "cotizacion_proveedor",
            "cotizacion_correlativo",
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
