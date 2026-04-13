from django.contrib import admin
from .models import Compra, CompraItem


class CompraItemInline(admin.TabularInline):
    model = CompraItem
    extra = 1
    fields = ["producto", "cantidad", "costo_unitario"]


@admin.register(Compra)
class CompraAdmin(admin.ModelAdmin):
    list_display = ["__str__", "proveedor", "fecha_despacho", "tipo_pago", "fecha_creacion"]
    list_filter = ["tipo_pago"]
    search_fields = ["proveedor__razon_social"]
    inlines = [CompraItemInline]
