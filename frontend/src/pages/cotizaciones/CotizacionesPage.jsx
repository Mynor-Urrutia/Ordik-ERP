import { useEffect, useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faFilePdf, faClipboardList } from "@fortawesome/free-solid-svg-icons";
import { cotizacionesService } from "../../services/api/cotizaciones";
import { clientesService } from "../../services/api/clientes";
import { inventarioService } from "../../services/api/inventario";
import { tiposServicioService, tiposEstatusService, tiposTrabajoService, personalService, unidadesMedidaService } from "../../services/api/maestros";
import { ordenesTrabajoService } from "../../services/api/ordenesTrabajo";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

// ── Constantes ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  cliente: "", tipo: "", estatus: "", asesor: "",
  validez_dias: "30", condiciones_pago: "", tiempo_entrega: "",
  lugar_entrega: "", ot_referencia: "", notas: "",
};

const EMPTY_ITEM = {
  nombre_producto: "", descripcion: "", unidad_medida: "unidad",
  precio_unitario: "", descuento_porcentaje: "0", descuento_monto: "0",
  porcentaje_iva: "12", porcentaje_isr: "0", cantidad: "1",
};
// UNIDADES se carga desde maestros dinámicamente

const CONDICIONES_PAGO = [
  "Contado", "Crédito 15 días", "Crédito 30 días",
  "Crédito 60 días", "50% anticipo / 50% contra entrega",
  "Transferencia bancaria", "Cheque",
];

const TIEMPOS_ENTREGA = [
  "Inmediata", "1-3 días hábiles", "1 semana",
  "2 semanas", "1 mes", "A confirmar",
];

// ── Colores por estatus ──────────────────────────────────────────────────────
const ESTATUS_BADGE = {
  "Borrador":    "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300",
  "Enviada":     "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "En revisión": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Aprobada":    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "Rechazada":   "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "Vencida":     "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};
const estatusBadge = (estatus) =>
  ESTATUS_BADGE[estatus] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";

