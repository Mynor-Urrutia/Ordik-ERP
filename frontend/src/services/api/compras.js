import api from "./client";

export const comprasService = {
  getAll: () => api.get("/compras/"),
  getByProveedor: (proveedorId) => api.get("/compras/", { params: { proveedor: proveedorId } }),
  create: (data) => api.post("/compras/", data),
  update: (id, data) => api.put(`/compras/${id}/`, data),
  remove: (id) => api.delete(`/compras/${id}/`),
  cambiarEstatus: (id, estatus) => api.post(`/compras/${id}/cambiar-estatus/`, { estatus }),
};
