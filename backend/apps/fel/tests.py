import datetime
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.facturacion.models import Factura, FacturaItem
from apps.usuarios.tests import make_user, AuthMixin
from .models import FelCertificacion
from . import services


CLIENTE_DATA = {
    "razon_social":      "Cliente FEL SA",
    "nit":               "900002001-1",
    "email":             "fel@test.com",
    "telefono":          "55560001",
    "direccion_comercial": "Calle FEL 1",
    "nombre_comercial":  "FEL SA",
    "nombre_contacto":   "Luis",
    "telefono_contacto": "55560002",
    "email_contacto":    "luis@fel.com",
    "tipo_cliente":      "privado",
}


def make_factura(cliente, estatus="borrador"):
    f = Factura.objects.create(
        cliente=cliente,
        fecha_emision=datetime.date.today(),
        fecha_vencimiento=datetime.date.today() + datetime.timedelta(days=30),
        estatus=estatus,
    )
    FacturaItem.objects.create(
        factura=f, nombre="Producto FEL",
        cantidad=2, precio_unitario=Decimal("250.00"),
        porcentaje_iva=Decimal("12.00"), porcentaje_isr=Decimal("0.00"),
    )
    return f


# ── Servicio FEL ──────────────────────────────────────────────────────────────

class FelServiceTests(APITestCase):

    def setUp(self):
        self.cliente = Cliente.objects.create(**CLIENTE_DATA)
        self.factura = make_factura(self.cliente)

    def test_certificar_genera_uuid(self):
        fel = services.certificar(self.factura)
        self.assertIsNotNone(fel.uuid)
        self.assertEqual(fel.estatus, "certificada")

    def test_certificar_cambia_estatus_factura_a_emitida(self):
        services.certificar(self.factura)
        self.factura.refresh_from_db()
        self.assertEqual(self.factura.estatus, "emitida")

    def test_certificar_es_idempotente(self):
        fel1 = services.certificar(self.factura)
        fel2 = services.certificar(self.factura)
        self.assertEqual(fel1.uuid, fel2.uuid)

    def test_certificar_almacena_xml(self):
        fel = services.certificar(self.factura)
        self.assertIn("<DTE", fel.xml_enviado)
        self.assertIn("<DTECertificado>", fel.xml_respuesta)

    def test_anular_cambia_estatus_a_anulada(self):
        services.certificar(self.factura)
        fel = services.anular(self.factura, motivo="Error en cliente")
        self.assertEqual(fel.estatus, "anulada")
        self.factura.refresh_from_db()
        self.assertEqual(self.factura.estatus, "anulada")

    def test_anular_sin_certificacion_lanza_error(self):
        with self.assertRaises(ValueError):
            services.anular(self.factura)

    def test_certificar_ya_anulada_lanza_error(self):
        services.certificar(self.factura)
        services.anular(self.factura)
        with self.assertRaises(ValueError):
            services.certificar(self.factura)

    def test_anular_crea_cxc_marcada_vencida(self):
        services.certificar(self.factura)
        self.factura.refresh_from_db()
        # La factura emitida + fecha_vencimiento → CxC creada por signal
        self.assertTrue(hasattr(self.factura, "cxc"))
        services.anular(self.factura, motivo="Test anulación")
        self.factura.cxc.refresh_from_db()
        self.assertEqual(self.factura.cxc.estatus, "vencida")


# ── API FEL ───────────────────────────────────────────────────────────────────

class FelAPITests(AuthMixin, APITestCase):

    def setUp(self):
        self.admin    = make_user("fel_admin",    "admin")
        self.contador = make_user("fel_contador", "contador")
        self.vendedor = make_user("fel_vendedor", "vendedor")
        self.auth_as(self.admin)
        self.cliente = Cliente.objects.create(**{**CLIENTE_DATA, "nit": "900002002-1"})
        self.factura = make_factura(self.cliente)

    def test_certificar_via_api(self):
        r = self.client.post("/api/fel/certificar/", {"factura_id": self.factura.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["estatus"], "certificada")
        self.assertIsNotNone(r.data["uuid"])

    def test_anular_via_api(self):
        self.client.post("/api/fel/certificar/", {"factura_id": self.factura.pk}, format="json")
        r = self.client.post(
            "/api/fel/anular/",
            {"factura_id": self.factura.pk, "motivo": "Error en datos"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["estatus"], "anulada")

    def test_certificar_factura_inexistente_retorna_404(self):
        r = self.client.post("/api/fel/certificar/", {"factura_id": 99999}, format="json")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_vendedor_no_puede_anular(self):
        self.client.post("/api/fel/certificar/", {"factura_id": self.factura.pk}, format="json")
        self.auth_as(self.vendedor)
        r = self.client.post(
            "/api/fel/anular/",
            {"factura_id": self.factura.pk, "motivo": "Test"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_contador_puede_certificar(self):
        self.auth_as(self.contador)
        r = self.client.post("/api/fel/certificar/", {"factura_id": self.factura.pk}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_list_certificaciones(self):
        self.client.post("/api/fel/certificar/", {"factura_id": self.factura.pk}, format="json")
        r = self.client.get("/api/fel/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data["results"]) if "results" in r.data else len(r.data), 1)

    def test_sin_auth_retorna_401(self):
        self.unauth()
        r = self.client.get("/api/fel/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
