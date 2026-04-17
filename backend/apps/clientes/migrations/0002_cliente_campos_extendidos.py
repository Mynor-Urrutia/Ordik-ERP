from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0001_initial'),
    ]

    operations = [
        # Hacer opcionales campos existentes
        migrations.AlterField(
            model_name='cliente',
            name='email',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AlterField(
            model_name='cliente',
            name='telefono',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AlterField(
            model_name='cliente',
            name='nombre_comercial',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AlterField(
            model_name='cliente',
            name='direccion_comercial',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='cliente',
            name='nombre_contacto',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AlterField(
            model_name='cliente',
            name='telefono_contacto',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AlterField(
            model_name='cliente',
            name='email_contacto',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AlterField(
            model_name='cliente',
            name='tipo_cliente',
            field=models.CharField(
                blank=True,
                choices=[('publico', 'Público'), ('privado', 'Privado')],
                max_length=10,
            ),
        ),
        # Nuevos campos
        migrations.AddField(
            model_name='cliente',
            name='sector',
            field=models.CharField(blank=True, help_text='Industria o sector al que pertenece el cliente.', max_length=100),
        ),
        migrations.AddField(
            model_name='cliente',
            name='sitio_web',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='cliente',
            name='municipio',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='cliente',
            name='departamento',
            field=models.CharField(
                blank=True,
                choices=[
                    ('Alta Verapaz', 'Alta Verapaz'), ('Baja Verapaz', 'Baja Verapaz'),
                    ('Chimaltenango', 'Chimaltenango'), ('Chiquimula', 'Chiquimula'),
                    ('El Progreso', 'El Progreso'), ('Escuintla', 'Escuintla'),
                    ('Guatemala', 'Guatemala'), ('Huehuetenango', 'Huehuetenango'),
                    ('Izabal', 'Izabal'), ('Jalapa', 'Jalapa'), ('Jutiapa', 'Jutiapa'),
                    ('Petén', 'Petén'), ('Quetzaltenango', 'Quetzaltenango'),
                    ('Quiché', 'Quiché'), ('Retalhuleu', 'Retalhuleu'),
                    ('Sacatepéquez', 'Sacatepéquez'), ('San Marcos', 'San Marcos'),
                    ('Santa Rosa', 'Santa Rosa'), ('Sololá', 'Sololá'),
                    ('Suchitepéquez', 'Suchitepéquez'), ('Totonicapán', 'Totonicapán'),
                    ('Zacapa', 'Zacapa'),
                ],
                max_length=100,
            ),
        ),
        migrations.AddField(
            model_name='cliente',
            name='pais',
            field=models.CharField(blank=True, default='Guatemala', max_length=100),
        ),
        migrations.AddField(
            model_name='cliente',
            name='telefono_secundario',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='cliente',
            name='limite_credito',
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=12,
                verbose_name='Límite de Crédito (Q)',
            ),
        ),
        migrations.AddField(
            model_name='cliente',
            name='dias_credito',
            field=models.PositiveIntegerField(
                default=0,
                help_text='Días de plazo para el pago. Use 0 para pago inmediato.',
            ),
        ),
        migrations.AddField(
            model_name='cliente',
            name='notas',
            field=models.TextField(blank=True),
        ),
    ]
