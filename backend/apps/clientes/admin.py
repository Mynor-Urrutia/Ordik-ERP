from django.contrib import admin
from .models import Cliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ["razon_social", "nit", "email", "telefono", "tipo_cliente", "fecha_creacion"]
    search_fields = ["razon_social", "nit", "nombre_comercial"]
    list_filter = ["tipo_cliente"]
