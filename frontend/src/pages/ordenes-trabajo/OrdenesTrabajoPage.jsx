import { useEffect, useState, useMemo, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faFilePdf, faCheckCircle,
  faUser, faPhone, faMapPin, faEnvelope, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { ordenesTrabajoService } from "../../services/api/ordenesTrabajo";
import { cotizacionesService } from "../../services/api/cotizaciones";
import { clientesService } from "../../services/api/clientes";
import { tiposClienteService, tiposTrabajoService, personalService, tiposEstatusService } from "../../services/api/maestros";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

// ── Constantes ────────────────────────────────────────────────────────────────
const PRIORIDADES = [
  { label: "Alta",  value: "Alta",  cls: "bg-red-100 text-red-700 ring-red-300" },
  { label: "Media", value: "Media", cls: "bg-amber-100 text-amber-700 ring-amber-300" },
  { label: "Baja",  value: "Baja",  cls: "bg-green-100 text-green-700 ring-green-300" },
];

const EMPTY = {
  cliente: "",
  tipo_cliente: "",
  tipo_trabajo: "",
  tecnico_asignado: "",
  descripcion: "",
  estatus: "",
  fecha_inicio: "",
  fecha_finalizado: "",
  cotizacion: "",
  prioridad: "Media",
  equipo: "",
  marca: "",
  modelo: "",
  numero_serie: "",
  ubicacion_servicio: "",
  telefono_contacto_obra: "",
  materiales_requeridos: "",
  notas_tecnico: "",
};

const EMPTY_CIERRE = {
  observaciones_cierre: "",
  horas_trabajadas: "",
  nombre_receptor: "",
  firma_obtenida: false,
  fecha_finalizado: new Date().toISOString().split("T")[0],
};

const COLS = [
  { key: "id",           label: "N°",          render: (r) => `OT-${String(r.id).padStart(4, "0")}`, sortable: true },
  { key: "cliente_nombre", label: "Cliente",    render: (r) => r.cliente_nombre ?? "—", sortable: true },
  { key: "tipo_trabajo", label: "Tipo Trabajo", sortable: true },
  {
    key: "prioridad", label: "Prioridad",
    render: (r) => {
      if (!r.prioridad) return "—";
      const cfg = { Alta: "bg-red-100 text-red-700", Media: "bg-amber-100 text-amber-700", Baja: "bg-green-100 text-green-700" };
      return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg[r.prioridad] ?? "bg-gray-100 text-gray-600"}`}>{r.prioridad}</span>;
    },
  },
  { key: "tecnico_asignado", label: "Técnico", sortable: true },
  { key: "estatus",      label: "Estatus",      sortable: true },
  {
    key: "fecha_creacion", label: "Creación", sortable: true,
    render: (r) => r.fecha_creacion ? new Date(r.fecha_creacion).toLocaleDateString("es-GT") : "—",
  },
  {
    key: "fecha_finalizado", label: "Estado",
    render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        r.fecha_finalizado ? "bg-green-100 text-green-700" :
        r.fecha_inicio ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
      }`}>
        {r.fecha_finalizado ? "Finalizado" : r.fecha_inicio ? "En curso" : "Pendiente"}
      </span>
    ),
  },
];

// ── Mapa tipo_cliente raw → display ──────────────────────────────────────────
const TIPO_DISPLAY = { publico: "Público", privado: "Privado" };

