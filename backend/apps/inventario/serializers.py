from rest_framework import serializers
from .models import Producto, MovimientoInventario


class ProductoSerializer(serializers.ModelSerializer):
    costo_total = serializers.ReadOnlyField()
    precio_venta = serializers.ReadOnlyField()
    proveedor_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = "__all__"

    def get_proveedor_nombre(self, obj):
        return obj.proveedor.razon_social if obj.proveedor else None


class MovimientoInventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    proveedor_nombre = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoInventario
        fields = [
            "id", "producto", "producto_nombre",
            "tipo", "tipo_display",
            "cantidad", "fecha", "observacion",
            "proveedor", "proveedor_nombre",
            "numero_factura", "orden_compra",
            "vale_salida", "referencia_ot",
        ]
        read_only_fields = ["fecha"]

    def get_proveedor_nombre(self, obj):
        return obj.proveedor.razon_social if obj.proveedor else None
