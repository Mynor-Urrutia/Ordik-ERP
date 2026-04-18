"""
Tests de facturación: correlativo auto-incremental, cálculos IVA/ISR/descuento.
"""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.clientes.models import Cliente
from apps.usuarios.tests import make_user, AuthMixin

from .models import Factura, FacturaItem


CLIENTE_DATA = {
    "razon_social": "Cliente Fact SA",
    "nit": "900000001-1",
    "email": "fact@test.com",
    "telefono": "55553333",
    "direccion_comercial": "Calle Factura 1",
    "nombre_comercial": "Fact SA",
    "nombre_contacto": "Ana",
    "telefono_contacto": "55554444",
    "email_contacto": "ana@test.com",
    "tipo_cliente": "privado",
}


def make_factura(cliente):
    return Factura.objects.create(
        cliente=cliente,
        fecha_emision="2026-04-17",
        estatus="borrador",
    )


def make_item(factura, precio, cantidad=1, iva=12, isr=0, descuento=0):
    return FacturaItem.objects.create(
        factura=factura,
        nombre="Producto Test",
        cantidad=cantidad,
        precio_unitario=Decimal(str(precio)),
        porcentaje_iva=Decimal(str(iva)),
        porcentaje_isr=Decimal(str(isr)),
        descuento_porcentaje=Decimal(str(descuento)),
    )


# ── Correlativo ───────────────────────────────────────────────────────────────

class FacturaCorrelativoTests(AuthMixin, APITestCase):

    def setUp(self):
        self.contador = make_user("fac_contador", "contador")
        self.auth_as(self.contador)
        self.cliente  = Cliente.objects.create(**CLIENTE_DATA)

    def _payload(self, **kwargs):
        base = {
            "cliente":        self.cliente.pk,
            "fecha_emision":  "2026-04-17",
            "estatus":        "borrador",
            "items": [
                {"nombre": "Servicio", "cantidad": 1,
                 "precio_unitario": "100.00",
                 "porcentaje_iva": "12.00", "porcentaje_isr": "0.00"}
            ],
        }
        base.update(kwargs)
        return base

    def test_primera_factura_tiene_correlativo_FAC_00001(self):
        r = self.client.post("/api/facturas/", self._payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["correlativo"], "FAC-00001")

    def test_segunda_factura_incrementa_correlativo(self):
        self.client.post("/api/facturas/", self._payload(), format="json")
        r = self.client.post("/api/facturas/", self._payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["correlativo"], "FAC-00002")

    def test_correlativo_es_unico(self):
        from django.db import IntegrityError
        fac1 = make_factura(self.cliente)
        with self.assertRaises(IntegrityError):
            Factura.objects.create(
                cliente=self.cliente,
                correlativo=fac1.correlativo,
                fecha_emision="2026-04-17",
            )


# ── Cálculos de ítems ─────────────────────────────────────────────────────────

class FacturaItemCalculosTests(APITestCase):
    """
    Estas pruebas verifican la lógica del modelo directamente (sin HTTP).
    No necesitan autenticación.
    """

    def setUp(self):
        self.cliente = Cliente.objects.create(**{**CLIENTE_DATA, "nit": "900000002-1"})
        self.factura = make_factura(self.cliente)

    def test_total_sin_impuestos(self):
        it = make_item(self.factura, precio=100, iva=0, isr=0)
        self.assertEqual(it.total, Decimal("100.00"))

    def test_total_con_iva_12(self):
        it = make_item(self.factura, precio=100, iva=12, isr=0)
        self.assertEqual(it.total, Decimal("112.00"))

    def test_total_con_iva_y_isr(self):
        """precio=100, IVA=12%, ISR=5% → neto=100, factor=1.17 → total=117"""
        it = make_item(self.factura, precio=100, iva=12, isr=5)
        self.assertEqual(it.total, Decimal("117.00"))

    def test_total_con_descuento_porcentaje(self):
        """precio=100, descuento=10%, IVA=12% → neto=90, total=90*1.12=100.80"""
        it = make_item(self.factura, precio=100, descuento=10, iva=12)
        self.assertEqual(it.total, Decimal("100.80"))

    def test_descuento_no_genera_precio_negativo(self):
        """Descuento 200% → precio_neto = max(0, ...) = 0"""
        it = make_item(self.factura, precio=100, descuento=200, iva=12)
        self.assertEqual(it.precio_neto, Decimal("0"))
        self.assertEqual(it.total, Decimal("0"))

    def test_total_con_cantidad(self):
        """precio=50, IVA=12%, cantidad=3 → total=50*1.12*3=168"""
        it = make_item(self.factura, precio=50, cantidad=3, iva=12)
        self.assertEqual(it.total, Decimal("168.00"))

    def test_total_factura_suma_items(self):
        make_item(self.factura, precio=100, iva=12)   # 112.00
        make_item(self.factura, precio=50, cantidad=2, iva=12)  # 112.00
        self.assertEqual(self.factura.total, Decimal("224.00"))

    def test_precio_neto_correcto(self):
        it = make_item(self.factura, precio=200, descuento=25)  # neto = 200 * 0.75 = 150
        self.assertEqual(it.precio_neto, Decimal("150.00"))


# ── API: permisos en facturación ──────────────────────────────────────────────

class FacturaPermisosAPITests(AuthMixin, APITestCase):

    def setUp(self):
        self.admin    = make_user("fac_admin",    "admin")
        self.contador = make_user("fac_cont",     "contador")
        self.vendedor = make_user("fac_vend",     "vendedor")
        self.cliente  = Cliente.objects.create(**{**CLIENTE_DATA, "nit": "900000003-1"})

    def _payload(self):
        return {
            "cliente":       self.cliente.pk,
            "fecha_emision": "2026-04-17",
            "estatus":       "borrador",
            "items": [
                {"nombre": "X", "cantidad": 1,
                 "precio_unitario": "100.00",
                 "porcentaje_iva": "12.00", "porcentaje_isr": "0.00"}
            ],
        }

    def test_contador_puede_crear_factura(self):
        self.auth_as(self.contador)
        r = self.client.post("/api/facturas/", self._payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_vendedor_no_puede_crear_factura(self):
        self.auth_as(self.vendedor)
        r = self.client.post("/api/facturas/", self._payload(), format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_puede_eliminar_factura(self):
        self.auth_as(self.admin)
        r = self.client.post("/api/facturas/", self._payload(), format="json")
        fac_id = r.data["id"]
        r2 = self.client.delete(f"/api/facturas/{fac_id}/")
        self.assertEqual(r2.status_code, status.HTTP_204_NO_CONTENT)
