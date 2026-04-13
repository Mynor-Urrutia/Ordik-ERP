from rest_framework import status
from rest_framework.test import APITestCase
from apps.proveedores.models import Proveedor
from apps.inventario.models import Producto
from .models import Compra

PROV_DATA = {
    "razon_social": "Prov Compras SA",
    "nit": "555555555-1",
    "email": "compras@prov.com",
    "telefono": "3008888888",
    "direccion_comercial": "Cra 8",
    "nombre_comercial": "Prov Compras",
    "nombre_contacto": "Pedro",
    "telefono_contacto": "3009999999",
    "email_contacto": "pedro@prov.com",
    "tipo_pago": "credito",
}

PROD_DATA = {
    "nombre": "Cable UTP",
    "marca": "AMP",
    "cod_producto": "CAB-001",
    "categoria": "Cableado",
    "costo_unitario": "15000.00",
    "porcentaje_utilidad": "30.00",
}


class CompraAPITest(APITestCase):
    def setUp(self):
        self.proveedor = Proveedor.objects.create(**PROV_DATA)
        self.producto = Producto.objects.create(**PROD_DATA, proveedor=self.proveedor)

    def test_create_con_items(self):
        payload = {
            "proveedor": self.proveedor.pk,
            "fecha_despacho": "2026-04-15",
            "tipo_pago": "credito",
            "items": [
                {"producto": self.producto.pk, "cantidad": 5, "costo_unitario": "14000.00"}
            ],
        }
        r = self.client.post("/api/compras/", payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Compra.objects.count(), 1)
        self.assertEqual(len(r.data["items"]), 1)
