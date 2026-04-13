from rest_framework import serializers
from .models import Marca, Modelo, TipoPago, TipoTrabajo, TipoEstatus, TipoServicio, Personal, TipoCliente, TipoProducto


class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = "__all__"


class ModeloSerializer(serializers.ModelSerializer):
    marca_nombre = serializers.CharField(source="marca.nombre", read_only=True)

    class Meta:
        model = Modelo
        fields = ["id", "marca", "marca_nombre", "nombre", "activo"]


class TipoPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPago
        fields = "__all__"


class TipoTrabajoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoTrabajo
        fields = "__all__"


class TipoEstatusSerializer(serializers.ModelSerializer):
    modulo_display = serializers.CharField(source="get_modulo_display", read_only=True)

    class Meta:
        model = TipoEstatus
        fields = ["id", "nombre", "modulo", "modulo_display", "activo"]


class TipoServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServicio
        fields = "__all__"


class PersonalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personal
        fields = "__all__"


class TipoClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCliente
        fields = "__all__"


class TipoProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoProducto
        fields = "__all__"
