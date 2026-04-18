from django.http import HttpResponse
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor
from rest_framework.permissions import IsAuthenticated
from apps.usuarios.permissions import ReadOrAdminSupervisorOrBodeguero, IsAdminSupervisorOrBodeguero
from .models import Producto, MovimientoInventario, UnidadSeriada
from .serializers import (
    ProductoSerializer,
    MovimientoInventarioSerializer,
    UnidadSeriadaSerializer,
)
from apps.compras.models import Compra, CompraHistorial
from apps.maestros.models import EmpresaConfig


# ── Paleta ──────────────────────────────────────────────────────────────────
C_NAVY   = HexColor("#1e3a5f")
C_TEAL   = HexColor("#0f766e")
C_AMBER  = HexColor("#d97706")
C_RED    = HexColor("#dc2626")
C_MIST   = HexColor("#f1f5f9")
C_STRIPE = HexColor("#f8fafc")
C_WHITE  = HexColor("#ffffff")
C_GRAY   = HexColor("#64748b")


class MovimientoPagination(PageNumberPagination):
    """
    Paginación configurable por el cliente.
    Por defecto 25 — el frontend pide más cuando necesita todo (KARDEX individual).
    """
    page_size               = 25
    page_size_query_param   = "page_size"
    max_page_size           = 2000