// ── ClienteAutocomplete ───────────────────────────────────────────────────────
// onSelect(cliente | null) — pasa el objeto completo para que el padre
// pueda extraer tipo_cliente, direccion_comercial, etc.
function ClienteAutocomplete({ clientes, value, onSelect }) {
  const [query,    setQuery]    = useState("");
  const [open,     setOpen]     = useState(false);
  const [selected, setSelected] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (value && clientes.length) {
      const found = clientes.find((c) => String(c.id) === String(value));
      setSelected(found ?? null);
    } else if (!value) {
      setSelected(null);
    }
  }, [value, clientes]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return clientes.slice(0, 8);
    return clientes.filter(
      (c) => c.razon_social.toLowerCase().includes(q) || c.nit.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [clientes, query]);

  const handleSelect = (c) => {
    setSelected(c); setQuery(""); setOpen(false);
    onSelect(c);
  };

  const handleClear = () => {
    setSelected(null); setQuery("");
    onSelect(null);
  };

  return (
    <div ref={ref}>
      {!selected ? (
        <div className="relative">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Escribí nombre o NIT del cliente…"
            className={inputCls}
          />
          {open && (
            <ul className="absolute z-[60] mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200
                           dark:border-slate-600 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
              {filtered.length === 0
                ? <li className="px-4 py-3 text-xs text-slate-400">Sin resultados</li>
                : filtered.map((c) => (
                  <li key={c.id} onMouseDown={() => handleSelect(c)}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{c.razon_social}</p>
                      <p className="text-xs text-slate-400">NIT: {c.nit}</p>
                    </div>
                    {c.telefono && <span className="text-xs text-slate-400 ml-2 shrink-0">{c.telefono}</span>}
                  </li>
                ))
              }
            </ul>
          )}
        </div>
      ) : (
        <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 min-w-0">
              <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{selected.razon_social}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <FontAwesomeIcon icon={faUser} className="w-3 h-3 shrink-0" /> NIT: {selected.nit}
                </span>
                {selected.telefono && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <FontAwesomeIcon icon={faPhone} className="w-3 h-3 shrink-0" /> {selected.telefono}
                  </span>
                )}
                {selected.email && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <FontAwesomeIcon icon={faEnvelope} className="w-3 h-3 shrink-0" /> {selected.email}
                  </span>
                )}
                {selected.direccion_comercial && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <FontAwesomeIcon icon={faMapPin} className="w-3 h-3 shrink-0" />
                    {[selected.direccion_comercial, selected.municipio, selected.departamento].filter(Boolean).join(", ")}
                  </span>
                )}
                {selected.nombre_contacto && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Contacto: <strong>{selected.nombre_contacto}</strong>
                    {selected.telefono_contacto ? ` · ${selected.telefono_contacto}` : ""}
                  </span>
                )}
              </div>
            </div>
            <button type="button" onClick={handleClear}
              className="text-slate-400 hover:text-red-500 transition-colors shrink-0 mt-0.5"
              title="Cambiar cliente">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ComboInput — input con dropdown filtrado, permite escritura libre ─────────
