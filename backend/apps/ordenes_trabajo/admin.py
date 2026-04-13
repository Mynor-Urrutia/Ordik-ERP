from django.contrib import admin
from .models import OrdenTrabajo


@admin.register(OrdenTrabajo)
class OrdenTrabajoAdmin(admin.ModelAdmin):
    list_display = [
        "__str__", "tipo_trabajo", "tipo_cliente", "tecnico_asignado",
        "fecha_creacion", "fecha_inicio", "fecha_finalizado",
    ]
    search_fields = ["tecnico_asignado", "descripcion"]
    list_filter = ["tipo_trabajo", "tipo_cliente"]
