from rest_framework.permissions import BasePermission, SAFE_METHODS

ADMIN       = "admin"
SUPERVISOR  = "supervisor"
VENDEDOR    = "vendedor"
BODEGUERO   = "bodeguero"
CONTADOR    = "contador"


def _get_rol(user):
    return getattr(getattr(user, "perfil", None), "rol", None)


class IsAdmin(BasePermission):
    """Solo administradores."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and _get_rol(request.user) == ADMIN)


class IsAdminOrSupervisor(BasePermission):
    """Admin o supervisor — gestión de catálogos y configuración."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and _get_rol(request.user) in (ADMIN, SUPERVISOR)
        )


class IsAdminSupervisorOrVendedor(BasePermission):
    """Admin, supervisor o vendedor — operaciones de venta."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and _get_rol(request.user) in (ADMIN, SUPERVISOR, VENDEDOR)
        )


class IsAdminSupervisorOrBodeguero(BasePermission):
    """Admin, supervisor o bodeguero — operaciones de inventario/compras."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and _get_rol(request.user) in (ADMIN, SUPERVISOR, BODEGUERO)
        )


class IsAdminSupervisorOrContador(BasePermission):
    """Admin, supervisor o contador — facturación y reportes."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and _get_rol(request.user) in (ADMIN, SUPERVISOR, CONTADOR)
        )


class IsAdminSupervisorBodegueroOrContador(BasePermission):
    """Admin, supervisor, bodeguero o contador — compras e inventario."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and _get_rol(request.user) in (ADMIN, SUPERVISOR, BODEGUERO, CONTADOR)
        )


class IsAnyAuthenticated(BasePermission):
    """Cualquier usuario autenticado — módulos de solo lectura universal."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


# ── Permisos de lectura libre / escritura restringida ────────────────────────
# Todos los roles autenticados pueden leer (GET) para que los dropdowns funcionen.
# Solo los roles especificados pueden crear / editar / eliminar.

class ReadOrAdminSupervisor(BasePermission):
    """GET libre para todos; escritura solo admin/supervisor."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _get_rol(request.user) in (ADMIN, SUPERVISOR)


class ReadOrAdminSupervisorOrVendedor(BasePermission):
    """GET libre para todos; escritura admin/supervisor/vendedor."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _get_rol(request.user) in (ADMIN, SUPERVISOR, VENDEDOR)


class ReadOrAdminSupervisorOrBodeguero(BasePermission):
    """GET libre para todos; escritura admin/supervisor/bodeguero."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _get_rol(request.user) in (ADMIN, SUPERVISOR, BODEGUERO)


class ReadOrAdminSupervisorOrContador(BasePermission):
    """GET libre para todos; escritura admin/supervisor/contador."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return _get_rol(request.user) in (ADMIN, SUPERVISOR, CONTADOR)


# ── Matriz de permisos por módulo ───────────────────────────────────────────
# Usada por el frontend para renderizar la tabla de Roles y Permisos.
PERMISSION_MATRIX = {
    "dashboard":    {ADMIN: "full", SUPERVISOR: "full", VENDEDOR: "read", BODEGUERO: "read", CONTADOR: "full"},
    "clientes":     {ADMIN: "full", SUPERVISOR: "full", VENDEDOR: "full", BODEGUERO: "read", CONTADOR: "read"},
    "proveedores":  {ADMIN: "full", SUPERVISOR: "full", VENDEDOR: "read", BODEGUERO: "read", CONTADOR: "read"},
    "cotizaciones": {ADMIN: "full", SUPERVISOR: "full", VENDEDOR: "full", BODEGUERO: "none", CONTADOR: "read"},
    "ordenes":      {ADMIN: "full", SUPERVISOR: "full", VENDEDOR: "full", BODEGUERO: "read", CONTADOR: "read"},
    "inventario":   {ADMIN: "full", SUPERVISOR: "full", VENDEDOR: "read", BODEGUERO: "full", CONTADOR: "read"},
    "compras":      {ADMIN: "full", SUPERVISOR: "full", VENDEDOR: "none", BODEGUERO: "full", CONTADOR: "read"},
    "facturacion":  {ADMIN: "full", SUPERVISOR: "full", VENDEDOR: "read", BODEGUERO: "none", CONTADOR: "full"},
    "reportes":     {ADMIN: "full", SUPERVISOR: "full", VENDEDOR: "none", BODEGUERO: "none", CONTADOR: "full"},
    "maestros":     {ADMIN: "full", SUPERVISOR: "read", VENDEDOR: "none", BODEGUERO: "none", CONTADOR: "none"},
    "configuracion":{ADMIN: "full", SUPERVISOR: "none", VENDEDOR: "none", BODEGUERO: "none", CONTADOR: "none"},
    "cxc":          {ADMIN: "full", SUPERVISOR: "full", VENDEDOR: "read", BODEGUERO: "none", CONTADOR: "full"},
    "fel":          {ADMIN: "full", SUPERVISOR: "full", VENDEDOR: "none", BODEGUERO: "none", CONTADOR: "full"},
}
