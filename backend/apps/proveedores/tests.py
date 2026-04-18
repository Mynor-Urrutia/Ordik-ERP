from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.usuarios.tests import make_user, AuthMixin
from .models import Proveedor

DATA = {
    "razon_social": "Proveedor Test SAS",
    "nit": "800987654-2",
    "email": "prov@test.com",
    "telefono": "55559876",
    "direccion_comercial": "Carrera 5 # 10-20",
    "nombre_comercial": "Proveedor Test",
    "nombre_contacto": "María López",
    "telefono_contacto": "55551122",
    "email_contacto": "maria@provtest.com",
}


class ProveedorModelTest(TestCase):

    def test_str(self):
        p = Proveedor(**DATA)
        self.assertIn("Proveedor Test SAS", str(p))


class ProveedorAPITest(AuthMixin, APITestCase):

    def setUp(self):
        self.admin      = make_user("prov_admin",      "admin")
        self.supervisor = make_user("prov_supervisor", "supervisor")
        self.vendedor   = make_user("prov_vendedor",   "vendedor")
        self.auth_as(self.admin)

    def test_list(self):
        r = self.client.get("/api/proveedores/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_create(self):
        r = self.client.post("/api/proveedores/", DATA, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_supervisor_puede_crear_proveedor(self):
        self.auth_as(self.supervisor)
        r = self.client.post("/api/proveedores/", DATA, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_vendedor_puede_listar_proveedores(self):
        self.auth_as(self.vendedor)
        r = self.client.get("/api/proveedores/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_vendedor_no_puede_crear_proveedor(self):
        self.auth_as(self.vendedor)
        r = self.client.post("/api/proveedores/", DATA, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_sin_auth_retorna_401(self):
        self.unauth()
        r = self.client.get("/api/proveedores/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
