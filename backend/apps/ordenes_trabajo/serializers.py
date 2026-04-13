from rest_framework import serializers
from .models import OrdenTrabajo


class OrdenTrabajoSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(
        source="cliente.razon_social", read_only=True, default=None
    )

    class Meta:
        model = OrdenTrabajo
        fields = "__all__"
