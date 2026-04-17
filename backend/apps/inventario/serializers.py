from rest_framework import serializers
from .models import Producto, MovimientoInventario, UnidadSeriada


class UnidadSeriadaSerializer(serializers.ModelSerializer):
    estado_display    = serializers.CharField(source="get_estado_display", read_only=True)
    condicion_display = serializers.CharField(source="get_condicion_display", read_only=True)
    producto_nombre   = serializers.CharField(source="producto.nombre", read_only=True)

    class Meta:
        model  = UnidadSeriada
        fields = [
            "id", "producto", "producto_nombre",
            "numero_serie", "estado", "estado_display",
            "condicion", "condicion_display",
            "observaciones", "fecha_ingreso",
            "movimiento_entrada", "movimiento_salida",
        ]
        read_only_fields = ["fecha_ingreso", "movimiento_entrada", "movimiento_salida"]


class ProductoSerializer(serializers.ModelSerializer):
    costo_total           = serializers.ReadOnlyField()
    precio_venta          = serializers.ReadOnlyField()
    proveedor_nombre      = serializers.SerializerMethodField()
    unidad_medida_display = serializers.CharField(
        source="get_unidad_medida_display", read_only=True
    )
    # Conteo de unidades disponibles (sólo para productos con controla_serie=True)
    unidades_disponibles  = serializers.SerializerMethodField()

    class Meta:
        model  = Producto
        fields = "__all__"

    def get_proveedor_nombre(self, obj):
        return obj.proveedor.razon_social if obj.proveedor else None

    def get_unidades_disponibles(self, obj):
        if not obj.controla_serie:
            return None
        return obj.unidades.filter(estado="disponible").count()


class MovimientoInventarioSerializer(serializers.ModelSerializer):
    producto_nombre       = serializers.CharField(source="producto.nombre", read_only=True)
    cod_producto          = serializers.CharField(source="producto.cod_producto", read_only=True)
    tipo_display          = serializers.CharField(source="get_tipo_display", read_only=True)
    proveedor_nombre      = serializers.SerializerMethodField()
    responsable_nombre    = serializers.SerializerMethodField()
    motivo_salida_display = serializers.CharField(
        source="get_motivo_salida_display", read_only=True
    )
    condicion_display     = serializers.CharField(
        source="get_condicion_display", read_only=True
    )

    # Seriales asociados a este movimiento (lectura)
    unidades_ingresadas = UnidadSeriadaSerializer(many=True, read_only=True)
    unidades_egresadas  = UnidadSeriadaSerializer(many=True, read_only=True)

    # Campos de escritura para productos serializados
    # Entrada: lista de strings con los nuevos números de serie
    numeros_serie = serializers.ListField(
        child=serializers.CharField(max_length=200),
        required=False,
        write_only=True,
        allow_empty=True,
    )
    # Salida: lista de IDs de UnidadSeriada disponibles a retirar
    unidades_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        allow_empty=True,
    )

    class Meta:
        model  = MovimientoInventario
        fields = [
            "id", "producto", "producto_nombre", "cod_producto",
            "tipo", "tipo_display",
            "cantidad", "costo_unitario", "fecha", "observacion",
            "proveedor", "proveedor_nombre",
            "numero_factura", "orden_compra",
            "vale_salida", "referencia_ot",
            "motivo_salida", "motivo_salida_display",
            "responsable", "responsable_nombre",
            "condicion", "condicion_display",
            # Seriales
            "unidades_ingresadas", "unidades_egresadas",
            "numeros_serie", "unidades_ids",
        ]
        read_only_fields = ["fecha"]

    def get_proveedor_nombre(self, obj):
        return obj.proveedor.razon_social if obj.proveedor else None

    def get_responsable_nombre(self, obj):
        return str(obj.responsable) if obj.responsable else None

    def validate(self, data):
        producto = data.get("producto")
        tipo     = data.get("tipo")

        if not producto or not producto.controla_serie:
            return data

        numeros_serie = data.get("numeros_serie", [])
        unidades_ids  = data.get("unidades_ids", [])

        if tipo == "entrada":
            if not numeros_serie:
                raise serializers.ValidationError(
                    {"numeros_serie": "Este producto requiere números de serie en cada entrada."}
                )
            cantidad = data.get("cantidad")
            if cantidad and len(numeros_serie) != cantidad:
                raise serializers.ValidationError(
                    {"numeros_serie": f"La cantidad ({cantidad}) debe coincidir con el número de seriales ingresados ({len(numeros_serie)})."}
                )
            # Verificar que ningún serial exista ya
            existentes = UnidadSeriada.objects.filter(numero_serie__in=numeros_serie).values_list("numero_serie", flat=True)
            if existentes:
                raise serializers.ValidationError(
                    {"numeros_serie": f"Los siguientes números de serie ya existen: {', '.join(existentes)}"}
                )

        elif tipo == "salida":
            if not unidades_ids:
                raise serializers.ValidationError(
                    {"unidades_ids": "Este producto requiere seleccionar las unidades específicas a retirar."}
                )
            unidades = UnidadSeriada.objects.filter(id__in=unidades_ids)
            # Verificar que todas existan y pertenezcan al producto
            if unidades.count() != len(unidades_ids):
                raise serializers.ValidationError(
                    {"unidades_ids": "Una o más unidades seleccionadas no existen."}
                )
            no_disponibles = unidades.exclude(estado="disponible").values_list("numero_serie", flat=True)
            if no_disponibles:
                raise serializers.ValidationError(
                    {"unidades_ids": f"Las siguientes unidades no están disponibles: {', '.join(no_disponibles)}"}
                )
            producto_incorrecto = unidades.exclude(producto=producto).values_list("numero_serie", flat=True)
            if producto_incorrecto:
                raise serializers.ValidationError(
                    {"unidades_ids": f"Las siguientes unidades no pertenecen a este producto: {', '.join(producto_incorrecto)}"}
                )
            # Para salidas con seriales, la cantidad se deriva del número de unidades
            data["cantidad"] = len(unidades_ids)

        return data
