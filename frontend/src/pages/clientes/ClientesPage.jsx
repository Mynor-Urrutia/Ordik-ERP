import { useEffect, useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faAddressCard } from "@fortawesome/free-solid-svg-icons";
import { clientesService } from "../../services/api/clientes";
import { ordenesTrabajoService } from "../../services/api/ordenesTrabajo";
import { cotizacionesService } from "../../services/api/cotizaciones";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  `Q${parseFloat(n || 0).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("es-GT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const iniciales = (nombre) =>
  (nombre ?? "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase() || "?";

const padId = (id, prefix, n = 4) =>
  `${prefix}-${String(id).padStart(n, "0")}`;

const OT_BADGE = {
  Finalizado: "bg-green-100 text-green-700",
  "En proceso": "bg-blue-100 text-blue-700",
  Cancelado: "bg-red-100 text-red-700",
  Pendiente: "bg-amber-100 text-amber-700",
};
const COT_BADGE = {
  Borrador: "bg-gray-100 text-gray-500",
  Enviada: "bg-blue-100 text-blue-700",
  Aprobada: "bg-green-100 text-green-700",
  Rechazada: "bg-red-100 text-red-700",
  Cerrada: "bg-purple-100 text-purple-700",
};
const badge = (map, key) =>
  map[key] ?? "bg-gray-100 text-gray-600";

// ── Formulario ────────────────────────────────────────────────────────────────
const EMPTY = {
  razon_social: "", nit: "", nombre_comercial: "", tipo_cliente: "privado",
  sector: "", sitio_web: "",
  direccion_comercial: "", municipio: "", departamento: "", pais: "Guatemala",
  telefono: "", telefono_secundario: "", email: "",
  nombre_contacto: "", telefono_contacto: "", email_contacto: "",
  limite_credito: "0", dias_credito: "0",
  notas: "",
};

const DEPARTAMENTOS_GT = [
  "Alta Verapaz","Baja Verapaz","Chimaltenango","Chiquimula","El Progreso",
  "Escuintla","Guatemala","Huehuetenango","Izabal","Jalapa","Jutiapa","Petén",
  "Quetzaltenango","Quiché","Retalhuleu","Sacatepéquez","San Marcos","Santa Rosa",
  "Sololá","Suchitepéquez","Totonicapán","Zacapa",
];

const SECTORES = [
  "Agropecuario", "Comercio al por mayor", "Comercio al por menor",
  "Construcción", "Educación", "Energía", "Financiero / Bancario",
  "Gobierno / Sector público", "Manufactura / Industria", "ONG / Sin fines de lucro",
  "Salud", "Servicios profesionales", "Tecnología",
  "Telecomunicaciones", "Transporte y logística", "Turismo y hostelería",
];

const COLS = [
  { key: "razon_social",    label: "Razón Social",    sortable: true },
  { key: "nit",             label: "NIT",             sortable: true },
  { key: "nombre_comercial",label: "Nombre Comercial",sortable: true },
  { key: "telefono",        label: "Teléfono" },
  {
    key: "sector",
    label: "Sector",
    render: (r) => r.sector
      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{r.sector}</span>
      : <span className="text-gray-300 text-xs">—</span>,
  },
  {
    key: "tipo_cliente",
    label: "Tipo",
    render: (r) => r.tipo_cliente
      ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          r.tipo_cliente === "publico" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
        }`}>
          {r.tipo_cliente === "publico" ? "Público" : "Privado"}
        </span>
      : <span className="text-gray-300 text-xs">—</span>,
  },
];

