import { useEffect, useState, useMemo } from "react";
import { cotizacionesService } from "../../services/api/cotizaciones";
import { clientesService } from "../../services/api/clientes";
import { inventarioService } from "../../services/api/inventario";
import { tiposServicioService, tiposEstatusService, personalService } from "../../services/api/maestros";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

const EMPTY_FORM = { cliente: "", tipo: "", estatus: "", asesor: "" };
const EMPTY_ITEM = { nombre_producto: "", precio_unitario: "", porcentaje_iva: "19", porcentaje_isr: "0", cantidad: "1" };

const COLS = [
  { key: "id", label: "N°", sortable: true, render: (r) => `COT-${String(r.id).padStart(4, "0")}` },
  { key: "cliente_nombre", label: "Cliente", sortable: true },
  { key: "tipo", label: "Tipo de Servicio", sortable: true },
  { key: "asesor", label: "Asesor", sortable: true },
  {
    key: "estatus",
    label: "Estatus",
    sortable: true,
    render: (r) => (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
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

export default function CotizacionesPage() {
  const [items, setItems] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [tiposServicio, setTiposServicio] = useState([]);
  const [tiposEstatus, setTiposEstatus] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formItems, setFormItems] = useState([{ ...EMPTY_ITEM }]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    load();
    loadClientes();
    loadProductos();
    loadMaestros();
  }, []);

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
      const [ts, te, per] = await Promise.all([
        tiposServicioService.getAll({ activo: true }),
        tiposEstatusService.getAll({ activo: true, modulo: "cotizaciones" }),
        personalService.getAll({ activo: true }),
      ]);
      setTiposServicio(ts.data.results ?? ts.data);
      setTiposEstatus(te.data.results ?? te.data);
      setPersonal(per.data.results ?? per.data);
    } catch (e) { console.error(e); }
  };

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

  const addItem = () => setFormItems((fi) => [...fi, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setFormItems((fi) => fi.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) =>
    setFormItems((fi) => fi.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const itemTotal = (it) => {
    const p = parseFloat(it.precio_unitario) || 0;
    const iva = parseFloat(it.porcentaje_iva) || 0;
    const isr = parseFloat(it.porcentaje_isr) || 0;
    const q = parseInt(it.cantidad) || 0;
    return p * (1 + iva / 100 + isr / 100) * q;
  };

  const grandTotal = formItems.reduce((acc, it) => acc + itemTotal(it), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, items: formItems };
    try {
      editing ? await cotizacionesService.update(editing.id, payload) : await cotizacionesService.create(payload);
      close(); load();
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error"); }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({ cliente: item.cliente, tipo: item.tipo, estatus: item.estatus, asesor: item.asesor ?? "" });
    setFormItems(item.items?.length ? item.items.map((it) => ({
      nombre_producto: it.nombre_producto,
      precio_unitario: it.precio_unitario,
      porcentaje_iva: it.porcentaje_iva,
      porcentaje_isr: it.porcentaje_isr,
      cantidad: it.cantidad,
    })) : [{ ...EMPTY_ITEM }]);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta cotización?")) return;
    await cotizacionesService.remove(id); load();
  };

  const handlePdf = async (id) => {
    try {
      const { data } = await cotizacionesService.pdf(id);
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = `cotizacion_${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const close = () => { setOpen(false); setEditing(null); setForm(EMPTY_FORM); setFormItems([{ ...EMPTY_ITEM }]); };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-800">Cotizaciones</h1>
        <button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Nueva Cotización
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, estatus, asesor…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-1/4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {busqueda && (
            <span className="text-xs text-gray-400">
              {itemsFiltrados.length} resultado{itemsFiltrados.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <DataTable
          columns={COLS} data={itemsFiltrados} loading={loading}
          onEdit={handleEdit} onDelete={handleDelete}
          sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
          extra={(row) => (
            <button onClick={() => handlePdf(row.id)} className="text-purple-600 hover:text-purple-800 font-medium text-xs">
              PDF
            </button>
          )}
        />
      </div>

      {open && (
        <Modal title={editing ? "Editar Cotización" : "Nueva Cotización"} onClose={close} wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Cliente */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
                <select value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar…</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
                </select>
              </div>

              {/* Tipo de Servicio */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Servicio *</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar…</option>
                  {tiposServicio.map((ts) => <option key={ts.id} value={ts.nombre}>{ts.nombre}</option>)}
                </select>
              </div>

              {/* Estatus */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estatus *</label>
                <select value={form.estatus} onChange={(e) => setForm({ ...form, estatus: e.target.value })} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar…</option>
                  {tiposEstatus.map((te) => <option key={te.id} value={te.nombre}>{te.nombre}</option>)}
                </select>
              </div>

              {/* Asesor */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Asesor</label>
                <select value={form.asesor} onChange={(e) => setForm({ ...form, asesor: e.target.value })}
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

            {/* Ítems */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Ítems</span>
                <button type="button" onClick={addItem} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                  + Agregar ítem
                </button>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="px-2 py-2 text-left font-medium">Producto / Servicio</th>
                    <th className="px-2 py-2 text-right font-medium">P. Unit.</th>
                    <th className="px-2 py-2 text-right font-medium">IVA %</th>
                    <th className="px-2 py-2 text-right font-medium">ISR %</th>
                    <th className="px-2 py-2 text-right font-medium">Cant.</th>
                    <th className="px-2 py-2 text-right font-medium">Total</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {formItems.map((it, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-1 py-1 relative">
                        <input
                          value={it.nombre_producto}
                          onChange={(e) => { updateItem(i, "nombre_producto", e.target.value); setOpenDropdown(i); }}
                          onFocus={() => setOpenDropdown(i)}
                          onBlur={() => setTimeout(() => setOpenDropdown(null), 150)}
                          required placeholder="Buscar…"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        {openDropdown === i && (
                          <div className="absolute z-20 left-1 right-1 top-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
                            {productos
                              .filter((p) => !it.nombre_producto || p.nombre.toLowerCase().includes(it.nombre_producto.toLowerCase()))
                              .slice(0, 12)
                              .map((p) => (
                                <button key={p.id} type="button"
                                  onMouseDown={() => {
                                    updateItem(i, "nombre_producto", p.nombre);
                                    updateItem(i, "precio_unitario", p.precio_venta ?? p.costo_unitario ?? "");
                                    setOpenDropdown(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-0 flex justify-between items-center gap-2"
                                >
                                  <span className="font-medium truncate">{p.nombre}</span>
                                  {p.precio_venta && (
                                    <span className="text-gray-400 shrink-0">
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
                      </td>
                      {["precio_unitario", "porcentaje_iva", "porcentaje_isr", "cantidad"].map((k) => (
                        <td key={k} className="px-1 py-1">
                          <input type="number" min="0" step="0.01" value={it[k]}
                            onChange={(e) => updateItem(i, k, e.target.value)} required
                            className="w-20 border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-medium">
                        Q{itemTotal(it).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-1 py-1">
                        {formItems.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="px-2 py-2 text-right font-semibold text-sm">TOTAL</td>
                    <td className="px-2 py-2 text-right font-bold text-sm">
                      Q{grandTotal.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
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
