import { useEffect, useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faAddressCard } from "@fortawesome/free-solid-svg-icons";
import { proveedoresService } from "../../services/api/proveedores";
import { comprasService } from "../../services/api/compras";
import { tiposPagoService } from "../../services/api/maestros";
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
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

const iniciales = (nombre) =>
  (nombre ?? "").split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "?";

const compraTotal = (compra) =>
  (compra.items ?? []).reduce((s, i) => s + parseFloat(i.subtotal || 0), 0);

// ── Formulario ────────────────────────────────────────────────────────────────
const EMPTY = {
  razon_social: "", nit: "", nombre_comercial: "", tipo_proveedor: "",
  numero_rtu: "", sitio_web: "",
  direccion_comercial: "", municipio: "", departamento: "", pais: "Guatemala",
  telefono: "", email: "",
  nombre_contacto: "", telefono_contacto: "", email_contacto: "",
  tipo_pago: "", banco: "", numero_cuenta: "", tipo_cuenta: "",
  notas: "",
};

const DEPARTAMENTOS_GT = [
  "Alta Verapaz","Baja Verapaz","Chimaltenango","Chiquimula","El Progreso",
  "Escuintla","Guatemala","Huehuetenango","Izabal","Jalapa","Jutiapa","Petén",
  "Quetzaltenango","Quiché","Retalhuleu","Sacatepéquez","San Marcos","Santa Rosa",
  "Sololá","Suchitepéquez","Totonicapán","Zacapa",
];

const BANCOS_GT = [
  "Banco Industrial", "Banco G&T Continental", "Banco de los Trabajadores (Bantrab)",
  "Banco Agromercantil (BAM)", "Banco Internacional", "Banco Promerica",
  "Banco Ficohsa", "Banco Azteca", "Banco de Desarrollo Rural (Banrural)",
  "Banco Inmobiliario", "Crédito Hipotecario Nacional (CHN)", "Otro",
];

const COLS = [
  { key: "razon_social",    label: "Razón Social",    sortable: true },
  { key: "nit",             label: "NIT",             sortable: true },
  { key: "nombre_comercial",label: "Nombre Comercial",sortable: true },
  {
    key: "tipo_proveedor",
    label: "Tipo",
    render: (r) => r.tipo_proveedor
      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">{r.tipo_proveedor}</span>
      : <span className="text-gray-300 text-xs">—</span>,
  },
  { key: "telefono", label: "Teléfono" },
  {
    key: "tipo_pago",
    label: "Tipo de Pago",
    render: (r) => r.tipo_pago
      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">{r.tipo_pago}</span>
      : <span className="text-gray-300 text-xs">—</span>,
  },
];

