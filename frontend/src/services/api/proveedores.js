import api from "./client";
export const proveedoresService = {
  getAll: () => api.get("/proveedores/"),
  create: (data) => api.post("/proveedores/", data),
  update: (id, data) => api.put(`/proveedores/${id}/`, data),
  remove: (id) => api.delete(`/proveedores/${id}/`),
};
