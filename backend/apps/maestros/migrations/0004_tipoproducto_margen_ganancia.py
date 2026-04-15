from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('maestros', '0003_tipopago_dias_plazo'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipoproducto',
            name='margen_ganancia',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Porcentaje de ganancia a aplicar sobre el costo de los productos de este tipo.',
                max_digits=5,
            ),
        ),
    ]
