import { useEffect, useState, useMemo } from "react";
import { comprasService } from "../../services/api/compras";
import { proveedoresService } from "../../services/api/proveedores";
import { inventarioService } from "../../services/api/inventario";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

const EMPTY_FORM = { proveedor: "", fecha_despacho: "", tipo_pago: "contado" };
const EMPTY_ITEM = { producto: "", cantidad: "1", costo_unitario: "" };

export default function ComprasPage() {
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formItems, setFormItems] = useState([{ ...EMPTY_ITEM }]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => { load(); loadOpciones(); }, []);

  const load = async () => {
    setLoading(true);
    try { const { data } = await comprasService.getAll(); setItems(data.results ?? data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadOpciones = async () => {
    try {
      const [p, pr] = await Promise.all([proveedoresService.getAll(), inventarioService.getProductos()]);
      setProveedores(p.data.results ?? p.data);
      setProductos(pr.data.results ?? pr.data);
    } catch (e) { console.error(e); }
  };

  // Mapa id → nombre para proveedores
  const proveedorMap = useMemo(
    () => Object.fromEntries(proveedores.map((p) => [p.id, p.razon_social])),
    [proveedores]
  );

  const columnas = useMemo(() => [
    { key: "id", label: "N°", sortable: true, render: (r) => `COM-${String(r.id).padStart(4, "0")}` },
    {
      key: "proveedor",
      label: "Proveedor",
      sortable: true,
      render: (r) => proveedorMap[r.proveedor] ?? `#${r.proveedor}`,
    },
    {
      key: "fecha_despacho",
      label: "Fecha Despacho",
      sortable: true,
      render: (r) => r.fecha_despacho
        ? new Date(r.fecha_despacho + "T00:00:00").toLocaleDateString("es-GT")
        : "—",
    },
    {
      key: "tipo_pago",
      label: "Tipo Pago",
      render: (r) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          r.tipo_pago === "credito" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
        }`}>
          {r.tipo_pago === "credito" ? "Crédito" : "Contado"}
        </span>
      ),
    },
    {
      key: "total",
      label: "Total",
      sortable: true,
      render: (r) => {
        const t = (r.items ?? []).reduce(
          (acc, it) => acc + (parseFloat(it.costo_unitario) || 0) * (parseInt(it.cantidad) || 0),
          0
        );
        return `Q${t.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;
      },
    },
    { key: "items", label: "# Ítems", render: (r) => r.items?.length ?? 0 },
  ], [proveedorMap]);

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let result = q
      ? items.filter((r) => {
          const nombre = proveedorMap[r.proveedor] ?? "";
          return (
            nombre.toLowerCase().includes(q) ||
            `COM-${String(r.id).padStart(4, "0")}`.toLowerCase().includes(q) ||
            r.tipo_pago?.toLowerCase().includes(q)
          );
        })
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
  }, [items, busqueda, proveedorMap, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const addItem = () => setFormItems((fi) => [...fi, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setFormItems((fi) => fi.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) =>
    setFormItems((fi) => fi.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const subtotal = (it) => (parseFloat(it.costo_unitario) || 0) * (parseInt(it.cantidad) || 0);
  const total = formItems.reduce((acc, it) => acc + subtotal(it), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, items: formItems.map((it) => ({ ...it, producto: parseInt(it.producto) })) };
    try {
      editing ? await comprasService.update(editing.id, payload) : await comprasService.create(payload);
      close(); load();
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error"); }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({ proveedor: item.proveedor, fecha_despacho: item.fecha_despacho, tipo_pago: item.tipo_pago });
    setFormItems(item.items?.length ? item.items.map((it) => ({
      producto: it.producto, cantidad: it.cantidad, costo_unitario: it.costo_unitario,
    })) : [{ ...EMPTY_ITEM }]);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta compra?")) return;
    await comprasService.remove(id); load();
  };

  const close = () => { setOpen(false); setEditing(null); setForm(EMPTY_FORM); setFormItems([{ ...EMPTY_ITEM }]); };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-800">Compras</h1>
        <button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Nueva Compra
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por proveedor, tipo de pago…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-1/4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {busqueda && (
            <span className="text-xs text-gray-400">
              {itemsFiltrados.length} resultado{itemsFiltrados.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <DataTable
          columns={columnas}
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
        <Modal title={editing ? "Editar Compra" : "Nueva Compra"} onClose={close} wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor *</label>
                <select value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar…</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Despacho *</label>
                <input type="date" value={form.fecha_despacho}
                  onChange={(e) => setForm({ ...form, fecha_despacho: e.target.value })} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Pago</label>
                <select value={form.tipo_pago} onChange={(e) => setForm({ ...form, tipo_pago: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Productos</span>
                <button type="button" onClick={addItem}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium">+ Agregar producto</button>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="px-2 py-2 text-left font-medium">Producto</th>
                    <th className="px-2 py-2 text-right font-medium">Cant.</th>
                    <th className="px-2 py-2 text-right font-medium">Costo Unit.</th>
                    <th className="px-2 py-2 text-right font-medium">Subtotal</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {formItems.map((it, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-1 py-1">
                        <select value={it.producto} onChange={(e) => updateItem(i, "producto", e.target.value)} required
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                          <option value="">Seleccionar…</option>
                          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" min="1" value={it.cantidad}
                          onChange={(e) => updateItem(i, "cantidad", e.target.value)} required
                          className="w-20 border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" min="0" step="0.01" value={it.costo_unitario}
                          onChange={(e) => updateItem(i, "costo_unitario", e.target.value)} required
                          className="w-28 border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </td>
                      <td className="px-2 py-1 text-right font-medium">
                        Q{subtotal(it).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-1 py-1">
                        {formItems.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)}
                            className="text-red-400 hover:text-red-600 font-bold">✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="px-2 py-2 text-right font-semibold text-sm">TOTAL</td>
                    <td className="px-2 py-2 text-right font-bold text-sm">
                      Q{total.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
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
