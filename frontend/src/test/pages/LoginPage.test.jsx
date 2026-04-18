import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import LoginPage from "../../pages/auth/LoginPage"

const mockLogin   = vi.fn()
const mockNavigate = vi.fn()

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin }),
}))

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal()
  return { ...mod, useNavigate: () => mockNavigate }
})

// Silenciar import de imagen PNG en jsdom
vi.mock("../../assets/logo-light.png", () => ({ default: "logo.png" }))

function wrap() {
  return render(<MemoryRouter><LoginPage /></MemoryRouter>)
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogin.mockResolvedValue(undefined)
  })

  it("renderiza campos de usuario y contraseña", () => {
    wrap()
    expect(screen.getByPlaceholderText(/ingresá tu usuario/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it("submit llama login() con las credenciales ingresadas", async () => {
    const user = userEvent.setup()
    wrap()

    await user.type(screen.getByPlaceholderText(/ingresá tu usuario/i), "admin")
    await user.type(screen.getByPlaceholderText("••••••••"), "pass1234")
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("admin", "pass1234")
    })
  })

  it("login exitoso navega a /", async () => {
    const user = userEvent.setup()
    wrap()

    await user.type(screen.getByPlaceholderText(/ingresá tu usuario/i), "admin")
    await user.type(screen.getByPlaceholderText("••••••••"), "clave")
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true })
    })
  })

  it("credenciales incorrectas muestra mensaje de error", async () => {
    mockLogin.mockRejectedValue(new Error("unauthorized"))
    const user = userEvent.setup()
    wrap()

    await user.type(screen.getByPlaceholderText(/ingresá tu usuario/i), "hacker")
    await user.type(screen.getByPlaceholderText("••••••••"), "wrong")
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(screen.getByText(/usuario o contraseña incorrectos/i)).toBeInTheDocument()
    })
  })

  it("mientras carga el botón queda deshabilitado", async () => {
    let resolve
    mockLogin.mockReturnValue(new Promise(r => { resolve = r }))
    const user = userEvent.setup()
    wrap()

    await user.type(screen.getByPlaceholderText(/ingresá tu usuario/i), "admin")
    await user.type(screen.getByPlaceholderText("••••••••"), "pass")
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /iniciando sesión/i })).toBeDisabled()
    })

    resolve()
  })
})
