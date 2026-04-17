from decimal import Decimal
from django.db import models, transaction

UNIDAD_MEDIDA_CHOICES = [
    ("unidad",        "Unidad"),
    ("par",           "Par"),
    ("juego",         "Juego / Set"),
    ("caja",          "Caja"),
    ("paquete",       "Paquete"),
    ("rollo",         "Rollo"),
    ("metro",         "Metro lineal"),
    ("metro_cuadrado","Metro cuadrado (m²)"),
    ("kg",            "Kilogramo"),
    ("libra",         "Libra"),
    ("litro",         "Litro"),
    ("galon",         "Galón"),
    ("pieza",         "Pieza"),
]

MOTIVO_SALIDA_CHOICES = [
    ("uso_interno",          "Uso interno"),
    ("prestamo",             "Préstamo"),
    ("devolucion_proveedor", "Devolución a proveedor"),
    ("baja_definitiva",      "Baja definitiva"),
    ("transferencia",        "Transferencia"),
    ("merma",                "Merma / Pérdida"),
    ("otro",                 "Otro"),
]

CONDICION_CHOICES = [
    ("nuevo",    "Nuevo"),
    ("bueno",    "Bueno"),
    ("regular",  "Regular"),
    ("danado",   "Dañado"),
    ("obsoleto", "Obsoleto"),
]


def _gen_prefix(categoria):
    """Extrae el prefijo de 5 letras a partir del nombre de categoría."""
    if not categoria:
        return "PROD"
    clean = "".join(c for c in categoria.upper() if c.isalpha())
    return clean[:5] if clean else "PROD"


def _generate_cod_producto(categoria):
    """
    Genera código automático: primeras 5 letras de la categoría + correlativo
    de 3 dígitos sobre los registros existentes con ese mismo prefijo.
    Ejemplo: "Computadora Portátil" → COMPU001, COMPU002, …
    """
    prefix = _gen_prefix(categoria)
    existing = Producto.objects.filter(
        cod_producto__regex=rf"^{prefix}\d+$"
    ).values_list("cod_producto", flat=True)

    max_num = 0
    for code in existing:
        try:
            num = int(code[len(prefix):])
            if num > max_num:
                max_num = num
        except (ValueError, IndexError):
            pass

    return f"{prefix}{max_num + 1:03d}"


class Producto(models.Model):
    nombre = models.CharField(max_length=200)
    proveedor = models.ForeignKey(
        "proveedores.Proveedor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="productos",
    )
    marca = models.CharField(max_length=100, blank=True)
    modelo = models.CharField(max_length=100, blank=True)
    cod_producto = models.CharField(max_length=50, blank=True, null=True, unique=True)
    categoria = models.CharField(max_length=100, blank=True)
    uso = models.TextField(blank=True)
    costo_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    porcentaje_utilidad = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0")
    )
    stock_actual = models.IntegerField(default=0)
    stock_minimo = models.IntegerField(default=0)
    stock_maximo = models.IntegerField(null=True, blank=True)
    unidad_medida = models.CharField(max_length=50, default="unidad")
    ubicacion = models.CharField(max_length=200, blank=True)
    numero_serie = models.CharField(max_length=100, blank=True)
    controla_serie = models.BooleanField(
        default=False,
        help_text="Si está activo, cada unidad física requiere número de serie individual.",
    )
    activo = models.BooleanField(default=True)
    numero_factura = models.CharField(max_length=100, blank=True)
    orden_compra = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

    def save(self, *args, **kwargs):
        if not self.cod_producto:
            self.cod_producto = _generate_cod_producto(self.categoria)
        super().save(*args, **kwargs)

    @property
    def costo_total(self):
        return self.costo_unitario * self.stock_actual

    @property
    def precio_venta(self):
        return self.costo_unitario * (1 + self.porcentaje_utilidad / 100)


class MovimientoInventario(models.Model):
    TIPO_CHOICES = [("entrada", "Entrada"), ("salida", "Salida")]

    producto = models.ForeignKey(
        Producto, on_delete=models.CASCADE, related_name="movimientos"
    )
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad = models.PositiveIntegerField()
    fecha = models.DateTimeField(auto_now_add=True)
    observacion = models.TextField(blank=True)

    # Campos para entradas
    proveedor = models.ForeignKey(
        "proveedores.Proveedor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimientos_inventario",
    )
    numero_factura = models.CharField(max_length=100, blank=True)
    orden_compra = models.CharField(max_length=100, blank=True)
    costo_unitario = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Costo por unidad en esta entrada (usado para calcular CPP)"
    )

    # Campos para salidas
    vale_salida = models.CharField(max_length=100, blank=True)
    referencia_ot = models.CharField(max_length=100, blank=True)
    motivo_salida = models.CharField(max_length=100, blank=True)

    # Campos comunes
    responsable = models.ForeignKey(
        "maestros.Personal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="movimientos_inventario",
    )
    condicion = models.CharField(
        max_length=20, choices=CONDICION_CHOICES, blank=True
    )

    class Meta:
        ordering = ["-fecha"]
        verbose_name = "Movimiento de Inventario"
        verbose_name_plural = "Movimientos de Inventario (CARDEX)"

    def __str__(self):
        return f"{self.get_tipo_display()} — {self.producto} x{self.cantidad}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            with transaction.atomic():
                # Re-fetch con lock para evitar race condition en CPP
                producto = Producto.objects.select_for_update().get(pk=self.producto_id)
                if self.tipo == "entrada":
                    # Costo Promedio Ponderado (CPP)
                    if self.costo_unitario is not None:
                        stock_previo = producto.stock_actual
                        costo_previo = producto.costo_unitario
                        nuevo_stock = stock_previo + self.cantidad
                        nuevo_costo = (
                            (stock_previo * costo_previo) + (self.cantidad * self.costo_unitario)
                        ) / nuevo_stock
                        producto.costo_unitario = nuevo_costo.quantize(Decimal("0.01"))
                        producto.stock_actual += self.cantidad
                        producto.save(update_fields=["stock_actual", "costo_unitario"])
                    else:
                        producto.stock_actual += self.cantidad
                        producto.save(update_fields=["stock_actual"])
                else:
                    producto.stock_actual = max(0, producto.stock_actual - self.cantidad)
                    producto.save(update_fields=["stock_actual"])


ESTADO_UNIDAD_CHOICES = [
    ("disponible",   "Disponible"),
    ("en_uso",       "En Uso"),
    ("dado_de_baja", "Dado de Baja"),
]


class UnidadSeriada(models.Model):
    """
    Representa una unidad física individual de un Producto con controla_serie=True.
    Cada número de serie es único a nivel global.
    """
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name="unidades",
    )
    numero_serie = models.CharField(max_length=200, unique=True)
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_UNIDAD_CHOICES,
        default="disponible",
    )
    condicion = models.CharField(
        max_length=20,
        choices=CONDICION_CHOICES,
        blank=True,
    )
    observaciones = models.TextField(blank=True)
    fecha_ingreso = models.DateTimeField(auto_now_add=True)

    # Trazabilidad: qué movimiento creó/removió esta unidad
    movimiento_entrada = models.ForeignKey(
        MovimientoInventario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="unidades_ingresadas",
    )
    movimiento_salida = models.ForeignKey(
        MovimientoInventario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="unidades_egresadas",
    )

    class Meta:
        ordering = ["producto", "numero_serie"]
        verbose_name = "Unidad Seriada"
        verbose_name_plural = "Unidades Seriadas"

    def __str__(self):
        return f"{self.producto} — {self.numero_serie} [{self.get_estado_display()}]"
