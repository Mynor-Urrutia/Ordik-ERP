import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AuthProvider, useAuth } from "../../contexts/AuthContext"

vi.mock("../../services/api/auth", () => ({
  default: {
    login:  vi.fn(),
    me:     vi.fn(),
    logout: vi.fn(),
  },
}))

// Also mock api/client so interceptors don't crash in jsdom
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

import authService from "../../services/api/auth"

function TestConsumer() {
  const { user, ready } = useAuth()
  if (!ready) return <div>loading</div>
  return <div>{user ? `logged:${user.username}` : "anonymous"}</div>
}

function wrap(ui) {
  return render(<MemoryRouter><AuthProvider>{ui}</AuthProvider></MemoryRouter>)
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("sin token en localStorage → ready=true, user=null", async () => {
    authService.me.mockResolvedValue({ data: {} })
    wrap(<TestConsumer />)
    await waitFor(() => expect(screen.getByText("anonymous")).toBeInTheDocument())
    expect(authService.me).not.toHaveBeenCalled()
  })

  it("con token válido → llama me() y setea el usuario", async () => {
    localStorage.setItem("access", "valid-token")
    authService.me.mockResolvedValue({ data: { username: "admin", rol: "admin" } })
    wrap(<TestConsumer />)
    await waitFor(() => expect(screen.getByText("logged:admin")).toBeInTheDocument())
    expect(authService.me).toHaveBeenCalledOnce()
  })

  it("me() falla → limpia localStorage y queda anonymous", async () => {
    localStorage.setItem("access", "expired-token")
    localStorage.setItem("refresh", "old-refresh")
    authService.me.mockRejectedValue({ response: { status: 401 } })
    authService.logout.mockResolvedValue({})
    wrap(<TestConsumer />)
    await waitFor(() => expect(screen.getByText("anonymous")).toBeInTheDocument())
  })

  it("login() llama authService.login y almacena tokens", async () => {
    authService.me.mockResolvedValue({ data: {} })
    authService.login.mockResolvedValue({
      data: { access: "acc", refresh: "ref", user: { username: "juana", rol: "vendedor" } },
    })

    function LoginBtn() {
      const { login, user } = useAuth()
      return (
        <button onClick={() => login("juana", "pass")}>
          {user ? `hi:${user.username}` : "login"}
        </button>
      )
    }

    wrap(<LoginBtn />)
    await waitFor(() => screen.getByText("login"))
    act(() => screen.getByText("login").click())
    await waitFor(() => expect(screen.getByText("hi:juana")).toBeInTheDocument())
    expect(localStorage.getItem("access")).toBe("acc")
    expect(localStorage.getItem("refresh")).toBe("ref")
  })
})
