import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import CxCPage from "../../pages/cxc/CxCPage"

const mockGetAll  = vi.fn()
const mockResumen = vi.fn()
const mockPagar   = vi.fn()

vi.mock("../../services/api/cxc", () => ({
  default: {
    getAll:  (...a) => mockGetAll(...a),
    resumen: (...a) => mockResumen(...a),
    pagar:   (...a) => mockPagar(...a),
  },
}))

const RESUMEN = {
  total_pendiente:    "560.00",
  total_vencido:      "0.00",
  total_cobrado_mes:  "0.00",
  cantidad_pendientes: 1,
}

const CUENTA = {
  id:               1,
  correlativo:      "FAC-00001",
  factura:          1,
  cliente:          1,
  cliente_nombre:   "Cliente Test SA",
  monto_original:   "560.00",
  saldo_pendiente:  "560.00",
  fecha_vencimiento: "2026-05-17",
  estatus:          "pendiente",
  pagos:            [],
}

function wrap() {
  return render(<MemoryRouter><CxCPage /></MemoryRouter>)
}

describe("CxCPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAll.mockResolvedValue({ data: [CUENTA] })
    mockResumen.mockResolvedValue({ data: RESUMEN })
  })

  it("muestra estado de carga inicialmente", () => {
    wrap()
    expect(screen.getByText("Cargando...")).toBeInTheDocument()
  })

  it("renderiza las cards de resumen con datos del backend", async () => {
    wrap()
    await waitFor(() => {
      expect(screen.getByText("Por Cobrar")).toBeInTheDocument()
      expect(screen.getByText("Vencido")).toBeInTheDocument()
      expect(screen.getByText("Cobrado este mes")).toBeInTheDocument()
    })
    // "Q 560.00" aparece en cards y tabla — verificar que existe al menos uno
    expect(screen.getAllByText("Q 560.00").length).toBeGreaterThan(0)
  })

  it("renderiza la tabla con las cuentas por cobrar", async () => {
    wrap()
    await waitFor(() => {
      expect(screen.getByText("FAC-00001")).toBeInTheDocument()
      expect(screen.getByText("Cliente Test SA")).toBeInTheDocument()
    })
    // "Pendiente" aparece en el filtro y en el badge de la tabla
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0)
  })

  it("botón 'Registrar Pago' visible para cuentas pendientes", async () => {
    wrap()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /registrar pago/i })).toBeInTheDocument()
    })
  })

  it("cuentas pagadas no muestran botón de pago", async () => {
    mockGetAll.mockResolvedValue({ data: [{ ...CUENTA, estatus: "pagada", saldo_pendiente: "0.00" }] })
    wrap()
    await waitFor(() => {
      expect(screen.getByText("Pagada")).toBeInTheDocument()
    })
    expect(screen.queryByRole("button", { name: /registrar pago/i })).not.toBeInTheDocument()
  })

  it("click en 'Registrar Pago' abre el modal", async () => {
    const user = userEvent.setup()
    wrap()
    await waitFor(() => screen.getByRole("button", { name: /registrar pago/i }))
    await user.click(screen.getByRole("button", { name: /registrar pago/i }))
    expect(screen.getByText(/registrar pago — fac-00001/i)).toBeInTheDocument()
  })

  it("submit del modal llama cxcService.pagar con los datos correctos", async () => {
    mockPagar.mockResolvedValue({ data: { ...CUENTA, pagos: [{ id: 1, monto: "100.00", fecha_pago: "2026-04-17", metodo_pago: "efectivo" }] } })
    mockGetAll.mockResolvedValue({ data: [{ ...CUENTA, estatus: "parcial", saldo_pendiente: "460.00" }] })

    const user = userEvent.setup()
    wrap()

    await waitFor(() => screen.getByRole("button", { name: /registrar pago/i }))
    await user.click(screen.getByRole("button", { name: /registrar pago/i }))

    const modal = screen.getByText(/registrar pago — fac-00001/i).closest("div").parentElement
    const montoInput = within(modal).getByPlaceholderText("0.00")
    await user.clear(montoInput)
    await user.type(montoInput, "100")

    const submitBtn = within(modal).getByRole("button", { name: /registrar pago$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockPagar).toHaveBeenCalledWith(1, expect.objectContaining({ monto: "100" }))
    })
  })

  it("tabla vacía muestra mensaje cuando no hay cuentas", async () => {
    mockGetAll.mockResolvedValue({ data: [] })
    wrap()
    await waitFor(() => {
      expect(screen.getByText("No hay cuentas por cobrar")).toBeInTheDocument()
    })
  })
})
