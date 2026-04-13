from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Cliente

DATA = {
    "razon_social": "Empresa Test SA",
    "nit": "900123456-1",
    "email": "test@empresa.com",
    "telefono": "3001234567",
    "direccion_comercial": "Calle 1 # 2-3",
    "nombre_comercial": "Empresa Test",
    "nombre_contacto": "Juan Pérez",
    "telefono_contacto": "3007654321",
    "email_contacto": "juan@empresa.com",
    "tipo_cliente": "privado",
}


class ClienteModelTest(TestCase):
    def test_str(self):
        c = Cliente(**DATA)
        self.assertIn("Empresa Test SA", str(c))

    def test_nit_unique(self):
        from django.db import IntegrityError
        Cliente.objects.create(**DATA)
        with self.assertRaises(IntegrityError):
            Cliente.objects.create(**DATA)


class ClienteAPITest(APITestCase):
    def test_list(self):
        self.assertEqual(self.client.get("/api/clientes/").status_code, status.HTTP_200_OK)

    def test_create(self):
        r = self.client.post("/api/clientes/", DATA, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Cliente.objects.count(), 1)

    def test_retrieve(self):
        c = Cliente.objects.create(**DATA)
        r = self.client.get(f"/api/clientes/{c.pk}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["nit"], DATA["nit"])

    def test_delete(self):
        c = Cliente.objects.create(**DATA)
        r = self.client.delete(f"/api/clientes/{c.pk}/")
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
