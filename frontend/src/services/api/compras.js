import api from "./client";

export const comprasService = {
  getAll: () => api.get("/compras/"),
  create: (data) => api.post("/compras/", data),
  update: (id, data) => api.put(`/compras/${id}/`, data),
  remove: (id) => api.delete(`/compras/${id}/`),
};

export const cotizacionesProveedorService = {
  getAll: (params) => api.get("/compras/cotizaciones-proveedor/", { params }),
  get: (id) => api.get(`/compras/cotizaciones-proveedor/${id}/`),
  create: (data) => api.post("/compras/cotizaciones-proveedor/", data),
  update: (id, data) => api.put(`/compras/cotizaciones-proveedor/${id}/`, data),
  remove: (id) => api.delete(`/compras/cotizaciones-proveedor/${id}/`),
};
