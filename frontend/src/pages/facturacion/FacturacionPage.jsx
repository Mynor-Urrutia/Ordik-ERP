import { useEffect, useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faFilePdf, faTrash } from "@fortawesome/free-solid-svg-icons";
import facturacionService from "../../services/api/facturacion";
import felService from "../../services/api/fel";
import { clientesService } from "../../services/api/clientes";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  `Q${parseFloat(n || 0).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const today = () => new Date().toISOString().slice(0, 10);

const ESTATUS_BADGE = {
  borrador: "bg-amber-100 text-amber-700",
  emitida:  "bg-blue-100  text-blue-700",
  pagada:   "bg-green-100 text-green-700",
  anulada:  "bg-red-100   text-red-700",
};

const ESTATUS_LABEL = {
  borrador: "Borrador",
  emitida:  "Emitida",
  pagada:   "Pagada",
  anulada:  "Anulada",
};

const EMPTY_FORM = {
  cliente: "",
  cotizacion: "",
  orden_trabajo: "",
  fecha_emision: today(),
  fecha_vencimiento: "",
  estatus: "borrador",
  notas: "",
};

const EMPTY_ITEM = {
  nombre: "",
  descripcion: "",
  unidad_medida: "unidad",
  cantidad: "1",
  precio_unitario: "",
  descuento_porcentaje: "0",
  porcentaje_iva: "12",
  porcentaje_isr: "0",
};

function calcItem(it) {
  const p    = parseFloat(it.precio_unitario) || 0;
  const q    = parseInt(it.cantidad)          || 0;
  const dsc  = parseFloat(it.descuento_porcentaje) || 0;
  const iva  = parseFloat(it.porcentaje_iva)  || 0;
  const isr  = parseFloat(it.porcentaje_isr)  || 0;
  const neto = Math.max(0, p * (1 - dsc / 100));
  const total = neto * (1 + iva / 100 + isr / 100) * q;
  return { neto, total };
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function FacturacionPage() {
  const [facturas,  setFacturas]  = useState([]);
  const [clientes,  setClientes]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [items,     setItems]     = useState([{ ...EMPTY_ITEM }]);
  const [saving,    setSaving]    = useState(false);
  const [filtroEstatus, setFiltroEstatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [fRes, cRes] = await Promise.all([
        facturacionService.getAll(),
        clientesService.getAll({ page_size: 500 }),
      ]);
      setFacturas(fRes.data.results ?? fRes.data);
      setClientes(cRes.data.results ?? cRes.data);
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudieron cargar las facturas. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Filtrado ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return facturas.filter((f) => {
      const matchSearch =
        !q ||
        f.correlativo?.toLowerCase().includes(q) ||
        f.cliente_nombre?.toLowerCase().includes(q);
      const matchEstatus = !filtroEstatus || f.estatus === filtroEstatus;
      return matchSearch && matchEstatus;
    });
  }, [facturas, search, filtroEstatus]);

  // ── Totales sidebar ─────────────────────────────────────────────────────────
  const totalItems = useMemo(() =>
    items.reduce((acc, it) => acc + calcItem(it).total, 0)
  , [items]);

  // ── Abrir modal ─────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setItems([{ ...EMPTY_ITEM }]);
    setModalOpen(true);
  };

  const openEdit = (f) => {
    setEditing(f);
    setForm({
      cliente:          String(f.cliente),
      cotizacion:       f.cotizacion   ? String(f.cotizacion)   : "",
      orden_trabajo:    f.orden_trabajo ? String(f.orden_trabajo) : "",
      fecha_emision:    f.fecha_emision,
      fecha_vencimiento: f.fecha_vencimiento ?? "",
      estatus:          f.estatus,
      notas:            f.notas ?? "",
    });
    setItems(
      (f.items ?? []).map((it) => ({
        nombre:               it.nombre,
        descripcion:          it.descripcion ?? "",
        unidad_medida:        it.unidad_medida,
        cantidad:             String(it.cantidad),
        precio_unitario:      String(it.precio_unitario),
        descuento_porcentaje: String(it.descuento_porcentaje),
        porcentaje_iva:       String(it.porcentaje_iva),
        porcentaje_isr:       String(it.porcentaje_isr),
      }))
    );
    setModalOpen(true);
  };

  // ── Guardar ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.cliente || items.length === 0 || !form.fecha_emision) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        cliente:       parseInt(form.cliente),
        cotizacion:    form.cotizacion    ? parseInt(form.cotizacion)    : null,
        orden_trabajo: form.orden_trabajo ? parseInt(form.orden_trabajo) : null,
        fecha_vencimiento: form.fecha_vencimiento || null,
        items: items.map((it) => ({
          nombre:               it.nombre,
          descripcion:          it.descripcion,
          unidad_medida:        it.unidad_medida,
          cantidad:             parseInt(it.cantidad),
          precio_unitario:      parseFloat(it.precio_unitario),
          descuento_porcentaje: parseFloat(it.descuento_porcentaje) || 0,
          porcentaje_iva:       parseFloat(it.porcentaje_iva)  || 0,
          porcentaje_isr:       parseFloat(it.porcentaje_isr)  || 0,
        })),
      };

      if (editing) {
        await facturacionService.update(editing.id, payload);
      } else {
        await facturacionService.create(payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudo guardar la factura. Verificá los datos e intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // ── PDF ─────────────────────────────────────────────────────────────────────
  const handlePdf = async (factura) => {
    try {
      const res  = await facturacionService.pdf(factura.id);
      const url  = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href  = url;
      link.download = `${factura.correlativo}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudo generar el PDF. Intentá de nuevo.");
    }
  };

  // ── Cambiar estatus ─────────────────────────────────────────────────────────
  const handleEstatus = async (factura, nuevoEstatus) => {
    try {
      await facturacionService.patch(factura.id, { estatus: nuevoEstatus });
      load();
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudo cambiar el estatus. Intentá de nuevo.");
    }
  };

  // ── FEL ─────────────────────────────────────────────────────────────────────
  const [felLoading, setFelLoading] = useState(null);

  const handleCertificarFEL = async (factura) => {
    setFelLoading(factura.id);
    try {
      const res = await felService.certificar(factura.id);
      alert(`Factura certificada FEL\nUUID: ${res.data.uuid}\nSerie: ${res.data.serie} | No. ${res.data.numero}`);
      load();
    } catch (err) {
      alert(err.response?.data?.detail ?? JSON.stringify(err.response?.data) ?? "Error al certificar FEL");
    } finally {
      setFelLoading(null);
    }
  };

  const handleAnularFEL = async (factura) => {
    const motivo = prompt("Motivo de anulación FEL:");
    if (!motivo) return;
    setFelLoading(factura.id);
    try {
      await felService.anular(factura.id, motivo);
      load();
    } catch (err) {
      alert(err.response?.data?.detail ?? JSON.stringify(err.response?.data) ?? "Error al anular FEL");
    } finally {
      setFelLoading(null);
    }
  };

  // ── Items helpers ────────────────────────────────────────────────────────────
  const setItemField = (idx, key, val) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));

  const addItem    = () => setItems((p) => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));

  // ── Columnas ─────────────────────────────────────────────────────────────────
  const columns = [
    {
      key: "correlativo",
      label: "Correlativo",
      render: (f) => (
        <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">
          {f.correlativo}
        </span>
      ),
    },
    {
      key: "cliente_nombre",
      label: "Cliente",
      render: (f) => (
        <span className="font-medium text-slate-800 dark:text-slate-200">{f.cliente_nombre}</span>
      ),
    },
    {
      key: "fecha_emision",
      label: "Emisión",
      render: (f) => f.fecha_emision,
    },
    {
      key: "fecha_vencimiento",
      label: "Vencimiento",
      render: (f) => f.fecha_vencimiento ?? "—",
    },
    {
      key: "estatus",
      label: "Estatus",
      render: (f) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTATUS_BADGE[f.estatus]}`}>
          {ESTATUS_LABEL[f.estatus]}
        </span>
      ),
    },
    {
      key: "total",
      label: "Total",
      render: (f) => (
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">{fmt(f.total)}</span>
      ),
    },
    {
      key: "acciones",
      label: "",
      render: (f) => (
        <div className="flex gap-1.5 justify-end">
          {f.estatus === "borrador" && (
            <button
              onClick={() => handleCertificarFEL(f)}
              disabled={felLoading === f.id}
              className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {felLoading === f.id ? "..." : "Certificar FEL"}
            </button>
          )}
          {f.estatus === "emitida" && (
            <>
              <button
                onClick={() => handleEstatus(f, "pagada")}
                className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-semibold"
              >
                Marcar pagada
              </button>
              <button
                onClick={() => handleAnularFEL(f)}
                disabled={felLoading === f.id}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-semibold disabled:opacity-50"
              >
                {felLoading === f.id ? "..." : "Anular FEL"}
              </button>
            </>
          )}
          {f.estatus === "borrador" && (
            <button
              onClick={() => handleEstatus(f, "anulada")}
              className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
            >
              Anular
            </button>
          )}
          <button
            onClick={() => openEdit(f)}
            className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
          >
            Editar
          </button>
          <button
            onClick={() => handlePdf(f)}
            title="Descargar PDF"
            className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 font-semibold"
          >
            <FontAwesomeIcon icon={faFilePdf} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Facturación</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {facturas.length} factura{facturas.length !== 1 ? "s" : ""} registrada{facturas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} />
          Nueva factura
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por correlativo o cliente…"
          className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm w-72
                     bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={filtroEstatus}
          onChange={(e) => setFiltroEstatus(e.target.value)}
          className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                     bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Todos los estatus</option>
          {Object.entries(ESTATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="No hay facturas registradas." />

      {/* Modal */}
      {modalOpen && (
      <Modal
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar ${editing.correlativo}` : "Nueva Factura"}
        size="xl"
      >
        <div className="space-y-5">
          {/* Datos generales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Cliente *</label>
              <select
                value={form.cliente}
                onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                           bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Seleccioná un cliente…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.razon_social} — {c.nit}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha de emisión *</label>
              <input
                type="date"
                value={form.fecha_emision}
                onChange={(e) => setForm((f) => ({ ...f, fecha_emision: e.target.value }))}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                           bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha de vencimiento</label>
              <input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(e) => setForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                           bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Estatus</label>
              <select
                value={form.estatus}
                onChange={(e) => setForm((f) => ({ ...f, estatus: e.target.value }))}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                           bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {Object.entries(ESTATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Notas</label>
              <input
                value={form.notas}
                onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                placeholder="Observaciones opcionales…"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                           bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Ítems */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Líneas de factura</h3>
              <button
                onClick={addItem}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                + Agregar línea
              </button>
            </div>

            {/* Encabezado tabla ítems */}
            <div className="grid grid-cols-[2fr_80px_90px_70px_60px_60px_30px] gap-1 text-xs font-semibold
                            text-slate-500 dark:text-slate-400 mb-1 px-1">
              <span>Descripción</span>
              <span className="text-center">Cant.</span>
              <span className="text-right">P. Unit.</span>
              <span className="text-right">Dscto. %</span>
              <span className="text-right">IVA %</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {items.map((it, idx) => {
                const { neto, total } = calcItem(it);
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-[2fr_80px_90px_70px_60px_60px_30px] gap-1 items-center
                               bg-slate-50 dark:bg-slate-700/50 rounded-lg px-2 py-1.5"
                  >
                    <div>
                      <input
                        value={it.nombre}
                        onChange={(e) => setItemField(idx, "nombre", e.target.value)}
                        placeholder="Nombre del ítem *"
                        className="w-full border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs
                                   bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <input
                      type="number" min="1"
                      value={it.cantidad}
                      onChange={(e) => setItemField(idx, "cantidad", e.target.value)}
                      className="border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs text-center
                                 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="number" min="0" step="0.01"
                      value={it.precio_unitario}
                      onChange={(e) => setItemField(idx, "precio_unitario", e.target.value)}
                      placeholder="0.00"
                      className="border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs text-right
                                 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="number" min="0" max="100" step="0.01"
                      value={it.descuento_porcentaje}
                      onChange={(e) => setItemField(idx, "descuento_porcentaje", e.target.value)}
                      className="border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs text-right
                                 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <input
                      type="number" min="0" max="100" step="0.01"
                      value={it.porcentaje_iva}
                      onChange={(e) => setItemField(idx, "porcentaje_iva", e.target.value)}
                      className="border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs text-right
                                 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-right pr-1">
                      {fmt(total)}
                    </span>
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="mt-3 flex justify-end">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl px-5 py-2.5 text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">Total factura</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{fmt(totalItems)}</p>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg
                         text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.cliente || items.length === 0 || !form.fecha_emision}
              className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                         text-white font-semibold rounded-lg transition-colors"
            >
              {saving ? "Guardando…" : editing ? "Actualizar" : "Crear factura"}
            </button>
          </div>
        </div>
      </Modal>
      )}
    </div>
  );
}
