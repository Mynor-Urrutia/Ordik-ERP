from django.db import models


class Proveedor(models.Model):
    razon_social = models.CharField(max_length=200)
    nit = models.CharField(max_length=20, unique=True)
    email = models.EmailField()
    telefono = models.CharField(max_length=20)
    direccion_comercial = models.TextField()
    nombre_comercial = models.CharField(max_length=200)
    nombre_contacto = models.CharField(max_length=100)
    telefono_contacto = models.CharField(max_length=20)
    email_contacto = models.EmailField()
    tipo_pago = models.CharField(max_length=100)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["razon_social"]

    def __str__(self):
        return f"{self.razon_social} ({self.nit})"
