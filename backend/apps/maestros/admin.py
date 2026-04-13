from django.contrib import admin
from .models import Marca, Modelo, TipoPago, TipoTrabajo, TipoEstatus, TipoServicio, Personal, TipoCliente, TipoProducto


@admin.register(Marca)
class MarcaAdmin(admin.ModelAdmin):
    list_display = ["nombre", "activo"]
    list_filter = ["activo"]
    search_fields = ["nombre"]


@admin.register(Modelo)
class ModeloAdmin(admin.ModelAdmin):
    list_display = ["nombre", "marca", "activo"]
    list_filter = ["activo", "marca"]
    search_fields = ["nombre", "marca__nombre"]


@admin.register(TipoPago)
class TipoPagoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "dias_plazo", "activo"]
    list_filter = ["activo"]


@admin.register(TipoTrabajo)
class TipoTrabajoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "activo"]
    list_filter = ["activo"]


@admin.register(TipoEstatus)
class TipoEstatusAdmin(admin.ModelAdmin):
    list_display = ["nombre", "modulo", "activo"]
    list_filter = ["activo", "modulo"]


@admin.register(TipoServicio)
class TipoServicioAdmin(admin.ModelAdmin):
    list_display = ["nombre", "activo"]
    list_filter = ["activo"]


@admin.register(Personal)
class PersonalAdmin(admin.ModelAdmin):
    list_display = ["nombre", "cargo", "email", "telefono", "activo"]
    list_filter = ["activo"]
    search_fields = ["nombre", "cargo", "email"]


@admin.register(TipoCliente)
class TipoClienteAdmin(admin.ModelAdmin):
    list_display = ["nombre", "activo"]
    list_filter = ["activo"]


@admin.register(TipoProducto)
class TipoProductoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "activo"]
    list_filter = ["activo"]
    search_fields = ["nombre"]
