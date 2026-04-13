import api from "./client";
export const comprasService = {
  getAll: () => api.get("/compras/"),
  create: (data) => api.post("/compras/", data),
  update: (id, data) => api.put(`/compras/${id}/`, data),
  remove: (id) => api.delete(`/compras/${id}/`),
};
