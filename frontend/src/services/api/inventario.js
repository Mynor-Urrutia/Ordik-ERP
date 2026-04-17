import api from "./client";

export const inventarioService = {
  getProductos: () => api.get("/inventario/productos/"),
  createProducto: (data) => api.post("/inventario/productos/", data),
  updateProducto: (id, data) => api.put(`/inventario/productos/${id}/`, data),
  removeProducto: (id) => api.delete(`/inventario/productos/${id}/`),

  // KARDEX individual — pide hasta 2000 para tener el historial completo del producto
  getMovimientos: (productoId) =>
    api.get(`/inventario/movimientos/?producto=${productoId}&page_size=2000&ordering=-fecha`),

  createMovimiento: (data) => api.post("/inventario/movimientos/", data),

  // Unidades seriadas
  getUnidades: (productoId, estado) => {
    const params = new URLSearchParams({ producto: productoId, page_size: 2000 });
    if (estado) params.append("estado", estado);
    return api.get(`/inventario/unidades-serie/?${params}`);
  },

  // Movimientos por OC (para comparativo en DetalleOC)
  getMovimientosByOC: (correlativo) =>
    api.get(
      `/inventario/movimientos/?orden_compra=${encodeURIComponent(correlativo)}&tipo=entrada&page_size=2000`
    ),

  // Historial global paginado
  getHistorial: ({ search = "", page = 1, pageSize = 25 } = {}) => {
    const params = new URLSearchParams({ page, page_size: pageSize, ordering: "-fecha" });
    if (search.trim()) params.append("search", search.trim());
    return api.get(`/inventario/movimientos/?${params}`);
  },

  // Exportar PDF del inventario
  exportarPdf: (incluirSinStock = false) =>
    api.get(`/inventario/productos/pdf/?incluir_sin_stock=${incluirSinStock}`, {
      responseType: "blob",
    }),
};
