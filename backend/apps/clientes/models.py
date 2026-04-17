from django.db import models

DEPARTAMENTOS_GT = [
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


class Cliente(models.Model):
    TIPO_CHOICES = [("publico", "Público"), ("privado", "Privado")]

    # Identidad
    razon_social     = models.CharField(max_length=200)
    nit              = models.CharField(max_length=20, unique=True)
    nombre_comercial = models.CharField(max_length=200, blank=True)
    tipo_cliente     = models.CharField(max_length=10, choices=TIPO_CHOICES, blank=True)
    sector           = models.CharField(max_length=100, blank=True,
                           help_text="Industria o sector al que pertenece el cliente.")
    sitio_web        = models.URLField(blank=True)

    # Dirección
    direccion_comercial = models.TextField(blank=True)
    municipio           = models.CharField(max_length=100, blank=True)
    departamento        = models.CharField(max_length=100, choices=DEPARTAMENTOS_GT, blank=True)
    pais                = models.CharField(max_length=100, default="Guatemala", blank=True)

    # Contacto corporativo
    telefono           = models.CharField(max_length=20, blank=True)
    telefono_secundario = models.CharField(max_length=20, blank=True)
    email              = models.EmailField(blank=True)

    # Persona de contacto
    nombre_contacto   = models.CharField(max_length=100, blank=True)
    telefono_contacto = models.CharField(max_length=20, blank=True)
    email_contacto    = models.EmailField(blank=True)

    # Condiciones comerciales
    limite_credito = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        verbose_name="Límite de Crédito (Q)",
    )
    dias_credito = models.PositiveIntegerField(
        default=0,
        help_text="Días de plazo para el pago. Use 0 para pago inmediato.",
    )

    # General
    notas          = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["razon_social"]

    def __str__(self):
        return f"{self.razon_social} ({self.nit})"
