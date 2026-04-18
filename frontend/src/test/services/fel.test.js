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
import felService from "../../services/api/fel"

describe("felService", () => {
  beforeEach(() => vi.clearAllMocks())

  it("getAll llama GET /fel/", () => {
    api.get.mockResolvedValue({ data: [] })
    felService.getAll()
    expect(api.get).toHaveBeenCalledWith("/fel/", { params: undefined })
  })

  it("certificar llama POST /fel/certificar/ con factura_id", () => {
    api.post.mockResolvedValue({ data: { estatus: "certificada", uuid: "abc-123" } })
    felService.certificar(15)
    expect(api.post).toHaveBeenCalledWith("/fel/certificar/", { factura_id: 15 })
  })

  it("anular llama POST /fel/anular/ con factura_id y motivo", () => {
    api.post.mockResolvedValue({ data: { estatus: "anulada" } })
    felService.anular(15, "Error en receptor")
    expect(api.post).toHaveBeenCalledWith("/fel/anular/", {
      factura_id: 15,
      motivo: "Error en receptor",
    })
  })
})
