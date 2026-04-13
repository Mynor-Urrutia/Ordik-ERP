from django.contrib import admin
from .models import Cotizacion, CotizacionItem


class CotizacionItemInline(admin.TabularInline):
    model = CotizacionItem
    extra = 1
    fields = ["nombre_producto", "precio_unitario", "porcentaje_iva", "porcentaje_isr", "cantidad"]


@admin.register(Cotizacion)
class CotizacionAdmin(admin.ModelAdmin):
    list_display = ["__str__", "cliente", "tipo", "estatus", "fecha_creacion"]
    list_filter = ["estatus", "tipo"]
    search_fields = ["cliente__razon_social"]
    inlines = [CotizacionItemInline]
