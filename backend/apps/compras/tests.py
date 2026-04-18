"""
Tests de compras: correlativo diario, historial de estatus, cambio de estatus.
"""
from rest_framework import status
from rest_framework.test import APITestCase

from apps.proveedores.models import Proveedor
from apps.inventario.models import Producto
from apps.maestros.models import TipoPago
from apps.usuarios.tests import make_user, AuthMixin

from .models import Compra, CompraHistorial


PROV_DATA = {
    "razon_social": "Prov Compras SA",
    "nit": "555555500-1",
    "email": "compras@prov.com",
    "telefono": "55558888",
    "direccion_comercial": "Cra 8",
    "nombre_comercial": "Prov Compras",
    "nombre_contacto": "Pedro",
    "telefono_contacto": "55559999",
    "email_contacto": "pedro@prov.com",
}

PROD_DATA = {
    "nombre": "Cable UTP",
    "marca": "AMP",
    "cod_producto": "CAB-001",
    "categoria": "Cableado",
    "costo_unitario": "15.00",
    "porcentaje_utilidad": "30.00",
}


class CompraAPITests(AuthMixin, APITestCase):

    def setUp(self):
        self.admin    = make_user("cmp_admin",    "admin")
        self.bodeguero = make_user("cmp_bodeguero", "bodeguero")
        self.auth_as(self.admin)

        self.proveedor = Proveedor.objects.create(**PROV_DATA)
        self.producto  = Producto.objects.create(**PROD_DATA, proveedor=self.proveedor)
        self.tipo_pago = TipoPago.objects.create(nombre="Crédito 30 días", dias_plazo=30)

    def _payload(self, **kwargs):
        base = {
            "proveedor":      self.proveedor.pk,
            "fecha_despacho": "2026-04-17",
            "tipo_pago":      self.tipo_pago.pk,
            "items": [
                {"producto": self.producto.pk, "cantidad": 5, "costo_unitario": "14.00"}
            ],
        }
        base.update(kwargs)
        return base

    # ── Creación básica ───────────────────────────────────────────────────────

    def test_create_con_items(self):
        r = self.client.post("/api/compras/", self._payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Compra.objects.count(), 1)
        self.assertEqual(len(r.data["items"]), 1)

    def test_create_sin_tipo_pago(self):
        payload = self._payload()
        del payload["tipo_pago"]
        r = self.client.post("/api/compras/", payload, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(r.data["tipo_pago"])

    # ── Correlativo ───────────────────────────────────────────────────────────

    def test_correlativo_tiene_formato_diario(self):
        r = self.client.post("/api/compras/", self._payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        correlativo = r.data["correlativo"]
        self.assertTrue(correlativo.startswith("OC-"))
        partes = correlativo.split("-")
        self.assertEqual(len(partes), 3)          # OC, YYYYMMDD, seq
        self.assertEqual(len(partes[1]), 8)        # fecha 8 dígitos
        self.assertTrue(partes[2].isdigit())       # secuencia numérica

    def test_dos_compras_mismo_dia_tienen_seq_distinto(self):
        r1 = self.client.post("/api/compras/", self._payload(), format="json")
        r2 = self.client.post("/api/compras/", self._payload(), format="json")
        self.assertNotEqual(r1.data["correlativo"], r2.data["correlativo"])

    # ── Cambio de estatus y historial ─────────────────────────────────────────

    def test_cambiar_estatus_actualiza_compra(self):
        r = self.client.post("/api/compras/", self._payload(), format="json")
        compra_id = r.data["id"]
        r2 = self.client.post(
            f"/api/compras/{compra_id}/cambiar-estatus/",
            {"estatus": "Confirmada"},
            format="json",
        )
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        compra = Compra.objects.get(pk=compra_id)
        self.assertEqual(compra.estatus, "Confirmada")

    def test_cambio_estatus_registra_historial(self):
        r = self.client.post("/api/compras/", self._payload(), format="json")
        compra_id = r.data["id"]
        self.client.post(
            f"/api/compras/{compra_id}/cambiar-estatus/",
            {"estatus": "Confirmada"},
            format="json",
        )
        self.assertTrue(
            CompraHistorial.objects.filter(
                compra_id=compra_id, tipo="estatus"
            ).exists()
        )

    def test_historial_registra_valores_anterior_y_nuevo(self):
        r = self.client.post("/api/compras/", self._payload(), format="json")
        compra_id = r.data["id"]
        self.client.post(
            f"/api/compras/{compra_id}/cambiar-estatus/",
            {"estatus": "En tránsito"},
            format="json",
        )
        historial = CompraHistorial.objects.filter(compra_id=compra_id, tipo="estatus").first()
        self.assertIsNotNone(historial)
        self.assertEqual(historial.valor_anterior, "Pendiente")
        self.assertEqual(historial.valor_nuevo, "En tránsito")

    # ── Permisos específicos ──────────────────────────────────────────────────

    def test_bodeguero_puede_crear_compra(self):
        self.auth_as(self.bodeguero)
        r = self.client.post("/api/compras/", self._payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_bodeguero_puede_cambiar_estatus(self):
        r = self.client.post("/api/compras/", self._payload(), format="json")
        compra_id = r.data["id"]
        self.auth_as(self.bodeguero)
        r2 = self.client.post(
            f"/api/compras/{compra_id}/cambiar-estatus/",
            {"estatus": "Confirmada"},
            format="json",
        )
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
