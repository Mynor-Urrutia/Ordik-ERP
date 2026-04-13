from django.contrib import admin
from .models import Producto, MovimientoInventario


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = [
        "nombre", "cod_producto", "categoria", "proveedor",
        "costo_unitario", "stock_actual",
    ]
    search_fields = ["nombre", "cod_producto", "marca"]
    list_filter = ["categoria"]
    readonly_fields = ["stock_actual"]


@admin.register(MovimientoInventario)
class MovimientoInventarioAdmin(admin.ModelAdmin):
    list_display = ["producto", "tipo", "cantidad", "fecha", "observacion"]
    list_filter = ["tipo"]
    readonly_fields = ["fecha"]