// ── Helpers de formulario ─────────────────────────────────────────────────────
function CField({ label, children, span = 1 }) {
  const cls = span === 2 ? "col-span-2" : span === 3 ? "col-span-3" : "";
  return (
    <div className={cls}>
      <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function CInp({ label, name, form, setForm, type = "text", placeholder = "", span, required = false }) {
  return (
    <CField label={label} span={span}>
      <input
        type={type}
        value={form[name] ?? ""}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </CField>
  );
}

function CSel({ label, name, form, setForm, options, placeholder = "— Seleccionar —", span }) {
  return (
    <CField label={label} span={span}>
      <select
        value={form[name] ?? ""}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
    </CField>
  );
}

function CSection({ title, children }) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-5">
      <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">{title}</h3>
      <div className="grid grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent = "blue" }) {
  const colors = {
    blue:   "from-blue-50 to-blue-100 border-blue-200 text-blue-700",
    green:  "from-green-50 to-green-100 border-green-200 text-green-700",
    amber:  "from-amber-50 to-amber-100 border-amber-200 text-amber-700",
    indigo: "from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700",
    rose:   "from-rose-50 to-rose-100 border-rose-200 text-rose-700",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[accent]} border rounded-lg p-3 flex flex-col gap-0.5`}>
      <p className="text-[10px] font-semibold opacity-70 uppercase tracking-wide leading-none">{label}</p>
      <p className="text-lg font-bold leading-tight">{value}</p>
      {sub && <p className="text-[10px] opacity-60 leading-snug">{sub}</p>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ClientesPage() {
  // Lista
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // CRUD
  const [form, setForm]       = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [open, setOpen]       = useState(false);

  // Perfil
  const [perfil, setPerfil]             = useState(null);
  const [perfilOTs, setPerfilOTs]       = useState([]);
  const [perfilCots, setPerfilCots]     = useState([]);
  const [perfilTab, setPerfilTab]       = useState("ots");
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [openPerfil, setOpenPerfil]     = useState(false);
  const [selectedOT, setSelectedOT]     = useState(null);
  const [selectedCot, setSelectedCot]   = useState(null);

  const switchPerfilTab = (tab) => {
    setPerfilTab(tab);
    setSelectedOT(null);
    setSelectedCot(null);
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await clientesService.getAll();
      setItems(data.results ?? data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Perfil: carga OTs y Cotizaciones en paralelo ──────────────────────────
  const openPerfilModal = async (cliente) => {
    setPerfil(cliente);
    setPerfilTab("ots");
    setPerfilOTs([]);
    setPerfilCots([]);
    setSelectedOT(null);
    setSelectedCot(null);
    setOpenPerfil(true);
    setPerfilLoading(true);
    try {
      const [ots, cots] = await Promise.all([
        ordenesTrabajoService.getByCliente(cliente.id),
        cotizacionesService.getByCliente(cliente.id),
      ]);
      setPerfilOTs(ots.data.results ?? ots.data);
      setPerfilCots(cots.data.results ?? cots.data);
    } catch (e) { console.error(e); }
    finally { setPerfilLoading(false); }
  };

  // ── Métricas derivadas ────────────────────────────────────────────────────
  const totalCotizado = useMemo(
    () => perfilCots.reduce((s, c) => s + parseFloat(c.total || 0), 0),
    [perfilCots]
  );
  const totalAprobado = useMemo(
    () => perfilCots
      .filter((c) => c.estatus === "Aprobada" || c.estatus === "Cerrada")
      .reduce((s, c) => s + parseFloat(c.total || 0), 0),
    [perfilCots]
  );
  const otsActivas = useMemo(
    () => perfilOTs.filter((o) => !["Finalizado", "Cancelado"].includes(o.estatus)).length,
    [perfilOTs]
  );
  const tasaAprobacion = perfilCots.length > 0
    ? Math.round(
        (perfilCots.filter((c) => c.estatus === "Aprobada" || c.estatus === "Cerrada").length /
          perfilCots.length) * 100
      )
    : null;
  const ticketPromedio = perfilCots.length > 0 ? totalCotizado / perfilCots.length : null;

// ── CRUD ──────────────────────────────────────────────────────────────────
  const itemsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (r) =>
        r.razon_social?.toLowerCase().includes(q) ||
        r.nit?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.nombre_comercial?.toLowerCase().includes(q) ||
        r.telefono?.toLowerCase().includes(q)
    );
  }, [items, busqueda]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      editing
        ? await clientesService.update(editing.id, form)
        : await clientesService.create(form);
      close();
      load();
    } catch (e) {
      alert(e.response?.data ? JSON.stringify(e.response.data) : "Error");
    }
  };

  const handleEdit = (item) => { setEditing(item); setForm({ ...EMPTY, ...item }); setOpen(true); };
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    await clientesService.remove(id);
    load();
  };
  const close = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Clientes</h1>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} />
          Nuevo Cliente
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por razón social, NIT, email…"
            className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 rounded-lg px-3 py-1.5 text-sm w-1/4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {busqueda && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {itemsFiltrados.length} resultado{itemsFiltrados.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <DataTable
          columns={COLS}
          data={itemsFiltrados}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          extra={(row) => (
            <button
              onClick={() => openPerfilModal(row)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <FontAwesomeIcon icon={faAddressCard} />
              Ver perfil
            </button>
          )}
        />
      </div>

      {/* ── Modal: CRUD ── */}
      {open && (
        <Modal title={editing ? "Editar Cliente" : "Nuevo Cliente"} onClose={close} wide>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Identidad */}
            <CSection title="Identidad Comercial">
              <CInp label="Razón Social *" name="razon_social" form={form} setForm={setForm}
                placeholder="Nombre legal completo" required span={2} />
              <CInp label="NIT *" name="nit" form={form} setForm={setForm}
                placeholder="Ej: 1234567-8" required />
              <CInp label="Nombre Comercial" name="nombre_comercial" form={form} setForm={setForm}
                placeholder="Marca o nombre de fantasía" span={2} />
              <CSel label="Tipo de Cliente" name="tipo_cliente" form={form} setForm={setForm}
                options={[{ value: "privado", label: "Privado" }, { value: "publico", label: "Público" }]}
                placeholder="— Seleccionar —" />
              <CSel label="Sector / Industria" name="sector" form={form} setForm={setForm}
                options={SECTORES} span={2} />
              <CInp label="Sitio Web" name="sitio_web" form={form} setForm={setForm}
                type="url" placeholder="https://cliente.com" />
            </CSection>

            {/* Dirección */}
            <CSection title="Dirección">
              <CField label="Dirección Comercial" span={3}>
                <textarea
                  value={form.direccion_comercial ?? ""}
                  onChange={(e) => setForm({ ...form, direccion_comercial: e.target.value })}
                  rows={2}
                  placeholder="Calle, número, zona, colonia…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </CField>
              <CInp label="Municipio" name="municipio" form={form} setForm={setForm} />
              <CSel label="Departamento" name="departamento" form={form} setForm={setForm}
                options={DEPARTAMENTOS_GT} />
              <CInp label="País" name="pais" form={form} setForm={setForm} />
            </CSection>

            {/* Contacto corporativo */}
            <CSection title="Contacto Corporativo">
              <CInp label="Teléfono" name="telefono" form={form} setForm={setForm}
                placeholder="+502 2234-5678" />
              <CInp label="Teléfono Secundario" name="telefono_secundario" form={form} setForm={setForm}
                placeholder="+502 5555-1234" />
              <CInp label="Email" name="email" form={form} setForm={setForm}
                type="email" placeholder="info@cliente.com" />
            </CSection>

            {/* Persona de contacto */}
            <CSection title="Persona de Contacto">
              <CInp label="Nombre" name="nombre_contacto" form={form} setForm={setForm}
                placeholder="Nombre completo" />
              <CInp label="Teléfono" name="telefono_contacto" form={form} setForm={setForm}
                placeholder="+502 5555-1234" />
              <CInp label="Email" name="email_contacto" form={form} setForm={setForm}
                type="email" placeholder="contacto@cliente.com" />
            </CSection>

            {/* Condiciones comerciales */}
            <CSection title="Condiciones Comerciales">
              <CField label="Límite de Crédito (Q)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">Q</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.limite_credito ?? "0"}
                    onChange={(e) => setForm({ ...form, limite_credito: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </CField>
              <CField label="Días de Crédito">
                <div className="relative">
                  <input
                    type="number" min="0"
                    value={form.dias_credito ?? "0"}
                    onChange={(e) => setForm({ ...form, dias_credito: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">días</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">0 = pago inmediato</p>
              </CField>
            </CSection>

            {/* Notas */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Notas</h3>
              <textarea
                value={form.notas ?? ""}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={3}
                placeholder="Observaciones generales sobre el cliente…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-1 border-t dark:border-slate-700">
              <button type="button" onClick={close}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300">
                Cancelar
              </button>
              <button type="submit"
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                {editing ? "Actualizar Cliente" : "Crear Cliente"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Perfil de cliente ── */}
      {openPerfil && perfil && (
        <Modal title="Perfil de Cliente" onClose={() => setOpenPerfil(false)} wide>
          <div className="space-y-6">

            {/* ── Identidad ── */}
            <div className="flex items-start gap-5 pb-5 border-b border-gray-100">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md">
                {iniciales(perfil.razon_social)}
              </div>
              {/* Datos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                      {perfil.razon_social}
                    </h2>
                    {perfil.nombre_comercial && (
                      <p className="text-sm text-gray-500 mt-0.5">{perfil.nombre_comercial}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 mt-1 ${
                    perfil.tipo_cliente === "publico"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {perfil.tipo_cliente === "publico" ? "Cliente Público" : "Cliente Privado"}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="font-mono font-semibold text-gray-600">NIT: {perfil.nit}</span>
                  <span>•</span>
                  <span>Cliente desde {fmtDate(perfil.fecha_creacion)}</span>
                </div>
              </div>
            </div>

            {/* ── Datos de contacto ── */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Datos de Contacto
              </h3>
              <div className="grid grid-cols-4 gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Email corporativo</p>
                  <p className="text-sm text-gray-700 font-medium">{perfil.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Teléfono</p>
                  <p className="text-sm text-gray-700 font-medium">{perfil.telefono || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Nombre contacto</p>
                  <p className="text-sm text-gray-700 font-medium">{perfil.nombre_contacto || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Tel. contacto</p>
                  <p className="text-sm text-gray-700 font-medium">{perfil.telefono_contacto || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Dirección comercial</p>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">{perfil.direccion_comercial || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Email contacto</p>
                  <p className="text-sm text-gray-700 font-medium">{perfil.email_contacto || "—"}</p>
                </div>
              </div>
            </div>

            {/* ── KPIs ── */}
            {perfilLoading ? (
              <div className="text-center py-6 text-sm text-gray-400">Cargando datos…</div>
            ) : (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Resumen operativo
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    <KpiCard
                      label="Total cotizado"
                      value={fmt(totalCotizado)}
                      sub={`${perfilCots.length} cotizacion${perfilCots.length !== 1 ? "es" : ""}`}
                      accent="indigo"
                    />
                    <KpiCard
                      label="Total aprobado"
                      value={fmt(totalAprobado)}
                      sub={tasaAprobacion !== null ? `${tasaAprobacion}% tasa aprobación` : "Sin datos"}
                      accent="green"
                    />
                    <KpiCard
                      label="OTs totales"
                      value={perfilOTs.length}
                      sub={`${perfilOTs.filter(o => o.estatus === "Finalizado").length} finalizadas`}
                      accent="blue"
                    />
                    <KpiCard
                      label="OTs activas"
                      value={otsActivas}
                      sub={otsActivas > 0 ? "En curso actualmente" : "Sin OTs en curso"}
                      accent={otsActivas > 0 ? "amber" : "blue"}
                    />
                  </div>
                </div>

                {/* ── Métricas secundarias ── */}
                <div className="grid grid-cols-3 gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ticket promedio</p>
                    <p className="text-lg font-bold text-gray-800">
                      {ticketPromedio !== null ? fmt(ticketPromedio) : "—"}
                    </p>
                  </div>
                  <div className="text-center border-x border-gray-200">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Última actividad</p>
                    <p className="text-lg font-bold text-gray-800">
                      {(() => {
                        const fechas = [
                          ...perfilOTs.map(o => o.fecha_creacion),
                          ...perfilCots.map(c => c.fecha_creacion),
                        ].filter(Boolean).sort((a, b) => new Date(b) - new Date(a));
                        return fechas.length > 0 ? fmtDate(fechas[0]) : "—";
                      })()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Items cotizados</p>
                    <p className="text-lg font-bold text-gray-800">
                      {perfilCots.reduce((s, c) => s + (c.items?.length ?? 0), 0)}
                    </p>
                  </div>
                </div>

{/* ── Tabs OTs / Cotizaciones ── */}
                <div>
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
                    {[
                      { key: "ots",  label: "Órdenes de Trabajo", count: perfilOTs.length },
                      { key: "cots", label: "Cotizaciones",       count: perfilCots.length },
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => switchPerfilTab(key)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                          perfilTab === key
                            ? "bg-white text-gray-800 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                          perfilTab === key
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-200 text-gray-500"
                        }`}>{count}</span>
                      </button>
                    ))}
                  </div>

                  {/* OTs: lista o detalle */}
                  {perfilTab === "ots" && (
                    selectedOT ? (
                      /* ── Detalle OT ── */
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={() => setSelectedOT(null)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          ← Volver a la lista
                        </button>

                        {/* Encabezado */}
                        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
                          <div>
                            <p className="font-mono font-bold text-blue-700 text-xl">{padId(selectedOT.id, "OT")}</p>
                            <p className="text-gray-600 text-sm mt-0.5">{selectedOT.tipo_trabajo || "—"}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${badge(OT_BADGE, selectedOT.estatus)}`}>
                            {selectedOT.estatus || "—"}
                          </span>
                        </div>

                        {/* Campos */}
                        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Técnico asignado</p>
                            <p className="text-sm font-medium text-gray-700">{selectedOT.tecnico_asignado || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Tipo de cliente</p>
                            <p className="text-sm font-medium text-gray-700">{selectedOT.tipo_cliente || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Cotización vinculada</p>
                            <p className="text-sm font-mono font-semibold text-indigo-600">
                              {selectedOT.cotizacion ? padId(selectedOT.cotizacion, "COT") : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Fecha de creación</p>
                            <p className="text-sm font-medium text-gray-700">{fmtDate(selectedOT.fecha_creacion)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Fecha de inicio</p>
                            <p className="text-sm font-medium text-gray-700">{fmtDate(selectedOT.fecha_inicio)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Fecha de finalización</p>
                            <p className="text-sm font-medium text-gray-700">{fmtDate(selectedOT.fecha_finalizado)}</p>
                          </div>
                        </div>

                        {/* Descripción */}
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Descripción del trabajo</p>
                          <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 text-sm text-gray-700 leading-relaxed min-h-[60px]">
                              {selectedOT.descripcion || <span className="italic text-gray-400">Sin descripción registrada</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── Lista OTs ── */
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-700 text-white text-xs">
                              <th className="px-4 py-2.5 text-left font-medium">N°</th>
                              <th className="px-4 py-2.5 text-left font-medium">Tipo Trabajo</th>
                              <th className="px-4 py-2.5 text-left font-medium">Técnico</th>
                              <th className="px-4 py-2.5 text-left font-medium">Estatus</th>
                              <th className="px-4 py-2.5 text-left font-medium">Cotización</th>
                              <th className="px-4 py-2.5 text-left font-medium">Inicio</th>
                              <th className="px-4 py-2.5 text-left font-medium">Finalizado</th>
                              <th className="px-4 py-2.5 font-medium"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {perfilOTs.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="text-center py-8 text-gray-400 text-sm italic">
                                  Este cliente no tiene órdenes de trabajo
                                </td>
                              </tr>
                            ) : perfilOTs.map((ot, i) => (
                              <tr key={ot.id} className={`border-t border-gray-100 hover:bg-blue-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                                <td className="px-4 py-2.5 font-mono font-semibold text-blue-700 text-xs">
                                  {padId(ot.id, "OT")}
                                </td>
                                <td className="px-4 py-2.5 text-gray-700">{ot.tipo_trabajo || "—"}</td>
                                <td className="px-4 py-2.5 text-gray-600">{ot.tecnico_asignado || "—"}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge(OT_BADGE, ot.estatus)}`}>
                                    {ot.estatus || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs text-indigo-600">
                                  {ot.cotizacion ? padId(ot.cotizacion, "COT") : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                                  {fmtDate(ot.fecha_inicio)}
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                                  {fmtDate(ot.fecha_finalizado)}
                                </td>
                                <td className="px-4 py-2.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOT(ot)}
                                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                  >
                                    Ver
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}

                  {/* Cotizaciones: lista o detalle */}
                  {perfilTab === "cots" && (
                    selectedCot ? (
                      /* ── Detalle Cotización ── */
                      <div>
                        <button
                          type="button"
                          onClick={() => setSelectedCot(null)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium mb-4"
                        >
                          ← Volver a la lista
                        </button>
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-mono font-bold text-indigo-700 text-xl">{padId(selectedCot.id, "COT")}</p>
                              <p className="text-gray-600 text-sm mt-0.5">{selectedCot.tipo || "—"}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {selectedCot.asesor && (
                                <span className="text-xs text-gray-500">Asesor: <span className="font-medium text-gray-700">{selectedCot.asesor}</span></span>
                              )}
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge(COT_BADGE, selectedCot.estatus)}`}>
                                {selectedCot.estatus || "—"}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Fecha de creación</p>
                              <p className="text-sm font-medium text-gray-700">{fmtDate(selectedCot.fecha_creacion)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Ítems</p>
                              <p className="text-sm font-medium text-gray-700">{selectedCot.items?.length ?? 0} producto{selectedCot.items?.length !== 1 ? "s" : ""}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Total</p>
                              <p className="text-sm font-bold text-indigo-700">{fmt(selectedCot.total)}</p>
                            </div>
                          </div>
                          {/* Tabla de ítems */}
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Detalle de ítems</p>
                            <div className="rounded-lg border border-indigo-200 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-indigo-100 text-indigo-800">
                                    <th className="px-3 py-2 text-left font-semibold">Producto</th>
                                    <th className="px-3 py-2 text-right font-semibold">Cant.</th>
                                    <th className="px-3 py-2 text-right font-semibold">P. Unitario</th>
                                    <th className="px-3 py-2 text-right font-semibold">IVA %</th>
                                    <th className="px-3 py-2 text-right font-semibold">ISR %</th>
                                    <th className="px-3 py-2 text-right font-semibold">Total ítem</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(selectedCot.items ?? []).length === 0 ? (
                                    <tr>
                                      <td colSpan={6} className="text-center py-4 text-gray-400 italic">Sin ítems registrados</td>
                                    </tr>
                                  ) : (selectedCot.items ?? []).map((item, i) => (
                                    <tr key={item.id ?? i} className={`border-t border-indigo-100 ${i % 2 === 0 ? "bg-white" : "bg-indigo-50/40"}`}>
                                      <td className="px-3 py-2 text-gray-700 font-medium">{item.nombre_producto}</td>
                                      <td className="px-3 py-2 text-right text-gray-600">{item.cantidad}</td>
                                      <td className="px-3 py-2 text-right text-gray-600">{fmt(item.precio_unitario)}</td>
                                      <td className="px-3 py-2 text-right text-gray-500">{item.porcentaje_iva}%</td>
                                      <td className="px-3 py-2 text-right text-gray-500">{item.porcentaje_isr}%</td>
                                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{fmt(item.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                {(selectedCot.items ?? []).length > 0 && (
                                  <tfoot>
                                    <tr className="border-t-2 border-indigo-300 bg-indigo-100">
                                      <td colSpan={5} className="px-3 py-2 text-right font-semibold text-indigo-700">TOTAL</td>
                                      <td className="px-3 py-2 text-right font-bold text-indigo-900">{fmt(selectedCot.total)}</td>
                                    </tr>
                                  </tfoot>
                                )}
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── Lista Cotizaciones ── */
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-700 text-white text-xs">
                              <th className="px-4 py-2.5 text-left font-medium">N°</th>
                              <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
                              <th className="px-4 py-2.5 text-left font-medium">Asesor</th>
                              <th className="px-4 py-2.5 text-left font-medium">Estatus</th>
                              <th className="px-4 py-2.5 text-right font-medium">Ítems</th>
                              <th className="px-4 py-2.5 text-right font-medium">Total</th>
                              <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                              <th className="px-4 py-2.5 font-medium"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {perfilCots.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="text-center py-8 text-gray-400 text-sm italic">
                                  Este cliente no tiene cotizaciones
                                </td>
                              </tr>
                            ) : perfilCots.map((cot, i) => (
                              <tr key={cot.id} className={`border-t border-gray-100 hover:bg-indigo-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                                <td className="px-4 py-2.5 font-mono font-semibold text-indigo-700 text-xs">
                                  {padId(cot.id, "COT")}
                                </td>
                                <td className="px-4 py-2.5 text-gray-700">{cot.tipo || "—"}</td>
                                <td className="px-4 py-2.5 text-gray-600">{cot.asesor || "—"}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge(COT_BADGE, cot.estatus)}`}>
                                    {cot.estatus || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right text-gray-500">
                                  {cot.items?.length ?? 0}
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                                  {fmt(cot.total)}
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                                  {fmtDate(cot.fecha_creacion)}
                                </td>
                                <td className="px-4 py-2.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCot(cot)}
                                    className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                                  >
                                    Ver
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          {perfilCots.length > 0 && (
                            <tfoot>
                              <tr className="bg-gray-50 border-t-2 border-gray-200">
                                <td colSpan={5} className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-right">
                                  Total general
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                                  {fmt(totalCotizado)}
                                </td>
                                <td colSpan={2} />
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
