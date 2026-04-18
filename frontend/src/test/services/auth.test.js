import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the api client before importing authService
vi.mock("../../services/api/client", () => ({
  default: {
    post: vi.fn(),
    get:  vi.fn(),
    interceptors: {
      request:  { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

import api from "../../services/api/client"
import authService from "../../services/api/auth"

describe("authService", () => {
  beforeEach(() => vi.clearAllMocks())

  it("login llama POST /auth/login/ con credenciales", () => {
    api.post.mockResolvedValue({ data: { access: "tok", refresh: "ref", user: {} } })
    authService.login("admin", "pass123")
    expect(api.post).toHaveBeenCalledWith("/auth/login/", { username: "admin", password: "pass123" })
  })

  it("me llama GET /auth/me/", () => {
    api.get.mockResolvedValue({ data: { username: "admin", rol: "admin" } })
    authService.me()
    expect(api.get).toHaveBeenCalledWith("/auth/me/")
  })

  it("logout llama POST /auth/logout/ con el refresh token", () => {
    api.post.mockResolvedValue({ data: {} })
    authService.logout("my-refresh-token")
    expect(api.post).toHaveBeenCalledWith("/auth/logout/", { refresh: "my-refresh-token" })
  })
})
