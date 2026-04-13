import api from "./client";
export const clientesService = {
  getAll: () => api.get("/clientes/"),
  create: (data) => api.post("/clientes/", data),
  update: (id, data) => api.put(`/clientes/${id}/`, data),
  remove: (id) => api.delete(`/clientes/${id}/`),
};
