import api from "./client"

const felService = {
  getAll:    (params)           => api.get("/fel/", { params }),
  certificar: (facturaId)       => api.post("/fel/certificar/", { factura_id: facturaId }),
  anular:    (facturaId, motivo) => api.post("/fel/anular/", { factura_id: facturaId, motivo }),
}

export default felService
