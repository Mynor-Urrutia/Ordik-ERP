import api from "./client";
export const ordenesTrabajoService = {
  getAll: () => api.get("/ordenes-trabajo/"),
  create: (data) => api.post("/ordenes-trabajo/", data),
  update: (id, data) => api.put(`/ordenes-trabajo/${id}/`, data),
  remove: (id) => api.delete(`/ordenes-trabajo/${id}/`),
};
