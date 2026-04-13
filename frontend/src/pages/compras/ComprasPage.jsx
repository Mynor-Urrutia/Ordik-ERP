import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { comprasService, cotizacionesProveedorService } from "../../services/api/compras";
import { proveedoresService } from "../../services/api/proveedores";
import { inventarioService } from "../../services/api/inventario";
import { tiposPagoService } from "../../services/api/maestros";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  `Q${parseFloat(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY_FORM = { proveedor: "", fecha_despacho: "", tipo_pago: "", cotizacion_proveedor: "" };
const EMPTY_ITEM = { producto: "", cantidad: "1", costo_unitario: "" };

const EMPTY_COT_FORM = { proveedor: "", fecha: new Date().toISOString().slice(0, 10), notas: "" };
const EMPTY_COT_ITEM = { producto: "", cantidad: "1", precio_unitario: "" };

// ── AutocompleteSearch ────────────────────────────────────────────────────────
function AutocompleteSearch({ items, value, onChange, filterFn, renderBadge, renderOption, placeholder = "Buscar…" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);

  const seleccionado = items.find((it) => String(it.id) === String(value));

  const filtrados = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items.slice(0, 25);
    return items.filter((it) => filterFn(it, q)).slice(0, 25);
  }, [items, query, filterFn]);

  const calcPos = () => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) });
  };

  const handleSelect = (it) => { onChange(String(it.id)); setQuery(""); setOpen(false); };
  const handleClear  = ()   => { onChange(""); setQuery(""); setOpen(false); };

  return (
    <div className="w-full">
      {seleccionado ? (
        <div className="flex items-center gap-1.5 border border-blue-400 bg-blue-50 rounded px-2 py-1.5 w-full min-h-[2.2rem]">
          {renderBadge(seleccionado)}
          <button type="button" onClick={handleClear}
            className="text-gray-400 hover:text-red-500 font-bold shrink-0 text-xs ml-auto">✕</button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={placeholder}
            onChange={(e) => { setQuery(e.target.value); calcPos(); setOpen(true); }}
            onFocus={() => { calcPos(); setOpen(true); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {open && createPortal(
            <div
              style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
              className="bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
            >
              {filtrados.length === 0
                ? <p className="px-3 py-2 text-xs text-gray-400 italic">Sin resultados</p>
                : filtrados.map((it) => (
                  <button key={it.id} type="button" onMouseDown={() => handleSelect(it)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 border-b border-gray-50 last:border-0">
                    {renderOption(it)}
                  </button>
                ))
              }
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}

// ── ProductoSearch ────────────────────────────────────────────────────────────
function ProductoSearch({ productos, value, onChange, small }) {
  const filterFn    = useCallback((p, q) => p.nombre?.toLowerCase().includes(q) || p.cod_producto?.toLowerCase().includes(q), []);
  const renderBadge = useCallback((p) => (
    <>
      <span className="font-mono text-blue-700 font-semibold text-xs shrink-0">{p.cod_producto}</span>
      <span className="text-gray-700 text-xs truncate flex-1">{p.nombre}</span>
    </>
  ), []);
  const renderOption = useCallback((p) => (
    <>
      <span className="font-mono text-blue-600 font-semibold text-xs shrink-0 w-20">{p.cod_producto ?? "—"}</span>
      <span className="text-gray-800 text-xs truncate flex-1">{p.nombre}</span>
      <span className={`text-xs font-medium shrink-0 ${p.stock_actual <= 0 ? "text-red-500" : "text-green-600"}`}>
        stock: {p.stock_actual}
      </span>
    </>
  ), []);

  return (
    <AutocompleteSearch
      items={productos}
      value={value}
      onChange={onChange}
      filterFn={filterFn}
      renderBadge={renderBadge}
      renderOption={renderOption}
      placeholder="Código o nombre…"
    />
  );
}

// ── ProveedorSearch ───────────────────────────────────────────────────────────
function ProveedorSearch({ proveedores, value, onChange }) {
  const filterFn    = useCallback((p, q) => p.razon_social?.toLowerCase().includes(q) || p.nit?.toLowerCase().includes(q), []);
  const renderBadge = useCallback((p) => (
    <>
      <span className="text-gray-700 text-xs truncate flex-1">{p.razon_social}</span>
      <span className="text-gray-400 text-xs shrink-0">{p.nit}</span>
    </>
  ), []);
  const renderOption = useCallback((p) => (
    <>
      <span className="text-gray-800 text-xs truncate flex-1">{p.razon_social}</span>
      <span className="text-gray-400 text-xs shrink-0">{p.nit}</span>
    </>
  ), []);

  return (
    <AutocompleteSearch
      items={proveedores}
      value={value}
      onChange={onChange}
      filterFn={filterFn}
      renderBadge={renderBadge}
      renderOption={renderOption}
      placeholder="Razón social o NIT…"
    />
  );
}

// ── Tabla de ítems (reutilizable compra y cotización) ─────────────────────────
function ItemsTable({ items, productos, precioKey, onUpdate, onRemove, onAdd }) {
  const subtotal = (it) => (parseFloat(it[precioKey]) || 0) * (parseInt(it.cantidad) || 0);
  const total    = items.reduce((acc, it) => acc + subtotal(it), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">Productos</span>
        <button type="button" onClick={onAdd}
          className="text-blue-600 hover:text-blue-800 text-xs font-medium">+ Agregar producto</button>
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-600">
            <th className="px-2 py-2 text-left font-medium">Producto</th>
            <th className="px-2 py-2 text-right font-medium w-20">Cant.</th>
            <th className="px-2 py-2 text-right font-medium w-28">
              {precioKey === "costo_unitario" ? "Costo Unit." : "Precio Unit."}
            </th>
            <th className="px-2 py-2 text-right font-medium w-24">Subtotal</th>
            <th className="px-2 py-2 w-6"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="px-1 py-1">
                <ProductoSearch
                  productos={productos}
                  value={it.producto}
                  onChange={(v) => onUpdate(i, "producto", v)}
                />
              </td>
              <td className="px-1 py-1">
                <input
                  type="number" min="1" value={it.cantidad}
                  onChange={(e) => onUpdate(i, "cantidad", e.target.value)} required
                  className="w-full border border-gray-200 rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </td>
              <td className="px-1 py-1">
                <input
                  type="number" min="0" step="0.01" value={it[precioKey]}
                  onChange={(e) => onUpdate(i, precioKey, e.target.value)} required
                  className="w-full border border-gray-200 rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </td>
              <td className="px-2 py-1 text-right font-medium">
                {fmt(subtotal(it))}
              </td>
              <td className="px-1 py-1 text-center">
                {items.length > 1 && (
                  <button type="button" onClick={() => onRemove(i)}
                    className="text-red-400 hover:text-red-600 font-bold">✕</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="px-2 py-2 text-right font-semibold text-sm">TOTAL</td>
            <td className="px-2 py-2 text-right font-bold text-sm">{fmt(total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Modal Cotización Proveedor ────────────────────────────────────────────────
function ModalCotizacion({ proveedores, productos, onClose, onCreated }) {
  const [form, setForm]   = useState(EMPTY_COT_FORM);
  const [items, setItems] = useState([{ ...EMPTY_COT_ITEM }]);
  const [saving, setSaving] = useState(false);

  const addItem    = () => setItems((fi) => [...fi, { ...EMPTY_COT_ITEM }]);
  const removeItem = (i) => setItems((fi) => fi.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) => setItems((fi) => fi.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        proveedor: parseInt(form.proveedor),
        items: items.map((it) => ({
          producto: parseInt(it.producto),
          cantidad: parseInt(it.cantidad),
          precio_unitario: it.precio_unitario,
        })),
      };
      const { data } = await cotizacionesProveedorService.create(payload);
      onCreated(data);
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Registrar Cotización de Proveedor" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor *</label>
            <ProveedorSearch
              proveedores={proveedores}
              value={form.proveedor}
              onChange={(v) => setForm({ ...form, proveedor: v })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
            <input type="date" value={form.fecha} required
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
          <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Observaciones, condiciones del proveedor…" />
        </div>

        <ItemsTable
          items={items}
          productos={productos}
          precioKey="precio_unitario"
          onUpdate={updateItem}
          onRemove={removeItem}
          onAdd={addItem}
        />

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Guardando…" : "Registrar Cotización"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ComprasPage() {
  const [items, setItems]           = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos]   = useState([]);
  const [tiposPago, setTiposPago]   = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [formItems, setFormItems]   = useState([{ ...EMPTY_ITEM }]);
  const [editing, setEditing]       = useState(null);
  const [open, setOpen]             = useState(false);
  const [openCot, setOpenCot]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [busqueda, setBusqueda]     = useState("");
  const [sortKey, setSortKey]       = useState("id");
  const [sortDir, setSortDir]       = useState("desc");

  useEffect(() => { load(); loadOpciones(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await comprasService.getAll();
      setItems(data.results ?? data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadOpciones = async () => {
    try {
      const [p, pr, tp, cot] = await Promise.all([
        proveedoresService.getAll(),
        inventarioService.getProductos(),
        tiposPagoService.getAll({ activo: true }),
        cotizacionesProveedorService.getAll(),
      ]);
      setProveedores(p.data.results ?? p.data);
      setProductos(pr.data.results ?? pr.data);
      setTiposPago(tp.data.results ?? tp.data);
      setCotizaciones(cot.data.results ?? cot.data);
    } catch (e) { console.error(e); }
  };

  // Mapas rápidos id → nombre
  const proveedorMap = useMemo(
    () => Object.fromEntries(proveedores.map((p) => [p.id, p.razon_social])),
    [proveedores]
  );
  const tipoPagoMap = useMemo(
    () => Object.fromEntries(tiposPago.map((t) => [t.id, t.nombre])),
    [tiposPago]
  );

  // ── Tabla principal ──────────────────────────────────────────────────────
  const columnas = useMemo(() => [
    {
      key: "id",
      label: "N°",
      sortable: true,
      render: (r) => `COM-${String(r.id).padStart(4, "0")}`,
    },
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
      render: (r) => r.tipo_pago_nombre
        ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{r.tipo_pago_nombre}</span>
        : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: "cotizacion_correlativo",
      label: "Cotización",
      render: (r) => r.cotizacion_correlativo
        ? <span className="font-mono text-xs text-indigo-600">{r.cotizacion_correlativo}</span>
        : <span className="text-gray-300 text-xs">—</span>,
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
        return fmt(t);
      },
    },
    { key: "items", label: "# Ítems", render: (r) => r.items?.length ?? 0 },
  ], [proveedorMap, tipoPagoMap]);

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let result = q
      ? items.filter((r) => {
          const nombre = proveedorMap[r.proveedor] ?? "";
          const tpago  = r.tipo_pago_nombre ?? "";
          return (
            nombre.toLowerCase().includes(q) ||
            `COM-${String(r.id).padStart(4, "0")}`.toLowerCase().includes(q) ||
            tpago.toLowerCase().includes(q) ||
            (r.cotizacion_correlativo ?? "").toLowerCase().includes(q)
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

  // ── Form de compra ───────────────────────────────────────────────────────
  const addItem    = () => setFormItems((fi) => [...fi, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setFormItems((fi) => fi.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) =>
    setFormItems((fi) => fi.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      proveedor: parseInt(form.proveedor),
      tipo_pago: form.tipo_pago ? parseInt(form.tipo_pago) : null,
      cotizacion_proveedor: form.cotizacion_proveedor ? parseInt(form.cotizacion_proveedor) : null,
      items: formItems.map((it) => ({
        producto: parseInt(it.producto),
        cantidad: parseInt(it.cantidad),
        costo_unitario: it.costo_unitario,
      })),
    };
    try {
      editing
        ? await comprasService.update(editing.id, payload)
        : await comprasService.create(payload);
      close(); load();
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "Error");
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({
      proveedor: item.proveedor,
      fecha_despacho: item.fecha_despacho,
      tipo_pago: item.tipo_pago ?? "",
      cotizacion_proveedor: item.cotizacion_proveedor ?? "",
    });
    setFormItems(
      item.items?.length
        ? item.items.map((it) => ({ producto: it.producto, cantidad: it.cantidad, costo_unitario: it.costo_unitario }))
        : [{ ...EMPTY_ITEM }]
    );
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta compra?")) return;
    await comprasService.remove(id); load();
  };

  const close = () => {
    setOpen(false); setEditing(null);
    setForm(EMPTY_FORM); setFormItems([{ ...EMPTY_ITEM }]);
  };

  // Cuando se registra una cotización desde el modal, la agregamos a la lista
  // y la pre-seleccionamos en el formulario de compra
  const handleCotizacionCreada = (cot) => {
    setCotizaciones((prev) => [cot, ...prev]);
    setForm((f) => ({ ...f, proveedor: String(cot.proveedor), cotizacion_proveedor: String(cot.id) }));
    // Pre-cargar los items de la cotización en la compra
    if (cot.items?.length) {
      setFormItems(cot.items.map((it) => ({
        producto: String(it.producto),
        cantidad: String(it.cantidad),
        costo_unitario: String(it.precio_unitario),
      })));
    }
    setOpenCot(false);
    setOpen(true);
  };

  // Cotizaciones filtradas por proveedor seleccionado
  const cotizacionesFiltradas = useMemo(() => {
    if (!form.proveedor) return cotizaciones;
    return cotizaciones.filter((c) => String(c.proveedor) === String(form.proveedor));
  }, [cotizaciones, form.proveedor]);

  const total = formItems.reduce(
    (acc, it) => acc + (parseFloat(it.costo_unitario) || 0) * (parseInt(it.cantidad) || 0),
    0
  );

  return (
    <div>
      {/* ── Encabezado ── */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-800">Compras</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setOpenCot(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Cotización Proveedor
          </button>
          <button
            onClick={() => setOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Nueva Compra
          </button>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por proveedor, tipo de pago, correlativo…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* ── Modal Cotización Proveedor ── */}
      {openCot && (
        <ModalCotizacion
          proveedores={proveedores}
          productos={productos}
          onClose={() => setOpenCot(false)}
          onCreated={handleCotizacionCreada}
        />
      )}

      {/* ── Modal Compra ── */}
      {open && (
        <Modal title={editing ? "Editar Compra" : "Nueva Compra"} onClose={close} wide>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Encabezado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor *</label>
                <ProveedorSearch
                  proveedores={proveedores}
                  value={form.proveedor}
                  onChange={(v) => setForm({ ...form, proveedor: v, cotizacion_proveedor: "" })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Despacho *</label>
                <input type="date" value={form.fecha_despacho} required
                  onChange={(e) => setForm({ ...form, fecha_despacho: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Pago</label>
                <select
                  value={form.tipo_pago}
                  onChange={(e) => setForm({ ...form, tipo_pago: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin especificar</option>
                  {tiposPago.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}{t.dias_plazo > 0 ? ` (${t.dias_plazo} días)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cotización del Proveedor</label>
                <select
                  value={form.cotizacion_proveedor}
                  onChange={(e) => setForm({ ...form, cotizacion_proveedor: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin cotización</option>
                  {cotizacionesFiltradas.map((c) => (
                    <option key={c.id} value={c.id}>{c.correlativo}</option>
                  ))}
                </select>
                {!form.proveedor && (
                  <p className="text-xs text-gray-400 mt-1">Seleccioná un proveedor para filtrar cotizaciones</p>
                )}
              </div>
            </div>

            {/* Ítems */}
            <ItemsTable
              items={formItems}
              productos={productos}
              precioKey="costo_unitario"
              onUpdate={updateItem}
              onRemove={removeItem}
              onAdd={addItem}
            />

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={close}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editing ? "Actualizar" : "Crear"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