// ── Helpers de formulario ─────────────────────────────────────────────────────
function PField({ label, children, span = 1 }) {
  const cls = span === 2 ? "col-span-2" : span === 3 ? "col-span-3" : "";
  return (
    <div className={cls}>
      <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function PInp({ label, name, form, setForm, type = "text", placeholder = "", span, required = false }) {
  return (
    <PField label={label} span={span}>
      <input
        type={type}
        value={form[name] ?? ""}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </PField>
  );
}

function PSel({ label, name, form, setForm, options, placeholder = "— Seleccionar —", span }) {
  return (
    <PField label={label} span={span}>
      <select
        value={form[name] ?? ""}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
    </PField>
  );
}

// ── Sección del formulario ────────────────────────────────────────────────────
function FormSection({ title, children }) {
  return (
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-5">
      <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">{title}</h3>
      <div className="grid grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent = "emerald" }) {
  const colors = {
    emerald: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700",
    green:   "from-green-50 to-green-100 border-green-200 text-green-700",
    teal:    "from-teal-50 to-teal-100 border-teal-200 text-teal-700",
    amber:   "from-amber-50 to-amber-100 border-amber-200 text-amber-700",
    blue:    "from-blue-50 to-blue-100 border-blue-200 text-blue-700",
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
export default function ProveedoresPage() {
  // Lista
  const [items, setItems]       = useState([]);
  const [tiposPago, setTiposPago] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // CRUD
  const [form, setForm]       = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [open, setOpen]       = useState(false);

  // Perfil
  const [perfil, setPerfil]               = useState(null);
  const [perfilCompras, setPerfilCompras] = useState([]);
  const [perfilTab, setPerfilTab]         = useState("compras");
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [openPerfil, setOpenPerfil]       = useState(false);
  const [selectedCompra, setSelectedCompra] = useState(null);
  // Categoría expandida en el tab "Por Categoría"
  const [catExpandida, setCatExpandida]   = useState(null);

  useEffect(() => { load(); loadTiposPago(); }, []);

  const load = async () => {
    setLoading(true);
    try { const { data } = await proveedoresService.getAll(); setItems(data.results ?? data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadTiposPago = async () => {
    try {
      const { data } = await tiposPagoService.getAll({ activo: true });
      setTiposPago(data.results ?? data);
    } catch (e) { console.error(e); }
  };

  // ── Perfil ────────────────────────────────────────────────────────────────
  const openPerfilModal = async (proveedor) => {
    setPerfil(proveedor);
    setPerfilTab("compras");
    setPerfilCompras([]);
    setSelectedCompra(null);
    setCatExpandida(null);
    setOpenPerfil(true);
    setPerfilLoading(true);
    try {
      const { data } = await comprasService.getByProveedor(proveedor.id);
      setPerfilCompras(data.results ?? data);
    } catch (e) { console.error(e); }
    finally { setPerfilLoading(false); }
  };

  const switchTab = (tab) => {
    setPerfilTab(tab);
    setSelectedCompra(null);
    setCatExpandida(null);
  };

  // ── Métricas ──────────────────────────────────────────────────────────────
  const totalComprado = useMemo(
    () => perfilCompras.reduce((s, c) => s + compraTotal(c), 0),
    [perfilCompras]
  );

  const productosUnicos = useMemo(() => {
    const ids = new Set();
    perfilCompras.forEach((c) => c.items?.forEach((i) => ids.add(i.producto)));
    return ids.size;
  }, [perfilCompras]);

  const ticketPromedio = perfilCompras.length > 0 ? totalComprado / perfilCompras.length : null;

  const ultimaCompra = useMemo(() => {
    const fechas = perfilCompras.map((c) => c.fecha_despacho).filter(Boolean).sort().reverse();
    return fechas[0] ?? null;
  }, [perfilCompras]);

  // ── Agrupación por categoría ──────────────────────────────────────────────
  const porCategoria = useMemo(() => {
    const map = {};
    perfilCompras.forEach((compra) => {
      (compra.items ?? []).forEach((item) => {
        const cat = item.producto_categoria || "Sin categoría";
        if (!map[cat]) {
          map[cat] = {
            categoria: cat,
            totalUnidades: 0,
            totalCosto: 0,
            productosIds: new Set(),
            lineas: [],
          };
        }
        map[cat].totalUnidades += item.cantidad;
        map[cat].totalCosto += parseFloat(item.subtotal || 0);
        map[cat].productosIds.add(item.producto);
        map[cat].lineas.push({
          producto_cod: item.producto_cod,
          producto_nombre: item.producto_nombre,
          compra_correlativo: compra.correlativo,
          compra_fecha: compra.fecha_despacho,
          cantidad: item.cantidad,
          costo_unitario: item.costo_unitario,
          subtotal: item.subtotal,
        });
      });
    });
    return Object.values(map)
      .map((c) => ({ ...c, productosCount: c.productosIds.size }))
      .sort((a, b) => b.totalCosto - a.totalCosto);
  }, [perfilCompras]);

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
        ? await proveedoresService.update(editing.id, form)
        : await proveedoresService.create(form);
      close(); load();
    } catch (e) {
      alert(e.response?.data ? JSON.stringify(e.response.data) : "Error");
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({ ...EMPTY, ...item });
    setOpen(true);
  };
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este proveedor?")) return;
    await proveedoresService.remove(id); load();
  };
  const close = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Proveedores</h1>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} />
          Nuevo Proveedor
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
            className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 rounded-lg px-3 py-1.5 text-sm w-1/4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
              <FontAwesomeIcon icon={faAddressCard} />
              Ver perfil
            </button>
          )}
        />
      </div>

      {/* ── Modal: CRUD ── */}
      {open && (
        <Modal title={editing ? "Editar Proveedor" : "Nuevo Proveedor"} onClose={close} wide>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Identidad */}
            <FormSection title="Identidad Comercial">
              <PInp label="Razón Social *" name="razon_social" form={form} setForm={setForm}
                placeholder="Nombre legal completo" required span={2} />
              <PInp label="NIT *" name="nit" form={form} setForm={setForm}
                placeholder="Ej: 1234567-8" required />
              <PInp label="Nombre Comercial" name="nombre_comercial" form={form} setForm={setForm}
                placeholder="Marca o nombre de fantasía" span={2} />
              <PSel label="Tipo de Proveedor" name="tipo_proveedor" form={form} setForm={setForm}
                options={["Bienes", "Servicios", "Ambos"]} />
              <PInp label="N° RTU (SAT)" name="numero_rtu" form={form} setForm={setForm}
                placeholder="Registro Tributario Unificado" />
              <PInp label="Sitio Web" name="sitio_web" form={form} setForm={setForm}
                type="url" placeholder="https://proveedor.com" span={2} />
            </FormSection>

            {/* Dirección */}
            <FormSection title="Dirección">
              <PField label="Dirección Comercial" span={3}>
                <textarea
                  value={form.direccion_comercial ?? ""}
                  onChange={(e) => setForm({ ...form, direccion_comercial: e.target.value })}
                  rows={2}
                  placeholder="Calle, número, zona, colonia…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </PField>
              <PInp label="Municipio" name="municipio" form={form} setForm={setForm} />
              <PSel label="Departamento" name="departamento" form={form} setForm={setForm}
                options={DEPARTAMENTOS_GT} />
              <PInp label="País" name="pais" form={form} setForm={setForm} />
            </FormSection>

            {/* Contacto corporativo */}
            <FormSection title="Contacto Corporativo">
              <PInp label="Teléfono" name="telefono" form={form} setForm={setForm}
                placeholder="+502 2234-5678" />
              <PInp label="Email" name="email" form={form} setForm={setForm}
                type="email" placeholder="info@proveedor.com" span={2} />
            </FormSection>

            {/* Persona de contacto */}
            <FormSection title="Persona de Contacto">
              <PInp label="Nombre" name="nombre_contacto" form={form} setForm={setForm}
                placeholder="Nombre completo" />
              <PInp label="Teléfono" name="telefono_contacto" form={form} setForm={setForm}
                placeholder="+502 5555-1234" />
              <PInp label="Email" name="email_contacto" form={form} setForm={setForm}
                type="email" placeholder="contacto@proveedor.com" />
            </FormSection>

            {/* Pago y banco */}
            <FormSection title="Condiciones de Pago y Datos Bancarios">
              <PField label="Tipo de Pago">
                <select
                  value={form.tipo_pago ?? ""}
                  onChange={(e) => setForm({ ...form, tipo_pago: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">— Sin especificar —</option>
                  {tiposPago.map((tp) => (
                    <option key={tp.id} value={tp.nombre}>
                      {tp.nombre}{tp.dias_plazo > 0 ? ` (${tp.dias_plazo} días)` : " (Inmediato)"}
                    </option>
                  ))}
                </select>
              </PField>
              <PSel label="Banco" name="banco" form={form} setForm={setForm}
                options={BANCOS_GT} placeholder="— Seleccionar banco —" />
              <PInp label="N° de Cuenta" name="numero_cuenta" form={form} setForm={setForm}
                placeholder="000-000000-0" />
              <PSel label="Tipo de Cuenta" name="tipo_cuenta" form={form} setForm={setForm}
                options={["Monetaria", "Ahorro"]} />
            </FormSection>

            {/* Notas */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Notas</h3>
              <textarea
                value={form.notas ?? ""}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={3}
                placeholder="Observaciones generales sobre el proveedor…"
                className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-1 border-t dark:border-slate-700">
              <button type="button" onClick={close}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300">
                Cancelar
              </button>
              <button type="submit"
                className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors">
                {editing ? "Actualizar Proveedor" : "Crear Proveedor"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Perfil de proveedor ── */}
      {openPerfil && perfil && (
        <Modal title="Perfil de Proveedor" onClose={() => setOpenPerfil(false)} wide>
          <div className="space-y-6">

            {/* ── Identidad ── */}
            <div className="flex items-start gap-5 pb-5 border-b border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md">
                {iniciales(perfil.razon_social)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">{perfil.razon_social}</h2>
                    {perfil.nombre_comercial && (
                      <p className="text-sm text-gray-500 mt-0.5">{perfil.nombre_comercial}</p>
                    )}
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 shrink-0 mt-1">
                    {perfil.tipo_pago || "Sin tipo de pago"}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="font-mono font-semibold text-gray-600">NIT: {perfil.nit}</span>
                  <span>•</span>
                  <span>Proveedor desde {fmtDate(perfil.fecha_creacion)}</span>
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

            {/* ── Información Financiera y Bancaria ── */}
            {(perfil.banco || perfil.numero_cuenta || perfil.tipo_pago) && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Información Financiera y Bancaria
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Condición de pago",  value: perfil.tipo_pago,      accent: "bg-emerald-50 border-emerald-200 text-emerald-800" },
                    { label: "Banco",               value: perfil.banco,          accent: "bg-blue-50 border-blue-200 text-blue-800" },
                    { label: "N° de Cuenta",        value: perfil.numero_cuenta,  accent: "bg-slate-50 border-slate-200 text-slate-800", mono: true },
                    { label: "Tipo de Cuenta",      value: perfil.tipo_cuenta,    accent: "bg-purple-50 border-purple-200 text-purple-800" },
                  ].map(({ label, value, accent, mono }) =>
                    value ? (
                      <div key={label} className={`border rounded-lg px-4 py-3 ${accent}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-1">{label}</p>
                        <p className={`text-sm font-bold leading-tight ${mono ? "font-mono" : ""}`}>{value}</p>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* ── KPIs y métricas ── */}
            {perfilLoading ? (
              <div className="text-center py-8 text-sm text-gray-400">Cargando datos…</div>
            ) : (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Resumen de compras
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    <KpiCard
                      label="Total comprado"
                      value={fmt(totalComprado)}
                      sub={`${perfilCompras.length} orden${perfilCompras.length !== 1 ? "es" : ""} de compra`}
                      accent="emerald"
                    />
                    <KpiCard
                      label="Ticket promedio"
                      value={ticketPromedio !== null ? fmt(ticketPromedio) : "—"}
                      sub="por orden de compra"
                      accent="teal"
                    />
                    <KpiCard
                      label="Productos distintos"
                      value={productosUnicos}
                      sub={`en ${porCategoria.length} categoría${porCategoria.length !== 1 ? "s" : ""}`}
                      accent="green"
                    />
                    <KpiCard
                      label="Última compra"
                      value={ultimaCompra ? fmtDate(ultimaCompra) : "—"}
                      sub={perfilCompras.length > 0 ? "fecha de despacho" : "Sin compras registradas"}
                      accent="amber"
                    />
                  </div>
                </div>

                {/* ── Tabs ── */}
                <div>
                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
                    {[
                      { key: "compras",    label: "Órdenes de Compra", count: perfilCompras.length },
                      { key: "categorias", label: "Por Categoría",     count: porCategoria.length },
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => switchTab(key)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                          perfilTab === key
                            ? "bg-white text-gray-800 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                          perfilTab === key
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-200 text-gray-500"
                        }`}>{count}</span>
                      </button>
                    ))}
                  </div>

                  {/* ── Tab: Órdenes de compra ── */}
                  {perfilTab === "compras" && (
                    selectedCompra ? (
                      /* Detalle compra */
                      <div>
                        <button
                          type="button"
                          onClick={() => setSelectedCompra(null)}
                          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium mb-4"
                        >
                          ← Volver a la lista
                        </button>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-4">
                          {/* Cabecera */}
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-mono font-bold text-emerald-700 text-xl">{selectedCompra.correlativo}</p>
                              <p className="text-gray-500 text-xs mt-0.5">
                                Despacho: <span className="font-medium text-gray-700">{fmtDate(selectedCompra.fecha_despacho)}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-2xl font-bold text-emerald-700">{fmt(compraTotal(selectedCompra))}</p>
                              <p className="text-xs text-gray-400">{selectedCompra.items?.length ?? 0} ítem{selectedCompra.items?.length !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                          {/* Metadata */}
                          <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Tipo de pago</p>
                              <p className="text-sm font-medium text-gray-700">{selectedCompra.tipo_pago_nombre || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">N° Cotización proveedor</p>
                              <p className="text-sm font-mono font-medium text-gray-700">{selectedCompra.num_cotizacion_proveedor || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Fecha de creación</p>
                              <p className="text-sm font-medium text-gray-700">{fmtDate(selectedCompra.fecha_creacion)}</p>
                            </div>
                          </div>
                          {selectedCompra.notas && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Notas</p>
                              <p className="text-sm text-gray-700 bg-white border border-emerald-100 rounded-lg p-3 leading-relaxed">
                                {selectedCompra.notas}
                              </p>
                            </div>
                          )}
                          {/* Tabla de ítems */}
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Detalle de ítems</p>
                            <div className="rounded-lg border border-emerald-200 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-emerald-100 text-emerald-800">
                                    <th className="px-3 py-2 text-left font-semibold">Código</th>
                                    <th className="px-3 py-2 text-left font-semibold">Producto</th>
                                    <th className="px-3 py-2 text-left font-semibold">Categoría</th>
                                    <th className="px-3 py-2 text-right font-semibold">Cant.</th>
                                    <th className="px-3 py-2 text-right font-semibold">Costo Unit.</th>
                                    <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(selectedCompra.items ?? []).map((item, i) => (
                                    <tr key={item.id ?? i} className={`border-t border-emerald-100 ${i % 2 === 0 ? "bg-white" : "bg-emerald-50/40"}`}>
                                      <td className="px-3 py-2 font-mono text-gray-500">{item.producto_cod || "—"}</td>
                                      <td className="px-3 py-2 text-gray-700 font-medium">{item.producto_nombre}</td>
                                      <td className="px-3 py-2">
                                        <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded text-[10px] font-medium">
                                          {item.producto_categoria || "—"}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-right text-gray-600">{item.cantidad}</td>
                                      <td className="px-3 py-2 text-right text-gray-600">{fmt(item.costo_unitario)}</td>
                                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{fmt(item.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-emerald-300 bg-emerald-100">
                                    <td colSpan={5} className="px-3 py-2 text-right font-semibold text-emerald-700">TOTAL</td>
                                    <td className="px-3 py-2 text-right font-bold text-emerald-900">{fmt(compraTotal(selectedCompra))}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Lista de compras */
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-700 text-white text-xs">
                              <th className="px-4 py-2.5 text-left font-medium">OC</th>
                              <th className="px-4 py-2.5 text-left font-medium">Fecha despacho</th>
                              <th className="px-4 py-2.5 text-left font-medium">Tipo pago</th>
                              <th className="px-4 py-2.5 text-left font-medium">N° Cot. proveedor</th>
                              <th className="px-4 py-2.5 text-right font-medium">Ítems</th>
                              <th className="px-4 py-2.5 text-right font-medium">Total</th>
                              <th className="px-4 py-2.5 font-medium"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {perfilCompras.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-center py-8 text-gray-400 text-sm italic">
                                  No se han registrado compras a este proveedor
                                </td>
                              </tr>
                            ) : perfilCompras.map((c, i) => (
                              <tr key={c.id} className={`border-t border-gray-100 hover:bg-emerald-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                                <td className="px-4 py-2.5 font-mono font-semibold text-emerald-700 text-xs">{c.correlativo}</td>
                                <td className="px-4 py-2.5 text-gray-600 text-xs whitespace-nowrap">{fmtDate(c.fecha_despacho)}</td>
                                <td className="px-4 py-2.5 text-gray-600 text-xs">{c.tipo_pago_nombre || "—"}</td>
                                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{c.num_cotizacion_proveedor || "—"}</td>
                                <td className="px-4 py-2.5 text-right text-gray-500">{c.items?.length ?? 0}</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{fmt(compraTotal(c))}</td>
                                <td className="px-4 py-2.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCompra(c)}
                                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                  >
                                    Ver
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          {perfilCompras.length > 0 && (
                            <tfoot>
                              <tr className="bg-gray-50 border-t-2 border-gray-200">
                                <td colSpan={5} className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-right">
                                  Total general
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmt(totalComprado)}</td>
                                <td />
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )
                  )}

                  {/* ── Tab: Por Categoría ── */}
                  {perfilTab === "categorias" && (
                    <div className="space-y-3">
                      {porCategoria.length === 0 ? (
                        <p className="text-center py-8 text-sm text-gray-400 italic">
                          No hay compras registradas para clasificar
                        </p>
                      ) : porCategoria.map((cat) => {
                        const pct = totalComprado > 0
                          ? Math.round((cat.totalCosto / totalComprado) * 100)
                          : 0;
                        const expanded = catExpandida === cat.categoria;
                        return (
                          <div key={cat.categoria} className="border border-gray-200 rounded-xl overflow-hidden">
                            {/* Cabecera de categoría */}
                            <button
                              type="button"
                              onClick={() => setCatExpandida(expanded ? null : cat.categoria)}
                              className="w-full flex items-center gap-4 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1.5">
                                  <span className="font-semibold text-sm text-gray-800 truncate">{cat.categoria}</span>
                                  <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                                    {cat.productosCount} producto{cat.productosCount !== 1 ? "s" : ""}
                                  </span>
                                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium shrink-0">
                                    {cat.totalUnidades} uds.
                                  </span>
                                </div>
                                {/* Progress bar */}
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-gray-400 shrink-0 w-8 text-right">{pct}%</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-emerald-700 text-sm">{fmt(cat.totalCosto)}</p>
                                <p className="text-[10px] text-gray-400">{cat.lineas.length} línea{cat.lineas.length !== 1 ? "s" : ""}</p>
                              </div>
                              <span className={`text-gray-400 text-xs transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}>
                                ▼
                              </span>
                            </button>

                            {/* Detalle expandible */}
                            {expanded && (
                              <div className="border-t border-gray-100">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-teal-50 text-teal-800">
                                      <th className="px-4 py-2 text-left font-semibold">Código</th>
                                      <th className="px-4 py-2 text-left font-semibold">Producto</th>
                                      <th className="px-4 py-2 text-left font-semibold">OC</th>
                                      <th className="px-4 py-2 text-left font-semibold">Fecha</th>
                                      <th className="px-4 py-2 text-right font-semibold">Cant.</th>
                                      <th className="px-4 py-2 text-right font-semibold">Costo Unit.</th>
                                      <th className="px-4 py-2 text-right font-semibold">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cat.lineas.map((l, i) => (
                                      <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-teal-50/30"}`}>
                                        <td className="px-4 py-2 font-mono text-gray-500">{l.producto_cod || "—"}</td>
                                        <td className="px-4 py-2 text-gray-700 font-medium">{l.producto_nombre}</td>
                                        <td className="px-4 py-2 font-mono text-emerald-600">{l.compra_correlativo}</td>
                                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmtDate(l.compra_fecha)}</td>
                                        <td className="px-4 py-2 text-right text-gray-600">{l.cantidad}</td>
                                        <td className="px-4 py-2 text-right text-gray-600">{fmt(l.costo_unitario)}</td>
                                        <td className="px-4 py-2 text-right font-semibold text-gray-800">{fmt(l.subtotal)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t-2 border-teal-200 bg-teal-50">
                                      <td colSpan={6} className="px-4 py-2 text-right font-semibold text-teal-700">Subtotal categoría</td>
                                      <td className="px-4 py-2 text-right font-bold text-teal-900">{fmt(cat.totalCosto)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Resumen total */}
                      {porCategoria.length > 0 && (
                        <div className="flex justify-end pt-1">
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-5 py-2.5 text-sm">
                            <span className="text-gray-500 mr-3">Total general</span>
                            <span className="font-bold text-emerald-800 text-base">{fmt(totalComprado)}</span>
                          </div>
                        </div>
                      )}
                    </div>
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
