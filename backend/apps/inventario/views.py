from rest_framework import viewsets, filters
from .models import Producto, MovimientoInventario
from .serializers import ProductoSerializer, MovimientoInventarioSerializer


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.select_related("proveedor").all()
    serializer_class = ProductoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nombre", "cod_producto", "categoria", "marca", "proveedor__razon_social"]
    ordering_fields = ["nombre", "cod_producto", "categoria", "costo_unitario", "stock_actual"]
    ordering = ["nombre"]


class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    queryset = MovimientoInventario.objects.select_related("producto").all()
    serializer_class = MovimientoInventarioSerializer
    http_method_names = ["get", "post", "head", "options"]  # CARDEX: inmutable
    filter_backends = [filters.SearchFilter]
    search_fields = ["producto__nombre"]
    filterset_fields = ["producto"]
