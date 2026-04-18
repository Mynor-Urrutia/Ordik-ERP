from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.usuarios.tests import make_user, AuthMixin
from .models import Cliente

DATA = {
    "razon_social": "Empresa Test SA",
    "nit": "900123456-1",
    "email": "test@empresa.com",
    "telefono": "55551234",
    "direccion_comercial": "Calle 1 # 2-3",
    "nombre_comercial": "Empresa Test",
    "nombre_contacto": "Juan Pérez",
    "telefono_contacto": "55557654",
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


class ClienteAPITest(AuthMixin, APITestCase):

    def setUp(self):
        self.admin    = make_user("cli_admin",    "admin")
        self.vendedor = make_user("cli_vendedor", "vendedor")
        self.bodeguero = make_user("cli_bodeguero", "bodeguero")
        self.auth_as(self.admin)

    def test_list(self):
        r = self.client.get("/api/clientes/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

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

    def test_vendedor_puede_crear_cliente(self):
        self.auth_as(self.vendedor)
        r = self.client.post("/api/clientes/", DATA, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_bodeguero_no_puede_crear_cliente(self):
        self.auth_as(self.bodeguero)
        r = self.client.post("/api/clientes/", DATA, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_bodeguero_puede_listar_clientes(self):
        self.auth_as(self.bodeguero)
        r = self.client.get("/api/clientes/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_sin_auth_retorna_401(self):
        self.unauth()
        r = self.client.get("/api/clientes/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
