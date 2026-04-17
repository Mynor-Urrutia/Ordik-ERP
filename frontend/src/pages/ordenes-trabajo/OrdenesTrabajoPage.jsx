import { useEffect, useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { ordenesTrabajoService } from "../../services/api/ordenesTrabajo";
import { cotizacionesService } from "../../services/api/cotizaciones";
import { clientesService } from "../../services/api/clientes";
import { tiposClienteService, tiposTrabajoService, personalService, tiposEstatusService } from "../../services/api/maestros";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

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
};

const COLS = [
  { key: "id", label: "N°", render: (r) => `OT-${String(r.id).padStart(4, "0")}`, sortable: true },
  { key: "cliente_nombre", label: "Cliente", render: (r) => r.cliente_nombre ?? "—", sortable: true },
  { key: "tipo_trabajo", label: "Tipo Trabajo", sortable: true },
  { key: "tipo_cliente", label: "Tipo Cliente", sortable: true },
  { key: "tecnico_asignado", label: "Técnico", sortable: true },
  { key: "estatus", label: "Estatus", sortable: true },
  {
    key: "fecha_creacion",
    label: "Creación",
    sortable: true,
    render: (r) => r.fecha_creacion ? new Date(r.fecha_creacion).toLocaleDateString("es-GT") : "—",
  },
  {
    key: "fecha_finalizado",
    label: "Estado",
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

export default function OrdenesTrabajoPage() {
  const [items, setItems] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [tiposCliente, setTiposCliente] = useState([]);
  const [tiposTrabajo, setTiposTrabajo] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [tiposEstatus, setTiposEstatus] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    load();
    loadClientes();
    loadCotizaciones();
    loadMaestros();
  }, []);

  const load = async () => {
    setLoading(true);
    try { const { data } = await ordenesTrabajoService.getAll(); setItems(data.results ?? data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadClientes = async () => {
    try { const { data } = await clientesService.getAll(); setClientes(data.results ?? data); }
    catch (e) { console.error(e); }
  };

  const loadCotizaciones = async () => {
    try { const { data } = await cotizacionesService.getAll(); setCotizaciones(data.results ?? data); }
    catch (e) { console.error(e); }
  };

  const loadMaestros = async () => {
    try {
      const [tc, tt, per, est] = await Promise.all([
        tiposClienteService.getAll({ activo: true }),
        tiposTrabajoService.getAll({ activo: true }),
        personalService.getAll({ activo: true }),
        tiposEstatusService.getAll({ activo: true, modulo: "ordenes_trabajo" }),
      ]);
      setTiposCliente(tc.data.results ?? tc.data);
      setTiposTrabajo(tt.data.results ?? tt.data);
      setPersonal(per.data.results ?? per.data);
      setTiposEstatus(est.data.results ?? est.data);
    } catch (e) { console.error(e); }
  };

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let result = q
      ? items.filter((r) =>
          r.cliente_nombre?.toLowerCase().includes(q) ||
          r.tecnico_asignado?.toLowerCase().includes(q) ||
          r.tipo_trabajo?.toLowerCase().includes(q) ||
          r.tipo_cliente?.toLowerCase().includes(q) ||
          `OT-${String(r.id).padStart(4, "0")}`.toLowerCase().includes(q)
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

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, cliente: form.cliente || null, cotizacion: form.cotizacion || null };
    try {
      editing ? await ordenesTrabajoService.update(editing.id, payload) : await ordenesTrabajoService.create(payload);
      close(); load();
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error"); }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({
      ...item,
      cliente: item.cliente ?? "",
      cotizacion: item.cotizacion ?? "",
      fecha_inicio: item.fecha_inicio ?? "",
      fecha_finalizado: item.fecha_finalizado ?? "",
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta orden?")) return;
    await ordenesTrabajoService.remove(id); load();
  };

  const close = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const inp = (name, label, type = "text") => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={form[name]} onChange={(e) => set(name, e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Órdenes de Trabajo</h1>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <FontAwesomeIcon icon={faPlus} />
          Nueva OT
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, técnico, tipo…"
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
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>

      {open && (
        <Modal title={editing ? "Editar OT" : "Nueva Orden de Trabajo"} onClose={close}>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">

            {/* Cliente */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
              <select value={form.cliente} onChange={(e) => set("cliente", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sin cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.razon_social} — {c.nit}</option>
                ))}
              </select>
            </div>

            {/* Tipo de Cliente — desde datos maestros */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Cliente *</label>
              <select value={form.tipo_cliente} onChange={(e) => set("tipo_cliente", e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar…</option>
                {tiposCliente.map((tc) => (
                  <option key={tc.id} value={tc.nombre}>{tc.nombre}</option>
                ))}
              </select>
            </div>

            {/* Tipo de Trabajo — desde datos maestros */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Trabajo *</label>
              <select value={form.tipo_trabajo} onChange={(e) => set("tipo_trabajo", e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar…</option>
                {tiposTrabajo.map((tt) => (
                  <option key={tt.id} value={tt.nombre}>{tt.nombre}</option>
                ))}
              </select>
            </div>

            {/* Estatus — desde datos maestros */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estatus</label>
              <select value={form.estatus} onChange={(e) => set("estatus", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sin estatus —</option>
                {tiposEstatus.map((es) => (
                  <option key={es.id} value={es.nombre}>{es.nombre}</option>
                ))}
              </select>
            </div>

            {/* Técnico Asignado — desde datos maestros / personal */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Técnico Asignado</label>
              <select value={form.tecnico_asignado} onChange={(e) => set("tecnico_asignado", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sin asignar —</option>
                {personal.map((p) => (
                  <option key={p.id} value={p.nombre}>
                    {p.nombre}{p.cargo ? ` — ${p.cargo}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
              <textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={3} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {inp("fecha_inicio", "Fecha Inicio", "date")}
            {inp("fecha_finalizado", "Fecha Finalizado", "date")}

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Cotización (opcional)</label>
              <select value={form.cotizacion} onChange={(e) => set("cotizacion", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sin cotización —</option>
                {cotizaciones.map((c) => (
                  <option key={c.id} value={c.id}>
                    COT-{String(c.id).padStart(4, "0")} — {c.cliente_nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2 flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
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
