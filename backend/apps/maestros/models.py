from django.db import models


class Marca(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Marca"
        verbose_name_plural = "Marcas"

    def __str__(self):
        return self.nombre


class Modelo(models.Model):
    marca = models.ForeignKey(Marca, on_delete=models.CASCADE, related_name="modelos")
    nombre = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["marca__nombre", "nombre"]
        unique_together = ["marca", "nombre"]
        verbose_name = "Modelo"
        verbose_name_plural = "Modelos"

    def __str__(self):
        return f"{self.marca.nombre} — {self.nombre}"


class TipoPago(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    dias_plazo = models.PositiveIntegerField(
        default=0,
        help_text="Días disponibles para realizar el pago. Use 0 para pago inmediato."
    )
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Tipo de Pago"
        verbose_name_plural = "Tipos de Pago"

    def __str__(self):
        return self.nombre


class TipoTrabajo(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Tipo de Trabajo"
        verbose_name_plural = "Tipos de Trabajo"

    def __str__(self):
        return self.nombre


class TipoEstatus(models.Model):
    MODULO_CHOICES = [
        ("cotizaciones", "Cotizaciones"),
        ("ordenes_trabajo", "Órdenes de Trabajo"),
        ("compras", "Compras"),
        ("general", "General"),
    ]

    nombre = models.CharField(max_length=100)
    modulo = models.CharField(max_length=20, choices=MODULO_CHOICES, default="general")
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["modulo", "nombre"]
        unique_together = ["nombre", "modulo"]
        verbose_name = "Tipo de Estatus"
        verbose_name_plural = "Tipos de Estatus"

    def __str__(self):
        return f"{self.get_modulo_display()} — {self.nombre}"


class TipoServicio(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Tipo de Servicio"
        verbose_name_plural = "Tipos de Servicio"

    def __str__(self):
        return self.nombre


class Personal(models.Model):
    nombre = models.CharField(max_length=100)
    cargo = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Personal"
        verbose_name_plural = "Personal"

    def __str__(self):
        return f"{self.nombre} ({self.cargo})" if self.cargo else self.nombre


class TipoCliente(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Tipo de Cliente"
        verbose_name_plural = "Tipos de Cliente"

    def __str__(self):
        return self.nombre


class TipoProducto(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Tipo de Producto"
        verbose_name_plural = "Tipos de Producto"

    def __str__(self):
        return self.nombre
