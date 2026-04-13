import api from "./client";
export const inventarioService = {
  getProductos: () => api.get("/inventario/productos/"),
  createProducto: (data) => api.post("/inventario/productos/", data),
  updateProducto: (id, data) => api.put(`/inventario/productos/${id}/`, data),
  removeProducto: (id) => api.delete(`/inventario/productos/${id}/`),
  getMovimientos: (productoId) =>
    api.get(`/inventario/movimientos/?producto=${productoId}`),
  createMovimiento: (data) => api.post("/inventario/movimientos/", data),
};
