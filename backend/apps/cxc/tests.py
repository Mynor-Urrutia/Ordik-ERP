from decimal import Decimal
import datetime

from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.facturacion.models import Factura, FacturaItem
from apps.usuarios.tests import make_user, AuthMixin
from .models import CuentaPorCobrar, PagoCxC


CLIENTE_DATA = {
    "razon_social":      "Cliente CxC SA",
    "nit":               "900001001-1",
    "email":             "cxc@test.com",
    "telefono":          "55550001",
    "direccion_comercial": "Calle CxC 1",
    "nombre_comercial":  "CxC SA",
    "nombre_contacto":   "Pedro",
    "telefono_contacto": "55550002",
    "email_contacto":    "pedro@cxc.com",
    "tipo_cliente":      "privado",
}


def make_factura(cliente, estatus="emitida", dias_vencimiento=30):
    f = Factura.objects.create(
        cliente=cliente,
        fecha_emision=datetime.date.today(),
        fecha_vencimiento=datetime.date.today() + datetime.timedelta(days=dias_vencimiento),
        estatus="borrador",
    )
    FacturaItem.objects.create(
        factura=f,
        nombre="Servicio",
        cantidad=1,
        precio_unitario=Decimal("500.00"),
        porcentaje_iva=Decimal("12.00"),
        porcentaje_isr=Decimal("0.00"),
    )
    if estatus != "borrador":
        f.estatus = estatus
        f.save()
    return f


# ── Signal: creación automática de CxC ───────────────────────────────────────

class CxCSignalTests(APITestCase):

    def setUp(self):
        self.cliente = Cliente.objects.create(**CLIENTE_DATA)

    def test_factura_emitida_crea_cxc(self):
        f = make_factura(self.cliente, estatus="borrador")
        self.assertFalse(hasattr(f, "cxc"))
        f.estatus = "emitida"
        f.save()
        f.refresh_from_db()
        self.assertTrue(hasattr(f, "cxc"))
        self.assertEqual(f.cxc.monto_original, f.total)

    def test_factura_sin_vencimiento_no_crea_cxc(self):
        f = Factura.objects.create(
            cliente=self.cliente,
            fecha_emision=datetime.date.today(),
            estatus="emitida",
        )
        self.assertFalse(hasattr(f, "cxc"))

    def test_cxc_saldo_inicial_igual_a_total_factura(self):
        f = make_factura(self.cliente)
        self.assertEqual(f.cxc.saldo_pendiente, f.total)
        self.assertEqual(f.cxc.estatus, "pendiente")


# ── Modelo: pagos y recálculo de saldo ────────────────────────────────────────

class CxCPagosModelTests(APITestCase):

    def setUp(self):
        self.cliente = Cliente.objects.create(**{**CLIENTE_DATA, "nit": "900001002-1"})
        self.factura = make_factura(self.cliente)
        self.cxc = self.factura.cxc

    def test_pago_parcial_reduce_saldo(self):
        PagoCxC.objects.create(
            cuenta=self.cxc, monto=Decimal("200.00"),
            fecha_pago=datetime.date.today(), metodo_pago="efectivo",
        )
        self.cxc.refresh_from_db()
        self.assertEqual(self.cxc.estatus, "parcial")
        self.assertEqual(self.cxc.saldo_pendiente, self.cxc.monto_original - Decimal("200.00"))

    def test_pago_total_cierra_cxc(self):
        PagoCxC.objects.create(
            cuenta=self.cxc, monto=self.cxc.monto_original,
            fecha_pago=datetime.date.today(), metodo_pago="transferencia",
        )
        self.cxc.refresh_from_db()
        self.assertEqual(self.cxc.estatus, "pagada")
        self.assertEqual(self.cxc.saldo_pendiente, Decimal("0.00"))

    def test_saldo_no_puede_ser_negativo(self):
        PagoCxC.objects.create(
            cuenta=self.cxc, monto=self.cxc.monto_original + Decimal("1000.00"),
            fecha_pago=datetime.date.today(), metodo_pago="cheque",
        )
        self.cxc.refresh_from_db()
        self.assertEqual(self.cxc.saldo_pendiente, Decimal("0.00"))

    def test_eliminar_pago_recalcula_saldo(self):
        pago = PagoCxC.objects.create(
            cuenta=self.cxc, monto=self.cxc.monto_original,
            fecha_pago=datetime.date.today(), metodo_pago="efectivo",
        )
        self.cxc.refresh_from_db()
        self.assertEqual(self.cxc.estatus, "pagada")
        pago.delete()
        self.cxc.refresh_from_db()
        self.assertEqual(self.cxc.estatus, "pendiente")


# ── API ───────────────────────────────────────────────────────────────────────

class CxCAPITests(AuthMixin, APITestCase):

    def setUp(self):
        self.admin    = make_user("cxc_admin",    "admin")
        self.contador = make_user("cxc_contador", "contador")
        self.vendedor = make_user("cxc_vendedor", "vendedor")
        self.auth_as(self.admin)
        self.cliente = Cliente.objects.create(**{**CLIENTE_DATA, "nit": "900001003-1"})
        self.factura = make_factura(self.cliente)
        self.cxc     = self.factura.cxc

    def test_list_cxc(self):
        r = self.client.get("/api/cxc/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_retrieve_cxc(self):
        r = self.client.get(f"/api/cxc/{self.cxc.pk}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["correlativo"], self.factura.correlativo)

    def test_registrar_pago_via_action(self):
        payload = {
            "monto": "100.00",
            "fecha_pago": str(datetime.date.today()),
            "metodo_pago": "efectivo",
        }
        r = self.client.post(f"/api/cxc/{self.cxc.pk}/pagar/", payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(r.data["pagos"]), 1)

    def test_resumen_endpoint(self):
        r = self.client.get("/api/cxc/resumen/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("total_pendiente", r.data)
        self.assertIn("total_vencido", r.data)
        self.assertIn("total_cobrado_mes", r.data)

    def test_vendedor_puede_listar(self):
        self.auth_as(self.vendedor)
        r = self.client.get("/api/cxc/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_sin_auth_retorna_401(self):
        self.unauth()
        r = self.client.get("/api/cxc/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
