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
    proveedor_nombre          = serializers.CharField(source="proveedor.razon_social",  read_only=True)
    proveedor_nit             = serializers.CharField(source="proveedor.nit",            read_only=True)
    proveedor_email           = serializers.CharField(source="proveedor.email",          read_only=True)
    proveedor_telefono        = serializers.CharField(source="proveedor.telefono",       read_only=True)
    proveedor_nombre_contacto = serializers.CharField(source="proveedor.nombre_contacto", read_only=True)
    proveedor_banco           = serializers.CharField(source="proveedor.banco",          read_only=True)
    proveedor_numero_cuenta   = serializers.CharField(source="proveedor.numero_cuenta",  read_only=True)
    proveedor_tipo_cuenta     = serializers.CharField(source="proveedor.tipo_cuenta",    read_only=True)
    proveedor_tipo_pago       = serializers.CharField(source="proveedor.tipo_pago",      read_only=True)
    historial = CompraHistorialSerializer(many=True, read_only=True)

    class Meta:
        model = Compra
        fields = [
            "id",
            "correlativo",
            "proveedor",
            "proveedor_nombre",
            "proveedor_nit",
            "proveedor_email",
            "proveedor_telefono",
            "proveedor_nombre_contacto",
            "proveedor_banco",
            "proveedor_numero_cuenta",
            "proveedor_tipo_cuenta",
            "proveedor_tipo_pago",
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
