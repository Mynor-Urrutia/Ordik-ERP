from rest_framework import status
from rest_framework.test import APITestCase
from .models import OrdenTrabajo

DATA = {
    "tipo_cliente": "privado",
    "tipo_trabajo": "soporte",
    "tecnico_asignado": "Carlos Ruiz",
    "descripcion": "Revisión de equipos",
}


class OrdenTrabajoAPITest(APITestCase):
    def test_list(self):
        self.assertEqual(
            self.client.get("/api/ordenes-trabajo/").status_code, status.HTTP_200_OK
        )

    def test_create_sin_cotizacion(self):
        r = self.client.post("/api/ordenes-trabajo/", DATA, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(r.data["cotizacion"])

    def test_str(self):
        ot = OrdenTrabajo.objects.create(**DATA)
        self.assertIn("OT-", str(ot))
