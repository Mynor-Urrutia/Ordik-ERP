from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import PerfilUsuario, ROL_CHOICES


# ── Auth serializers ──────────────────────────────────────────────────────────

class PerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PerfilUsuario
        fields = ["rol"]


class UsuarioMeSerializer(serializers.ModelSerializer):
    rol         = serializers.CharField(source="perfil.rol",             read_only=True, default="admin")
    rol_display = serializers.CharField(source="perfil.get_rol_display", read_only=True, default="Administrador")
    nombre      = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ["id", "username", "email", "first_name", "last_name", "nombre", "rol", "rol_display", "is_staff"]

    def get_nombre(self, obj):
        nombre = f"{obj.first_name} {obj.last_name}".strip()
        return nombre or obj.username


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["rol"] = getattr(getattr(user, "perfil", None), "rol", "admin")
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UsuarioMeSerializer(self.user).data
        return data


# ── CRUD serializers ──────────────────────────────────────────────────────────

class UsuarioListSerializer(serializers.ModelSerializer):
    rol         = serializers.CharField(source="perfil.rol",             read_only=True, default="vendedor")
    rol_display = serializers.CharField(source="perfil.get_rol_display", read_only=True, default="Vendedor")
    nombre      = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "nombre", "rol", "rol_display", "is_active", "date_joined",
        ]

    def get_nombre(self, obj):
        nombre = f"{obj.first_name} {obj.last_name}".strip()
        return nombre or obj.username


class UsuarioCreateSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    rol       = serializers.ChoiceField(choices=ROL_CHOICES, write_only=True, default="vendedor")

    class Meta:
        model  = User
        fields = ["username", "email", "first_name", "last_name", "password", "rol", "is_active"]

    def create(self, validated_data):
        rol = validated_data.pop("rol", "vendedor")
        user = User.objects.create_user(**validated_data)
        PerfilUsuario.objects.create(user=user, rol=rol)
        return user

    def to_representation(self, instance):
        return UsuarioListSerializer(instance).data


class UsuarioUpdateSerializer(serializers.ModelSerializer):
    rol = serializers.ChoiceField(choices=ROL_CHOICES, required=False)

    class Meta:
        model  = User
        fields = ["email", "first_name", "last_name", "is_active", "rol"]

    def update(self, instance, validated_data):
        rol = validated_data.pop("rol", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if rol is not None:
            perfil, _ = PerfilUsuario.objects.get_or_create(user=instance)
            perfil.rol = rol
            perfil.save()
        return instance

    def to_representation(self, instance):
        return UsuarioListSerializer(instance).data


class PasswordChangeSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)
