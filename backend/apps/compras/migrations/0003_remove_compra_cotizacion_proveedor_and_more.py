# Migración manual — limpia el estado inconsistente de la BD vs Django
# y agrega correlativo + notas a Compra.

from django.db import migrations, models


def populate_correlativo(apps, schema_editor):
    Compra = apps.get_model("compras", "Compra")
    for compra in Compra.objects.all():
        fecha_str = compra.fecha_creacion.strftime("%Y%m%d")
        compra.correlativo = f"OC-{fecha_str}-{compra.pk:07d}"
        compra.save(update_fields=["correlativo"])


class Migration(migrations.Migration):

    dependencies = [
        ('compras', '0002_alter_compra_tipo_pago_cotizacionproveedor_and_more'),
    ]

    operations = [
        # ── Sincronizar estado Django ↔ BD ────────────────────────────────────
        # cotizacion_proveedor nunca llegó a la BD — solo actualizamos estado
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveField(model_name='compra', name='cotizacion_proveedor'),
            ],
        ),
        # cotizacionproveedoritem.cotizacion y .producto tampoco existen en BD
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveField(model_name='cotizacionproveedoritem', name='cotizacion'),
                migrations.RemoveField(model_name='cotizacionproveedoritem', name='producto'),
            ],
        ),
        # Dropear tablas directamente con SQL (ya existen en BD pero el estado
        # las elimina con DeleteModel)
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        "SET FOREIGN_KEY_CHECKS=0; "
                        "DROP TABLE IF EXISTS compras_cotizacionproveedoritem; "
                        "DROP TABLE IF EXISTS compras_cotizacionproveedor; "
                        "SET FOREIGN_KEY_CHECKS=1;"
                    ),
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.DeleteModel(name='CotizacionProveedorItem'),
                migrations.DeleteModel(name='CotizacionProveedor'),
            ],
        ),

        # ── Agregar campos nuevos a Compra ────────────────────────────────────
        migrations.AddField(
            model_name='compra',
            name='correlativo',
            field=models.CharField(blank=True, editable=False, max_length=20, default=''),
        ),
        migrations.AddField(
            model_name='compra',
            name='notas',
            field=models.TextField(blank=True),
        ),

        # Poblar correlativos en registros existentes
        migrations.RunPython(populate_correlativo, migrations.RunPython.noop),

        # Aplicar restricción unique después de poblar
        migrations.AlterField(
            model_name='compra',
            name='correlativo',
            field=models.CharField(blank=True, editable=False, max_length=20, unique=True),
        ),
    ]
