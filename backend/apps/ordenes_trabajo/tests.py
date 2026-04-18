from rest_framework import status
from rest_framework.test import APITestCase

from apps.usuarios.tests import make_user, AuthMixin
from .models import OrdenTrabajo

DATA = {
    "tipo_cliente": "privado",
    "tipo_trabajo": "soporte",
    "tecnico_asignado": "Carlos Ruiz",
    "descripcion": "Revisión de equipos",
}


class OrdenTrabajoAPITest(AuthMixin, APITestCase):

    def setUp(self):
        self.admin    = make_user("ot_admin",    "admin")
        self.vendedor = make_user("ot_vendedor", "vendedor")
        self.bodeguero = make_user("ot_bodeguero", "bodeguero")
        self.auth_as(self.admin)

    def test_list(self):
        r = self.client.get("/api/ordenes-trabajo/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_create_sin_cotizacion(self):
        r = self.client.post("/api/ordenes-trabajo/", DATA, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(r.data["cotizacion"])

    def test_str(self):
        ot = OrdenTrabajo.objects.create(**DATA)
        self.assertIn("OT-", str(ot))

    def test_vendedor_puede_crear_ot(self):
        self.auth_as(self.vendedor)
        r = self.client.post("/api/ordenes-trabajo/", DATA, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_bodeguero_solo_puede_listar_ot(self):
        self.auth_as(self.bodeguero)
        self.assertEqual(self.client.get("/api/ordenes-trabajo/").status_code, 200)
        r = self.client.post("/api/ordenes-trabajo/", DATA, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_sin_auth_retorna_401(self):
        self.unauth()
        r = self.client.get("/api/ordenes-trabajo/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