function ComboInput({ value, onChange, options = [], placeholder = "", required = false, id }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState(value || "");
  const ref = useRef(null);

  // Sincroniza si el valor cambia externamente (ej: al editar)
  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const handleChange = (e) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const handlePick = (opt) => {
    setQuery(opt);
    onChange(opt);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative" id={id}>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        className={inputCls}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-[60] mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200
                       dark:border-slate-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {filtered.map((opt) => (
            <li key={opt} onMouseDown={() => handlePick(opt)}
              className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700
                          dark:text-slate-200 ${opt === value ? "font-semibold text-blue-600 dark:text-blue-400" : "text-slate-700"}`}>
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Sección del formulario ────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ── Input helpers ─────────────────────────────────────────────────────────────
const inputCls = "w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

// ── Página principal ──────────────────────────────────────────────────────────
export default function OrdenesTrabajoPage() {
  const [items,         setItems]         = useState([]);
  const [clientes,      setClientes]      = useState([]);
  const [cotizaciones,  setCotizaciones]  = useState([]);
  const [tiposCliente,  setTiposCliente]  = useState([]);
  const [tiposTrabajo,  setTiposTrabajo]  = useState([]);
  const [personal,      setPersonal]      = useState([]);
  const [tiposEstatus,  setTiposEstatus]  = useState([]);

  const [form,    setForm]    = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [sortKey,  setSortKey]  = useState("id");
  const [sortDir,  setSortDir]  = useState("desc");

  const [cierreOt,      setCierreOt]      = useState(null);
  const [cierreForm,    setCierreForm]    = useState(EMPTY_CIERRE);
  const [cierreLoading, setCierreLoading] = useState(false);
  const [pdfLoading,    setPdfLoading]    = useState(null);

  useEffect(() => {
    load();
    const loadMaestros = async () => {
      try {
        const [cl, cot, tc, tt, per, est] = await Promise.all([
          clientesService.getAll({ page_size: 500 }),
          cotizacionesService.getAll({ page_size: 500 }),
          tiposClienteService.getAll({ activo: true }),
          tiposTrabajoService.getAll({ activo: true }),
          personalService.getAll({ activo: true }),
          tiposEstatusService.getAll({ activo: true, modulo: "ordenes_trabajo" }),
        ]);
        setClientes(cl.data.results ?? cl.data);
        setCotizaciones(cot.data.results ?? cot.data);
        setTiposCliente(tc.data.results ?? tc.data);
        setTiposTrabajo(tt.data.results ?? tt.data);
        setPersonal(per.data.results ?? per.data);
        setTiposEstatus(est.data.results ?? est.data);
      } catch (err) {
        alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudieron cargar los catálogos. Algunos campos pueden aparecer vacíos.");
      }
    };
    loadMaestros();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await ordenesTrabajoService.getAll();
      setItems(data.results ?? data);
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudieron cargar las órdenes de trabajo.");
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Cuando se selecciona un cliente: auto-rellena tipo_cliente y dirección
  const handleClienteSelect = (cliente) => {
    if (!cliente) {
      setForm((f) => ({ ...f, cliente: "" }));
      return;
    }
    setForm((f) => ({
      ...f,
      cliente: cliente.id,
      tipo_cliente: TIPO_DISPLAY[cliente.tipo_cliente] ?? f.tipo_cliente,
      ubicacion_servicio: f.ubicacion_servicio || cliente.direccion_comercial || "",
    }));
  };

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let result = q
      ? items.filter((r) =>
          r.cliente_nombre?.toLowerCase().includes(q) ||
          r.tecnico_asignado?.toLowerCase().includes(q) ||
          r.tipo_trabajo?.toLowerCase().includes(q) ||
          r.equipo?.toLowerCase().includes(q) ||
          `OT-${String(r.id).padStart(4, "0")}`.toLowerCase().includes(q)
        )
      : [...items];

    result.sort((a, b) => {
      const av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv : String(av).localeCompare(String(bv), "es");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [items, busqueda, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, cliente: form.cliente || null, cotizacion: form.cotizacion || null };
    try {
      editing
        ? await ordenesTrabajoService.update(editing.id, payload)
        : await ordenesTrabajoService.create(payload);
      close(); load();
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({
      ...EMPTY,
      ...item,
      cliente:         item.cliente        ?? "",
      cotizacion:      item.cotizacion      ?? "",
      fecha_inicio:    item.fecha_inicio    ?? "",
      fecha_finalizado: item.fecha_finalizado ?? "",
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta orden?")) return;
    try {
      await ordenesTrabajoService.remove(id);
      load();
    } catch {
      alert("No se pudo eliminar la orden. Intentá de nuevo.");
    }
  };

  const close = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  // ── Cierre formal ──────────────────────────────────────────────────────────
  const abrirCierre = (ot) => {
    setCierreOt(ot);
    setCierreForm({
      ...EMPTY_CIERRE,
      observaciones_cierre: ot.observaciones_cierre || "",
      horas_trabajadas:     ot.horas_trabajadas     || "",
      nombre_receptor:      ot.nombre_receptor       || "",
      firma_obtenida:       ot.firma_obtenida        || false,
      fecha_finalizado:     ot.fecha_finalizado      || new Date().toISOString().split("T")[0],
    });
  };

  const handleCierreSubmit = async (e) => {
    e.preventDefault();
    setCierreLoading(true);
    try {
      await ordenesTrabajoService.update(cierreOt.id, {
        ...cierreOt,
        cliente:    cierreOt.cliente    ?? null,
        cotizacion: cierreOt.cotizacion ?? null,
        ...cierreForm,
        estatus: cierreOt.estatus || "Finalizado",
      });
      setCierreOt(null);
      load();
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "Error al guardar cierre");
    } finally {
      setCierreLoading(false);
    }
  };

  // ── PDF ───────────────────────────────────────────────────────────────────
  const handleExportPdf = async (ot) => {
    setPdfLoading(ot.id);
    try {
      const { data } = await ordenesTrabajoService.exportarPdf(ot.id);
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `OT-${String(ot.id).padStart(4, "0")}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert(err.response?.data ? JSON.stringify(err.response.data) : "Error al generar PDF"); }
    finally { setPdfLoading(null); }
  };

  const columnsConAcciones = useMemo(() => [
    ...COLS,
    {
      key: "_acciones_ot",
      label: "",
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {!r.fecha_finalizado && (
            <button
              onClick={(e) => { e.stopPropagation(); abrirCierre(r); }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md border border-teal-200 transition-colors"
            >
              <FontAwesomeIcon icon={faCheckCircle} className="text-xs" /> Cerrar
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleExportPdf(r); }}
            disabled={pdfLoading === r.id}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md border border-rose-200 transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faFilePdf} className="text-xs" />
            {pdfLoading === r.id ? "…" : "PDF"}
          </button>
        </div>
      ),
    },
  ], [pdfLoading]);

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Órdenes de Trabajo</h1>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} /> Nueva OT
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, técnico, tipo, equipo…"
            className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {busqueda && <span className="text-xs text-gray-400">{itemsFiltrados.length} resultado{itemsFiltrados.length !== 1 ? "s" : ""}</span>}
        </div>
        <DataTable
          columns={columnsConAcciones} data={itemsFiltrados} loading={loading}
          onEdit={handleEdit} onDelete={handleDelete}
          sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
        />
      </div>

      {/* ── Modal nueva / editar OT ─────────────────────────────────────────── */}
      {open && (
        <Modal title={editing ? `Editar OT-${String(editing.id).padStart(4, "0")}` : "Nueva Orden de Trabajo"} onClose={close} size="xl">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Cliente ───────────────────────────────────────────────────── */}
            <Section title="Cliente">
              <ClienteAutocomplete
                clientes={clientes}
                value={form.cliente}
                onSelect={handleClienteSelect}
              />
            </Section>

            {/* ── Datos del trabajo ─────────────────────────────────────────── */}
            <Section title="Datos del trabajo">
              <div className="grid grid-cols-2 gap-3">

                {/* Tipo de cliente — viene del cliente, solo lectura */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Tipo de Cliente
                    <span className="ml-1 font-normal text-slate-400">(desde el cliente)</span>
                  </label>
                  <div className={`${inputCls} bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 cursor-default select-none`}>
                    {form.tipo_cliente || <span className="italic text-slate-300 dark:text-slate-600">Seleccioná un cliente primero</span>}
                  </div>
                </div>

                {/* Tipo de trabajo */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Tipo de Trabajo *</label>
                  <ComboInput
                    value={form.tipo_trabajo}
                    onChange={(v) => set("tipo_trabajo", v)}
                    options={tiposTrabajo.map((tt) => tt.nombre)}
                    placeholder="Escribí o elegí…"
                    required
                  />
                </div>

                {/* Técnico */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Técnico Asignado</label>
                  <ComboInput
                    value={form.tecnico_asignado}
                    onChange={(v) => set("tecnico_asignado", v)}
                    options={personal.map((p) => p.nombre)}
                    placeholder="Nombre del técnico…"
                  />
                </div>

                {/* Estatus */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Estatus</label>
                  <ComboInput
                    value={form.estatus}
                    onChange={(v) => set("estatus", v)}
                    options={tiposEstatus.map((es) => es.nombre)}
                    placeholder="Escribí o elegí…"
                  />
                </div>

                {/* Prioridad */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">Prioridad</label>
                  <div className="flex gap-2">
                    {PRIORIDADES.map((p) => (
                      <button key={p.value} type="button" onClick={() => set("prioridad", p.value)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all
                          ${form.prioridad === p.value
                            ? `${p.cls} ring-2 ring-offset-1`
                            : "bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-gray-300"
                          }`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Fecha Inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={(e) => set("fecha_inicio", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Fecha Estimada Fin</label>
                  <input type="date" value={form.fecha_finalizado} onChange={(e) => set("fecha_finalizado", e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Descripción del trabajo *</label>
                <textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)}
                  rows={3} required placeholder="Describí el trabajo a realizar, equipos involucrados, alcance…"
                  className={inputCls + " resize-none"} />
              </div>
            </Section>

            {/* ── Logística del servicio ────────────────────────────────────── */}
            <Section title="Logística del servicio">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Dirección del servicio
                    <span className="ml-1 font-normal text-slate-400">(pre-cargada desde el cliente, editable)</span>
                  </label>
                  <input
                    value={form.ubicacion_servicio}
                    onChange={(e) => set("ubicacion_servicio", e.target.value)}
                    placeholder="Dirección donde se realizará el trabajo…"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Teléfono de contacto en sitio</label>
                  <input
                    value={form.telefono_contacto_obra}
                    onChange={(e) => set("telefono_contacto_obra", e.target.value)}
                    placeholder="Para coordinar la visita"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Cotización de referencia</label>
                  <ComboInput
                    value={form.cotizacion ? `COT-${String(form.cotizacion).padStart(4, "0")} — ${cotizaciones.find((c) => String(c.id) === String(form.cotizacion))?.cliente_nombre ?? ""}` : ""}
                    onChange={(v) => {
                      const match = cotizaciones.find((c) =>
                        v.startsWith(`COT-${String(c.id).padStart(4, "0")}`)
                      );
                      set("cotizacion", match ? match.id : "");
                    }}
                    options={cotizaciones.map((c) => `COT-${String(c.id).padStart(4, "0")} — ${c.cliente_nombre}`)}
                    placeholder="Buscar cotización…"
                  />
                </div>
              </div>
            </Section>

            {/* ── Información para el técnico ───────────────────────────────── */}
            <Section title="Información para el técnico">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Materiales requeridos</label>
                <textarea
                  value={form.materiales_requeridos}
                  onChange={(e) => set("materiales_requeridos", e.target.value)}
                  rows={2}
                  placeholder="Lista de materiales, repuestos o herramientas necesarias…"
                  className={inputCls + " resize-none"}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Notas internas para el técnico
                  <span className="ml-1 text-slate-400 font-normal">(no aparecen en el PDF)</span>
                </label>
                <textarea
                  value={form.notas_tecnico}
                  onChange={(e) => set("notas_tecnico", e.target.value)}
                  rows={2}
                  placeholder="Instrucciones internas, contraseñas, accesos, advertencias…"
                  className={inputCls + " resize-none"}
                />
              </div>
            </Section>

            {/* ── Acciones ─────────────────────────────────────────────────── */}
            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
              <button
                type="button" onClick={close}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit" disabled={saving}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-semibold"
              >
                {saving ? "Guardando…" : editing ? "Actualizar OT" : "Crear OT"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal cierre formal ────────────────────────────────────────────── */}
      {cierreOt && (
        <Modal
          title={`Cierre formal — OT-${String(cierreOt.id).padStart(4, "0")}`}
          onClose={() => setCierreOt(null)}
        >
          <form onSubmit={handleCierreSubmit} className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-4 py-3 text-sm text-gray-600 dark:text-slate-300 space-y-1">
              <p><span className="font-semibold">Cliente:</span> {cierreOt.cliente_nombre || "—"}</p>
              <p><span className="font-semibold">Trabajo:</span> {cierreOt.tipo_trabajo} — {cierreOt.tipo_cliente}</p>
              {cierreOt.equipo && <p><span className="font-semibold">Equipo:</span> {cierreOt.equipo}{cierreOt.marca ? ` · ${cierreOt.marca}` : ""}{cierreOt.modelo ? ` ${cierreOt.modelo}` : ""}</p>}
              <p><span className="font-semibold">Técnico:</span> {cierreOt.tecnico_asignado || "—"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Fecha de cierre *</label>
                <input type="date" required value={cierreForm.fecha_finalizado}
                  onChange={(e) => setCierreForm((f) => ({ ...f, fecha_finalizado: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Horas trabajadas</label>
                <input type="number" step="0.5" min="0" value={cierreForm.horas_trabajadas}
                  onChange={(e) => setCierreForm((f) => ({ ...f, horas_trabajadas: e.target.value }))}
                  placeholder="Ej: 4.5" className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Informe de cierre *</label>
              <textarea required rows={4} value={cierreForm.observaciones_cierre}
                onChange={(e) => setCierreForm((f) => ({ ...f, observaciones_cierre: e.target.value }))}
                placeholder="Describí el trabajo realizado, materiales utilizados, observaciones finales…"
                className={inputCls + " resize-none"} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Nombre de quien recibe</label>
              <input value={cierreForm.nombre_receptor}
                onChange={(e) => setCierreForm((f) => ({ ...f, nombre_receptor: e.target.value }))}
                placeholder="Nombre completo del receptor"
                className={inputCls} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={cierreForm.firma_obtenida}
                onChange={(e) => setCierreForm((f) => ({ ...f, firma_obtenida: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700 dark:text-slate-300">Firma del cliente obtenida</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-700">
              <button type="button" onClick={() => setCierreOt(null)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300">
                Cancelar
              </button>
              <button type="submit" disabled={cierreLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60">
                <FontAwesomeIcon icon={faCheckCircle} />
                {cierreLoading ? "Guardando…" : "Cerrar OT"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
