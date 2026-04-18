import api from "./client"

const cxcService = {
  getAll:   (params) => api.get("/cxc/", { params }),
  getById:  (id)     => api.get(`/cxc/${id}/`),
  resumen:  ()       => api.get("/cxc/resumen/"),
  pagar:    (id, data) => api.post(`/cxc/${id}/pagar/`, data),
}

export default cxcService
