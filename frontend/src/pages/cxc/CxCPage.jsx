import { useState, useEffect, useCallback } from "react"
import cxcService from "../../services/api/cxc"

const ESTATUS_CONFIG = {
  pendiente: { label: "Pendiente", cls: "bg-amber-100 text-amber-800" },
  parcial:   { label: "Parcial",   cls: "bg-blue-100 text-blue-800" },
  pagada:    { label: "Pagada",    cls: "bg-green-100 text-green-800" },
  vencida:   { label: "Vencida",   cls: "bg-red-100 text-red-800" },
}

const METODOS = ["efectivo", "transferencia", "cheque", "tarjeta", "otro"]

function fmtQ(val) {
  return `Q ${parseFloat(val || 0).toFixed(2)}`
}

function EstatusBadge({ estatus }) {
  const cfg = ESTATUS_CONFIG[estatus] || { label: estatus, cls: "bg-gray-100 text-gray-800" }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function ResumenCards({ resumen }) {
  const cards = [
    { label: "Por Cobrar",       val: resumen.total_pendiente,   cls: "text-amber-600" },
    { label: "Vencido",          val: resumen.total_vencido,     cls: "text-red-600" },
    { label: "Cobrado este mes", val: resumen.total_cobrado_mes, cls: "text-green-600" },
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{c.label}</p>
          <p className={`text-2xl font-bold ${c.cls}`}>{fmtQ(c.val)}</p>
        </div>
      ))}
    </div>
  )
}

function PagoModal({ cuenta, onClose, onSuccess }) {
  const [form, setForm] = useState({
    monto: "",
    fecha_pago: new Date().toISOString().split("T")[0],
    metodo_pago: "efectivo",
    referencia: "",
    notas: "",
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await cxcService.pagar(cuenta.id, form)
      onSuccess()
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "Error al registrar pago")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold">Registrar Pago — {cuenta.correlativo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-4 bg-gray-50 border-b text-sm grid grid-cols-2 gap-2">
          <div><span className="text-gray-500">Monto original:</span> <strong>{fmtQ(cuenta.monto_original)}</strong></div>
          <div><span className="text-gray-500">Saldo pendiente:</span> <strong className="text-amber-700">{fmtQ(cuenta.saldo_pendiente)}</strong></div>
          <div><span className="text-gray-500">Cliente:</span> <strong>{cuenta.cliente_nombre}</strong></div>
          <div><span className="text-gray-500">Vencimiento:</span> <strong>{cuenta.fecha_vencimiento}</strong></div>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input
                type="number" step="0.01" required
                value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input
                type="date" required
                value={form.fecha_pago}
                onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago *</label>
            <select
              value={form.metodo_pago}
              onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {METODOS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia / No. cheque</label>
            <input
              type="text"
              value={form.referencia}
              onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              rows={2}
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !form.monto || !form.fecha_pago}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {loading ? "Guardando..." : "Registrar Pago"}
            </button>
          </div>
        </form>

        {cuenta.pagos?.length > 0 && (
          <div className="border-t p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Pagos anteriores</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {cuenta.pagos.map(p => (
                <div key={p.id} className="flex justify-between text-sm py-1 border-b border-gray-100">
                  <span>{p.fecha_pago} — {p.metodo_pago}</span>
                  <span className="font-semibold text-green-700">{fmtQ(p.monto)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CxCPage() {
  const [cuentas, setCuentas]   = useState([])
  const [resumen, setResumen]   = useState({})
  const [filtro, setFiltro]     = useState("")
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = filtro ? { estatus: filtro } : {}
      const [cxcRes, resRes] = await Promise.all([
        cxcService.getAll(params),
        cxcService.resumen(),
      ])
      setCuentas(cxcRes.data.results ?? cxcRes.data)
      setResumen(resRes.data)
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "Error al cargar CxC")
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => { cargar() }, [cargar])

  async function handlePagoSuccess() {
    setSelected(null)
    await cargar()
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cuentas por Cobrar</h1>
        <p className="text-sm text-gray-500 mt-1">Seguimiento de facturas emitidas y sus pagos</p>
      </div>

      <ResumenCards resumen={resumen} />

      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b flex flex-wrap gap-3 items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            {cuentas.length} cuenta{cuentas.length !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            {["", "pendiente", "parcial", "vencida", "pagada"].map(e => (
              <button
                key={e}
                onClick={() => setFiltro(e)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filtro === e
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {e ? e.charAt(0).toUpperCase() + e.slice(1) : "Todos"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : cuentas.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay cuentas por cobrar</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">Factura</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Cliente</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right">Monto Original</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right">Saldo Pendiente</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Vencimiento</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Estatus</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-700">{c.correlativo}</td>
                    <td className="px-4 py-3 text-gray-700">{c.cliente_nombre}</td>
                    <td className="px-4 py-3 text-right">{fmtQ(c.monto_original)}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={c.saldo_pendiente > 0 ? "text-amber-700" : "text-green-700"}>
                        {fmtQ(c.saldo_pendiente)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.fecha_vencimiento}</td>
                    <td className="px-4 py-3"><EstatusBadge estatus={c.estatus} /></td>
                    <td className="px-4 py-3">
                      {c.estatus !== "pagada" && (
                        <button
                          onClick={() => setSelected(c)}
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                        >
                          Registrar Pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <PagoModal
          cuenta={selected}
          onClose={() => setSelected(null)}
          onSuccess={handlePagoSuccess}
        />
      )}
    </div>
  )
}
