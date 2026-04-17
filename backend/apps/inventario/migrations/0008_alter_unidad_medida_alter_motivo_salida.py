from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventario", "0007_unidadseriada_y_controla_serie"),
    ]

    operations = [
        migrations.AlterField(
            model_name="producto",
            name="unidad_medida",
            field=models.CharField(default="unidad", max_length=50),
        ),
        migrations.AlterField(
            model_name="movimientoinventario",
            name="motivo_salida",
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
