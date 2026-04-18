"""
Tests de autenticación, JWT y permisos por rol.
"""
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PerfilUsuario

# ── Helper base ───────────────────────────────────────────────────────────────

def make_user(username, rol, password="Test1234!"):
    """Crea un User + PerfilUsuario y devuelve ambos."""
    user = User.objects.create_user(username=username, password=password)
    PerfilUsuario.objects.create(user=user, rol=rol)
    return user


class AuthMixin:
    """Mixin que añade `auth_as(user)` a cualquier APITestCase."""

    def auth_as(self, user):
        self.client.force_authenticate(user=user)

    def unauth(self):
        self.client.force_authenticate(user=None)


# ── Auth: login / logout / refresh / me ──────────────────────────────────────

class LoginTests(APITestCase):

    def setUp(self):
        self.user = make_user("admin_test", "admin")

    def test_login_exitoso_retorna_access_y_refresh(self):
        r = self.client.post("/api/auth/login/", {
            "username": "admin_test", "password": "Test1234!"
        })
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("access", r.data)
        self.assertIn("refresh", r.data)

    def test_login_incluye_datos_usuario(self):
        r = self.client.post("/api/auth/login/", {
            "username": "admin_test", "password": "Test1234!"
        })
        self.assertEqual(r.data["user"]["username"], "admin_test")
        self.assertEqual(r.data["user"]["rol"], "admin")

    def test_credenciales_invalidas_retorna_401(self):
        r = self.client.post("/api/auth/login/", {
            "username": "admin_test", "password": "wrong"
        })
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_usuario_inexistente_retorna_401(self):
        r = self.client.post("/api/auth/login/", {
            "username": "noexiste", "password": "Test1234!"
        })
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class RefreshTests(APITestCase):

    def setUp(self):
        self.user = make_user("refresh_user", "vendedor")

    def test_refresh_retorna_nuevo_access(self):
        login = self.client.post("/api/auth/login/", {
            "username": "refresh_user", "password": "Test1234!"
        })
        r = self.client.post("/api/auth/refresh/", {"refresh": login.data["refresh"]})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("access", r.data)

    def test_refresh_token_invalido_retorna_401(self):
        r = self.client.post("/api/auth/refresh/", {"refresh": "token.invalido.aqui"})
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class LogoutTests(APITestCase):

    def setUp(self):
        self.user = make_user("logout_user", "vendedor")

    def test_logout_blacklists_refresh_token(self):
        login = self.client.post("/api/auth/login/", {
            "username": "logout_user", "password": "Test1234!"
        })
        refresh = login.data["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        # Logout
        r = self.client.post("/api/auth/logout/", {"refresh": refresh})
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

        # El refresh ya no sirve
        r2 = self.client.post("/api/auth/refresh/", {"refresh": refresh})
        self.assertEqual(r2.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_sin_refresh_retorna_400(self):
        self.client.force_authenticate(user=self.user)
        r = self.client.post("/api/auth/logout/", {})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_sin_autenticar_retorna_401(self):
        r = self.client.post("/api/auth/logout/", {"refresh": "algo"})
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class MeTests(APITestCase):

    def setUp(self):
        self.user = make_user("me_user", "supervisor")

    def test_me_retorna_datos_del_usuario(self):
        self.client.force_authenticate(user=self.user)
        r = self.client.get("/api/auth/me/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["username"], "me_user")
        self.assertEqual(r.data["rol"], "supervisor")

    def test_me_sin_autenticar_retorna_401(self):
        r = self.client.get("/api/auth/me/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


# ── Permisos por rol ──────────────────────────────────────────────────────────

class PermisosEndpointTests(AuthMixin, APITestCase):
    """
    Verifica que cada rol reciba el código HTTP correcto en los endpoints clave.
    403 = autenticado pero sin permiso.
    401 = no autenticado.
    """

    def setUp(self):
        self.admin      = make_user("p_admin",      "admin")
        self.supervisor = make_user("p_supervisor", "supervisor")
        self.vendedor   = make_user("p_vendedor",   "vendedor")
        self.bodeguero  = make_user("p_bodeguero",  "bodeguero")
        self.contador   = make_user("p_contador",   "contador")

    # ── Sin autenticar ────────────────────────────────────────────────────────

    def test_sin_auth_clientes_retorna_401(self):
        self.unauth()
        self.assertEqual(self.client.get("/api/clientes/").status_code, 401)

    # ── Usuarios: solo admin ──────────────────────────────────────────────────

    def test_admin_puede_listar_usuarios(self):
        self.auth_as(self.admin)
        self.assertEqual(self.client.get("/api/usuarios/").status_code, 200)

    def test_supervisor_no_puede_listar_usuarios(self):
        self.auth_as(self.supervisor)
        self.assertEqual(self.client.get("/api/usuarios/").status_code, 403)

    def test_vendedor_no_puede_listar_usuarios(self):
        self.auth_as(self.vendedor)
        self.assertEqual(self.client.get("/api/usuarios/").status_code, 403)

    # ── Cotizaciones: admin/supervisor/vendedor ───────────────────────────────

    def test_vendedor_puede_listar_cotizaciones(self):
        self.auth_as(self.vendedor)
        self.assertEqual(self.client.get("/api/cotizaciones/").status_code, 200)

    def test_bodeguero_no_puede_crear_cotizacion(self):
        self.auth_as(self.bodeguero)
        r = self.client.post("/api/cotizaciones/", {}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_contador_no_puede_crear_cotizacion(self):
        self.auth_as(self.contador)
        r = self.client.post("/api/cotizaciones/", {}, format="json")
        self.assertEqual(r.status_code, 403)

    # ── Compras: admin/supervisor/bodeguero ───────────────────────────────────

    def test_bodeguero_puede_listar_compras(self):
        self.auth_as(self.bodeguero)
        self.assertEqual(self.client.get("/api/compras/").status_code, 200)

    def test_vendedor_no_puede_crear_compra(self):
        self.auth_as(self.vendedor)
        r = self.client.post("/api/compras/", {}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_contador_no_puede_crear_compra(self):
        self.auth_as(self.contador)
        r = self.client.post("/api/compras/", {}, format="json")
        self.assertEqual(r.status_code, 403)

    # ── Inventario movimientos: admin/supervisor/bodeguero ────────────────────

    def test_vendedor_no_puede_registrar_movimiento(self):
        self.auth_as(self.vendedor)
        r = self.client.post("/api/inventario/movimientos/", {}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_bodeguero_puede_listar_movimientos(self):
        self.auth_as(self.bodeguero)
        self.assertEqual(self.client.get("/api/inventario/movimientos/").status_code, 200)

    # ── Facturación: admin/supervisor/contador ────────────────────────────────

    def test_contador_puede_listar_facturas(self):
        self.auth_as(self.contador)
        self.assertEqual(self.client.get("/api/facturas/").status_code, 200)

    def test_vendedor_no_puede_crear_factura(self):
        self.auth_as(self.vendedor)
        r = self.client.post("/api/facturas/", {}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_bodeguero_no_puede_crear_factura(self):
        self.auth_as(self.bodeguero)
        r = self.client.post("/api/facturas/", {}, format="json")
        self.assertEqual(r.status_code, 403)

    # ── Lectura libre (GET permitido para todos) ──────────────────────────────

    def test_bodeguero_puede_listar_clientes(self):
        self.auth_as(self.bodeguero)
        self.assertEqual(self.client.get("/api/clientes/").status_code, 200)

    def test_contador_puede_listar_proveedores(self):
        self.auth_as(self.contador)
        self.assertEqual(self.client.get("/api/proveedores/").status_code, 200)

    def test_vendedor_puede_listar_maestros(self):
        self.auth_as(self.vendedor)
        self.assertEqual(self.client.get("/api/maestros/marcas/").status_code, 200)

    # ── Maestros escritura: solo admin/supervisor ─────────────────────────────

    def test_vendedor_no_puede_crear_marca(self):
        self.auth_as(self.vendedor)
        r = self.client.post("/api/maestros/marcas/", {"nombre": "X"}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_supervisor_puede_crear_marca(self):
        self.auth_as(self.supervisor)
        r = self.client.post("/api/maestros/marcas/", {"nombre": "MarcaTest"}, format="json")
        self.assertIn(r.status_code, [200, 201])

    # ── Reportes: admin/supervisor/contador ──────────────────────────────────

    def test_vendedor_no_puede_ver_reportes(self):
        self.auth_as(self.vendedor)
        self.assertEqual(self.client.get("/api/reportes/resumen/").status_code, 403)

    def test_contador_puede_ver_reportes(self):
        self.auth_as(self.contador)
        self.assertEqual(self.client.get("/api/reportes/resumen/").status_code, 200)


# ── CRUD de usuarios (admin only) ─────────────────────────────────────────────

class UsuarioCRUDTests(AuthMixin, APITestCase):

    def setUp(self):
        self.admin    = make_user("crud_admin", "admin")
        self.vendedor = make_user("crud_vendedor", "vendedor")

    def test_admin_puede_crear_usuario(self):
        self.auth_as(self.admin)
        r = self.client.post("/api/usuarios/", {
            "username": "nuevo_user", "password": "Segura123!",
            "email": "nuevo@test.com", "rol": "bodeguero",
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["rol"], "bodeguero")

    def test_admin_no_puede_eliminarse_a_si_mismo(self):
        self.auth_as(self.admin)
        r = self.client.delete(f"/api/usuarios/{self.admin.pk}/")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_puede_cambiar_password(self):
        self.auth_as(self.admin)
        r = self.client.post(
            f"/api/usuarios/{self.vendedor.pk}/cambiar-password/",
            {"password": "NuevaPass123!"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_admin_puede_obtener_matriz_roles(self):
        self.auth_as(self.admin)
        r = self.client.get("/api/usuarios/roles-permisos/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("inventario", r.data)
        self.assertIn("configuracion", r.data)
