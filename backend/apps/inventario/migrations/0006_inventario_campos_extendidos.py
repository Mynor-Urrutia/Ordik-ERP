from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0005_add_costo_unitario_to_movimiento'),
        ('maestros', '0005_empresaconfig'),
    ]

    operations = [
        # ── Producto — nuevos campos ─────────────────────────────────────────
        migrations.AddField(
            model_name='producto',
            name='stock_minimo',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='producto',
            name='stock_maximo',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='producto',
            name='unidad_medida',
            field=models.CharField(
                choices=[
                    ('unidad', 'Unidad'), ('par', 'Par'), ('juego', 'Juego / Set'),
                    ('caja', 'Caja'), ('paquete', 'Paquete'), ('rollo', 'Rollo'),
                    ('metro', 'Metro lineal'), ('metro_cuadrado', 'Metro cuadrado (m²)'),
                    ('kg', 'Kilogramo'), ('libra', 'Libra'),
                    ('litro', 'Litro'), ('galon', 'Galón'), ('pieza', 'Pieza'),
                ],
                default='unidad',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='producto',
            name='ubicacion',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='producto',
            name='numero_serie',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='producto',
            name='activo',
            field=models.BooleanField(default=True),
        ),
        # ── MovimientoInventario — nuevos campos ─────────────────────────────
        migrations.AddField(
            model_name='movimientoinventario',
            name='responsable',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='movimientos_inventario',
                to='maestros.personal',
            ),
        ),
        migrations.AddField(
            model_name='movimientoinventario',
            name='motivo_salida',
            field=models.CharField(
                blank=True,
                choices=[
                    ('uso_interno', 'Uso interno'),
                    ('prestamo', 'Préstamo'),
                    ('devolucion_proveedor', 'Devolución a proveedor'),
                    ('baja_definitiva', 'Baja definitiva'),
                    ('transferencia', 'Transferencia'),
                    ('merma', 'Merma / Pérdida'),
                    ('otro', 'Otro'),
                ],
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='movimientoinventario',
            name='condicion',
            field=models.CharField(
                blank=True,
                choices=[
                    ('nuevo', 'Nuevo'), ('bueno', 'Bueno'), ('regular', 'Regular'),
                    ('danado', 'Dañado'), ('obsoleto', 'Obsoleto'),
                ],
                max_length=20,
            ),
        ),
    ]
