from rest_framework import status
from rest_framework.test import APITestCase
from apps.proveedores.models import Proveedor
from .models import Producto, MovimientoInventario

PROV_DATA = {
    "razon_social": "Prov Inv SA",
    "nit": "777777777-0",
    "email": "inv@prov.com",
    "telefono": "3005555555",
    "direccion_comercial": "Av. 1",
    "nombre_comercial": "Prov Inv",
    "nombre_contacto": "Luis",
    "telefono_contacto": "3006666666",
    "email_contacto": "luis@prov.com",
    "tipo_pago": "contado",
}

PROD_DATA_BASE = {
    "nombre": "Switch 24p",
    "marca": "Cisco",
    "modelo": "SG350",
    "cod_producto": "SW-001",
    "categoria": "Redes",
    "uso": "Infraestructura",
    "costo_unitario": "1500000.00",
    "porcentaje_utilidad": "20.00",
}


class ProductoAPITest(APITestCase):
    def setUp(self):
        self.proveedor = Proveedor.objects.create(**PROV_DATA)

    def test_create_producto(self):
        data = {**PROD_DATA_BASE, "proveedor": self.proveedor.pk}
        r = self.client.post("/api/inventario/productos/", data, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["stock_actual"], 0)


class MovimientoInventarioTest(APITestCase):
    def setUp(self):
        prov = Proveedor.objects.create(**PROV_DATA)
        self.producto = Producto.objects.create(**PROD_DATA_BASE, proveedor=prov)

    def test_entrada_incrementa_stock(self):
        self.client.post(
            "/api/inventario/movimientos/",
            {"producto": self.producto.pk, "tipo": "entrada", "cantidad": 10, "observacion": ""},
            format="json",
        )
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 10)

    def test_salida_decrementa_stock(self):
        MovimientoInventario.objects.create(
            producto=self.producto, tipo="entrada", cantidad=5
        )
        self.producto.refresh_from_db()
        MovimientoInventario.objects.create(
            producto=self.producto, tipo="salida", cantidad=3
        )
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 2)

    def test_no_permite_put(self):
        r = self.client.put("/api/inventario/movimientos/", {})
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
