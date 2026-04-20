import { useEffect, useState, useMemo, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faFilePdf, faTrash, faTimes } from "@fortawesome/free-solid-svg-icons";
import facturacionService from "../../services/api/facturacion";
import felService from "../../services/api/fel";
import { empresaService } from "../../services/api/maestros";
import { clientesService } from "../../services/api/clientes";
import { cotizacionesService } from "../../services/api/cotizaciones";
import { ordenesTrabajoService } from "../../services/api/ordenesTrabajo";
import { inventarioService } from "../../services/api/inventario";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  `Q${parseFloat(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const today = () => new Date().toISOString().slice(0, 10);

const INPUT_CLS =
  "w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm " +
  "bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400";

const ESTATUS_BADGE = {
  borrador: "bg-amber-100 text-amber-700",
  emitida:  "bg-blue-100 text-blue-700",
  pagada:   "bg-green-100 text-green-700",
  anulada:  "bg-red-100 text-red-700",
};
const ESTATUS_LABEL = { borrador: "Borrador", emitida: "Emitida", pagada: "Pagada", anulada: "Anulada" };

const EMPTY_FORM = {
  cliente: "", cotizacion: "", orden_trabajo: "",
  fecha_emision: today(), fecha_vencimiento: "",
  estatus: "borrador", notas: "",
};

const EMPTY_ITEM = {
  nombre: "", descripcion: "", unidad_medida: "unidad",
  cantidad: "1", precio_unitario: "",
  descuento_porcentaje: "0", porcentaje_iva: "12", porcentaje_isr: "0",
};

function calcItem(it) {
  const p   = parseFloat(it.precio_unitario) || 0;
  const q   = parseInt(it.cantidad)          || 0;
  const dsc = parseFloat(it.descuento_porcentaje) || 0;
  const iva = parseFloat(it.porcentaje_iva)  || 0;
  const isr = parseFloat(it.porcentaje_isr)  || 0;
  const neto  = Math.max(0, p * (1 - dsc / 100));
  const total = neto * (1 + iva / 100 + isr / 100) * q;
  return { neto, total };
}

// ── Combobox genérico ─────────────────────────────────────────────────────────
function Combobox({ value, onChange, onSelect, onClear, options, display, placeholder, size = "md" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const q = (value || "").toLowerCase();
  const matches = useMemo(() => {
    const filtered = q
      ? options.filter((o) => display(o).toLowerCase().includes(q))
      : options;
    return filtered.slice(0, 20);
  }, [q, options, display]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const szCls = size === "sm"
    ? "px-2 py-1 text-xs"
    : "px-3 py-2 text-sm";

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full border border-slate-200 dark:border-slate-600 rounded-lg ${szCls}
                      bg-white dark:bg-slate-700 text-slate-800 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-blue-400 pr-7`}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={() => { onClear(); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
          </button>
        )}
      </div>

      {open && matches.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800
                       border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl
                       max-h-52 overflow-y-auto">
          {matches.map((o, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(o); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30
                           text-slate-800 dark:text-slate-200 border-b border-slate-50 dark:border-slate-700 last:border-0"
              >
                {display(o)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, idx, productos, onField, onProducto, onRemove, canRemove }) {
  const [query, setQuery] = useState(item.nombre || "");

  const { total } = calcItem(item);

  const iCls =
    "w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs " +
    "bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400";

  return (
    <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 space-y-2 border border-slate-100 dark:border-slate-700">

      {/* Fila 1: nombre (combobox productos) + eliminar */}
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wide">
            Producto / Servicio *
          </label>
          <Combobox
            value={query}
            onChange={(v) => { setQuery(v); onField(idx, "nombre", v); }}
            onSelect={(p) => {
              const label = p.nombre;
              setQuery(label);
              onProducto(idx, p);
            }}
            onClear={() => { setQuery(""); onField(idx, "nombre", ""); }}
            options={productos}
            display={(p) => `${p.nombre} — ${p.cod_producto || ""}`}
            placeholder="Escribí para buscar un producto o ingresá libremente…"
            size="sm"
          />
        </div>
        <button
          type="button"
          onClick={() => onRemove(idx)}
          disabled={!canRemove}
          className="mt-5 text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors shrink-0"
        >
          <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fila 2: descripción */}
      <div>
        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wide">
          Descripción
        </label>
        <input
          value={item.descripcion}
          onChange={(e) => onField(idx, "descripcion", e.target.value)}
          placeholder="Detalle opcional del ítem…"
          className={iCls}
        />
      </div>

      {/* Fila 3: campos numéricos */}
      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wide">Unidad</label>
          <input
            value={item.unidad_medida}
            onChange={(e) => onField(idx, "unidad_medida", e.target.value)}
            className={iCls}
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wide">Cantidad</label>
          <input
            type="number" min="1"
            value={item.cantidad}
            onChange={(e) => onField(idx, "cantidad", e.target.value)}
            className={`${iCls} text-center`}
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wide">P. Unit.</label>
          <input
            type="number" min="0" step="0.01"
            value={item.precio_unitario}
            onChange={(e) => onField(idx, "precio_unitario", e.target.value)}
            placeholder="0.00"
            className={`${iCls} text-right`}
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wide">Dscto. %</label>
          <input
            type="number" min="0" max="100" step="0.01"
            value={item.descuento_porcentaje}
            onChange={(e) => onField(idx, "descuento_porcentaje", e.target.value)}
            className={`${iCls} text-right`}
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wide">IVA %</label>
          <input
            type="number" min="0" max="100" step="0.01"
            value={item.porcentaje_iva}
            onChange={(e) => onField(idx, "porcentaje_iva", e.target.value)}
            className={`${iCls} text-right`}
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wide">ISR %</label>
          <input
            type="number" min="0" max="100" step="0.01"
            value={item.porcentaje_isr}
            onChange={(e) => onField(idx, "porcentaje_isr", e.target.value)}
            className={`${iCls} text-right`}
          />
        </div>
        <div className="flex flex-col justify-end">
          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wide">Total</label>
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 text-right py-1.5">
            {fmt(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function FacturacionPage() {
  const [facturas,  setFacturas]  = useState([]);
  const [clientes,  setClientes]  = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [ordenes,   setOrdenes]   = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [items,     setItems]     = useState([{ ...EMPTY_ITEM }]);
  const [saving,    setSaving]    = useState(false);
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [felActivo,     setFelActivo]     = useState(false);
  const tipoDoc = felActivo ? "Factura" : "Recibo";

  // Labels para los combobox de cabecera
  const [clienteLabel,    setClienteLabel]    = useState("");
  const [cotizacionLabel, setCotizacionLabel] = useState("");
  const [otLabel,         setOtLabel]         = useState("");

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const [fRes, cRes, cotRes, otRes, prodRes] = await Promise.all([
        facturacionService.getAll(),
        clientesService.getAll(),
        cotizacionesService.getAll(),
        ordenesTrabajoService.getAll(),
        inventarioService.getProductos(),
      ]);
      setFacturas(fRes.data.results   ?? fRes.data);
      setClientes(cRes.data.results   ?? cRes.data);
      setCotizaciones(cotRes.data.results ?? cotRes.data);
      setOrdenes(otRes.data.results   ?? otRes.data);
      setProductos(prodRes.data.results ?? prodRes.data);
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const loadEmpresa = async () => {
      try {
        const { data } = await empresaService.get();
        setFelActivo(Boolean(data.fel_habilitado && data.fel_api_key));
      } catch (err) {
        setFelActivo(false);
        if (err.response?.status && err.response.status !== 401) {
          alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudo verificar la configuración FEL.");
        }
      }
    };
    loadEmpresa();
  }, []);

  // ── Filtrado lista ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return facturas.filter((f) => {
      const matchSearch = !q || f.correlativo?.toLowerCase().includes(q) || f.cliente_nombre?.toLowerCase().includes(q);
      const matchEstatus = !filtroEstatus || f.estatus === filtroEstatus;
      return matchSearch && matchEstatus;
    });
  }, [facturas, search, filtroEstatus]);

  const totalFactura = useMemo(() => items.reduce((acc, it) => acc + calcItem(it).total, 0), [items]);

  // Cotizaciones y OTs filtradas por cliente seleccionado
  const cotizacionesFiltradas = useMemo(() => {
    if (!form.cliente) return cotizaciones;
    return cotizaciones.filter((c) => String(c.cliente) === String(form.cliente));
  }, [cotizaciones, form.cliente]);

  const ordenesFiltradas = useMemo(() => {
    if (!form.cliente) return ordenes;
    return ordenes.filter((o) => o.cliente && String(o.cliente) === String(form.cliente));
  }, [ordenes, form.cliente]);

  // ── Abrir modal ────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setItems([{ ...EMPTY_ITEM }]);
    setClienteLabel("");
    setCotizacionLabel("");
    setOtLabel("");
    setModalOpen(true);
  };

  const openEdit = (f) => {
    setEditing(f);
    setForm({
      cliente:           String(f.cliente),
      cotizacion:        f.cotizacion    ? String(f.cotizacion)    : "",
      orden_trabajo:     f.orden_trabajo ? String(f.orden_trabajo) : "",
      fecha_emision:     f.fecha_emision,
      fecha_vencimiento: f.fecha_vencimiento ?? "",
      estatus:           f.estatus,
      notas:             f.notas ?? "",
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
    // Labels
    const cl = clientes.find((c) => c.id === f.cliente);
    setClienteLabel(cl ? `${cl.razon_social} — ${cl.nit}` : "");
    const cot = cotizaciones.find((c) => c.id === f.cotizacion);
    setCotizacionLabel(cot ? `COT-${String(cot.id).padStart(5, "0")} — ${cot.cliente_nombre}` : "");
    const ot = ordenes.find((o) => o.id === f.orden_trabajo);
    setOtLabel(ot ? `OT-${String(ot.id).padStart(4, "0")} — ${ot.tipo_trabajo}` : "");
    setModalOpen(true);
  };

  // ── Items helpers ──────────────────────────────────────────────────────────
  const setItemField = (idx, key, val) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));

  const handleProductoSelect = (idx, producto) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              nombre:          producto.nombre,
              precio_unitario: String(producto.costo_unitario || ""),
              unidad_medida:   producto.unidad_medida || "unidad",
            }
          : it
      )
    );
  };

  const addItem    = () => setItems((p) => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.cliente || items.length === 0 || !form.fecha_emision) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        cliente:           parseInt(form.cliente),
        cotizacion:        form.cotizacion    ? parseInt(form.cotizacion)    : null,
        orden_trabajo:     form.orden_trabajo ? parseInt(form.orden_trabajo) : null,
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
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudo guardar la factura.");
    } finally {
      setSaving(false);
    }
  };

  // ── PDF ────────────────────────────────────────────────────────────────────
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
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudo generar el PDF.");
    }
  };

  // ── Estatus ────────────────────────────────────────────────────────────────
  const handleEstatus = async (factura, nuevoEstatus) => {
    try {
      await facturacionService.patch(factura.id, { estatus: nuevoEstatus });
      load();
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudo cambiar el estatus.");
    }
  };

  // ── FEL ────────────────────────────────────────────────────────────────────
  const [felLoading, setFelLoading] = useState(null);

  const handleCertificarFEL = async (factura) => {
    setFelLoading(factura.id);
    try {
      const res = await felService.certificar(factura.id);
      alert(`Factura certificada FEL\nUUID: ${res.data.uuid}\nSerie: ${res.data.serie} | No. ${res.data.numero}`);
      load();
    } catch (err) {
      alert(err.response?.data?.detail ?? "Error al certificar FEL");
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
      alert(err.response?.data?.detail ?? "Error al anular FEL");
    } finally {
      setFelLoading(null);
    }
  };

  // ── Columnas ───────────────────────────────────────────────────────────────
  const columns = [
    {
      key: "correlativo",
      label: "Correlativo",
      render: (f) => (
        <span className="font-mono font-semibold text-blue-700 dark:text-blue-400">{f.correlativo}</span>
      ),
    },
    {
      key: "cliente_nombre",
      label: "Cliente",
      render: (f) => <span className="font-medium text-slate-800 dark:text-slate-200">{f.cliente_nombre}</span>,
    },
    { key: "fecha_emision",    label: "Emisión",     render: (f) => f.fecha_emision },
    { key: "fecha_vencimiento",label: "Vencimiento", render: (f) => f.fecha_vencimiento ?? "—" },
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
      render: (f) => <span className="font-semibold text-emerald-700 dark:text-emerald-400">{fmt(f.total)}</span>,
    },
    {
      key: "acciones",
      label: "",
      render: (f) => {
        const bloqueada = f.estatus !== "borrador";
        return (
          <div className="flex gap-1.5 justify-end flex-wrap">
            {/* Borrador: botón principal de emisión */}
            {f.estatus === "borrador" && (
              felActivo ? (
                <button
                  onClick={() => handleCertificarFEL(f)}
                  disabled={felLoading === f.id}
                  className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-50"
                >
                  {felLoading === f.id ? "…" : "Emitir (FEL)"}
                </button>
              ) : (
                <button
                  onClick={() => handleEstatus(f, "emitida")}
                  className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
                >
                  Emitir recibo
                </button>
              )
            )}
            {/* Emitida: anular */}
            {f.estatus === "emitida" && felActivo && (
              <button
                onClick={() => handleAnularFEL(f)}
                disabled={felLoading === f.id}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-semibold disabled:opacity-50"
              >
                {felLoading === f.id ? "…" : "Anular FEL"}
              </button>
            )}
            {/* Borrador: anular */}
            {f.estatus === "borrador" && (
              <button
                onClick={() => handleEstatus(f, "anulada")}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
              >
                Anular
              </button>
            )}
            {/* Editar: solo borradores */}
            {!bloqueada && (
              <button
                onClick={() => openEdit(f)}
                className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
              >
                Editar
              </button>
            )}
            {/* PDF: siempre disponible */}
            <button
              onClick={() => handlePdf(f)}
              className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 font-semibold"
            >
              <FontAwesomeIcon icon={faFilePdf} />
            </button>
          </div>
        );
      },
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Facturación</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {facturas.length} {tipoDoc.toLowerCase()}{facturas.length !== 1 ? "s" : ""} registrada{facturas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} /> Nuevo borrador
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
          {Object.entries(ESTATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="No hay facturas registradas." />

      {/* Modal */}
      {modalOpen && (
        <Modal
          onClose={() => setModalOpen(false)}
          title={editing ? `Editar borrador — ${editing.correlativo}` : `Nuevo borrador de ${tipoDoc}`}
          size="xl"
        >
          <div className="space-y-5">

            {/* ── Sección: Datos generales ─────────────────────────────── */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Datos generales
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Cliente */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Cliente *</label>
                  <Combobox
                    value={clienteLabel}
                    onChange={(v) => {
                      setClienteLabel(v);
                      if (!v) {
                        setForm((f) => ({ ...f, cliente: "", cotizacion: "", orden_trabajo: "" }));
                        setCotizacionLabel("");
                        setOtLabel("");
                      }
                    }}
                    onSelect={(c) => {
                      setForm((f) => ({ ...f, cliente: String(c.id), cotizacion: "", orden_trabajo: "" }));
                      setClienteLabel(`${c.razon_social} — ${c.nit}`);
                      setCotizacionLabel("");
                      setOtLabel("");
                    }}
                    onClear={() => {
                      setForm((f) => ({ ...f, cliente: "", cotizacion: "", orden_trabajo: "" }));
                      setClienteLabel("");
                      setCotizacionLabel("");
                      setOtLabel("");
                    }}
                    options={clientes}
                    display={(c) => `${c.razon_social} — ${c.nit}`}
                    placeholder="Escribí para buscar un cliente…"
                  />
                </div>

                {/* Fecha emisión */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha de emisión *</label>
                  <input
                    type="date"
                    value={form.fecha_emision}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_emision: e.target.value }))}
                    className={INPUT_CLS}
                  />
                </div>

                {/* Fecha vencimiento */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Fecha de vencimiento
                    <span className="ml-1 text-slate-400 font-normal">(requerida para crear CxC)</span>
                  </label>
                  <input
                    type="date"
                    value={form.fecha_vencimiento}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
                    className={INPUT_CLS}
                  />
                </div>

                {/* Estatus */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Estatus</label>
                  <select
                    value={form.estatus}
                    onChange={(e) => setForm((f) => ({ ...f, estatus: e.target.value }))}
                    className={INPUT_CLS}
                  >
                    {Object.entries(ESTATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Notas</label>
                  <textarea
                    value={form.notas}
                    onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                    placeholder="Observaciones opcionales…"
                    rows={2}
                    className={`${INPUT_CLS} resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* ── Sección: Referencias opcionales ─────────────────────── */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Referencias opcionales
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Cotización */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Cotización relacionada</label>
                  <Combobox
                    value={cotizacionLabel}
                    onChange={(v) => {
                      setCotizacionLabel(v);
                      if (!v) setForm((f) => ({ ...f, cotizacion: "" }));
                    }}
                    onSelect={(c) => {
                      setForm((f) => ({ ...f, cotizacion: String(c.id) }));
                      setCotizacionLabel(`COT-${String(c.id).padStart(5, "0")} — ${c.cliente_nombre}`);
                    }}
                    onClear={() => {
                      setForm((f) => ({ ...f, cotizacion: "" }));
                      setCotizacionLabel("");
                    }}
                    options={cotizacionesFiltradas}
                    display={(c) => `COT-${String(c.id).padStart(5, "0")} — ${c.cliente_nombre} (${c.estatus})`}
                    placeholder={form.cliente ? "Buscar cotización del cliente…" : "Seleccioná un cliente primero…"}
                  />
                </div>

                {/* Orden de trabajo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Orden de trabajo relacionada</label>
                  <Combobox
                    value={otLabel}
                    onChange={(v) => {
                      setOtLabel(v);
                      if (!v) setForm((f) => ({ ...f, orden_trabajo: "" }));
                    }}
                    onSelect={(o) => {
                      setForm((f) => ({ ...f, orden_trabajo: String(o.id) }));
                      setOtLabel(`OT-${String(o.id).padStart(4, "0")} — ${o.tipo_trabajo}`);
                    }}
                    onClear={() => {
                      setForm((f) => ({ ...f, orden_trabajo: "" }));
                      setOtLabel("");
                    }}
                    options={ordenesFiltradas}
                    display={(o) => `OT-${String(o.id).padStart(4, "0")} — ${o.tipo_trabajo} (${o.estatus || "—"})`}
                    placeholder={form.cliente ? "Buscar orden de trabajo…" : "Seleccioná un cliente primero…"}
                  />
                </div>
              </div>
            </div>

            {/* ── Sección: Ítems ───────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Líneas de factura
                </h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-1"
                >
                  <FontAwesomeIcon icon={faPlus} className="w-3 h-3" /> Agregar línea
                </button>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {items.map((it, idx) => (
                  <ItemCard
                    key={idx}
                    item={it}
                    idx={idx}
                    productos={productos}
                    onField={setItemField}
                    onProducto={handleProductoSelect}
                    onRemove={removeItem}
                    canRemove={items.length > 1}
                  />
                ))}
              </div>

              {/* Total */}
              <div className="mt-3 flex justify-end">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl px-5 py-2.5 text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total factura</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{fmt(totalFactura)}</p>
                </div>
              </div>
            </div>

            {/* ── Acciones ────────────────────────────────────────────── */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
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
                {saving ? "Guardando…" : editing ? "Guardar borrador" : `Crear borrador de ${tipoDoc}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
