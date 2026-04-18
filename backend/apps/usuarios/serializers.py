from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import PerfilUsuario


class PerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerfilUsuario
        fields = ["rol"]


class UsuarioMeSerializer(serializers.ModelSerializer):
    rol         = serializers.CharField(source="perfil.rol",              read_only=True, default="admin")
    rol_display = serializers.CharField(source="perfil.get_rol_display",  read_only=True, default="Administrador")
    nombre      = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ["id", "username", "email", "first_name", "last_name", "nombre", "rol", "rol_display", "is_staff"]

    def get_nombre(self, obj):
        nombre = f"{obj.first_name} {obj.last_name}".strip()
        return nombre or obj.username


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Añade datos del usuario en el token de acceso."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["rol"] = getattr(getattr(user, "perfil", None), "rol", "admin")
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Añadir info del usuario en la respuesta de login
        data["user"] = UsuarioMeSerializer(self.user).data
        return data
