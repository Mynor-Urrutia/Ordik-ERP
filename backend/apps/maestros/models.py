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


class EmpresaConfig(models.Model):
    REGIMEN_CHOICES = [
        ("utilidades", "Sobre Utilidades de Actividades Lucrativas"),
        ("simplificado", "Opcional Simplificado sobre Ingresos"),
        ("pequeno", "Pequeño Contribuyente"),
    ]

    DEPARTAMENTOS = [
        ("Alta Verapaz", "Alta Verapaz"),
        ("Baja Verapaz", "Baja Verapaz"),
        ("Chimaltenango", "Chimaltenango"),
        ("Chiquimula", "Chiquimula"),
        ("El Progreso", "El Progreso"),
        ("Escuintla", "Escuintla"),
        ("Guatemala", "Guatemala"),
        ("Huehuetenango", "Huehuetenango"),
        ("Izabal", "Izabal"),
        ("Jalapa", "Jalapa"),
        ("Jutiapa", "Jutiapa"),
        ("Petén", "Petén"),
        ("Quetzaltenango", "Quetzaltenango"),
        ("Quiché", "Quiché"),
        ("Retalhuleu", "Retalhuleu"),
        ("Sacatepéquez", "Sacatepéquez"),
        ("San Marcos", "San Marcos"),
        ("Santa Rosa", "Santa Rosa"),
        ("Sololá", "Sololá"),
        ("Suchitepéquez", "Suchitepéquez"),
        ("Totonicapán", "Totonicapán"),
        ("Zacapa", "Zacapa"),
    ]

    # Identidad
    razon_social = models.CharField(max_length=200, blank=True)
    nombre_comercial = models.CharField(max_length=200, blank=True)
    nit = models.CharField(max_length=20, blank=True, verbose_name="NIT")
    tipo_sociedad = models.CharField(max_length=100, blank=True,
        help_text="Ej: Sociedad Anónima, Empresa Individual, etc.")

    # Dirección
    direccion = models.TextField(blank=True, verbose_name="Dirección Fiscal")
    municipio = models.CharField(max_length=100, blank=True)
    departamento = models.CharField(max_length=100, choices=DEPARTAMENTOS, blank=True)
    pais = models.CharField(max_length=100, default="Guatemala")
    codigo_postal = models.CharField(max_length=10, blank=True)

    # Contacto
    telefono = models.CharField(max_length=20, blank=True)
    telefono_secundario = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    email_facturacion = models.EmailField(blank=True, verbose_name="Email de Facturación")
    sitio_web = models.URLField(blank=True)

    # Fiscal / Legal
    regimen_fiscal = models.CharField(
        max_length=20, choices=REGIMEN_CHOICES, blank=True, verbose_name="Régimen ISR"
    )
    numero_rtu = models.CharField(max_length=50, blank=True, verbose_name="N° RTU",
        help_text="Número de Registro Tributario Unificado (SAT Guatemala)")
    numero_patente = models.CharField(max_length=50, blank=True, verbose_name="N° Patente de Comercio")
    representante_legal = models.CharField(max_length=200, blank=True)
    fecha_constitucion = models.DateField(null=True, blank=True, verbose_name="Fecha de Constitución")

    # Operacional
    giro_comercial = models.TextField(blank=True,
        help_text="Descripción de las actividades comerciales principales.")
    moneda = models.CharField(max_length=10, default="GTQ")

    class Meta:
        verbose_name = "Configuración de Empresa"

    def __str__(self):
        return self.razon_social or "Empresa"


class TipoProducto(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    margen_ganancia = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Porcentaje de ganancia a aplicar sobre el costo de los productos de este tipo.",
    )
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Tipo de Producto"
        verbose_name_plural = "Tipos de Producto"

    def __str__(self):
        return self.nombre


class CategoriaProducto(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Categoría de Producto"
        verbose_name_plural = "Categorías de Producto"

    def __str__(self):
        return self.nombre


class UnidadMedida(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    abreviatura = models.CharField(max_length=20, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Unidad de Medida"
        verbose_name_plural = "Unidades de Medida"

    def __str__(self):
        return f"{self.nombre} ({self.abreviatura})" if self.abreviatura else self.nombre


class MotivoSalida(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Motivo de Salida"
        verbose_name_plural = "Motivos de Salida"

    def __str__(self):
        return self.nombre
