import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import ProtectedRoute from "../../components/ui/ProtectedRoute"

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from "../../contexts/AuthContext"

function wrapRoute(ready, user) {
  useAuth.mockReturnValue({ ready, user })
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>contenido protegido</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe("ProtectedRoute", () => {
  it("no ready → muestra spinner", () => {
    wrapRoute(false, null)
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument()
    expect(screen.queryByText("login page")).not.toBeInTheDocument()
  })

  it("ready sin user → redirige a /login", () => {
    wrapRoute(true, null)
    expect(screen.getByText("login page")).toBeInTheDocument()
    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument()
  })

  it("ready con user → renderiza children", () => {
    wrapRoute(true, { username: "admin", rol: "admin" })
    expect(screen.getByText("contenido protegido")).toBeInTheDocument()
    expect(screen.queryByText("login page")).not.toBeInTheDocument()
  })
})
