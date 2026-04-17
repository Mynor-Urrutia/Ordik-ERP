from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ordenes_trabajo", "0003_ordentrabajo_estatus_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="ordentrabajo",
            name="observaciones_cierre",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="ordentrabajo",
            name="horas_trabajadas",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True),
        ),
        migrations.AddField(
            model_name="ordentrabajo",
            name="nombre_receptor",
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name="ordentrabajo",
            name="firma_obtenida",
            field=models.BooleanField(default=False),
        ),
    ]
