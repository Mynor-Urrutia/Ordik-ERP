from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('maestros', '0004_tipoproducto_margen_ganancia'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmpresaConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('razon_social', models.CharField(blank=True, max_length=200)),
                ('nombre_comercial', models.CharField(blank=True, max_length=200)),
                ('nit', models.CharField(blank=True, max_length=20, verbose_name='NIT')),
                ('tipo_sociedad', models.CharField(blank=True, help_text='Ej: Sociedad Anónima, Empresa Individual, etc.', max_length=100)),
                ('direccion', models.TextField(blank=True, verbose_name='Dirección Fiscal')),
                ('municipio', models.CharField(blank=True, max_length=100)),
                ('departamento', models.CharField(
                    blank=True,
                    choices=[
                        ('Alta Verapaz', 'Alta Verapaz'),
                        ('Baja Verapaz', 'Baja Verapaz'),
                        ('Chimaltenango', 'Chimaltenango'),
                        ('Chiquimula', 'Chiquimula'),
                        ('El Progreso', 'El Progreso'),
                        ('Escuintla', 'Escuintla'),
                        ('Guatemala', 'Guatemala'),
                        ('Huehuetenango', 'Huehuetenango'),
                        ('Izabal', 'Izabal'),
                        ('Jalapa', 'Jalapa'),
                        ('Jutiapa', 'Jutiapa'),
                        ('Petén', 'Petén'),
                        ('Quetzaltenango', 'Quetzaltenango'),
                        ('Quiché', 'Quiché'),
                        ('Retalhuleu', 'Retalhuleu'),
                        ('Sacatepéquez', 'Sacatepéquez'),
                        ('San Marcos', 'San Marcos'),
                        ('Santa Rosa', 'Santa Rosa'),
                        ('Sololá', 'Sololá'),
                        ('Suchitepéquez', 'Suchitepéquez'),
                        ('Totonicapán', 'Totonicapán'),
                        ('Zacapa', 'Zacapa'),
                    ],
                    max_length=100,
                )),
                ('pais', models.CharField(default='Guatemala', max_length=100)),
                ('codigo_postal', models.CharField(blank=True, max_length=10)),
                ('telefono', models.CharField(blank=True, max_length=20)),
                ('telefono_secundario', models.CharField(blank=True, max_length=20)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('email_facturacion', models.EmailField(blank=True, max_length=254, verbose_name='Email de Facturación')),
                ('sitio_web', models.URLField(blank=True)),
                ('regimen_fiscal', models.CharField(
                    blank=True,
                    choices=[
                        ('utilidades', 'Sobre Utilidades de Actividades Lucrativas'),
                        ('simplificado', 'Opcional Simplificado sobre Ingresos'),
                        ('pequeno', 'Pequeño Contribuyente'),
                    ],
                    max_length=20,
                    verbose_name='Régimen ISR',
                )),
                ('numero_rtu', models.CharField(blank=True, help_text='Número de Registro Tributario Unificado (SAT Guatemala)', max_length=50, verbose_name='N° RTU')),
                ('numero_patente', models.CharField(blank=True, max_length=50, verbose_name='N° Patente de Comercio')),
                ('representante_legal', models.CharField(blank=True, max_length=200)),
                ('fecha_constitucion', models.DateField(blank=True, null=True, verbose_name='Fecha de Constitución')),
                ('giro_comercial', models.TextField(blank=True, help_text='Descripción de las actividades comerciales principales.')),
                ('moneda', models.CharField(default='GTQ', max_length=10)),
            ],
            options={
                'verbose_name': 'Configuración de Empresa',
            },
        ),
    ]
