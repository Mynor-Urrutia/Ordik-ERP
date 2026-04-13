from django.contrib import admin
from .models import Proveedor


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ["razon_social", "nit", "email", "telefono", "tipo_pago", "fecha_creacion"]
    search_fields = ["razon_social", "nit", "nombre_comercial"]
    list_filter = ["tipo_pago"]