class ProductoViewSet(viewsets.ModelViewSet):
    queryset           = Producto.objects.select_related("proveedor").all()
    serializer_class   = ProductoSerializer
    permission_classes = [IsAuthenticated, ReadOrAdminSupervisorOrBodeguero]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ["nombre", "cod_producto", "categoria", "marca", "proveedor__razon_social"]
    ordering_fields    = ["nombre", "cod_producto", "categoria", "costo_unitario", "stock_actual"]
    ordering           = ["nombre"]

    @action(detail=False, methods=["get"], url_path="pdf")
    def generar_pdf(self, request):
        incluir_sin_stock = request.query_params.get("incluir_sin_stock", "false").lower() == "true"

        qs = Producto.objects.select_related("proveedor").order_by("categoria", "nombre")
        if not incluir_sin_stock:
            qs = qs.filter(stock_actual__gt=0)

        productos = list(qs)

        try:
            empresa = EmpresaConfig.objects.first()
        except Exception:
            empresa = None

        W, H = landscape(A4)
        resp = HttpResponse(content_type="application/pdf")
        nombre_archivo = "inventario_con_sin_stock.pdf" if incluir_sin_stock else "inventario.pdf"
        resp["Content-Disposition"] = f'attachment; filename="{nombre_archivo}"'

        c = canvas.Canvas(resp, pagesize=landscape(A4))

        def draw_page(page_num, total_pages):
            # ── Header ──────────────────────────────────────────────────────
            c.setFillColor(C_NAVY)
            c.rect(0, H - 55, W, 55, fill=1, stroke=0)

            emp_nombre = empresa.razon_social if empresa else "Inventario"
            emp_nit    = f"NIT: {empresa.nit}" if empresa else ""
            c.setFillColor(C_WHITE)
            c.setFont("Helvetica-Bold", 14)
            c.drawString(30, H - 22, emp_nombre)
            c.setFont("Helvetica", 8)
            c.drawString(30, H - 35, emp_nit)

            c.setFont("Helvetica-Bold", 18)
            titulo = "LISTADO DE INVENTARIO"
            c.drawRightString(W - 30, H - 22, titulo)

            from datetime import date
            subtitulo = f"{'Con y sin stock' if incluir_sin_stock else 'Solo con stock'} · {date.today().strftime('%d/%m/%Y')} · Pág. {page_num}/{total_pages}"
            c.setFont("Helvetica", 8)
            c.drawRightString(W - 30, H - 35, subtitulo)

            # ── Línea separadora ─────────────────────────────────────────────
            c.setFillColor(C_TEAL)
            c.rect(0, H - 60, W, 5, fill=1, stroke=0)

        # ── Encabezado tabla ────────────────────────────────────────────────
        COL = {
            "cod":      (30,   65),
            "nombre":   (100,  185),
            "cat":      (290,  100),
            "marca":    (395,   75),
            "ubic":     (475,   80),
            "costo":    (558,   68),
            "pventa":   (630,   68),
            "stock":    (702,   50),
            "min":      (756,   45),
        }

        def draw_table_header(y):
            c.setFillColor(C_NAVY)
            c.rect(28, y - 2, W - 56, 18, fill=1, stroke=0)
            c.setFillColor(C_WHITE)
            c.setFont("Helvetica-Bold", 7)
            headers = [
                ("cod",   "CÓDIGO"),
                ("nombre","DESCRIPCIÓN"),
                ("cat",   "CATEGORÍA"),
                ("marca", "MARCA"),
                ("ubic",  "UBICACIÓN"),
                ("costo", "COSTO UNIT."),
                ("pventa","P. VENTA"),
                ("stock", "STOCK"),
                ("min",   "STK MÍN"),
            ]
            for key, label in headers:
                x, _ = COL[key]
                c.drawString(x + 3, y + 4, label)
            return y - 20

        def draw_row(y, prod, i):
            # fondo alternado
            c.setFillColor(C_STRIPE if i % 2 == 0 else C_WHITE)
            c.rect(28, y - 2, W - 56, 16, fill=1, stroke=0)

            # borde izquierdo coloreado por estado stock
            if prod.stock_actual <= 0:
                c.setFillColor(C_RED)
            elif prod.stock_actual <= (prod.stock_minimo or 0):
                c.setFillColor(C_AMBER)
            else:
                c.setFillColor(C_TEAL)
            c.rect(28, y - 2, 4, 16, fill=1, stroke=0)

            c.setFillColor(HexColor("#1e293b"))
            c.setFont("Helvetica", 7)

            def cell(key, text, bold=False, color=None):
                x, w = COL[key]
                if color:
                    c.setFillColor(color)
                elif bold:
                    c.setFillColor(HexColor("#1e293b"))
                else:
                    c.setFillColor(C_GRAY)
                font = "Helvetica-Bold" if bold else "Helvetica"
                c.setFont(font, 7)
                # truncar texto para que quepa
                txt = str(text or "—")
                while c.stringWidth(txt, font, 7) > w - 6 and len(txt) > 1:
                    txt = txt[:-1]
                if str(text or "—") != txt:
                    txt = txt[:-1] + "…"
                c.drawString(x + 3, y + 2, txt)

            precio_venta = float(prod.costo_unitario or 0) * (1 + float(getattr(prod, 'porcentaje_utilidad', 0) or 0) / 100)

            cell("cod",    prod.cod_producto,  bold=True, color=HexColor("#0f766e"))
            cell("nombre", prod.nombre,         bold=True, color=HexColor("#1e293b"))
            cell("cat",    prod.categoria)
            cell("marca",  prod.marca)
            cell("ubic",   prod.ubicacion)
            cell("costo",  f"Q{float(prod.costo_unitario or 0):,.2f}", bold=True)
            cell("pventa", f"Q{precio_venta:,.2f}")

            # Stock — color según nivel
            x_stock, _ = COL["stock"]
            stk_color = C_RED if prod.stock_actual <= 0 else (C_AMBER if prod.stock_actual <= (prod.stock_minimo or 0) else C_TEAL)
            c.setFillColor(stk_color)
            c.setFont("Helvetica-Bold", 8)
            c.drawRightString(x_stock + 44, y + 2, str(prod.stock_actual))

            cell("min", str(prod.stock_minimo or 0))

            return y - 16

        # ── Calcular páginas necesarias ─────────────────────────────────────
        ROWS_PER_PAGE = 28
        total_pages = max(1, -(-len(productos) // ROWS_PER_PAGE))  # ceil

        for page_idx in range(total_pages):
            page_num = page_idx + 1
            draw_page(page_num, total_pages)

            y = H - 75
            y = draw_table_header(y)

            slice_start = page_idx * ROWS_PER_PAGE
            slice_end   = slice_start + ROWS_PER_PAGE
            page_prods  = productos[slice_start:slice_end]

            for i, prod in enumerate(page_prods):
                if y < 40:
                    c.showPage()
                    draw_page(page_num, total_pages)
                    y = H - 75
                    y = draw_table_header(y)
                y = draw_row(y, prod, i)

            # ── Leyenda colores (última página o cada página) ────────────────
            if page_num == total_pages:
                c.setFillColor(C_NAVY)
                c.rect(0, 0, W, 28, fill=1, stroke=0)
                c.setFont("Helvetica", 7)
                leyenda = [
                    (C_TEAL,  "Stock OK"),
                    (C_AMBER, "Stock bajo (≤ mínimo)"),
                    (C_RED,   "Sin stock"),
                ]
                lx = 30
                for color, label in leyenda:
                    c.setFillColor(color)
                    c.rect(lx, 9, 10, 10, fill=1, stroke=0)
                    c.setFillColor(C_WHITE)
                    c.drawString(lx + 14, 12, label)
                    lx += 130
                c.setFillColor(C_WHITE)
                c.setFont("Helvetica", 7)
                c.drawRightString(W - 30, 12, f"Total productos: {len(productos)}")

            if page_num < total_pages:
                c.showPage()

        c.save()
        return resp


class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    serializer_class   = MovimientoInventarioSerializer
    pagination_class   = MovimientoPagination
    permission_classes = [IsAuthenticated, IsAdminSupervisorOrBodeguero]
    http_method_names  = ["get", "post", "head", "options"]  # CARDEX: inmutable
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["producto", "orden_compra", "tipo"]
    ordering_fields    = ["fecha", "tipo", "cantidad"]
    ordering           = ["-fecha"]
    search_fields      = [
        "producto__nombre",
        "producto__cod_producto",
        "producto__marca",
        "producto__modelo",
        "producto__categoria",
        "unidades_ingresadas__numero_serie",
        "unidades_egresadas__numero_serie",
    ]

    def get_queryset(self):
        return (
            MovimientoInventario.objects
            .select_related("producto", "proveedor", "responsable")
            .prefetch_related("unidades_ingresadas", "unidades_egresadas")
            .distinct()
        )

    def perform_create(self, serializer):
        validated = serializer.validated_data
        producto  = validated.get("producto")
        tipo      = validated.get("tipo")

        # Extraer campos de escritura que no pertenecen al modelo
        numeros_serie = validated.pop("numeros_serie", [])
        unidades_ids  = validated.pop("unidades_ids", [])

        movimiento = serializer.save()

        # ── Unidades seriadas ─────────────────────────────────────────────────
        if producto.controla_serie:
            if tipo == "entrada" and numeros_serie:
                condicion = validated.get("condicion", "")
                unidades = [
                    UnidadSeriada(
                        producto=producto,
                        numero_serie=sn,
                        estado="disponible",
                        condicion=condicion,
                        movimiento_entrada=movimiento,
                    )
                    for sn in numeros_serie
                ]
                UnidadSeriada.objects.bulk_create(unidades)

            elif tipo == "salida" and unidades_ids:
                motivo = validated.get("motivo_salida", "")
                estado_destino = "dado_de_baja" if motivo in (
                    "devolucion_proveedor", "baja_definitiva", "merma", "otro"
                ) else "en_uso"
                UnidadSeriada.objects.filter(id__in=unidades_ids).update(
                    estado=estado_destino,
                    movimiento_salida=movimiento,
                )

        # ── Auto-marcar OC como Recibida ──────────────────────────────────────
        if tipo == "entrada" and movimiento.orden_compra:
            try:
                compra = Compra.objects.get(correlativo=movimiento.orden_compra)
                if compra.estatus != "Recibida":
                    anterior = compra.estatus
                    compra.estatus = "Recibida"
                    compra.save(update_fields=["estatus"])
                    CompraHistorial.objects.create(
                        compra=compra,
                        tipo="estatus",
                        descripcion=(
                            f"Marcada como Recibida automáticamente al registrar "
                            f"entrada de inventario (producto: {producto.nombre})"
                        ),
                        valor_anterior=anterior,
                        valor_nuevo="Recibida",
                    )
            except Compra.DoesNotExist:
                pass


class UnidadSeriadaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Solo lectura — las unidades se crean/actualizan a través de los movimientos.
    """
    serializer_class = UnidadSeriadaSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["numero_serie"]
    filterset_fields = ["producto", "estado"]

    def get_queryset(self):
        return UnidadSeriada.objects.select_related(
            "producto", "movimiento_entrada", "movimiento_salida"
        ).all()
