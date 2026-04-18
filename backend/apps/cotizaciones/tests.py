from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.usuarios.tests import make_user, AuthMixin
from .models import Cotizacion, CotizacionItem

CLIENTE_DATA = {
    "razon_social": "Cliente Cot SA",
    "nit": "123456780-0",
    "email": "cot@test.com",
    "telefono": "55551111",
    "direccion_comercial": "Calle 10",
    "nombre_comercial": "Cot",
    "nombre_contacto": "Ana",
    "telefono_contacto": "55552222",
    "email_contacto": "ana@test.com",
    "tipo_cliente": "privado",
}


class CotizacionAPITest(AuthMixin, APITestCase):

    def setUp(self):
        self.vendedor  = make_user("cot_vendedor",  "vendedor")
        self.bodeguero = make_user("cot_bodeguero", "bodeguero")
        self.auth_as(self.vendedor)
        self.cliente = Cliente.objects.create(**CLIENTE_DATA)

    def _payload(self):
        return {
            "cliente": self.cliente.pk,
            "tipo": "productos",
            "estatus": "borrador",
            "items": [
                {
                    "nombre_producto": "Producto A",
                    "precio_unitario": "100.00",
                    "porcentaje_iva": "12.00",
                    "porcentaje_isr": "0.00",
                    "cantidad": 2,
                }
            ],
        }

    def test_create_con_items(self):
        r = self.client.post("/api/cotizaciones/", self._payload(), format="json")
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
            porcentaje_iva=Decimal("12"),
            porcentaje_isr=Decimal("0"),
            cantidad=1,
        )
        self.assertEqual(cot.total, Decimal("112.00"))

    def test_bodeguero_no_puede_crear_cotizacion(self):
        self.auth_as(self.bodeguero)
        r = self.client.post("/api/cotizaciones/", self._payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_sin_auth_retorna_401(self):
        self.unauth()
        r = self.client.get("/api/cotizaciones/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
