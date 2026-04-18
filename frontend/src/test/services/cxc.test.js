import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../../services/api/client", () => ({
  default: {
    get:  vi.fn(),
    post: vi.fn(),
    interceptors: {
      request:  { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

import api from "../../services/api/client"
import cxcService from "../../services/api/cxc"

describe("cxcService", () => {
  beforeEach(() => vi.clearAllMocks())

  it("getAll llama GET /cxc/ sin params", () => {
    api.get.mockResolvedValue({ data: [] })
    cxcService.getAll()
    expect(api.get).toHaveBeenCalledWith("/cxc/", { params: undefined })
  })

  it("getAll pasa filtros como query params", () => {
    api.get.mockResolvedValue({ data: [] })
    cxcService.getAll({ estatus: "pendiente" })
    expect(api.get).toHaveBeenCalledWith("/cxc/", { params: { estatus: "pendiente" } })
  })

  it("getById llama GET /cxc/{id}/", () => {
    api.get.mockResolvedValue({ data: {} })
    cxcService.getById(42)
    expect(api.get).toHaveBeenCalledWith("/cxc/42/")
  })

  it("resumen llama GET /cxc/resumen/", () => {
    api.get.mockResolvedValue({ data: {} })
    cxcService.resumen()
    expect(api.get).toHaveBeenCalledWith("/cxc/resumen/")
  })

  it("pagar llama POST /cxc/{id}/pagar/ con payload", () => {
    api.post.mockResolvedValue({ data: {} })
    const payload = { monto: "100.00", fecha_pago: "2026-04-17", metodo_pago: "efectivo" }
    cxcService.pagar(7, payload)
    expect(api.post).toHaveBeenCalledWith("/cxc/7/pagar/", payload)
  })
})
