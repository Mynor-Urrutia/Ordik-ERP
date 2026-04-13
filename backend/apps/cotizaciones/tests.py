from decimal import Decimal
from rest_framework import status
from rest_framework.test import APITestCase
from apps.clientes.models import Cliente
from .models import Cotizacion, CotizacionItem

CLIENTE_DATA = {
    "razon_social": "Cliente Cot SA",
    "nit": "123456789-0",
    "email": "cot@test.com",
    "telefono": "3001111111",
    "direccion_comercial": "Calle 10",
    "nombre_comercial": "Cot",
    "nombre_contacto": "Ana",
    "telefono_contacto": "3002222222",
    "email_contacto": "ana@test.com",
    "tipo_cliente": "privado",
}


class CotizacionAPITest(APITestCase):
    def setUp(self):
        self.cliente = Cliente.objects.create(**CLIENTE_DATA)

    def test_create_con_items(self):
        payload = {
            "cliente": self.cliente.pk,
            "tipo": "productos",
            "estatus": "borrador",
            "items": [
                {
                    "nombre_producto": "Producto A",
                    "precio_unitario": "100.00",
                    "porcentaje_iva": "19.00",
                    "porcentaje_isr": "0.00",
                    "cantidad": 2,
                }
            ],
        }
        r = self.client.post("/api/cotizaciones/", payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(r.data["items"]), 1)

    def test_total_calculado(self):
        cot = Cotizacion.objects.create(
            cliente=self.cliente, tipo="productos", estatus="borrador"
        )
        CotizacionItem.objects.create(
            cotizacion=cot,
            nombre_producto="X",
            precio_unitario=Decimal("100"),
            porcentaje_iva=Decimal("19"),
            porcentaje_isr=Decimal("0"),
            cantidad=1,
        )
        self.assertEqual(cot.total, Decimal("119.00"))
