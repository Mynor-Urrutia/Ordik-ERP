import decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cotizaciones", "0003_cotizacion_campos_extendidos"),
    ]

    operations = [
        migrations.AddField(
            model_name="cotizacionitem",
            name="descuento_porcentaje",
            field=models.DecimalField(
                decimal_places=2, default=decimal.Decimal("0.00"),
                help_text="Descuento en porcentaje sobre el precio unitario", max_digits=5,
            ),
        ),
        migrations.AddField(
            model_name="cotizacionitem",
            name="descuento_monto",
            field=models.DecimalField(
                decimal_places=2, default=decimal.Decimal("0.00"),
                help_text="Descuento en monto fijo por unidad", max_digits=12,
            ),
        ),
        migrations.AlterField(
            model_name="cotizacionitem",
            name="unidad_medida",
            field=models.CharField(default="unidad", max_length=50),
        ),
    ]
