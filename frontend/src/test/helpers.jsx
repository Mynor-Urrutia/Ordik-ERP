import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AuthProvider } from "../contexts/AuthContext"

export function renderWithRouter(ui, { route = "/" } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  )
}

export function renderWithAuth(ui, { route = "/" } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </MemoryRouter>
  )
}
