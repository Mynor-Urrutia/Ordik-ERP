from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('proveedores', '0002_alter_proveedor_tipo_pago'),
    ]

    operations = [
        # Hacer opcionales campos existentes
        migrations.AlterField(
            model_name='proveedor',
            name='email',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AlterField(
            model_name='proveedor',
            name='telefono',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AlterField(
            model_name='proveedor',
            name='nombre_comercial',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AlterField(
            model_name='proveedor',
            name='direccion_comercial',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='proveedor',
            name='nombre_contacto',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AlterField(
            model_name='proveedor',
            name='telefono_contacto',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AlterField(
            model_name='proveedor',
            name='email_contacto',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AlterField(
            model_name='proveedor',
            name='tipo_pago',
            field=models.CharField(blank=True, max_length=100),
        ),
        # Nuevos campos
        migrations.AddField(
            model_name='proveedor',
            name='tipo_proveedor',
            field=models.CharField(
                blank=True,
                choices=[('Bienes', 'Bienes'), ('Servicios', 'Servicios'), ('Ambos', 'Bienes y Servicios')],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='proveedor',
            name='numero_rtu',
            field=models.CharField(blank=True, max_length=50, verbose_name='N° RTU'),
        ),
        migrations.AddField(
            model_name='proveedor',
            name='sitio_web',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='proveedor',
            name='municipio',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='proveedor',
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
            model_name='proveedor',
            name='pais',
            field=models.CharField(blank=True, default='Guatemala', max_length=100),
        ),
        migrations.AddField(
            model_name='proveedor',
            name='banco',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='proveedor',
            name='numero_cuenta',
            field=models.CharField(blank=True, max_length=50, verbose_name='N° de Cuenta'),
        ),
        migrations.AddField(
            model_name='proveedor',
            name='tipo_cuenta',
            field=models.CharField(
                blank=True,
                choices=[('Monetaria', 'Monetaria'), ('Ahorro', 'Ahorro')],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='proveedor',
            name='notas',
            field=models.TextField(blank=True),
        ),
    ]
