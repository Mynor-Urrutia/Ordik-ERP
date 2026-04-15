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


class Proveedor(models.Model):
    TIPO_PROVEEDOR_CHOICES = [
        ("Bienes", "Bienes"),
        ("Servicios", "Servicios"),
        ("Ambos", "Bienes y Servicios"),
    ]
    TIPO_CUENTA_CHOICES = [
        ("Monetaria", "Monetaria"),
        ("Ahorro", "Ahorro"),
    ]

    # Identidad
    razon_social    = models.CharField(max_length=200)
    nit             = models.CharField(max_length=20, unique=True)
    nombre_comercial = models.CharField(max_length=200, blank=True)
    tipo_proveedor  = models.CharField(max_length=20, choices=TIPO_PROVEEDOR_CHOICES, blank=True)
    numero_rtu      = models.CharField(max_length=50, blank=True, verbose_name="N° RTU")
    sitio_web       = models.URLField(blank=True)

    # Dirección
    direccion_comercial = models.TextField(blank=True)
    municipio           = models.CharField(max_length=100, blank=True)
    departamento        = models.CharField(max_length=100, choices=DEPARTAMENTOS_GT, blank=True)
    pais                = models.CharField(max_length=100, default="Guatemala", blank=True)

    # Contacto corporativo
    telefono = models.CharField(max_length=20, blank=True)
    email    = models.EmailField(blank=True)

    # Persona de contacto
    nombre_contacto   = models.CharField(max_length=100, blank=True)
    telefono_contacto = models.CharField(max_length=20, blank=True)
    email_contacto    = models.EmailField(blank=True)

    # Pago y banco
    tipo_pago     = models.CharField(max_length=100, blank=True)
    banco         = models.CharField(max_length=100, blank=True)
    numero_cuenta = models.CharField(max_length=50, blank=True, verbose_name="N° de Cuenta")
    tipo_cuenta   = models.CharField(max_length=20, choices=TIPO_CUENTA_CHOICES, blank=True)

    # General
    notas          = models.TextField(blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["razon_social"]

    def __str__(self):
        return f"{self.razon_social} ({self.nit})"
