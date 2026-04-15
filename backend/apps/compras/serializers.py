from rest_framework import serializers
from .models import Compra, CompraHistorial, CompraItem


class CompraItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    producto_cod = serializers.CharField(source="producto.cod_producto", read_only=True)
    producto_categoria = serializers.CharField(source="producto.categoria", read_only=True)

    class Meta:
        model = CompraItem
        fields = [
            "id", "producto", "producto_nombre", "producto_cod",
            "producto_categoria", "cantidad", "costo_unitario", "subtotal",
        ]


class CompraHistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompraHistorial
        fields = ["id", "tipo", "descripcion", "valor_anterior", "valor_nuevo", "fecha"]


class CompraSerializer(serializers.ModelSerializer):
    items = CompraItemSerializer(many=True)
    tipo_pago_nombre = serializers.CharField(source="tipo_pago.nombre", read_only=True)
    proveedor_nombre = serializers.CharField(source="proveedor.razon_social", read_only=True)
    historial = CompraHistorialSerializer(many=True, read_only=True)

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
            "num_cotizacion_proveedor",
            "notas",
            "estatus",
            "fecha_creacion",
            "items",
            "historial",
        ]
        read_only_fields = ["correlativo", "fecha_creacion"]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        compra = Compra.objects.create(**validated_data)
        for item in items_data:
            CompraItem.objects.create(compra=compra, **item)
        CompraHistorial.objects.create(
            compra=compra,
            tipo="creacion",
            descripcion=f"OC creada con {len(items_data)} producto(s)",
        )
        return compra

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        # Detectar cambios en campos simples
        campos_legibles = {
            "estatus": "Estatus",
            "fecha_despacho": "Fecha despacho",
            "notas": "Notas",
            "num_cotizacion_proveedor": "N° Cot. Proveedor",
        }
        partes = []
        for attr, value in validated_data.items():
            if attr in campos_legibles:
                anterior = getattr(instance, attr)
                if str(anterior or "") != str(value or ""):
                    partes.append(
                        f"{campos_legibles[attr]}: '{anterior or '—'}' → '{value or '—'}'"
                    )

        if items_data is not None:
            partes.append(f"Ítems actualizados ({len(items_data)} producto(s))")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                CompraItem.objects.create(compra=instance, **item)

        if partes:
            CompraHistorial.objects.create(
                compra=instance,
                tipo="edicion",
                descripcion="; ".join(partes),
            )

        return instance