const COLS = [
  { key: "id", label: "N°", sortable: true, render: (r) => (
    <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
      COT-{String(r.id).padStart(4, "0")}
    </span>
  )},
  { key: "cliente_nombre", label: "Cliente", sortable: true },
  { key: "tipo", label: "Tipo de Servicio", sortable: true },
  { key: "asesor", label: "Asesor", sortable: true },
  {
    key: "estatus",
    label: "Estatus",
    sortable: true,
    render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estatusBadge(r.estatus)}`}>
        {r.estatus || "—"}
      </span>
    ),
  },
  {
    key: "total",
    label: "Total",
    sortable: true,
    render: (r) => `Q${parseFloat(r.total || 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`,
  },
  {
    key: "fecha_creacion",
    label: "Fecha",
    sortable: true,
    render: (r) => new Date(r.fecha_creacion).toLocaleDateString("es-GT"),
  },
];

// ── Cálculos de ítem ─────────────────────────────────────────────────────────
const calcItem = (it) => {
  const p       = parseFloat(it.precio_unitario)      || 0;
  const descPct = parseFloat(it.descuento_porcentaje) || 0;
  const descMnt = parseFloat(it.descuento_monto)      || 0;
  const iva     = parseFloat(it.porcentaje_iva)       || 0;
  const isr     = parseFloat(it.porcentaje_isr)       || 0;
  const q       = parseInt(it.cantidad)               || 0;
  const pNeto   = Math.max(0, p * (1 - descPct / 100) - descMnt);
  const subtotal = pNeto * (1 + iva / 100 + isr / 100);
  return { subtotal, total: subtotal * q, pNeto };
};

const fmt = (n) => `Q${parseFloat(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;

// ── Sección del formulario ────────────────────────────────────────────────────
function Seccion({ titulo, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pb-1 border-b">
        {titulo}
      </h3>
      {children}
    </div>
  );
}

// ── Detalle Cotización ───────────────────────────────────────────────────────
function DetalleCotizacion({ cot: cotInicial, clientes, personal, tiposTrabajo, onClose, onEdit, onUpdated }) {
  const [cot, setCot]             = useState(cotInicial);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showOTForm, setShowOTForm] = useState(false);
  const [otForm, setOtForm]       = useState(null);
  const [otSaving, setOtSaving]   = useState(false);
  const [otSuccess, setOtSuccess] = useState(null); // { id, numero }

  // Cálculos
  const subtotal = (cot.items ?? []).reduce((s, it) => {
    const p       = parseFloat(it.precio_unitario)      || 0;
    const descPct = parseFloat(it.descuento_porcentaje) || 0;
    const descMnt = parseFloat(it.descuento_monto)      || 0;
    const q       = parseInt(it.cantidad)               || 0;
    const pNeto   = Math.max(0, p * (1 - descPct / 100) - descMnt);
    return s + pNeto * q;
  }, 0);
  const totalIva = (cot.items ?? []).reduce((s, it) => {
    const p       = parseFloat(it.precio_unitario)      || 0;
    const descPct = parseFloat(it.descuento_porcentaje) || 0;
    const descMnt = parseFloat(it.descuento_monto)      || 0;
    const iva     = parseFloat(it.porcentaje_iva)       || 0;
    const q       = parseInt(it.cantidad)               || 0;
    const pNeto   = Math.max(0, p * (1 - descPct / 100) - descMnt);
    return s + pNeto * (iva / 100) * q;
  }, 0);
  const totalIsr = (cot.items ?? []).reduce((s, it) => {
    const p       = parseFloat(it.precio_unitario)      || 0;
    const descPct = parseFloat(it.descuento_porcentaje) || 0;
    const descMnt = parseFloat(it.descuento_monto)      || 0;
    const isr     = parseFloat(it.porcentaje_isr)       || 0;
    const q       = parseInt(it.cantidad)               || 0;
    const pNeto   = Math.max(0, p * (1 - descPct / 100) - descMnt);
    return s + pNeto * (isr / 100) * q;
  }, 0);
  const total = parseFloat(cot.total) || (subtotal + totalIva + totalIsr);

  const fechaCreacion = cot.fecha_creacion
    ? new Date(cot.fecha_creacion).toLocaleDateString("es-GT", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  const fechaVence = cot.fecha_creacion && cot.validez_dias
    ? (() => {
        const d = new Date(cot.fecha_creacion);
        d.setDate(d.getDate() + parseInt(cot.validez_dias));
        return d.toLocaleDateString("es-GT", { day: "2-digit", month: "long", year: "numeric" });
      })()
    : null;

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      const { data } = await cotizacionesService.pdf(cot.id);
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url;
      a.download = `COT-${String(cot.id).padStart(4, "0")}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setPdfLoading(false); }
  };

  const abrirOTForm = () => {
    const descripcionAuto = (cot.items ?? [])
      .map((it) => `• ${it.nombre_producto}${it.descripcion ? ` — ${it.descripcion}` : ""} (x${it.cantidad})`)
      .join("\n");
    setOtForm({
      cliente:          cot.cliente,
      tipo_cliente:     "",
      tipo_trabajo:     cot.tipo ?? "",
      tecnico_asignado: "",
      descripcion:      descripcionAuto || cot.notas || "",
      estatus:          "Pendiente",
      fecha_inicio:     "",
      cotizacion:       cot.id,
    });
    setShowOTForm(true);
  };

  const handleCrearOT = async (e) => {
    e.preventDefault();
    setOtSaving(true);
    try {
      const payload = { ...otForm };
      if (!payload.fecha_inicio) delete payload.fecha_inicio;
      const { data } = await ordenesTrabajoService.create(payload);
      setOtSuccess({ id: data.id, numero: `OT-${String(data.id).padStart(4, "0")}` });
      setShowOTForm(false);
      onUpdated?.();
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error al crear OT"); }
    finally { setOtSaving(false); }
  };

  const sf = (k) => (e) => setOtForm((f) => ({ ...f, [k]: e.target.value }));

  const TIPOS_CLIENTE_OT = [
    "Empresa Privada", "Empresa Pública", "Gobierno / Institución",
    "Persona Individual", "Constructora", "Contratista", "ONG",
  ];

  return (
    <Modal title={`Cotización COT-${String(cot.id).padStart(4, "0")}`} onClose={onClose} wide>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-slate-300 text-xs font-medium uppercase tracking-widest mb-1">Cotización</p>
              <p className="text-2xl font-bold tracking-wide">
                COT-{String(cot.id).padStart(4, "0")}
              </p>
              <p className="text-slate-300 text-sm mt-1">{cot.cliente_nombre ?? "—"}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estatusBadge(cot.estatus)}`}>
                {cot.estatus || "—"}
              </span>
              <p className="text-slate-400 text-xs">{fechaCreacion}</p>
              {fechaVence && (
                <p className="text-slate-400 text-xs">Válida hasta: {fechaVence}</p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-600 grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Tipo de servicio</p>
              <p className="font-medium">{cot.tipo || "—"}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Asesor</p>
              <p className="font-medium">{cot.asesor || "—"}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Condiciones de pago</p>
              <p className="font-medium">{cot.condiciones_pago || "—"}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Tiempo de entrega</p>
              <p className="font-medium">{cot.tiempo_entrega || "—"}</p>
            </div>
          </div>
        </div>

        {/* ── Info adicional ── */}
        {(cot.lugar_entrega || cot.ot_referencia) && (
          <div className="grid grid-cols-2 gap-4">
            {cot.lugar_entrega && (
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">Lugar de entrega</p>
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{cot.lugar_entrega}</p>
              </div>
            )}
            {cot.ot_referencia && (
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">Referencia OT</p>
                <p className="text-sm font-mono font-semibold text-blue-700 dark:text-blue-400">{cot.ot_referencia}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Notas ── */}
        {cot.notas && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-600 font-medium mb-0.5">Notas / Condiciones</p>
            <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-line">{cot.notas}</p>
          </div>
        )}

        {/* ── Tabla de ítems ── */}
        <div className="border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium">Producto / Servicio</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium">U/M</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium">P. Unit.</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium">Dscto.</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium">IVA %</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium">ISR %</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium">Cant.</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {(cot.items ?? []).length === 0 ? (
                <tr><td colSpan={8} className="text-center py-6 text-gray-400 text-xs italic">Sin ítems</td></tr>
              ) : (cot.items ?? []).map((it, i) => {
                const p       = parseFloat(it.precio_unitario)      || 0;
                const descPct = parseFloat(it.descuento_porcentaje) || 0;
                const descMnt = parseFloat(it.descuento_monto)      || 0;
                const iva     = parseFloat(it.porcentaje_iva)       || 0;
                const isr     = parseFloat(it.porcentaje_isr)       || 0;
                const q       = parseInt(it.cantidad)               || 0;
                const pNeto   = Math.max(0, p * (1 - descPct / 100) - descMnt);
                const tot     = pNeto * (1 + iva / 100 + isr / 100) * q;
                const tieneDescuento = descPct > 0 || descMnt > 0;
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-gray-50 dark:bg-slate-750"}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-800 dark:text-slate-200">{it.nombre_producto}</p>
                      {it.descripcion && <p className="text-xs text-gray-400 mt-0.5 italic">{it.descripcion}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{it.unidad_medida}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700 dark:text-slate-300">{fmt(p)}</td>
                    <td className="px-3 py-2.5 text-right text-xs">
                      {tieneDescuento ? (
                        <span className="text-rose-600 font-semibold">
                          {descPct > 0 ? `${descPct}%` : fmt(descMnt)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{iva}%</td>
                    <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{isr > 0 ? `${isr}%` : "—"}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-700 dark:text-slate-300">{q}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-gray-800 dark:text-slate-200">{fmt(tot)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-slate-700 border-t-2 border-gray-200 dark:border-slate-600">
              <tr>
                <td colSpan={7} className="px-4 py-2 text-right text-xs text-gray-500">Subtotal sin impuestos</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-slate-300">{fmt(subtotal)}</td>
              </tr>
              {totalIva > 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-1.5 text-right text-xs text-gray-500">IVA</td>
                  <td className="px-3 py-1.5 text-right text-sm text-gray-600 dark:text-slate-400">{fmt(totalIva)}</td>
                </tr>
              )}
              {totalIsr > 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-1.5 text-right text-xs text-gray-500">ISR</td>
                  <td className="px-3 py-1.5 text-right text-sm text-gray-600 dark:text-slate-400">{fmt(totalIsr)}</td>
                </tr>
              )}
              <tr className="bg-slate-700 text-white">
                <td colSpan={7} className="px-4 py-3 text-right font-bold text-sm tracking-wide">TOTAL</td>
                <td className="px-3 py-3 text-right font-bold text-lg">{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Éxito creación OT ── */}
        {otSuccess && (
          <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3">
            <span className="text-green-600 text-lg">✓</span>
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                Orden de Trabajo {otSuccess.numero} creada exitosamente
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">Podés verla en el módulo de Órdenes de Trabajo.</p>
            </div>
          </div>
        )}

        {/* ── Formulario crear OT ── */}
        {showOTForm && otForm && (
          <div className="border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4 bg-blue-50/50 dark:bg-blue-900/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faClipboardList} className="text-blue-600" />
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Nueva Orden de Trabajo</p>
                <span className="text-xs text-blue-500">pre-cargada desde esta cotización</span>
              </div>
              <button type="button" onClick={() => setShowOTForm(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleCrearOT} className="grid grid-cols-2 gap-3">
              {/* Tipo de cliente */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Tipo de Cliente *</label>
                <select value={otForm.tipo_cliente} onChange={sf("tipo_cliente")} required
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar…</option>
                  {TIPOS_CLIENTE_OT.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Tipo de trabajo */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Tipo de Trabajo *</label>
                <select value={otForm.tipo_trabajo} onChange={sf("tipo_trabajo")} required
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar…</option>
                  {tiposTrabajo.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                </select>
              </div>

              {/* Técnico */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Técnico asignado</label>
                <select value={otForm.tecnico_asignado} onChange={sf("tecnico_asignado")}
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Sin asignar —</option>
                  {personal.map((p) => (
                    <option key={p.id} value={p.nombre}>{p.nombre}{p.cargo ? ` — ${p.cargo}` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Fecha inicio */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Fecha de inicio</label>
                <input type="date" value={otForm.fecha_inicio} onChange={sf("fecha_inicio")}
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Estatus */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Estatus inicial</label>
                <select value={otForm.estatus} onChange={sf("estatus")}
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {["Pendiente", "En espera", "En proceso"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Descripción del trabajo *</label>
                <textarea rows={4} value={otForm.descripcion} onChange={sf("descripcion")} required
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-xs" />
              </div>

              {/* Acciones */}
              <div className="col-span-2 flex justify-end gap-2 pt-1 border-t dark:border-slate-700">
                <button type="button" onClick={() => setShowOTForm(false)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300">
                  Cancelar
                </button>
                <button type="submit" disabled={otSaving}
                  className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60 transition-colors flex items-center gap-2">
                  <FontAwesomeIcon icon={faClipboardList} />
                  {otSaving ? "Creando…" : "Crear Orden de Trabajo"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Acciones ── */}
        <div className="flex items-center justify-between pt-2 border-t dark:border-slate-700">
          <div className="flex gap-2">
            <button onClick={handlePdf} disabled={pdfLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 disabled:opacity-60 transition-colors">
              <FontAwesomeIcon icon={faFilePdf} />
              {pdfLoading ? "Generando…" : "Descargar PDF"}
            </button>
            {!otSuccess && !showOTForm && (
              <button onClick={abrirOTForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                <FontAwesomeIcon icon={faClipboardList} />
                Crear Orden de Trabajo
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onClose(); onEdit(cot); }}
              className="px-4 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 font-medium">
              Editar
            </button>
            <button onClick={onClose}
              className="px-4 py-1.5 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CotizacionesPage() {
  const [items, setItems]           = useState([]);
  const [clientes, setClientes]     = useState([]);
  const [productos, setProductos]   = useState([]);
  const [tiposServicio, setTiposServicio] = useState([]);
  const [tiposEstatus, setTiposEstatus]   = useState([]);
  const [tiposTrabajo, setTiposTrabajo]   = useState([]);
  const [personal, setPersonal]     = useState([]);
  const [unidadesMedida, setUnidadesMedida] = useState([]);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [formItems, setFormItems]   = useState([{ ...EMPTY_ITEM }]);
  const [editing, setEditing]       = useState(null);
  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [busqueda, setBusqueda]     = useState("");
  const [sortKey, setSortKey]       = useState("id");
  const [sortDir, setSortDir]       = useState("desc");

  // Modal detalle
  const [detailCot, setDetailCot]   = useState(null);
  const [openDetail, setOpenDetail] = useState(false);

  useEffect(() => { load(); loadClientes(); loadProductos(); loadMaestros(); }, []);

  const load = async () => {
    setLoading(true);
    try { const { data } = await cotizacionesService.getAll(); setItems(data.results ?? data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadClientes = async () => {
    try { const { data } = await clientesService.getAll(); setClientes(data.results ?? data); }
    catch (e) { console.error(e); }
  };

  const loadProductos = async () => {
    try { const { data } = await inventarioService.getProductos(); setProductos(data.results ?? data); }
    catch (e) { console.error(e); }
  };

  const loadMaestros = async () => {
    try {
      const [ts, te, per, tt, um] = await Promise.all([
        tiposServicioService.getAll({ activo: true }),
        tiposEstatusService.getAll({ activo: true, modulo: "cotizaciones" }),
        personalService.getAll({ activo: true }),
        tiposTrabajoService.getAll({ activo: true }),
        unidadesMedidaService.getAll({ activo: true }),
      ]);
      setTiposServicio(ts.data.results ?? ts.data);
      setTiposEstatus(te.data.results ?? te.data);
      setPersonal(per.data.results ?? per.data);
      setTiposTrabajo(tt.data.results ?? tt.data);
      setUnidadesMedida(um.data.results ?? um.data);
    } catch (e) { console.error(e); }
  };

  // ── Filtro + orden ──────────────────────────────────────────────────────────
  const itemsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let result = q
      ? items.filter((r) =>
          r.cliente_nombre?.toLowerCase().includes(q) ||
          r.estatus?.toLowerCase().includes(q) ||
          r.tipo?.toLowerCase().includes(q) ||
          r.asesor?.toLowerCase().includes(q) ||
          `COT-${String(r.id).padStart(4, "0")}`.toLowerCase().includes(q)
        )
      : [...items];

    result.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "es");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [items, busqueda, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Ítems ───────────────────────────────────────────────────────────────────
  const addItem    = () => setFormItems((fi) => [...fi, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setFormItems((fi) => fi.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) =>
    setFormItems((fi) => fi.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const grandTotal = formItems.reduce((acc, it) => acc + calcItem(it).total, 0);
  const grandSubtotal = formItems.reduce((acc, it) => {
    const p = parseFloat(it.precio_unitario) || 0;
    const q = parseInt(it.cantidad) || 0;
    return acc + p * q;
  }, 0);
  const grandIva = formItems.reduce((acc, it) => {
    const p   = parseFloat(it.precio_unitario) || 0;
    const iva = parseFloat(it.porcentaje_iva)  || 0;
    const q   = parseInt(it.cantidad)          || 0;
    return acc + p * (iva / 100) * q;
  }, 0);

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, items: formItems };
    try {
      editing
        ? await cotizacionesService.update(editing.id, payload)
        : await cotizacionesService.create(payload);
      close(); load();
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error"); }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({
      cliente:          item.cliente,
      tipo:             item.tipo,
      estatus:          item.estatus,
      asesor:           item.asesor ?? "",
      validez_dias:     item.validez_dias ?? "30",
      condiciones_pago: item.condiciones_pago ?? "",
      tiempo_entrega:   item.tiempo_entrega ?? "",
      lugar_entrega:    item.lugar_entrega ?? "",
      ot_referencia:    item.ot_referencia ?? "",
      notas:            item.notas ?? "",
    });
    setFormItems(item.items?.length ? item.items.map((it) => ({
      nombre_producto:      it.nombre_producto,
      descripcion:          it.descripcion          ?? "",
      unidad_medida:        it.unidad_medida        ?? "unidad",
      precio_unitario:      it.precio_unitario,
      descuento_porcentaje: it.descuento_porcentaje ?? "0",
      descuento_monto:      it.descuento_monto      ?? "0",
      porcentaje_iva:       it.porcentaje_iva,
      porcentaje_isr:       it.porcentaje_isr,
      cantidad:             it.cantidad,
    })) : [{ ...EMPTY_ITEM }]);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta cotización?")) return;
    await cotizacionesService.remove(id); load();
  };

  const openDetalle = (row) => {
    setDetailCot(row);
    setOpenDetail(true);
  };

  const close = () => {
    setOpen(false); setEditing(null);
    setForm(EMPTY_FORM); setFormItems([{ ...EMPTY_ITEM }]);
  };

  const sf = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Cotizaciones</h1>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} />
          Nueva Cotización
        </button>
      </div>

      {/* Tabla principal */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, estatus, asesor…"
            className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 rounded-lg px-3 py-1.5 text-sm w-1/4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {busqueda && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {itemsFiltrados.length} resultado{itemsFiltrados.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <DataTable
          columns={COLS} data={itemsFiltrados} loading={loading}
          onEdit={handleEdit} onDelete={handleDelete}
          sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
          extra={(row) => (
            <button
              onClick={() => openDetalle(row)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              Ver
            </button>
          )}
        />
      </div>

      {/* ── Modal Detalle Cotización ── */}
      {openDetail && detailCot && (
        <DetalleCotizacion
          cot={detailCot}
          clientes={clientes}
          personal={personal}
          tiposTrabajo={tiposTrabajo}
          onClose={() => { setOpenDetail(false); setDetailCot(null); }}
          onEdit={(cot) => { handleEdit(cot); }}
          onUpdated={() => load()}
        />
      )}

      {/* ── Modal del formulario ── */}
      {open && (
        <Modal
          title={editing ? `Editar Cotización — COT-${String(editing.id).padStart(4, "0")}` : "Nueva Cotización"}
          onClose={close}
          size="xl"
        >
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── 1. Información general ── */}
            <Seccion titulo="Información general">
              <div className="grid grid-cols-3 gap-3">
                {/* Cliente — ocupa todo el ancho */}
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
                  <select value={form.cliente} onChange={sf("cliente")} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar…</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                  </select>
                </div>

                {/* Tipo de servicio */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Servicio *</label>
                  <select value={form.tipo} onChange={sf("tipo")} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar…</option>
                    {tiposServicio.map((ts) => <option key={ts.id} value={ts.nombre}>{ts.nombre}</option>)}
                  </select>
                </div>

                {/* Estatus */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estatus *</label>
                  <select value={form.estatus} onChange={sf("estatus")} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar…</option>
                    {tiposEstatus.map((te) => <option key={te.id} value={te.nombre}>{te.nombre}</option>)}
                  </select>
                </div>

                {/* Asesor */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Asesor</label>
                  <select value={form.asesor} onChange={sf("asesor")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Sin asesor —</option>
                    {personal.map((p) => (
                      <option key={p.id} value={p.nombre}>
                        {p.nombre}{p.cargo ? ` — ${p.cargo}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Seccion>

            {/* ── 2. Condiciones comerciales ── */}
            <Seccion titulo="Condiciones comerciales">
              <div className="grid grid-cols-3 gap-3">
                {/* Validez */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Validez (días)</label>
                  <input
                    type="number" min="1" value={form.validez_dias} onChange={sf("validez_dias")}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Condiciones de pago */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Condiciones de Pago</label>
                  <input
                    list="condiciones-list" value={form.condiciones_pago} onChange={sf("condiciones_pago")}
                    placeholder="Ej: Contado, Crédito 30 días…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="condiciones-list">
                    {CONDICIONES_PAGO.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                {/* Tiempo de entrega */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tiempo de Entrega</label>
                  <input
                    list="tiempos-list" value={form.tiempo_entrega} onChange={sf("tiempo_entrega")}
                    placeholder="Ej: Inmediata, 1-2 semanas…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="tiempos-list">
                    {TIEMPOS_ENTREGA.map((t) => <option key={t} value={t} />)}
                  </datalist>
                </div>

                {/* Lugar de entrega */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lugar de Entrega</label>
                  <input
                    type="text" value={form.lugar_entrega} onChange={sf("lugar_entrega")}
                    placeholder="Ej: Instalaciones del cliente, bodega…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* OT de referencia */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">OT Referencia</label>
                  <input
                    type="text" value={form.ot_referencia} onChange={sf("ot_referencia")}
                    placeholder="Nº de Orden de Trabajo relacionada"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </Seccion>

            {/* ── 3. Ítems ── */}
            <Seccion titulo="Productos / Servicios">
              <div className="space-y-0 rounded-lg border overflow-hidden">
                {/* Cabecera */}
                <div className="grid grid-cols-[2fr_100px_70px_70px_70px_70px_70px_90px_32px] gap-0 bg-gray-50 text-xs font-semibold text-gray-500 uppercase px-3 py-2 border-b">
                  <div>Producto / Servicio</div>
                  <div>Unidad</div>
                  <div className="text-right">P. Unit.</div>
                  <div className="text-right">Dscto. %</div>
                  <div className="text-right">IVA %</div>
                  <div className="text-right">ISR %</div>
                  <div className="text-right">Cant.</div>
                  <div className="text-right">Total</div>
                  <div />
                </div>

                {/* Filas */}
                {formItems.map((it, i) => {
                  const { total } = calcItem(it);
                  return (
                    <div key={i} className="border-b last:border-b-0 bg-white">
                      {/* Fila 1: nombre + unidad + números */}
                      <div className="grid grid-cols-[2fr_100px_70px_70px_70px_70px_70px_90px_32px] gap-0 px-3 py-2 items-start">
                        {/* Nombre con autocomplete */}
                        <div className="relative pr-2">
                          <input
                            value={it.nombre_producto}
                            onChange={(e) => { updateItem(i, "nombre_producto", e.target.value); setOpenDropdown(i); }}
                            onFocus={() => setOpenDropdown(i)}
                            onBlur={() => setTimeout(() => setOpenDropdown(null), 150)}
                            required placeholder="Buscar producto…"
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          {openDropdown === i && (
                            <div className="absolute z-30 left-0 right-2 top-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                              {productos
                                .filter((p) => !it.nombre_producto || p.nombre.toLowerCase().includes(it.nombre_producto.toLowerCase()))
                                .slice(0, 12)
                                .map((p) => (
                                  <button key={p.id} type="button"
                                    onMouseDown={() => {
                                      updateItem(i, "nombre_producto", p.nombre);
                                      updateItem(i, "precio_unitario", p.precio_venta ?? p.costo_unitario ?? "");
                                      if (p.marca || p.modelo) {
                                        updateItem(i, "descripcion", [p.marca, p.modelo].filter(Boolean).join(" "));
                                      }
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0 flex justify-between items-center gap-2"
                                  >
                                    <div>
                                      <div className="font-medium">{p.nombre}</div>
                                      {(p.marca || p.modelo) && (
                                        <div className="text-gray-400 text-[10px]">{[p.marca, p.modelo].filter(Boolean).join(" · ")}</div>
                                      )}
                                    </div>
                                    {p.precio_venta && (
                                      <span className="text-gray-400 shrink-0 text-[10px]">
                                        Q{parseFloat(p.precio_venta).toLocaleString("es-GT", { minimumFractionDigits: 0 })}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              {productos.filter((p) => !it.nombre_producto || p.nombre.toLowerCase().includes(it.nombre_producto.toLowerCase())).length === 0 && (
                                <div className="px-3 py-2 text-xs text-gray-400 italic">Sin resultados</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Unidad */}
                        <div className="pr-2">
                          <select value={it.unidad_medida} onChange={(e) => updateItem(i, "unidad_medida", e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                            <option value="unidad">Unidad</option>
                            {unidadesMedida.map((u) => (
                              <option key={u.id} value={u.abreviatura || u.nombre}>{u.nombre}</option>
                            ))}
                          </select>
                        </div>

                        {/* Precio unitario */}
                        <div className="pr-2">
                          <input type="number" min="0" step="0.01" value={it.precio_unitario}
                            onChange={(e) => updateItem(i, "precio_unitario", e.target.value)} required
                            placeholder="0.00"
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>

                        {/* Descuento % */}
                        <div className="pr-2">
                          <input type="number" min="0" max="100" step="0.01" value={it.descuento_porcentaje}
                            onChange={(e) => updateItem(i, "descuento_porcentaje", e.target.value)}
                            placeholder="0"
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-rose-400" />
                        </div>

                        {/* IVA */}
                        <div className="pr-2">
                          <input type="number" min="0" step="0.01" value={it.porcentaje_iva}
                            onChange={(e) => updateItem(i, "porcentaje_iva", e.target.value)} required
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>

                        {/* ISR */}
                        <div className="pr-2">
                          <input type="number" min="0" step="0.01" value={it.porcentaje_isr}
                            onChange={(e) => updateItem(i, "porcentaje_isr", e.target.value)} required
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>

                        {/* Cantidad */}
                        <div className="pr-2">
                          <input type="number" min="1" step="1" value={it.cantidad}
                            onChange={(e) => updateItem(i, "cantidad", e.target.value)} required
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-end pr-2">
                          <span className="text-sm font-semibold text-gray-800">{fmt(total)}</span>
                        </div>

                        {/* Eliminar */}
                        <div className="flex items-center justify-center">
                          {formItems.length > 1 && (
                            <button type="button" onClick={() => removeItem(i)}
                              className="text-red-400 hover:text-red-600 text-lg leading-none font-bold">✕</button>
                          )}
                        </div>
                      </div>

                      {/* Fila 2: descripción */}
                      <div className="px-3 pb-2">
                        <input
                          type="text" value={it.descripcion}
                          onChange={(e) => updateItem(i, "descripcion", e.target.value)}
                          placeholder="Descripción detallada (opcional)…"
                          className="w-full border border-gray-100 bg-gray-50 rounded px-2 py-1 text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:bg-white"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Footer con totales */}
                <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                  <button type="button" onClick={addItem}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                    + Agregar ítem
                  </button>
                  <div className="flex items-center gap-6 text-xs text-gray-500">
                    <span>Subtotal: <span className="font-medium text-gray-700">{fmt(grandSubtotal)}</span></span>
                    <span>IVA: <span className="font-medium text-gray-700">{fmt(grandIva)}</span></span>
                    <span className="text-sm font-bold text-gray-800 border-l pl-4">
                      TOTAL: {fmt(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </Seccion>

            {/* ── 4. Notas y condiciones ── */}
            <Seccion titulo="Notas y condiciones">
              <textarea
                value={form.notas} onChange={sf("notas")} rows={3}
                placeholder="Términos y condiciones, garantías, observaciones generales…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </Seccion>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
              <button type="button" onClick={close}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300">
                Cancelar
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                {editing ? "Actualizar" : "Crear Cotización"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
