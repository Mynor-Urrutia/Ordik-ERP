"""
Tests de inventario: KARDEX inmutable, CPP, stock floor, OC auto-Recibida.
"""
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.proveedores.models import Proveedor
from apps.compras.models import Compra
from apps.usuarios.tests import make_user, AuthMixin

from .models import Producto, MovimientoInventario


# ── Fixtures ──────────────────────────────────────────────────────────────────

PROV_DATA = {
    "razon_social": "Prov Inventario SA",
    "nit": "777777700-0",
    "email": "inv@prov.com",
    "telefono": "55551111",
    "direccion_comercial": "Av. Bodega 1",
    "nombre_comercial": "Prov Inv",
    "nombre_contacto": "Luis",
    "telefono_contacto": "55552222",
    "email_contacto": "luis@prov.com",
}

PROD_BASE = {
    "nombre": "Switch 24p",
    "marca": "Cisco",
    "modelo": "SG350",
    "cod_producto": "SW-001",
    "categoria": "Redes",
    "costo_unitario": "1500.00",
    "porcentaje_utilidad": "20.00",
}


def make_producto(proveedor, **kwargs):
    data = {**PROD_BASE, "proveedor": proveedor}
    data.update(kwargs)
    return Producto.objects.create(**data)


def make_entrada(producto, cantidad, costo=None, orden_compra=""):
    return MovimientoInventario.objects.create(
        producto=producto,
        tipo="entrada",
        cantidad=cantidad,
        costo_unitario=Decimal(str(costo)) if costo else None,
        orden_compra=orden_compra,
    )


def make_salida(producto, cantidad):
    return MovimientoInventario.objects.create(
        producto=producto, tipo="salida", cantidad=cantidad,
    )


# ── KARDEX: inmutabilidad ─────────────────────────────────────────────────────

class KARDEXInmutabilidadTests(AuthMixin, APITestCase):

    def setUp(self):
        self.admin = make_user("inv_admin", "admin")
        self.auth_as(self.admin)
        prov = Proveedor.objects.create(**PROV_DATA)
        self.producto = make_producto(prov)

    def test_kardex_no_permite_delete_via_api(self):
        mov = make_entrada(self.producto, 5)
        r = self.client.delete(f"/api/inventario/movimientos/{mov.pk}/")
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_kardex_no_permite_put_via_api(self):
        r = self.client.put("/api/inventario/movimientos/", {})
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_kardex_no_permite_patch_via_api(self):
        mov = make_entrada(self.producto, 5)
        r = self.client.patch(f"/api/inventario/movimientos/{mov.pk}/", {})
        self.assertEqual(r.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_kardex_permite_get_lista(self):
        r = self.client.get("/api/inventario/movimientos/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_kardex_permite_post(self):
        r = self.client.post("/api/inventario/movimientos/", {
            "producto": self.producto.pk, "tipo": "entrada",
            "cantidad": 3, "observacion": "",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)


# ── Stock: movimientos correctos ──────────────────────────────────────────────

class StockMovimientoTests(AuthMixin, APITestCase):

    def setUp(self):
        self.admin = make_user("stock_admin", "admin")
        self.auth_as(self.admin)
        prov = Proveedor.objects.create(**{**PROV_DATA, "nit": "777777701-0"})
        self.producto = make_producto(prov, cod_producto="SW-002")

    def test_entrada_incrementa_stock(self):
        make_entrada(self.producto, 10)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 10)

    def test_salida_decrementa_stock(self):
        make_entrada(self.producto, 10)
        make_salida(self.producto, 4)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 6)

    def test_stock_no_baja_de_cero(self):
        """Si hay stock 2 y se intenta sacar 10, el stock queda en 0 — nunca negativo."""
        make_entrada(self.producto, 2)
        make_salida(self.producto, 10)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 0)

    def test_multiples_entradas_acumulan_stock(self):
        make_entrada(self.producto, 5)
        make_entrada(self.producto, 3)
        make_entrada(self.producto, 2)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 10)


