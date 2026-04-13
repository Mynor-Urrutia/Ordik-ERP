from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Proveedor

DATA = {
    "razon_social": "Proveedor Test SAS",
    "nit": "800987654-2",
    "email": "prov@test.com",
    "telefono": "3109876543",
    "direccion_comercial": "Carrera 5 # 10-20",
    "nombre_comercial": "Proveedor Test",
    "nombre_contacto": "María López",
    "telefono_contacto": "3001112233",
    "email_contacto": "maria@provtest.com",
    "tipo_pago": "credito",
}


class ProveedorModelTest(TestCase):
    def test_str(self):
        p = Proveedor(**DATA)
        self.assertIn("Proveedor Test SAS", str(p))


class ProveedorAPITest(APITestCase):
    def test_list(self):
        self.assertEqual(self.client.get("/api/proveedores/").status_code, status.HTTP_200_OK)

    def test_create(self):
        r = self.client.post("/api/proveedores/", DATA, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_update_tipo_pago(self):
        p = Proveedor.objects.create(**DATA)
        r = self.client.patch(f"/api/proveedores/{p.pk}/", {"tipo_pago": "contado"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["tipo_pago"], "contado")
