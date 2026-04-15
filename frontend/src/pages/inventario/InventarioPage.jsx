import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { inventarioService } from "../../services/api/inventario";
import { proveedoresService } from "../../services/api/proveedores";
import { comprasService } from "../../services/api/compras";
import { marcasService, modelosService, tiposProductoService } from "../../services/api/maestros";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

// ── Constantes ───────────────────────────────────────────────────────────────
const EMPTY = {
  nombre: "", marca: "", modelo: "",
  categoria: "", uso: "", costo_unitario: "",
};

const EMPTY_ENTRADA = {
  producto: "", cantidad: "", costo_unitario: "", proveedor: "",
  numero_factura: "", orden_compra: "", observacion: "",
};

const EMPTY_SALIDA = {
  producto: "", cantidad: "", vale_salida: "", referencia_ot: "", observacion: "",
};

const fmt = (n) =>
  `Q${parseFloat(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const sel = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";
const inp_cls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

// ── Filtro en encabezado de columna ─────────────────────────────────────────
function HeaderFilter({ options, selected, onToggle, onClear, open, onToggleOpen }) {
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onToggleOpen(); }}
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors ${
          selected.length > 0
            ? "bg-blue-400 text-white"
            : "bg-white/20 text-white/80 hover:bg-white/30"
        }`}
      >
        ▼
        {selected.length > 0 && (
          <span className="bg-white text-blue-600 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold leading-none">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-30 top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl min-w-44 max-h-52 overflow-y-auto py-1 text-gray-700">
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400 italic">Sin opciones</p>
          )}
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} className="accent-blue-600" />
              {opt}
            </label>
          ))}
          {selected.length > 0 && (
            <div className="border-t mt-1 pt-1 px-3 pb-1">
              <button type="button" onMouseDown={onClear} className="text-xs text-red-500 hover:text-red-700">
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Autocomplete genérico ────────────────────────────────────────────────────
/**
 * AutocompleteSearch — componente base reutilizable.
 * @param {Array}    items        — lista de objetos a buscar
 * @param {string}   value        — ID del item seleccionado
 * @param {Function} onChange     — recibe el ID como string
 * @param {Function} filterFn     — (item, query) => bool
 * @param {Function} renderBadge  — (item) => JSX del badge cuando está seleccionado
 * @param {Function} renderOption — (item) => JSX de cada fila del dropdown
 * @param {string}   placeholder
 */
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
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 300) });
  };

  const handleSelect = (it) => { onChange(String(it.id)); setQuery(""); setOpen(false); };
  const handleClear  = ()   => { onChange(""); setQuery(""); setOpen(false); };

  return (
    <div className="w-full">
      {seleccionado ? (
        <div className="flex items-center gap-1.5 border border-teal-400 bg-teal-50 rounded px-2 py-1.5 w-full h-[2.2rem]">
          {renderBadge(seleccionado)}
          <button type="button" onClick={handleClear} className="text-gray-400 hover:text-red-500 font-bold shrink-0 text-xs ml-auto">✕</button>
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
            className="bulk-inp w-full"
          />
          {open && createPortal(
            <div
              style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
              className="bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
            >
              {filtrados.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400 italic">Sin resultados</p>
              ) : filtrados.map((it) => (
                <button key={it.id} type="button" onMouseDown={() => handleSelect(it)}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center gap-2 border-b border-gray-50 last:border-0">
                  {renderOption(it)}
                </button>
              ))}
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}

// ── ProductoSearch ────────────────────────────────────────────────────────────
function ProductoSearch({ productos, value, onChange }) {
  const filterFn     = useCallback((p, q) => p.nombre?.toLowerCase().includes(q) || p.cod_producto?.toLowerCase().includes(q), []);
  const renderBadge  = useCallback((p) => (
    <>
      <span className="font-mono text-teal-700 font-semibold text-xs shrink-0">{p.cod_producto}</span>
      <span className="text-gray-700 text-xs truncate flex-1">{p.nombre}</span>
      <span className="text-gray-400 text-xs shrink-0">stock: {p.stock_actual}</span>
    </>
  ), []);
  const renderOption = useCallback((p) => (
    <>
      <span className="font-mono text-teal-700 font-semibold text-xs shrink-0 w-20">{p.cod_producto ?? "—"}</span>
      <span className="text-gray-800 text-xs truncate flex-1">{p.nombre}</span>
      <span className={`text-xs font-medium shrink-0 ${p.stock_actual <= 0 ? "text-red-500" : "text-green-600"}`}>{p.stock_actual}</span>
    </>
  ), []);

  return <AutocompleteSearch items={productos} value={value} onChange={onChange}
    filterFn={filterFn} renderBadge={renderBadge} renderOption={renderOption}
    placeholder="Código o nombre…" />;
}

// ── ProveedorSearch ───────────────────────────────────────────────────────────
function ProveedorSearch({ proveedores, value, onChange }) {
  const filterFn     = useCallback((p, q) => p.razon_social?.toLowerCase().includes(q) || p.nit?.toLowerCase().includes(q), []);
  const renderBadge  = useCallback((p) => (
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

  return <AutocompleteSearch items={proveedores} value={value} onChange={onChange}
    filterFn={filterFn} renderBadge={renderBadge} renderOption={renderOption}
    placeholder="Razón social o NIT…" />;
}

// ── OCSearch ──────────────────────────────────────────────────────────────────
function OCSearch({ compras, value, onChange, inputClass = "bulk-inp w-full" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);

  const seleccionada = compras.find((c) => c.correlativo === value);

  const filtradas = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return compras.slice(0, 25);
    return compras.filter((c) =>
      c.correlativo?.toLowerCase().includes(q) ||
      c.proveedor_nombre?.toLowerCase().includes(q)
    ).slice(0, 25);
  }, [compras, query]);

  const calcPos = () => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 340) });
  };

  const handleSelect = (c) => { onChange(c.correlativo); setQuery(""); setOpen(false); };
  const handleClear  = ()   => { onChange(""); setQuery(""); setOpen(false); };

  return (
    <div className="w-full">
      {seleccionada ? (
        <div className="flex items-center gap-1.5 border border-teal-400 bg-teal-50 rounded px-2 py-1.5 w-full h-[2.2rem]">
          <span className="font-mono text-teal-700 font-semibold text-xs shrink-0">{seleccionada.correlativo}</span>
          <span className="text-gray-500 text-xs truncate flex-1">{seleccionada.proveedor_nombre}</span>
          <button type="button" onClick={handleClear} className="text-gray-400 hover:text-red-500 font-bold shrink-0 text-xs ml-auto">✕</button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Buscar OC registrada…"
            onChange={(e) => { setQuery(e.target.value); calcPos(); setOpen(true); }}
            onFocus={() => { calcPos(); setOpen(true); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className={inputClass}
          />
          {open && createPortal(
            <div
              style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
              className="bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
            >
              {filtradas.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400 italic">No hay OC registradas — creá una en Compras primero</p>
              ) : filtradas.map((c) => (
                <button key={c.id} type="button" onMouseDown={() => handleSelect(c)}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center gap-2 border-b border-gray-50 last:border-0">
                  <span className="font-mono text-teal-700 font-semibold text-xs shrink-0 w-40">{c.correlativo}</span>
                  <span className="text-gray-800 text-xs truncate flex-1">{c.proveedor_nombre}</span>
                  <span className="text-gray-400 text-xs shrink-0">{c.fecha_despacho}</span>
                </button>
              ))}
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function InventarioPage() {
  // Datos maestros y productos
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [compras, setCompras] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [tiposProducto, setTiposProducto] = useState([]);

  // Formulario producto
  const [form, setForm] = useState(EMPTY);
  const [selectedMarcaId, setSelectedMarcaId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Búsqueda, filtros y orden
  const [busqueda, setBusqueda] = useState("");
  const [categoriasSelec, setCategoriasSelec] = useState([]);
  const [openFilter, setOpenFilter] = useState(null);
  const [sortKey, setSortKey] = useState("nombre");
  const [sortDir, setSortDir] = useState("asc");

  // Modal detalle producto
  const [detailProducto, setDetailProducto] = useState(null);
  const [detailMovimientos, setDetailMovimientos] = useState([]);
  const [detailTab, setDetailTab] = useState("todos");
  const [openDetail, setOpenDetail] = useState(false);

  // KARDEX individual
  const [cardexProducto, setCardexProducto] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [cardexTab, setCardexTab] = useState("entrada");
  const [cardexEntrada, setCardexEntrada] = useState({ ...EMPTY_ENTRADA });
  const [cardexSalida, setCardexSalida] = useState({ ...EMPTY_SALIDA });
  const [openCardex, setOpenCardex] = useState(false);

  // KARDEX masivo
  const [openBulk, setOpenBulk] = useState(false);
  const [bulkTab, setBulkTab] = useState("entradas");
  const [bulkEntradas, setBulkEntradas] = useState([{ ...EMPTY_ENTRADA }]);
  const [bulkSalidas, setBulkSalidas] = useState([{ ...EMPTY_SALIDA }]);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => { load(); loadAuxiliar(); }, []);

  useEffect(() => {
    if (!openFilter) return;
    const handler = (e) => {
      if (!e.target.closest("[data-filter-dropdown]")) setOpenFilter(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openFilter]);

  const load = async () => {
    setLoading(true);
    try { const { data } = await inventarioService.getProductos(); setProductos(data.results ?? data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadAuxiliar = async () => {
    try {
      const [prov, mar, mod, tp, oc] = await Promise.all([
        proveedoresService.getAll(),
        marcasService.getAll({ activo: true }),
        modelosService.getAll({ activo: true }),
        tiposProductoService.getAll({ activo: true }),
        comprasService.getAll(),
      ]);
      setProveedores(prov.data.results ?? prov.data);
      setMarcas(mar.data.results ?? mar.data);
      setModelos(mod.data.results ?? mod.data);
      setTiposProducto(tp.data.results ?? tp.data);
      setCompras(oc.data.results ?? oc.data);
    } catch (e) { console.error(e); }
  };

  const loadMovimientos = async (id) => {
    try { const { data } = await inventarioService.getMovimientos(id); setMovimientos(data.results ?? data); }
    catch (e) { console.error(e); }
  };

  // ── Filtrado + ordenamiento ────────────────────────────────────────────────
  const categoriasUnicas = useMemo(
    () => [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort(),
    [productos]
  );

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let result = q
      ? productos.filter((p) =>
          p.nombre?.toLowerCase().includes(q) ||
          p.cod_producto?.toLowerCase().includes(q) ||
          p.categoria?.toLowerCase().includes(q) ||
          p.marca?.toLowerCase().includes(q)
        )
      : [...productos];

    if (categoriasSelec.length > 0)
      result = result.filter((p) => categoriasSelec.includes(p.categoria));

    result.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "es");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [productos, busqueda, categoriasSelec, sortKey, sortDir]);

  const toggleCategoria = useCallback(
    (v) => setCategoriasSelec((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]),
    []
  );

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Columnas ───────────────────────────────────────────────────────────────
  const columnas = useMemo(() => [
    { key: "cod_producto", label: "Código", sortable: true, render: (r) => (
      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
        {r.cod_producto ?? "—"}
      </span>
    )},
    { key: "nombre",   label: "Nombre",   sortable: true },
    { key: "marca",    label: "Marca",    sortable: true },
    { key: "modelo",   label: "Modelo",   sortable: true },
    {
      key: "categoria",
      label: "Categoría",
      sortable: true,
      filterSlot: (
        <div data-filter-dropdown>
          <HeaderFilter
            options={categoriasUnicas}
            selected={categoriasSelec}
            onToggle={toggleCategoria}
            onClear={() => setCategoriasSelec([])}
            open={openFilter === "categoria"}
            onToggleOpen={() => setOpenFilter((f) => f === "categoria" ? null : "categoria")}
          />
        </div>
      ),
    },
    {
      key: "costo_unitario",
      label: "Costo Unit.",
      sortable: true,
      render: (r) => fmt(r.costo_unitario),
    },
    {
      key: "stock_actual",
      label: "Stock",
      sortable: true,
      render: (r) => (
        <span className={`font-semibold ${r.stock_actual <= 0 ? "text-red-600" : r.stock_actual < 5 ? "text-amber-600" : "text-green-600"}`}>
          {r.stock_actual}
        </span>
      ),
    },
    {
      key: "precio_venta",
      label: "P. Venta",
      sortable: true,
      render: (r) => r.precio_venta ? fmt(r.precio_venta) : "—",
    },
  ], [categoriasUnicas, categoriasSelec, openFilter, toggleCategoria]);

  // ── Producto CRUD ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      editing
        ? await inventarioService.updateProducto(editing.id, form)
        : await inventarioService.createProducto(form);
      close(); load();
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error"); }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({
      nombre: item.nombre ?? "",
      marca: item.marca ?? "",
      modelo: item.modelo ?? "",
      categoria: item.categoria ?? "",
      uso: item.uso ?? "",
      costo_unitario: item.costo_unitario ?? "",
    });
    const marcaObj = marcas.find((m) => m.nombre === item.marca);
    setSelectedMarcaId(marcaObj?.id ?? null);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este producto?")) return;
    await inventarioService.removeProducto(id); load();
  };

  const close = () => { setOpen(false); setEditing(null); setForm(EMPTY); setSelectedMarcaId(null); };

  const inp = (name, label, type = "text") => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[name] ?? ""}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        required={["nombre", "costo_unitario"].includes(name)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  // ── Modal detalle ──────────────────────────────────────────────────────────
  const openDetailModal = async (producto) => {
    setDetailProducto(producto);
    setDetailTab("todos");
    setOpenDetail(true);
    try {
      const { data } = await inventarioService.getMovimientos(producto.id);
      setDetailMovimientos(data.results ?? data);
    } catch (e) { console.error(e); }
  };

  // ── KARDEX individual ──────────────────────────────────────────────────────
  const openCardexModal = (producto) => {
    setCardexProducto(producto);
    loadMovimientos(producto.id);
    setCardexTab("entrada");
    setCardexEntrada({ ...EMPTY_ENTRADA });
    setCardexSalida({ ...EMPTY_SALIDA });
    setOpenCardex(true);
  };

  const handleCardexEntradaSubmit = async (e) => {
    e.preventDefault();
    try {
      await inventarioService.createMovimiento({
        producto: cardexProducto.id,
        tipo: "entrada",
        cantidad: parseInt(cardexEntrada.cantidad),
        costo_unitario: cardexEntrada.costo_unitario ? parseFloat(cardexEntrada.costo_unitario) : null,
        proveedor: cardexEntrada.proveedor || null,
        numero_factura: cardexEntrada.numero_factura,
        orden_compra: cardexEntrada.orden_compra,
        observacion: cardexEntrada.observacion,
      });
      load();
      loadMovimientos(cardexProducto.id);
      setCardexEntrada({ ...EMPTY_ENTRADA });
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error"); }
  };

  const handleCardexSalidaSubmit = async (e) => {
    e.preventDefault();
    try {
      await inventarioService.createMovimiento({
        producto: cardexProducto.id,
        tipo: "salida",
        cantidad: parseInt(cardexSalida.cantidad),
        vale_salida: cardexSalida.vale_salida,
        referencia_ot: cardexSalida.referencia_ot,
        observacion: cardexSalida.observacion,
      });
      load();
      loadMovimientos(cardexProducto.id);
      setCardexSalida({ ...EMPTY_SALIDA });
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error"); }
  };

  // ── KARDEX masivo ──────────────────────────────────────────────────────────
  const updateBulkEntrada = (i, k, v) =>
    setBulkEntradas((r) => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
  const updateBulkSalida = (i, k, v) =>
    setBulkSalidas((r) => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setBulkLoading(true);
    try {
      const entradas = bulkEntradas
        .filter((r) => r.producto && r.cantidad)
        .map((r) => ({
          producto: parseInt(r.producto),
          tipo: "entrada",
          cantidad: parseInt(r.cantidad),
          costo_unitario: r.costo_unitario ? parseFloat(r.costo_unitario) : null,
          proveedor: r.proveedor || null,
          numero_factura: r.numero_factura,
          orden_compra: r.orden_compra,
          observacion: r.observacion,
        }));
      const salidas = bulkSalidas
        .filter((r) => r.producto && r.cantidad)
        .map((r) => ({
          producto: parseInt(r.producto),
          tipo: "salida",
          cantidad: parseInt(r.cantidad),
          vale_salida: r.vale_salida,
          referencia_ot: r.referencia_ot,
          observacion: r.observacion,
        }));

      for (const row of [...entradas, ...salidas]) {
        await inventarioService.createMovimiento(row);
      }
      setOpenBulk(false);
      setBulkEntradas([{ ...EMPTY_ENTRADA }]);
      setBulkSalidas([{ ...EMPTY_SALIDA }]);
      setBulkTab("entradas");
      load();
    } catch (e) {
      alert(e.response?.data ? JSON.stringify(e.response.data) : "Error al registrar movimientos");
    } finally { setBulkLoading(false); }
  };

  const closeBulk = () => {
    setOpenBulk(false);
    setBulkEntradas([{ ...EMPTY_ENTRADA }]);
    setBulkSalidas([{ ...EMPTY_SALIDA }]);
    setBulkTab("entradas");
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-800">Inventario</h1>
        <div className="flex gap-2">
          <button onClick={() => setOpenBulk(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            KARDEX Masivo
          </button>
          <button onClick={() => setOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Nuevo Producto
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, nombre, marca, categoría…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-1/4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {(busqueda || categoriasSelec.length > 0) && (
            <span className="text-xs text-gray-400">
              {productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <DataTable
          columns={columnas}
          data={productosFiltrados}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          extra={(row) => (
            <div className="flex items-center gap-3">
              <button onClick={() => openDetailModal(row)} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                Ver
              </button>
              <button onClick={() => openCardexModal(row)} className="text-teal-600 hover:text-teal-800 font-medium text-xs">
                KARDEX
              </button>
            </div>
          )}
        />
      </div>

      {/* ── Modal: Producto ── */}
      {open && (
        <Modal title={editing ? "Editar Producto" : "Nuevo Producto"} onClose={close}>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">

            {/* Código de producto — solo lectura */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Código de Producto</label>
              {editing?.cod_producto ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    {editing.cod_producto}
                  </span>
                  <span className="text-xs text-gray-400">Generado automáticamente — no editable</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-400 italic">Se generará automáticamente al guardar según la categoría seleccionada</span>
                </div>
              )}
            </div>

            <div className="col-span-2">{inp("nombre", "Nombre del Producto")}</div>

            {/* Marca */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
              <select
                value={form.marca}
                onChange={(e) => {
                  const selected = marcas.find((m) => m.nombre === e.target.value);
                  setForm({ ...form, marca: e.target.value, modelo: "" });
                  setSelectedMarcaId(selected?.id ?? null);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Sin marca —</option>
                {marcas.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
              </select>
            </div>

            {/* Modelo filtrado por marca */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label>
              <select
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Sin modelo —</option>
                {modelos
                  .filter((m) => !selectedMarcaId || m.marca === selectedMarcaId)
                  .map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)
                }
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sin categoría —</option>
                {tiposProducto.map((tp) => <option key={tp.id} value={tp.nombre}>{tp.nombre}</option>)}
              </select>
            </div>

            {inp("costo_unitario", "Costo Unitario (Q)", "number")}

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Uso / Descripción</label>
              <textarea value={form.uso} onChange={(e) => setForm({ ...form, uso: e.target.value })} rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

      {/* ── Modal: Detalle producto ── */}
      {openDetail && detailProducto && (
        <Modal title={`Detalle — ${detailProducto.nombre}`} onClose={() => setOpenDetail(false)} wide>
          <div className="space-y-5">

            {/* ── Ficha del producto ── */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">

              {/* Columna izquierda */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    {detailProducto.cod_producto ?? "—"}
                  </span>
                  <span className="text-xs text-gray-400">código de producto</span>
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Nombre</p>
                  <p className="font-semibold text-gray-800">{detailProducto.nombre}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Marca</p>
                    <p className="text-gray-700">{detailProducto.marca || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Modelo</p>
                    <p className="text-gray-700">{detailProducto.modelo || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Categoría</p>
                    <p className="text-gray-700">{detailProducto.categoria || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Proveedor</p>
                    <p className="text-gray-700">{detailProducto.proveedor_nombre || "—"}</p>
                  </div>
                </div>

                {detailProducto.uso && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Uso / Descripción</p>
                    <p className="text-gray-600 text-xs leading-relaxed">{detailProducto.uso}</p>
                  </div>
                )}
              </div>

              {/* Columna derecha — métricas */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Stock actual</p>
                    <p className={`text-2xl font-bold ${
                      detailProducto.stock_actual <= 0 ? "text-red-600"
                      : detailProducto.stock_actual < 5 ? "text-amber-600"
                      : "text-green-600"
                    }`}>{detailProducto.stock_actual}</p>
                    <p className="text-xs text-gray-400">unidades</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Costo unit.</p>
                    <p className="text-lg font-bold text-gray-800">{fmt(detailProducto.costo_unitario)}</p>
                    <p className="text-xs text-gray-400">CPP</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Costo total</p>
                    <p className="text-lg font-bold text-gray-800">{fmt(detailProducto.costo_total)}</p>
                    <p className="text-xs text-gray-400">en stock</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">% Utilidad</p>
                    <p className="text-lg font-bold text-indigo-700">{detailProducto.porcentaje_utilidad ?? 0}%</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Precio venta</p>
                    <p className="text-lg font-bold text-indigo-700">{detailProducto.precio_venta ? fmt(detailProducto.precio_venta) : "—"}</p>
                  </div>
                </div>

                {(detailProducto.numero_factura || detailProducto.orden_compra) && (
                  <div className="grid grid-cols-2 gap-3">
                    {detailProducto.numero_factura && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">N° Factura (alta)</p>
                        <p className="font-mono text-xs text-gray-700">{detailProducto.numero_factura}</p>
                      </div>
                    )}
                    {detailProducto.orden_compra && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">OC (alta)</p>
                        <p className="font-mono text-xs text-gray-700">{detailProducto.orden_compra}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Historial de movimientos ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Historial de movimientos</h3>
                <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
                  {[
                    { key: "todos",    label: "Todos",    count: detailMovimientos.length },
                    { key: "entrada",  label: "Entradas", count: detailMovimientos.filter(m => m.tipo === "entrada").length },
                    { key: "salida",   label: "Salidas",  count: detailMovimientos.filter(m => m.tipo === "salida").length },
                  ].map(({ key, label, count }) => (
                    <button key={key} type="button" onClick={() => setDetailTab(key)}
                      className={`px-3 py-1 rounded-md font-medium transition-colors ${
                        detailTab === key
                          ? key === "entrada" ? "bg-green-600 text-white shadow-sm"
                            : key === "salida" ? "bg-red-600 text-white shadow-sm"
                            : "bg-white text-gray-700 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}>
                      {label}
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        detailTab === key ? "bg-white/30 text-white" : "bg-gray-200 text-gray-500"
                      }`}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-gray-500 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left font-medium">Tipo</th>
                      <th className="px-3 py-2 text-right font-medium">Cant.</th>
                      <th className="px-3 py-2 text-right font-medium">Costo Unit.</th>
                      <th className="px-3 py-2 text-left font-medium">Proveedor / Vale</th>
                      <th className="px-3 py-2 text-left font-medium">N° Factura</th>
                      <th className="px-3 py-2 text-left font-medium">Orden Compra</th>
                      <th className="px-3 py-2 text-left font-medium">Ref. OT</th>
                      <th className="px-3 py-2 text-left font-medium">Fecha</th>
                      <th className="px-3 py-2 text-left font-medium">Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailMovimientos
                      .filter(m => detailTab === "todos" || m.tipo === detailTab)
                      .map((m) => (
                        <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                              m.tipo === "entrada"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {m.tipo === "entrada" ? "↑" : "↓"} {m.tipo_display}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-gray-800">{m.cantidad}</td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {m.tipo === "entrada" && m.costo_unitario ? fmt(m.costo_unitario) : "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {m.tipo === "entrada" ? (m.proveedor_nombre || "—") : (m.vale_salida || "—")}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-600">{m.numero_factura || "—"}</td>
                          <td className="px-3 py-2 font-mono text-gray-600">{m.orden_compra || "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{m.referencia_ot || "—"}</td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                            {new Date(m.fecha).toLocaleString("es-GT", {
                              dateStyle: "short", timeStyle: "short"
                            })}
                          </td>
                          <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">{m.observacion || "—"}</td>
                        </tr>
                      ))
                    }
                    {detailMovimientos.filter(m => detailTab === "todos" || m.tipo === detailTab).length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-6 text-gray-400 italic">
                          Sin movimientos registrados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: KARDEX individual ── */}
      {openCardex && cardexProducto && (
        <Modal title={`KARDEX — ${cardexProducto.nombre}`} onClose={() => setOpenCardex(false)} wide>
          <div className="space-y-4">

            {/* Tabs Entrada / Salida */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setCardexTab("entrada")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  cardexTab === "entrada"
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                ↑ Entrada
              </button>
              <button
                type="button"
                onClick={() => setCardexTab("salida")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  cardexTab === "salida"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                ↓ Salida
              </button>
            </div>

            {/* Formulario Entrada */}
            {cardexTab === "entrada" && (
              <form onSubmit={handleCardexEntradaSubmit} className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-800 mb-3">Registrar Entrada de Stock</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad *</label>
                    <input type="number" min="1" required value={cardexEntrada.cantidad}
                      onChange={(e) => setCardexEntrada({ ...cardexEntrada, cantidad: e.target.value })}
                      className={inp_cls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Costo Unitario
                      <span className="ml-1 text-green-600 font-normal">(actualiza CPP)</span>
                    </label>
                    <input type="number" min="0" step="0.01" value={cardexEntrada.costo_unitario}
                      onChange={(e) => setCardexEntrada({ ...cardexEntrada, costo_unitario: e.target.value })}
                      placeholder="0.00"
                      className={inp_cls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
                    <ProveedorSearch
                      proveedores={proveedores}
                      value={cardexEntrada.proveedor}
                      onChange={(v) => setCardexEntrada({ ...cardexEntrada, proveedor: v })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">N° de Factura</label>
                    <input value={cardexEntrada.numero_factura}
                      onChange={(e) => setCardexEntrada({ ...cardexEntrada, numero_factura: e.target.value })}
                      className={inp_cls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Orden de Compra</label>
                    <OCSearch
                      compras={compras}
                      value={cardexEntrada.orden_compra}
                      onChange={(v) => setCardexEntrada({ ...cardexEntrada, orden_compra: v })}
                      inputClass={inp_cls}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observación</label>
                    <input value={cardexEntrada.observacion}
                      onChange={(e) => setCardexEntrada({ ...cardexEntrada, observacion: e.target.value })}
                      className={inp_cls} />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium">
                    Registrar Entrada
                  </button>
                </div>
              </form>
            )}

            {/* Formulario Salida */}
            {cardexTab === "salida" && (
              <form onSubmit={handleCardexSalidaSubmit} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-3">Registrar Salida de Stock</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad *</label>
                    <input type="number" min="1" required value={cardexSalida.cantidad}
                      onChange={(e) => setCardexSalida({ ...cardexSalida, cantidad: e.target.value })}
                      className={inp_cls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Vale de Salida</label>
                    <input value={cardexSalida.vale_salida}
                      onChange={(e) => setCardexSalida({ ...cardexSalida, vale_salida: e.target.value })}
                      className={inp_cls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Referencia OT</label>
                    <input value={cardexSalida.referencia_ot}
                      onChange={(e) => setCardexSalida({ ...cardexSalida, referencia_ot: e.target.value })}
                      placeholder="Ej: OT-0001"
                      className={inp_cls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observación</label>
                    <input value={cardexSalida.observacion}
                      onChange={(e) => setCardexSalida({ ...cardexSalida, observacion: e.target.value })}
                      className={inp_cls} />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium">
                    Registrar Salida
                  </button>
                </div>
              </form>
            )}

            {/* Historial de movimientos */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Historial</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-xs">
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-right">Cant.</th>
                      <th className="px-3 py-2 text-right">Costo Unit.</th>
                      <th className="px-3 py-2 text-left">Proveedor / Vale</th>
                      <th className="px-3 py-2 text-left">Referencia</th>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-4 text-gray-400 text-xs">Sin movimientos registrados</td></tr>
                    )}
                    {movimientos.map((m) => (
                      <tr key={m.id} className="border-b border-gray-100">
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.tipo === "entrada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>{m.tipo_display}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{m.cantidad}</td>
                        <td className="px-3 py-2 text-right text-xs text-gray-500">
                          {m.tipo === "entrada" && m.costo_unitario ? fmt(m.costo_unitario) : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {m.tipo === "entrada"
                            ? (m.proveedor_nombre || m.numero_factura || "—")
                            : (m.vale_salida || "—")
                          }
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {m.tipo === "entrada"
                            ? (m.orden_compra || "—")
                            : (m.referencia_ot || "—")
                          }
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {new Date(m.fecha).toLocaleString("es-GT")}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{m.observacion || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: KARDEX masivo ── */}
      {openBulk && (
        <Modal title="KARDEX Masivo — Registro por Bloques" onClose={closeBulk} wide>
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <p className="text-xs text-gray-500">
              Registrá múltiples movimientos en una sola operación. Completá las entradas y salidas en sus respectivas pestañas y luego presioná "Registrar Todo".
            </p>

            {/* Tabs Entradas / Salidas */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button type="button" onClick={() => setBulkTab("entradas")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  bulkTab === "entradas" ? "bg-green-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"
                }`}>
                ↑ Entradas {bulkEntradas.filter(r => r.producto && r.cantidad).length > 0 && (
                  <span className="ml-1 bg-white text-green-700 rounded-full px-1.5 text-xs font-bold">
                    {bulkEntradas.filter(r => r.producto && r.cantidad).length}
                  </span>
                )}
              </button>
              <button type="button" onClick={() => setBulkTab("salidas")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  bulkTab === "salidas" ? "bg-red-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-800"
                }`}>
                ↓ Salidas {bulkSalidas.filter(r => r.producto && r.cantidad).length > 0 && (
                  <span className="ml-1 bg-white text-red-700 rounded-full px-1.5 text-xs font-bold">
                    {bulkSalidas.filter(r => r.producto && r.cantidad).length}
                  </span>
                )}
              </button>
            </div>

            {/* Tabla Entradas */}
            {bulkTab === "entradas" && (
              <div className="space-y-3">
                <table className="w-full border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: "26%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "2%" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-green-50 text-green-800 text-xs">
                      <th className="px-2 py-2 text-left font-medium">Producto *</th>
                      <th className="px-2 py-2 text-left font-medium">Cant. *</th>
                      <th className="px-2 py-2 text-left font-medium">Costo Unit.</th>
                      <th className="px-2 py-2 text-left font-medium">Proveedor</th>
                      <th className="px-2 py-2 text-left font-medium">N° Factura</th>
                      <th className="px-2 py-2 text-left font-medium">Orden Compra</th>
                      <th className="px-2 py-2 text-left font-medium">Observación</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {bulkEntradas.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-1 py-1.5">
                          <ProductoSearch productos={productos} value={row.producto} onChange={(v) => updateBulkEntrada(i, "producto", v)} />
                        </td>
                        <td className="px-1 py-1.5">
                          <input type="number" min="1" value={row.cantidad}
                            onChange={(e) => updateBulkEntrada(i, "cantidad", e.target.value)}
                            className="bulk-inp w-full text-right" />
                        </td>
                        <td className="px-1 py-1.5">
                          <input type="number" min="0" step="0.01" value={row.costo_unitario}
                            onChange={(e) => updateBulkEntrada(i, "costo_unitario", e.target.value)}
                            placeholder="0.00" className="bulk-inp w-full text-right" />
                        </td>
                        <td className="px-1 py-1.5">
                          <ProveedorSearch proveedores={proveedores} value={row.proveedor} onChange={(v) => updateBulkEntrada(i, "proveedor", v)} />
                        </td>
                        <td className="px-1 py-1.5">
                          <input value={row.numero_factura} onChange={(e) => updateBulkEntrada(i, "numero_factura", e.target.value)}
                            placeholder="Factura" className="bulk-inp w-full" />
                        </td>
                        <td className="px-1 py-1.5">
                          <OCSearch
                            compras={compras}
                            value={row.orden_compra}
                            onChange={(v) => updateBulkEntrada(i, "orden_compra", v)}
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <input value={row.observacion} onChange={(e) => updateBulkEntrada(i, "observacion", e.target.value)}
                            placeholder="Opcional" className="bulk-inp w-full" />
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          {bulkEntradas.length > 1 && (
                            <button type="button" onClick={() => setBulkEntradas((r) => r.filter((_, idx) => idx !== i))}
                              className="text-red-400 hover:text-red-600 font-bold text-sm">✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={() => setBulkEntradas((r) => [...r, { ...EMPTY_ENTRADA }])}
                  className="text-green-600 hover:text-green-800 text-sm font-medium">
                  + Agregar fila de entrada
                </button>
              </div>
            )}

            {/* Tabla Salidas */}
            {bulkTab === "salidas" && (
              <div className="space-y-3">
                <table className="w-full border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: "32%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "21%" }} />
                    <col style={{ width: "3%" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-red-50 text-red-800 text-xs">
                      <th className="px-2 py-2 text-left font-medium">Producto *</th>
                      <th className="px-2 py-2 text-left font-medium">Cant. *</th>
                      <th className="px-2 py-2 text-left font-medium">Vale de Salida</th>
                      <th className="px-2 py-2 text-left font-medium">Referencia OT</th>
                      <th className="px-2 py-2 text-left font-medium">Observación</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {bulkSalidas.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-1 py-1.5">
                          <ProductoSearch productos={productos} value={row.producto} onChange={(v) => updateBulkSalida(i, "producto", v)} />
                        </td>
                        <td className="px-1 py-1.5">
                          <input type="number" min="1" value={row.cantidad}
                            onChange={(e) => updateBulkSalida(i, "cantidad", e.target.value)}
                            className="bulk-inp w-full text-right" />
                        </td>
                        <td className="px-1 py-1.5">
                          <input value={row.vale_salida} onChange={(e) => updateBulkSalida(i, "vale_salida", e.target.value)}
                            placeholder="Nº vale" className="bulk-inp w-full" />
                        </td>
                        <td className="px-1 py-1.5">
                          <input value={row.referencia_ot} onChange={(e) => updateBulkSalida(i, "referencia_ot", e.target.value)}
                            placeholder="OT-0001" className="bulk-inp w-full" />
                        </td>
                        <td className="px-1 py-1.5">
                          <input value={row.observacion} onChange={(e) => updateBulkSalida(i, "observacion", e.target.value)}
                            placeholder="Opcional" className="bulk-inp w-full" />
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          {bulkSalidas.length > 1 && (
                            <button type="button" onClick={() => setBulkSalidas((r) => r.filter((_, idx) => idx !== i))}
                              className="text-red-400 hover:text-red-600 font-bold text-sm">✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" onClick={() => setBulkSalidas((r) => [...r, { ...EMPTY_SALIDA }])}
                  className="text-red-600 hover:text-red-800 text-sm font-medium">
                  + Agregar fila de salida
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={closeBulk}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={bulkLoading}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60">
                {bulkLoading ? "Registrando…" : "Registrar Todo"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
