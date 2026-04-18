from django.contrib.auth.models import User
from django.db import models


ROL_CHOICES = [
    ("admin",      "Administrador"),
    ("supervisor", "Supervisor"),
    ("vendedor",   "Vendedor"),
    ("bodeguero",  "Bodeguero"),
    ("contador",   "Contador"),
]


class PerfilUsuario(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="perfil")
    rol  = models.CharField(max_length=20, choices=ROL_CHOICES, default="vendedor")

    class Meta:
        verbose_name = "Perfil de Usuario"
        verbose_name_plural = "Perfiles de Usuario"

    def __str__(self):
        return f"{self.user.username} ({self.get_rol_display()})"
