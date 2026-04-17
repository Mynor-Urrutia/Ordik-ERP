import api from "./client";
export const ordenesTrabajoService = {
  getAll: () => api.get("/ordenes-trabajo/"),
  getByCliente: (clienteId) => api.get("/ordenes-trabajo/", { params: { cliente: clienteId } }),
  create: (data) => api.post("/ordenes-trabajo/", data),
  update: (id, data) => api.put(`/ordenes-trabajo/${id}/`, data),
  remove: (id) => api.delete(`/ordenes-trabajo/${id}/`),
  exportarPdf: (id) =>
    api.get(`/ordenes-trabajo/${id}/pdf/`, { responseType: "blob" }),
};
