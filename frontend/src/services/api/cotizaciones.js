import api from "./client";
export const cotizacionesService = {
  getAll: () => api.get("/cotizaciones/"),
  create: (data) => api.post("/cotizaciones/", data),
  update: (id, data) => api.put(`/cotizaciones/${id}/`, data),
  remove: (id) => api.delete(`/cotizaciones/${id}/`),
  pdf: (id) => api.get(`/cotizaciones/${id}/pdf/`, { responseType: "blob" }),
};
