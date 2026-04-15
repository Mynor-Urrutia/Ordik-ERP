from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('compras', '0004_compra_num_cotizacion_proveedor'),
    ]

    operations = [
        migrations.AddField(
            model_name='compra',
            name='estatus',
            field=models.CharField(
                choices=[
                    ('Pendiente', 'Pendiente'),
                    ('Confirmada', 'Confirmada'),
                    ('En tránsito', 'En tránsito'),
                    ('Recibida', 'Recibida'),
                    ('Cancelada', 'Cancelada'),
                ],
                default='Pendiente',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='CompraHistorial',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(
                    choices=[
                        ('creacion', 'Creación'),
                        ('estatus', 'Cambio de estatus'),
                        ('edicion', 'Edición'),
                    ],
                    max_length=20,
                )),
                ('descripcion', models.TextField()),
                ('valor_anterior', models.CharField(blank=True, max_length=200)),
                ('valor_nuevo', models.CharField(blank=True, max_length=200)),
                ('fecha', models.DateTimeField(auto_now_add=True)),
                ('compra', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='historial',
                    to='compras.compra',
                )),
            ],
            options={
                'ordering': ['-fecha'],
            },
        ),
    ]
