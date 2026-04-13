from django.db import migrations, models


def _gen_prefix(categoria):
    if not categoria:
        return "PROD"
    clean = "".join(c for c in categoria.upper() if c.isalpha())
    return clean[:5] if clean else "PROD"


def populate_cod_producto(apps, schema_editor):
    """
    Asigna código automático a todos los productos existentes que no lo tengan.
    Agrupa por prefijo de categoría y asigna correlativo en orden de creación (pk).
    """
    Producto = apps.get_model("inventario", "Producto")
    from collections import defaultdict

    prefix_counter = defaultdict(int)

    for producto in Producto.objects.filter(cod_producto__isnull=True).order_by("pk"):
        prefix = _gen_prefix(producto.categoria)
        prefix_counter[prefix] += 1
        producto.cod_producto = f"{prefix}{prefix_counter[prefix]:03d}"
        producto.save(update_fields=["cod_producto"])


def reverse_populate(apps, schema_editor):
    # No revertimos: mantener los códigos asignados aunque se haga rollback
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("inventario", "0003_movimientoinventario_numero_factura_and_more"),
    ]

    operations = [
        # 1. Primero poblar los registros existentes sin código
        migrations.RunPython(populate_cod_producto, reverse_populate),

        # 2. Recién después agregar el unique constraint
        migrations.AlterField(
            model_name="producto",
            name="cod_producto",
            field=models.CharField(blank=True, max_length=50, null=True, unique=True),
        ),
    ]
