import api from "./client";

const BASE = "/facturas";

const facturacionService = {
  getAll:  (params) => api.get(BASE + "/", { params }),
  get:     (id)     => api.get(`${BASE}/${id}/`),
  create:  (data)   => api.post(BASE + "/", data),
  update:  (id, data) => api.put(`${BASE}/${id}/`, data),
  patch:   (id, data) => api.patch(`${BASE}/${id}/`, data),
  delete:  (id)     => api.delete(`${BASE}/${id}/`),
  pdf:     (id)     => api.get(`${BASE}/${id}/pdf/`, { responseType: "blob" }),
};

export default facturacionService;
