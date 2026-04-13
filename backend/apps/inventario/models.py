from decimal import Decimal
from django.db import models


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

    # Campos para salidas
    vale_salida = models.CharField(max_length=100, blank=True)
    referencia_ot = models.CharField(max_length=100, blank=True)

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
            producto = self.producto
            if self.tipo == "entrada":
                producto.stock_actual += self.cantidad
            else:
                producto.stock_actual = max(0, producto.stock_actual - self.cantidad)
            producto.save(update_fields=["stock_actual"])
