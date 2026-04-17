import { useEffect, useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import Modal from "../../components/ui/Modal";
import DataTable from "../../components/ui/DataTable";
import {
  marcasService, modelosService, tiposPagoService, tiposTrabajoService,
  tiposEstatusService, tiposServicioService, personalService, tiposClienteService,
  tiposProductoService, empresaService,
  categoriasProductoService, unidadesMedidaService, motivosSalidaService,
} from "../../services/api/maestros";

// ── Badge activo ─────────────────────────────────────────────────────────────
const ActiveBadge = ({ value }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
    value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
  }`}>
    {value ? "Activo" : "Inactivo"}
  </span>
);

// ── Input genérico ───────────────────────────────────────────────────────────
function Inp({ label, name, form, setForm, type = "text", required = true }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={form[name] ?? ""}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        required={required}
        className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function ActivoToggle({ form, setForm }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id="activo"
        checked={!!form.activo}
        onChange={(e) => setForm({ ...form, activo: e.target.checked })}
        className="w-4 h-4 accent-blue-600"
      />
      <label htmlFor="activo" className="text-sm text-gray-600 dark:text-slate-400">Activo</label>
    </div>
  );
}

// ── CRUD genérico para entidades simples (solo nombre + activo) ──────────────
function SimpleCRUD({ title, service, extraCols = [], renderForm, EMPTY }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const load = async () => {
    setLoading(true);
    try { const { data } = await service.getAll(); setItems(data.results ?? data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return items;
    return items.filter((r) =>
      Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [items, busqueda]);

  const cols = [
    { key: "nombre", label: "Nombre", sortable: true },
    ...extraCols,
    { key: "activo", label: "Estado", render: (r) => <ActiveBadge value={r.activo} /> },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      editing ? await service.update(editing.id, form) : await service.create(form);
      close(); load();
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error"); }
  };

  const handleEdit = (item) => { setEditing(item); setForm(item); setOpen(true); };
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    try { await service.remove(id); load(); }
    catch (e) { alert("No se puede eliminar — puede estar en uso."); }
  };
  const close = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">{title}</h2>
        <button onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
          <FontAwesomeIcon icon={faPlus} />
          Nuevo
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 rounded-lg px-3 py-1.5 text-sm w-1/4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {busqueda && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <DataTable columns={cols} data={filtrados} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {open && (
        <Modal title={editing ? `Editar ${title}` : `Nuevo — ${title}`} onClose={close}>
          <form onSubmit={handleSubmit} className="space-y-3">
            {renderForm(form, setForm)}
            <ActivoToggle form={form} setForm={setForm} />
            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
              <button type="button" onClick={close} className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                {editing ? "Actualizar" : "Crear"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Sección Marcas ────────────────────────────────────────────────────────────
function Marcas() {
  return (
    <SimpleCRUD
      title="Marcas"
      service={marcasService}
      EMPTY={{ nombre: "", activo: true }}
      renderForm={(form, setForm) => (
        <Inp label="Nombre de la marca" name="nombre" form={form} setForm={setForm} />
      )}
    />
  );
}

// ── Sección Modelos ───────────────────────────────────────────────────────────
function Modelos() {
  const [marcas, setMarcas] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ marca: "", nombre: "", activo: true });
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [m, md] = await Promise.all([marcasService.getAll(), modelosService.getAll()]);
      setMarcas(m.data.results ?? m.data);
      setItems(md.data.results ?? md.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return items;
    return items.filter((r) =>
      r.nombre?.toLowerCase().includes(q) || r.marca_nombre?.toLowerCase().includes(q)
    );
  }, [items, busqueda]);

  const cols = [
    { key: "marca_nombre", label: "Marca", sortable: true },
    { key: "nombre", label: "Modelo", sortable: true },
    { key: "activo", label: "Estado", render: (r) => <ActiveBadge value={r.activo} /> },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      editing ? await modelosService.update(editing.id, form) : await modelosService.create(form);
      close(); load();
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error"); }
  };

  const handleEdit = (item) => { setEditing(item); setForm({ marca: item.marca, nombre: item.nombre, activo: item.activo }); setOpen(true); };
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este modelo?")) return;
    try { await modelosService.remove(id); load(); }
    catch (e) { alert("No se puede eliminar — puede estar en uso."); }
  };
  const close = () => { setOpen(false); setEditing(null); setForm({ marca: "", nombre: "", activo: true }); };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Modelos</h2>
        <button onClick={() => setOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
          + Nuevo
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por marca o modelo…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-1/4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {busqueda && <span className="text-xs text-gray-400">{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</span>}
        </div>
        <DataTable columns={cols} data={filtrados} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {open && (
        <Modal title={editing ? "Editar Modelo" : "Nuevo Modelo"} onClose={close}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marca *</label>
              <select value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} required
                className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar…</option>
                {marcas.filter((m) => m.activo).map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
            <Inp label="Nombre del modelo" name="nombre" form={form} setForm={setForm} />
            <ActivoToggle form={form} setForm={setForm} />
            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
              <button type="button" onClick={close} className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                {editing ? "Actualizar" : "Crear"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Sección Tipos de Estatus (tiene campo módulo) ─────────────────────────────
const MODULOS = [
  { value: "cotizaciones", label: "Cotizaciones" },
  { value: "ordenes_trabajo", label: "Órdenes de Trabajo" },
  { value: "compras", label: "Compras" },
  { value: "general", label: "General" },
];

function TiposEstatus() {
  return (
    <SimpleCRUD
      title="Tipos de Estatus"
      service={tiposEstatusService}
      EMPTY={{ nombre: "", modulo: "general", activo: true }}
      extraCols={[{ key: "modulo_display", label: "Módulo" }]}
      renderForm={(form, setForm) => (
        <>
          <Inp label="Nombre del estatus" name="nombre" form={form} setForm={setForm} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Módulo</label>
            <select value={form.modulo} onChange={(e) => setForm({ ...form, modulo: e.target.value })}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {MODULOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </>
      )}
    />
  );
}

// ── Sección Tipos de Servicio (tiene descripción) ─────────────────────────────
function TiposServicio() {
  return (
    <SimpleCRUD
      title="Tipos de Servicio"
      service={tiposServicioService}
      EMPTY={{ nombre: "", descripcion: "", activo: true }}
      renderForm={(form, setForm) => (
        <>
          <Inp label="Nombre del servicio" name="nombre" form={form} setForm={setForm} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <textarea value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </>
      )}
    />
  );
}

// ── Sección Personal (más campos) ─────────────────────────────────────────────
function PersonalSection() {
  return (
    <SimpleCRUD
      title="Personal"
      service={personalService}
      EMPTY={{ nombre: "", cargo: "", email: "", telefono: "", activo: true }}
      extraCols={[
        { key: "cargo", label: "Cargo" },
        { key: "email", label: "Email" },
        { key: "telefono", label: "Teléfono" },
      ]}
      renderForm={(form, setForm) => (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Inp label="Nombre completo" name="nombre" form={form} setForm={setForm} /></div>
          <Inp label="Cargo" name="cargo" form={form} setForm={setForm} required={false} />
          <Inp label="Teléfono" name="telefono" form={form} setForm={setForm} required={false} />
          <div className="col-span-2"><Inp label="Email" name="email" form={form} setForm={setForm} type="email" required={false} /></div>
        </div>
      )}
    />
  );
}

// ── Datos de Empresa ─────────────────────────────────────────────────────────
const DEPARTAMENTOS_GT = [
  "Alta Verapaz","Baja Verapaz","Chimaltenango","Chiquimula","El Progreso",
  "Escuintla","Guatemala","Huehuetenango","Izabal","Jalapa","Jutiapa","Petén",
  "Quetzaltenango","Quiché","Retalhuleu","Sacatepéquez","San Marcos","Santa Rosa",
  "Sololá","Suchitepéquez","Totonicapán","Zacapa",
];

const REGIMENES = [
  { value: "utilidades",   label: "Sobre Utilidades de Actividades Lucrativas — 25%" },
  { value: "simplificado", label: "Opcional Simplificado sobre Ingresos — 7%" },
  { value: "pequeno",      label: "Pequeño Contribuyente — 5%" },
];

const EMPRESA_EMPTY = {
  razon_social: "", nombre_comercial: "", nit: "", tipo_sociedad: "",
  direccion: "", municipio: "", departamento: "", pais: "Guatemala", codigo_postal: "",
  telefono: "", telefono_secundario: "", email: "", email_facturacion: "", sitio_web: "",
  regimen_fiscal: "", numero_rtu: "", numero_patente: "",
  representante_legal: "", fecha_constitucion: "",
  giro_comercial: "", moneda: "GTQ",
};

function EmpresaField({ label, children, span = 1 }) {
  return (
    <div className={span === 2 ? "col-span-2" : span === 3 ? "col-span-3" : ""}>
      <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function EmpresaInp({ label, name, form, setForm, type = "text", span, placeholder = "" }) {
  return (
    <EmpresaField label={label} span={span}>
      <input
        type={type}
        value={form[name] ?? ""}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        placeholder={placeholder}
        className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </EmpresaField>
  );
}

function EmpresaSection() {
  const [form, setForm]       = useState(EMPRESA_EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    empresaService.get()
      .then(({ data }) => setForm({ ...EMPRESA_EMPTY, ...data }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await empresaService.update(form);
      setForm({ ...EMPRESA_EMPTY, ...data });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="text-center py-16 text-sm text-gray-400">Cargando datos de empresa…</div>
  );

  const inp = (label, name, opts = {}) => (
    <EmpresaInp key={name} label={label} name={name} form={form} setForm={setForm} {...opts} />
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Identidad ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">
          Identidad Legal
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {inp("Razón Social *", "razon_social", { span: 2 })}
          {inp("NIT *", "nit", { placeholder: "Ej: 1234567-8" })}
          {inp("Nombre Comercial", "nombre_comercial", { span: 2 })}
          <EmpresaField label="Tipo de Sociedad">
            <select
              value={form.tipo_sociedad ?? ""}
              onChange={(e) => setForm({ ...form, tipo_sociedad: e.target.value })}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seleccionar —</option>
              <option value="Sociedad Anónima (S.A.)">Sociedad Anónima (S.A.)</option>
              <option value="Sociedad de Responsabilidad Limitada (S.R.L.)">Sociedad de Responsabilidad Limitada (S.R.L.)</option>
              <option value="Empresa Individual de Responsabilidad Limitada (E.I.R.L.)">Empresa Individual de Responsabilidad Limitada (E.I.R.L.)</option>
              <option value="Empresa Individual">Empresa Individual</option>
              <option value="Sociedad en Comandita Simple">Sociedad en Comandita Simple</option>
              <option value="Sociedad en Comandita por Acciones">Sociedad en Comandita por Acciones</option>
              <option value="Asociación Solidarista">Asociación Solidarista</option>
            </select>
          </EmpresaField>
          {inp("Representante Legal", "representante_legal", { span: 2 })}
          {inp("Fecha de Constitución", "fecha_constitucion", { type: "date" })}
        </div>
      </div>

      {/* ── Dirección ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">
          Dirección Fiscal
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <EmpresaField label="Dirección" span={3}>
            <textarea
              value={form.direccion ?? ""}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              rows={2}
              placeholder="Calle, número, zona, colonia…"
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </EmpresaField>
          {inp("Municipio", "municipio")}
          <EmpresaField label="Departamento">
            <select
              value={form.departamento ?? ""}
              onChange={(e) => setForm({ ...form, departamento: e.target.value })}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seleccionar —</option>
              {DEPARTAMENTOS_GT.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </EmpresaField>
          {inp("País", "pais")}
        </div>
      </div>

      {/* ── Contacto ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">
          Contacto
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {inp("Teléfono Principal", "telefono",           { placeholder: "Ej: +502 2234-5678" })}
          {inp("Teléfono Secundario", "telefono_secundario", { placeholder: "Ej: +502 5555-1234" })}
          {inp("Código Postal", "codigo_postal",           { placeholder: "Ej: 01001" })}
          {inp("Email Corporativo", "email",               { type: "email", placeholder: "info@empresa.com.gt" })}
          {inp("Email de Facturación", "email_facturacion", { type: "email", placeholder: "facturacion@empresa.com.gt" })}
          {inp("Sitio Web", "sitio_web",                   { type: "url",  placeholder: "https://www.empresa.com.gt" })}
        </div>
      </div>

      {/* ── Fiscal / Legal ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">
          Información Fiscal y Legal
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <EmpresaField label="Régimen ISR" span={2}>
            <select
              value={form.regimen_fiscal ?? ""}
              onChange={(e) => setForm({ ...form, regimen_fiscal: e.target.value })}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Seleccionar régimen —</option>
              {REGIMENES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </EmpresaField>
          {inp("Moneda", "moneda", { placeholder: "GTQ" })}
          {inp("N° RTU (SAT)", "numero_rtu",       { placeholder: "Registro Tributario Unificado" })}
          {inp("N° Patente de Comercio", "numero_patente", { placeholder: "Ej: 123456" })}
          <EmpresaField label="Giro Comercial" span={3}>
            <textarea
              value={form.giro_comercial ?? ""}
              onChange={(e) => setForm({ ...form, giro_comercial: e.target.value })}
              rows={2}
              placeholder="Descripción de las actividades comerciales principales…"
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </EmpresaField>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between">
        {saved ? (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px]">✓</span>
            Datos guardados correctamente
          </span>
        ) : <span />}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar Datos de Empresa"}
        </button>
      </div>
    </form>
  );
}

// ── Sub-navegación ────────────────────────────────────────────────────────────
const SECCIONES = [
  { id: "marcas",          label: "Marcas",            icon: "🏷️",  component: Marcas },
  { id: "modelos",         label: "Modelos",            icon: "🔧",  component: Modelos },
  { id: "tipos-pago",      label: "Tipos de Pago",      icon: "💳",  component: () => (
    <SimpleCRUD
      title="Tipos de Pago"
      service={tiposPagoService}
      EMPTY={{ nombre: "", dias_plazo: 0, activo: true }}
      extraCols={[{
        key: "dias_plazo",
        label: "Días de Plazo",
        render: (r) => r.dias_plazo === 0
          ? <span className="text-xs text-gray-400 italic">Inmediato</span>
          : <span className="text-xs font-medium">{r.dias_plazo} días</span>,
      }]}
      renderForm={(form, setForm) => (
        <>
          <Inp label="Nombre" name="nombre" form={form} setForm={setForm} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Días de Plazo</label>
            <input
              type="number" min="0" value={form.dias_plazo ?? 0}
              onChange={(e) => setForm({ ...form, dias_plazo: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Ingresá 0 para indicar pago inmediato.</p>
          </div>
        </>
      )}
    />
  )},
  { id: "tipos-trabajo",   label: "Tipos de Trabajo",   icon: "⚙️",  component: () => (
    <SimpleCRUD title="Tipos de Trabajo" service={tiposTrabajoService} EMPTY={{ nombre: "", activo: true }}
      renderForm={(form, setForm) => <Inp label="Nombre" name="nombre" form={form} setForm={setForm} />} />
  )},
  { id: "tipos-estatus",   label: "Tipos de Estatus",   icon: "📌",  component: TiposEstatus },
  { id: "tipos-servicio",  label: "Tipos de Servicio",  icon: "🛠️",  component: TiposServicio },
  { id: "personal",        label: "Personal",            icon: "👤",  component: PersonalSection },
  { id: "tipos-cliente",   label: "Tipos de Cliente",   icon: "🏢",  component: () => (
    <SimpleCRUD title="Tipos de Cliente" service={tiposClienteService} EMPTY={{ nombre: "", activo: true }}
      renderForm={(form, setForm) => <Inp label="Nombre" name="nombre" form={form} setForm={setForm} />} />
  )},
  { id: "categorias",       label: "Categorías",          icon: "📂",  component: () => (
    <SimpleCRUD
      title="Categorías de Producto"
      service={categoriasProductoService}
      EMPTY={{ nombre: "", descripcion: "", activo: true }}
      renderForm={(form, setForm) => (
        <>
          <Inp label="Nombre" name="nombre" form={form} setForm={setForm} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <textarea value={form.descripcion ?? ""} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </>
      )}
    />
  )},
  { id: "unidades-medida", label: "Unidades de Medida",  icon: "📐",  component: () => (
    <SimpleCRUD
      title="Unidades de Medida"
      service={unidadesMedidaService}
      EMPTY={{ nombre: "", abreviatura: "", activo: true }}
      extraCols={[{ key: "abreviatura", label: "Abreviatura" }]}
      renderForm={(form, setForm) => (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Inp label="Nombre" name="nombre" form={form} setForm={setForm} /></div>
          <Inp label="Abreviatura" name="abreviatura" form={form} setForm={setForm} required={false} />
        </div>
      )}
    />
  )},
  { id: "motivos-salida",  label: "Motivos de Salida",   icon: "📤",  component: () => (
    <SimpleCRUD
      title="Motivos de Salida de Inventario"
      service={motivosSalidaService}
      EMPTY={{ nombre: "", activo: true }}
      renderForm={(form, setForm) => (
        <Inp label="Nombre del motivo" name="nombre" form={form} setForm={setForm} />
      )}
    />
  )},
  { id: "empresa",         label: "Datos de Empresa",   icon: "🏛️",  component: EmpresaSection },
  { id: "tipos-producto",  label: "Tipos de Producto",  icon: "📦",  component: () => (
    <SimpleCRUD
      title="Tipos de Producto"
      service={tiposProductoService}
      EMPTY={{ nombre: "", descripcion: "", margen_ganancia: "0", activo: true }}
      extraCols={[{
        key: "margen_ganancia",
        label: "% Ganancia",
        render: (r) => (
          <span className="font-mono text-sm font-semibold text-emerald-700">
            {parseFloat(r.margen_ganancia ?? 0).toFixed(2)}%
          </span>
        ),
      }]}
      renderForm={(form, setForm) => (
        <>
          <Inp label="Nombre" name="nombre" form={form} setForm={setForm} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              % de Ganancia
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="9999"
                step="0.01"
                value={form.margen_ganancia ?? "0"}
                onChange={(e) => setForm({ ...form, margen_ganancia: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                %
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <textarea
              value={form.descripcion ?? ""}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}
    />
  )},
];

// ── Página principal ──────────────────────────────────────────────────────────
export default function MaestrosPage() {
  const [activa, setActiva] = useState("marcas");
  const seccion = SECCIONES.find((s) => s.id === activa);
  const Componente = seccion?.component;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Datos Maestros</h1>

      {/* Nav tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 mb-5 overflow-x-auto">
        <nav className="flex border-b border-gray-200 dark:border-slate-700 min-w-max">
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiva(s.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activa === s.id
                  ? "border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20"
                  : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500"
              }`}
            >
              <span className="text-sm leading-none">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      {Componente && <Componente key={activa} />}
    </div>
  );
}
