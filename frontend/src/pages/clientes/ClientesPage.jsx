import { useEffect, useState, useMemo } from "react";
import { clientesService } from "../../services/api/clientes";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

const EMPTY = {
  razon_social: "", nit: "", email: "", telefono: "",
  direccion_comercial: "", nombre_comercial: "",
  nombre_contacto: "", telefono_contacto: "", email_contacto: "",
  tipo_cliente: "privado",
};

const COLS = [
  { key: "razon_social", label: "Razón Social", sortable: true },
  { key: "nit", label: "NIT", sortable: true },
  { key: "nombre_comercial", label: "Nombre Comercial", sortable: true },
  { key: "email", label: "Email" },
  { key: "telefono", label: "Teléfono" },
  {
    key: "tipo_cliente",
    label: "Tipo",
    render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        r.tipo_cliente === "publico" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
      }`}>
        {r.tipo_cliente === "publico" ? "Público" : "Privado"}
      </span>
    ),
  },
];

function Input({ label, name, form, setForm, type = "text", required = true }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export default function ClientesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const { data } = await clientesService.getAll(); setItems(data.results ?? data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return items;
    return items.filter((r) =>
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
      editing ? await clientesService.update(editing.id, form) : await clientesService.create(form);
      close(); load();
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error"); }
  };

  const handleEdit = (item) => { setEditing(item); setForm(item); setOpen(true); };
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    await clientesService.remove(id); load();
  };
  const close = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-800">Clientes</h1>
        <button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por razón social, NIT, email…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-1/4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {busqueda && (
            <span className="text-xs text-gray-400">
              {itemsFiltrados.length} resultado{itemsFiltrados.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <DataTable columns={COLS} data={itemsFiltrados} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {open && (
        <Modal title={editing ? "Editar Cliente" : "Nuevo Cliente"} onClose={close}>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <Input label="Razón Social" name="razon_social" form={form} setForm={setForm} />
            <Input label="NIT" name="nit" form={form} setForm={setForm} />
            <Input label="Email" name="email" form={form} setForm={setForm} type="email" />
            <Input label="Teléfono" name="telefono" form={form} setForm={setForm} />
            <div className="col-span-2">
              <Input label="Dirección Comercial" name="direccion_comercial" form={form} setForm={setForm} />
            </div>
            <Input label="Nombre Comercial" name="nombre_comercial" form={form} setForm={setForm} />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Cliente</label>
              <select value={form.tipo_cliente} onChange={(e) => setForm({ ...form, tipo_cliente: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="privado">Privado</option>
                <option value="publico">Público</option>
              </select>
            </div>
            <Input label="Nombre Contacto" name="nombre_contacto" form={form} setForm={setForm} />
            <Input label="Teléfono Contacto" name="telefono_contacto" form={form} setForm={setForm} />
            <div className="col-span-2">
              <Input label="Email Contacto" name="email_contacto" form={form} setForm={setForm} type="email" />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={close} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editing ? "Actualizar" : "Crear"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