# ── CPP: Costo Promedio Ponderado ─────────────────────────────────────────────

class CPPTests(AuthMixin, APITestCase):
    """
    Fórmula:
        nuevo_costo = (stock_prev * costo_prev + cant_entrada * costo_entrada) / nuevo_stock
    """

    def setUp(self):
        self.admin = make_user("cpp_admin", "admin")
        self.auth_as(self.admin)
        prov = Proveedor.objects.create(**{**PROV_DATA, "nit": "777777702-0"})
        self.producto = make_producto(prov, costo_unitario="1000.00", cod_producto="SW-003")

    def test_primera_entrada_establece_costo(self):
        make_entrada(self.producto, 10, costo=1500)
        self.producto.refresh_from_db()
        # stock 0 → 10 @ 1500: CPP = (0*1000 + 10*1500) / 10 = 1500
        self.assertEqual(self.producto.costo_unitario, Decimal("1500.00"))

    def test_segunda_entrada_recalcula_cpp(self):
        make_entrada(self.producto, 10, costo=1000)  # CPP = 1000
        make_entrada(self.producto, 10, costo=2000)  # CPP = (10*1000 + 10*2000) / 20 = 1500
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.costo_unitario, Decimal("1500.00"))

    def test_cpp_ponderado_cantidades_distintas(self):
        """4 unidades a 100 + 1 unidad a 600 → CPP = (4*100 + 1*600)/5 = 200"""
        make_entrada(self.producto, 4, costo=100)
        make_entrada(self.producto, 1, costo=600)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.costo_unitario, Decimal("200.00"))

    def test_salida_no_modifica_costo(self):
        """La salida baja stock pero NO modifica el costo unitario."""
        make_entrada(self.producto, 10, costo=1500)
        make_salida(self.producto, 5)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.costo_unitario, Decimal("1500.00"))

    def test_entrada_sin_costo_no_modifica_cpp(self):
        """Entrada sin costo_unitario solo suma stock, no recalcula CPP."""
        make_entrada(self.producto, 5, costo=1000)   # CPP = 1000
        make_entrada(self.producto, 5)               # sin costo — no debe cambiar CPP
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.costo_unitario, Decimal("1000.00"))
        self.assertEqual(self.producto.stock_actual, 10)


# ── OC auto-Recibida ──────────────────────────────────────────────────────────

class OCAutoRecibidaTests(AuthMixin, APITestCase):
    """
    Al registrar una entrada de inventario con orden_compra = correlativo de una OC,
    esa OC debe cambiar automáticamente a estatus 'Recibida'.
    """

    def setUp(self):
        self.admin = make_user("oc_admin", "admin")
        self.auth_as(self.admin)
        self.prov = Proveedor.objects.create(**{**PROV_DATA, "nit": "777777703-0"})
        self.producto = make_producto(self.prov, cod_producto="SW-004")

        # Crear OC directamente en la DB (Pendiente)
        self.oc = Compra.objects.create(
            proveedor=self.prov,
            fecha_despacho="2026-04-17",
            estatus="Pendiente",
        )
        # Aseguramos que tenga correlativo
        self.oc.refresh_from_db()

    def test_entrada_con_oc_marca_compra_recibida(self):
        r = self.client.post("/api/inventario/movimientos/", {
            "producto": self.producto.pk,
            "tipo": "entrada",
            "cantidad": 5,
            "orden_compra": self.oc.correlativo,
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.oc.refresh_from_db()
        self.assertEqual(self.oc.estatus, "Recibida")

    def test_entrada_sin_oc_no_afecta_compras(self):
        make_entrada(self.producto, 3)
        self.oc.refresh_from_db()
        self.assertNotEqual(self.oc.estatus, "Recibida")

    def test_entrada_con_oc_inexistente_no_falla(self):
        """Un correlativo que no existe no debe crashear el endpoint."""
        r = self.client.post("/api/inventario/movimientos/", {
            "producto": self.producto.pk,
            "tipo": "entrada",
            "cantidad": 2,
            "orden_compra": "OC-NO-EXISTE",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
