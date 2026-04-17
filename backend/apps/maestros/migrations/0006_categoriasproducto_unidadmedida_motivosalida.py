from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("maestros", "0005_empresaconfig"),
    ]

    operations = [
        migrations.CreateModel(
            name="CategoriaProducto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=100, unique=True)),
                ("descripcion", models.TextField(blank=True)),
                ("activo", models.BooleanField(default=True)),
            ],
            options={"ordering": ["nombre"], "verbose_name": "Categoría de Producto", "verbose_name_plural": "Categorías de Producto"},
        ),
        migrations.CreateModel(
            name="UnidadMedida",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=100, unique=True)),
                ("abreviatura", models.CharField(blank=True, max_length=20)),
                ("activo", models.BooleanField(default=True)),
            ],
            options={"ordering": ["nombre"], "verbose_name": "Unidad de Medida", "verbose_name_plural": "Unidades de Medida"},
        ),
        migrations.CreateModel(
            name="MotivoSalida",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=100, unique=True)),
                ("activo", models.BooleanField(default=True)),
            ],
            options={"ordering": ["nombre"], "verbose_name": "Motivo de Salida", "verbose_name_plural": "Motivos de Salida"},
        ),
    ]
