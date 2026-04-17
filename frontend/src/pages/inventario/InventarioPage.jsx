import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTableList, faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { inventarioService } from "../../services/api/inventario";
import { proveedoresService } from "../../services/api/proveedores";
import { comprasService } from "../../services/api/compras";
import { marcasService, modelosService, tiposProductoService, personalService } from "../../services/api/maestros";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

// ── Constantes ───────────────────────────────────────────────────────────────
const EMPTY = {
  nombre: "", marca: "", modelo: "",
  categoria: "", uso: "", costo_unitario: "",
  numero_serie: "", unidad_medida: "unidad",
  stock_minimo: 0, stock_maximo: "",
  ubicacion: "", activo: true, controla_serie: false,
};

const EMPTY_ENTRADA = {
  producto: "", cantidad: "", costo_unitario: "", proveedor: "",
  numero_factura: "", orden_compra: "",
  condicion: "", responsable: "", observacion: "",
  numeros_serie: [],  // para productos con controla_serie
};

const EMPTY_SALIDA = {
  producto: "", cantidad: "", vale_salida: "", referencia_ot: "",
  motivo_salida: "", condicion: "", responsable: "", observacion: "",
  unidades_ids: [],   // para productos con controla_serie
};

// Genera filas bulk con ID único para rastrear expansión independientemente del índice
const mkEntrada = () => ({ ...EMPTY_ENTRADA, _id: `e-${Date.now()}-${Math.random()}` });
const mkSalida  = () => ({ ...EMPTY_SALIDA,  _id: `s-${Date.now()}-${Math.random()}` });

const UNIDADES = [
  { value: "unidad",         label: "Unidad" },
  { value: "par",            label: "Par" },
  { value: "juego",          label: "Juego / Set" },
  { value: "caja",           label: "Caja" },
  { value: "paquete",        label: "Paquete" },
  { value: "rollo",          label: "Rollo" },
  { value: "metro",          label: "Metro lineal" },
  { value: "metro_cuadrado", label: "Metro cuadrado (m²)" },
  { value: "kg",             label: "Kilogramo" },
  { value: "libra",          label: "Libra" },
  { value: "litro",          label: "Litro" },
  { value: "galon",          label: "Galón" },
  { value: "pieza",          label: "Pieza" },
];

const MOTIVOS_SALIDA = [
  { value: "uso_interno",          label: "Uso interno" },
  { value: "prestamo",             label: "Préstamo" },
  { value: "devolucion_proveedor", label: "Devolución a proveedor" },
  { value: "baja_definitiva",      label: "Baja definitiva" },
  { value: "transferencia",        label: "Transferencia" },
  { value: "merma",                label: "Merma / Pérdida" },
  { value: "otro",                 label: "Otro" },
];

const CONDICIONES = [
  { value: "nuevo",    label: "Nuevo" },
  { value: "bueno",    label: "Bueno" },
  { value: "regular",  label: "Regular" },
  { value: "danado",   label: "Dañado" },
  { value: "obsoleto", label: "Obsoleto" },
];

const fmt = (n) =>
  `Q${parseFloat(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const sel = "w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";
const inp_cls = "w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

// ── Helpers de formulario ────────────────────────────────────────────────────
function FormLabel({ children }) {
  return (
    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
      {children}
    </label>
  );
}

function SectionDivider({ label }) {
  return (
    <div className="col-span-3 pt-1 pb-2 border-b border-gray-100 dark:border-slate-700">
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
        {label}
      </p>
    </div>
  );
}

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
  const [personal, setPersonal] = useState([]);

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
  const [mostrarSinStock, setMostrarSinStock] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

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
  const [bulkEntradas, setBulkEntradas] = useState([mkEntrada()]);
  const [bulkSalidas, setBulkSalidas] = useState([mkSalida()]);
  const [bulkLoading, setBulkLoading] = useState(false);
  // Filas expandidas en bulk (seriales)
  const [expandedBulkE, setExpandedBulkE] = useState(new Set());
  const [expandedBulkS, setExpandedBulkS] = useState(new Set());
  // Unidades disponibles por fila de salida (key = _id de la fila)
  const [bulkSalidasUnidades, setBulkSalidasUnidades] = useState({});
  // Input temporal de serial por fila de entrada (key = _id)
  const [bulkSerialInputs, setBulkSerialInputs] = useState({});

  // Unidades seriadas (para KARDEX de productos con controla_serie)
  const [unidadesDisponibles, setUnidadesDisponibles] = useState([]);
  const [cardexSeriales, setCardexSeriales] = useState([]);        // entrada: seriales a ingresar
  const [cardexSerialInput, setCardexSerialInput] = useState(""); // entrada: texto del input
  const [cardexUnidadesSelec, setCardexUnidadesSelec] = useState([]); // salida: IDs seleccionados
  const [detailUnidades, setDetailUnidades] = useState([]);

  // OCs disponibles para entrada (excluye las ya Recibidas)
  const ocsPendientes = useMemo(
    () => compras.filter((c) => c.estatus !== "Recibida"),
    [compras]
  );

  // Filas expandidas en las tablas de historial
  const [expandedCardex, setExpandedCardex] = useState(new Set());
  const [expandedDetail, setExpandedDetail] = useState(new Set());

  // Historial Global
  const [openHistorial, setOpenHistorial]     = useState(false);
  const [histSearch, setHistSearch]           = useState("");
  const [histPage, setHistPage]               = useState(1);
  const [histData, setHistData]               = useState({ count: 0, results: [] });
  const [histLoading, setHistLoading]         = useState(false);
  const [expandedHist, setExpandedHist]       = useState(new Set());
  const HIST_PAGE_SIZE = 25;

  const toggleExpand = (setter, id) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  useEffect(() => { load(); loadAuxiliar(); }, []);

  useEffect(() => {
    if (!openFilter) return;
    const handler = (e) => {
      if (!e.target.closest("[data-filter-dropdown]")) setOpenFilter(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openFilter]);

  // Cargar historial global con debounce en la búsqueda
  useEffect(() => {
    if (!openHistorial) return;
    const id = setTimeout(() => fetchHistorial(histSearch, 1), 350);
    return () => clearTimeout(id);
  }, [histSearch, openHistorial]); // eslint-disable-line

  useEffect(() => {
    if (!openHistorial) return;
    fetchHistorial(histSearch, histPage);
  }, [histPage]); // eslint-disable-line

  const fetchHistorial = async (search, page) => {
    setHistLoading(true);
    try {
      const { data } = await inventarioService.getHistorial({ search, page, pageSize: HIST_PAGE_SIZE });
      setHistData({ count: data.count ?? 0, results: data.results ?? data });
      if (page !== histPage) setHistPage(page);
    } catch (e) { console.error(e); }
    finally { setHistLoading(false); }
  };

  const load = async () => {
    setLoading(true);
    try { const { data } = await inventarioService.getProductos(); setProductos(data.results ?? data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadAuxiliar = async () => {
    try {
      const [prov, mar, mod, tp, oc, pers] = await Promise.all([
        proveedoresService.getAll(),
        marcasService.getAll({ activo: true }),
        modelosService.getAll({ activo: true }),
        tiposProductoService.getAll({ activo: true }),
        comprasService.getAll(),
        personalService.getAll({ activo: true }),
      ]);
      setProveedores(prov.data.results ?? prov.data);
      setMarcas(mar.data.results ?? mar.data);
      setModelos(mod.data.results ?? mod.data);
      setTiposProducto(tp.data.results ?? tp.data);
      setCompras(oc.data.results ?? oc.data);
      setPersonal(pers.data.results ?? pers.data);
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

    if (!mostrarSinStock)
      result = result.filter((p) => (p.stock_actual ?? 0) > 0);

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
  }, [productos, busqueda, categoriasSelec, sortKey, sortDir, mostrarSinStock]);

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
    { key: "nombre", label: "Nombre", sortable: true, render: (r) => (
      <span className="flex items-center gap-1.5">
        {r.nombre}
        {r.controla_serie && (
          <span className="text-[9px] font-bold uppercase tracking-wide bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 px-1.5 py-0.5 rounded-full shrink-0">
            S/N
          </span>
        )}
      </span>
    )},
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
        <span className={`font-semibold ${r.stock_actual <= 0 ? "text-red-600" : r.stock_actual <= (r.stock_minimo || 0) ? "text-amber-600" : "text-green-600"}`}>
          {r.stock_actual}
        </span>
      ),
      filterSlot: (
        <button
          type="button"
          onClick={() => setMostrarSinStock((v) => !v)}
          title={mostrarSinStock ? "Ocultar productos sin stock" : "Mostrar productos sin stock"}
          className={`ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
            mostrarSinStock
              ? "bg-red-600 text-white"
              : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${mostrarSinStock ? "bg-white" : "bg-slate-400"}`} />
          sin stock
        </button>
      ),
    },
    {
      key: "precio_venta",
      label: "P. Venta",
      sortable: true,
      render: (r) => r.precio_venta ? fmt(r.precio_venta) : "—",
    },
  ], [categoriasUnicas, categoriasSelec, openFilter, toggleCategoria, mostrarSinStock]);

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
      nombre:         item.nombre         ?? "",
      marca:          item.marca          ?? "",
      modelo:         item.modelo         ?? "",
      categoria:      item.categoria      ?? "",
      uso:            item.uso            ?? "",
      costo_unitario: item.costo_unitario ?? "",
      numero_serie:   item.numero_serie   ?? "",
      unidad_medida:  item.unidad_medida  ?? "unidad",
      stock_minimo:   item.stock_minimo   ?? 0,
      stock_maximo:   item.stock_maximo   ?? "",
      ubicacion:      item.ubicacion      ?? "",
      activo:         item.activo         ?? true,
      controla_serie: item.controla_serie ?? false,
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

  const inp = (name, label, type = "text", required = false) => (
    <div>
      <FormLabel>{label}</FormLabel>
      <input
        type={type}
        value={form[name] ?? ""}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        required={required}
        className={inp_cls}
      />
    </div>
  );

  // ── Modal detalle ──────────────────────────────────────────────────────────
  const openDetailModal = async (producto) => {
    setDetailProducto(producto);
    setDetailTab("todos");
    setDetailUnidades([]);
    setOpenDetail(true);
    try {
      const [movResp, unidResp] = await Promise.all([
        inventarioService.getMovimientos(producto.id),
        producto.controla_serie ? inventarioService.getUnidades(producto.id) : Promise.resolve({ data: [] }),
      ]);
      setDetailMovimientos(movResp.data.results ?? movResp.data);
      setDetailUnidades(unidResp.data.results ?? unidResp.data);
    } catch (e) { console.error(e); }
  };

  // ── KARDEX individual ──────────────────────────────────────────────────────
  const openCardexModal = async (producto) => {
    setCardexProducto(producto);
    loadMovimientos(producto.id);
    setCardexTab("entrada");
    setCardexEntrada({ ...EMPTY_ENTRADA });
    setCardexSalida({ ...EMPTY_SALIDA });
    setCardexSeriales([]);
    setCardexSerialInput("");
    setCardexUnidadesSelec([]);
    setOpenCardex(true);
    if (producto.controla_serie) {
      try {
        const { data } = await inventarioService.getUnidades(producto.id, "disponible");
        setUnidadesDisponibles(data.results ?? data);
      } catch (e) { console.error(e); }
    }
  };

  const handleCardexEntradaSubmit = async (e) => {
    e.preventDefault();
    const esSeriado = cardexProducto.controla_serie;
    if (esSeriado && cardexSeriales.length === 0) {
      alert("Ingresá al menos un número de serie.");
      return;
    }
    try {
      const payload = {
        producto:       cardexProducto.id,
        tipo:           "entrada",
        cantidad:       esSeriado ? cardexSeriales.length : parseInt(cardexEntrada.cantidad),
        costo_unitario: cardexEntrada.costo_unitario ? parseFloat(cardexEntrada.costo_unitario) : null,
        proveedor:      cardexEntrada.proveedor || null,
        numero_factura: cardexEntrada.numero_factura,
        orden_compra:   cardexEntrada.orden_compra,
        condicion:      cardexEntrada.condicion,
        responsable:    cardexEntrada.responsable || null,
        observacion:    cardexEntrada.observacion,
      };
      if (esSeriado) payload.numeros_serie = cardexSeriales;
      await inventarioService.createMovimiento(payload);
      load();
      loadMovimientos(cardexProducto.id);
      setCardexEntrada({ ...EMPTY_ENTRADA });
      setCardexSeriales([]);
      setCardexSerialInput("");
      // Recargar unidades disponibles
      const { data } = await inventarioService.getUnidades(cardexProducto.id, "disponible");
      setUnidadesDisponibles(data.results ?? data);
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error"); }
  };

  const handleCardexSalidaSubmit = async (e) => {
    e.preventDefault();
    const esSeriado = cardexProducto.controla_serie;
    if (esSeriado && cardexUnidadesSelec.length === 0) {
      alert("Seleccioná al menos una unidad a retirar.");
      return;
    }
    try {
      const payload = {
        producto:      cardexProducto.id,
        tipo:          "salida",
        cantidad:      esSeriado ? cardexUnidadesSelec.length : parseInt(cardexSalida.cantidad),
        vale_salida:   cardexSalida.vale_salida,
        referencia_ot: cardexSalida.referencia_ot,
        motivo_salida: cardexSalida.motivo_salida,
        condicion:     cardexSalida.condicion,
        responsable:   cardexSalida.responsable || null,
        observacion:   cardexSalida.observacion,
      };
      if (esSeriado) payload.unidades_ids = cardexUnidadesSelec;
      await inventarioService.createMovimiento(payload);
      load();
      loadMovimientos(cardexProducto.id);
      setCardexSalida({ ...EMPTY_SALIDA });
      setCardexUnidadesSelec([]);
      // Recargar unidades disponibles
      const { data } = await inventarioService.getUnidades(cardexProducto.id, "disponible");
      setUnidadesDisponibles(data.results ?? data);
    } catch (e) { alert(e.response?.data ? JSON.stringify(e.response.data) : "Error"); }
  };

  // ── KARDEX masivo ──────────────────────────────────────────────────────────
  const updateBulkEntrada = (i, k, v) =>
    setBulkEntradas((r) => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
  const updateBulkSalida = (i, k, v) =>
    setBulkSalidas((r) => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  // Cuando cambia el producto en una fila de entrada bulk: resetea seriales
  const handleBulkEntradaProducto = (i, productoId) => {
    updateBulkEntrada(i, "producto", productoId);
    updateBulkEntrada(i, "numeros_serie", []);
  };

  // Cuando cambia el producto en una fila de salida bulk: resetea y carga unidades
  const handleBulkSalidaProducto = async (i, fila, productoId) => {
    updateBulkSalida(i, "producto", productoId);
    updateBulkSalida(i, "unidades_ids", []);
    const producto = productos.find((p) => String(p.id) === String(productoId));
    if (producto?.controla_serie) {
      try {
        const { data } = await inventarioService.getUnidades(productoId, "disponible");
        setBulkSalidasUnidades((prev) => ({ ...prev, [fila._id]: data.results ?? data }));
      } catch (e) { console.error(e); }
    } else {
      setBulkSalidasUnidades((prev) => { const n = { ...prev }; delete n[fila._id]; return n; });
    }
  };

  // Agrega serial a una fila de entrada bulk
  const addBulkSerial = (i, fila, sn) => {
    const sn2 = sn.trim();
    if (!sn2) return;
    if (fila.numeros_serie.includes(sn2)) { alert(`El serial "${sn2}" ya está en esta fila.`); return; }
    updateBulkEntrada(i, "numeros_serie", [...fila.numeros_serie, sn2]);
    setBulkSerialInputs((prev) => ({ ...prev, [fila._id]: "" }));
  };

  // Quita serial de una fila de entrada bulk
  const removeBulkSerial = (i, fila, sn) =>
    updateBulkEntrada(i, "numeros_serie", fila.numeros_serie.filter((s) => s !== sn));

  // Toggle unidad en fila de salida bulk
  const toggleBulkUnidad = (i, fila, unidadId) => {
    const actual = fila.unidades_ids;
    const next = actual.includes(unidadId)
      ? actual.filter((id) => id !== unidadId)
      : [...actual, unidadId];
    updateBulkSalida(i, "unidades_ids", next);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setBulkLoading(true);
    try {
      const entradas = bulkEntradas
        .filter((r) => {
          const prod = productos.find((p) => String(p.id) === String(r.producto));
          return r.producto && (prod?.controla_serie ? r.numeros_serie.length > 0 : r.cantidad);
        })
        .map((r) => {
          const prod = productos.find((p) => String(p.id) === String(r.producto));
          const payload = {
            producto: parseInt(r.producto),
            tipo: "entrada",
            cantidad: prod?.controla_serie ? r.numeros_serie.length : parseInt(r.cantidad),
            costo_unitario: r.costo_unitario ? parseFloat(r.costo_unitario) : null,
            proveedor: r.proveedor || null,
            numero_factura: r.numero_factura,
            orden_compra: r.orden_compra,
            observacion: r.observacion,
          };
          if (prod?.controla_serie) payload.numeros_serie = r.numeros_serie;
          return payload;
        });

      const salidas = bulkSalidas
        .filter((r) => {
          const prod = productos.find((p) => String(p.id) === String(r.producto));
          return r.producto && (prod?.controla_serie ? r.unidades_ids.length > 0 : r.cantidad);
        })
        .map((r) => {
          const prod = productos.find((p) => String(p.id) === String(r.producto));
          const payload = {
            producto: parseInt(r.producto),
            tipo: "salida",
            cantidad: prod?.controla_serie ? r.unidades_ids.length : parseInt(r.cantidad),
            vale_salida: r.vale_salida,
            referencia_ot: r.referencia_ot,
            motivo_salida: r.motivo_salida,
            observacion: r.observacion,
          };
          if (prod?.controla_serie) payload.unidades_ids = r.unidades_ids;
          return payload;
        });

      for (const row of [...entradas, ...salidas]) {
        await inventarioService.createMovimiento(row);
      }
      closeBulk();
      load();
    } catch (e) {
      alert(e.response?.data ? JSON.stringify(e.response.data) : "Error al registrar movimientos");
    } finally { setBulkLoading(false); }
  };

  const closeBulk = () => {
    setOpenBulk(false);
    setBulkEntradas([mkEntrada()]);
    setBulkSalidas([mkSalida()]);
    setBulkTab("entradas");
    setExpandedBulkE(new Set());
    setExpandedBulkS(new Set());
    setBulkSalidasUnidades({});
    setBulkSerialInputs({});
  };

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      const { data } = await inventarioService.exportarPdf(mostrarSinStock);
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = mostrarSinStock ? "inventario_completo.pdf" : "inventario.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setPdfLoading(false); }
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Inventario</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportPdf}
            disabled={pdfLoading}
            title={mostrarSinStock ? "Exportar inventario completo (con y sin stock)" : "Exportar inventario con stock"}
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <FontAwesomeIcon icon={faFilePdf} />
            {pdfLoading ? "Generando…" : "Exportar PDF"}
          </button>
          <button
            onClick={() => { setOpenHistorial(true); setHistSearch(""); setHistPage(1); setExpandedHist(new Set()); }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Historial Global
          </button>
          <button onClick={() => setOpenBulk(true)}
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <FontAwesomeIcon icon={faTableList} />
            KARDEX Masivo
          </button>
          <button onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <FontAwesomeIcon icon={faPlus} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, nombre, marca, categoría…"
            className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400 rounded-lg px-3 py-1.5 text-sm w-1/4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {(busqueda || categoriasSelec.length > 0) && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
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
            <div className="flex items-center gap-2">
              <button onClick={() => openDetailModal(row)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                Ver
              </button>
              <button onClick={() => openCardexModal(row)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors">
                KARDEX
              </button>
            </div>
          )}
        />
      </div>

      {/* ── Modal: Producto ── */}
      {open && (
        <Modal title={editing ? "Editar Producto" : "Nuevo Producto"} onClose={close} wide>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-x-4 gap-y-3">

            {/* ── Identificación ── */}
            <SectionDivider label="Identificación" />

            {/* Código */}
            <div className="col-span-3">
              <FormLabel>Código de Producto</FormLabel>
              {editing?.cod_producto ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
                    {editing.cod_producto}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">Generado automáticamente — no editable</span>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-400 dark:text-slate-500 italic">Se generará automáticamente al guardar según la categoría</span>
                </div>
              )}
            </div>

            {/* Nombre + N° serie (solo si no controla serie) */}
            <div className={form.controla_serie ? "col-span-3" : "col-span-2"}>
              {inp("nombre", "Nombre *", "text", true)}
            </div>
            {!form.controla_serie && inp("numero_serie", "N° de Serie")}

            {/* Control de serie */}
            <div className="col-span-3">
              <label className="inline-flex items-center gap-3 cursor-pointer select-none group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={!!form.controla_serie}
                    onChange={(e) => setForm({ ...form, controla_serie: e.target.checked })}
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${form.controla_serie ? "bg-teal-500" : "bg-gray-300 dark:bg-slate-600"}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.controla_serie ? "translate-x-5" : ""}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Control de número de serie por unidad
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    Cada unidad física tendrá su propio número de serie registrado en el KARDEX.
                  </p>
                </div>
              </label>
            </div>

            {/* ── Clasificación ── */}
            <SectionDivider label="Clasificación" />

            {/* Categoría */}
            <div>
              <FormLabel>Categoría</FormLabel>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={sel}>
                <option value="">— Sin categoría —</option>
                {tiposProducto.map((tp) => <option key={tp.id} value={tp.nombre}>{tp.nombre}</option>)}
              </select>
            </div>

            {/* Marca */}
            <div>
              <FormLabel>Marca</FormLabel>
              <select
                value={form.marca}
                onChange={(e) => {
                  const selected = marcas.find((m) => m.nombre === e.target.value);
                  setForm({ ...form, marca: e.target.value, modelo: "" });
                  setSelectedMarcaId(selected?.id ?? null);
                }}
                className={sel}
              >
                <option value="">— Sin marca —</option>
                {marcas.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
              </select>
            </div>

            {/* Modelo filtrado por marca */}
            <div>
              <FormLabel>Modelo</FormLabel>
              <select value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className={sel}>
                <option value="">— Sin modelo —</option>
                {modelos
                  .filter((m) => !selectedMarcaId || m.marca === selectedMarcaId)
                  .map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)
                }
              </select>
            </div>

            {/* Unidad de medida */}
            <div>
              <FormLabel>Unidad de Medida</FormLabel>
              <select value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} className={sel}>
                {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>

            {/* Costo unitario */}
            <div>
              <FormLabel>Costo Unitario (Q) *</FormLabel>
              <input
                type="number" min="0" step="0.01" required
                value={form.costo_unitario ?? ""}
                onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })}
                className={inp_cls}
              />
            </div>

            {/* Proveedor habitual */}
            <div>
              <FormLabel>Proveedor habitual</FormLabel>
              <select
                value={form.proveedor ?? ""}
                onChange={(e) => setForm({ ...form, proveedor: e.target.value || null })}
                className={sel}
              >
                <option value="">— Ninguno —</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
              </select>
            </div>

            {/* ── Stock y Ubicación ── */}
            <SectionDivider label="Stock y Ubicación" />

            {/* Stock mínimo */}
            <div>
              <FormLabel>Stock Mínimo</FormLabel>
              <input
                type="number" min="0"
                value={form.stock_minimo ?? 0}
                onChange={(e) => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })}
                className={inp_cls}
              />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Alerta de reposición</p>
            </div>

            {/* Stock máximo */}
            <div>
              <FormLabel>Stock Máximo</FormLabel>
              <input
                type="number" min="0"
                value={form.stock_maximo ?? ""}
                onChange={(e) => setForm({ ...form, stock_maximo: e.target.value ? parseInt(e.target.value) : "" })}
                placeholder="Sin límite"
                className={inp_cls}
              />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Opcional</p>
            </div>

            {/* Ubicación física */}
            {inp("ubicacion", "Ubicación Física")}

            {/* ── Descripción ── */}
            <SectionDivider label="Descripción" />

            <div className="col-span-3">
              <FormLabel>Uso / Descripción</FormLabel>
              <textarea
                value={form.uso ?? ""}
                onChange={(e) => setForm({ ...form, uso: e.target.value })}
                rows={2}
                placeholder="Descripción del ítem, uso habitual, especificaciones relevantes…"
                className={inp_cls}
              />
            </div>

            {/* ── Acciones ── */}
            <div className="col-span-3 flex items-center justify-between pt-2 border-t dark:border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-600 dark:text-slate-400">Activo</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={close} className="px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  {editing ? "Actualizar" : "Crear"}
                </button>
              </div>
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

            {/* ── Tabs de historial ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Historial de movimientos</h3>
                <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
                  {[
                    { key: "todos",    label: "Todos",    count: detailMovimientos.length },
                    { key: "entrada",  label: "Entradas", count: detailMovimientos.filter(m => m.tipo === "entrada").length },
                    { key: "salida",   label: "Salidas",  count: detailMovimientos.filter(m => m.tipo === "salida").length },
                    ...(detailProducto?.controla_serie
                      ? [{ key: "unidades", label: "Unidades", count: detailUnidades.length }]
                      : []),
                  ].map(({ key, label, count }) => (
                    <button key={key} type="button" onClick={() => setDetailTab(key)}
                      className={`px-3 py-1 rounded-md font-medium transition-colors ${
                        detailTab === key
                          ? key === "entrada"  ? "bg-green-600 text-white shadow-sm"
                            : key === "salida" ? "bg-red-600 text-white shadow-sm"
                            : key === "unidades" ? "bg-teal-600 text-white shadow-sm"
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

              {/* Tabla movimientos */}
              {detailTab !== "unidades" && (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        <th className="px-3 py-2 text-left font-medium">Tipo</th>
                        <th className="px-3 py-2 text-right font-medium">Cant.</th>
                        <th className="px-3 py-2 text-right font-medium">Costo Unit.</th>
                        <th className="px-3 py-2 text-left font-medium">Proveedor / Vale</th>
                        <th className="px-3 py-2 text-left font-medium">N° Factura</th>
                        <th className="px-3 py-2 text-left font-medium">Orden Compra</th>
                        <th className="px-3 py-2 text-left font-medium">Ref. OT</th>
                        <th className="px-3 py-2 text-left font-medium">Fecha</th>
                        <th className="px-3 py-2 text-left font-medium">Observación</th>
                        <th className="px-3 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {detailMovimientos
                        .filter(m => detailTab === "todos" || m.tipo === detailTab)
                        .map((m) => {
                          const seriales = m.tipo === "entrada"
                            ? (m.unidades_ingresadas ?? [])
                            : (m.unidades_egresadas ?? []);
                          const tieneSeriales = seriales.length > 0;
                          const expandido = expandedDetail.has(m.id);
                          return (
                            <>
                              <tr
                                key={m.id}
                                onClick={() => toggleExpand(setExpandedDetail, m.id)}
                                className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer select-none"
                              >
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
                                <td className="px-2 py-2 text-center text-teal-600 text-xs font-bold">
                                  {tieneSeriales ? (expandido ? "▲" : "▼") : ""}
                                </td>
                              </tr>
                              {tieneSeriales && expandido && (
                                <tr key={`${m.id}-seriales`} className="bg-teal-50/60 dark:bg-teal-900/10">
                                  <td colSpan={10} className="px-4 py-2">
                                    <p className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide mb-1.5">
                                      Números de serie — {m.tipo === "entrada" ? "ingresados" : "retirados"}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {seriales.map((u) => (
                                        <span key={u.id} className={`inline-flex items-center gap-1.5 font-mono text-xs px-2 py-1 rounded-full border ${
                                          u.estado === "disponible"
                                            ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300"
                                            : u.estado === "en_uso"
                                            ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300"
                                            : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
                                        }`}>
                                          {u.numero_serie}
                                          <span className="text-[9px] font-normal opacity-70">{u.estado_display}</span>
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })
                      }
                      {detailMovimientos.filter(m => detailTab === "todos" || m.tipo === detailTab).length === 0 && (
                        <tr>
                          <td colSpan={10} className="text-center py-6 text-gray-400 italic">
                            Sin movimientos registrados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tabla unidades seriadas */}
              {detailTab === "unidades" && (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 uppercase tracking-wide">
                        <th className="px-3 py-2 text-left font-medium">N° de Serie</th>
                        <th className="px-3 py-2 text-left font-medium">Estado</th>
                        <th className="px-3 py-2 text-left font-medium">Condición</th>
                        <th className="px-3 py-2 text-left font-medium">Fecha Ingreso</th>
                        <th className="px-3 py-2 text-left font-medium">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailUnidades.map((u) => (
                        <tr key={u.id} className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                          <td className="px-3 py-2 font-mono font-semibold text-gray-800 dark:text-slate-200">{u.numero_serie}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              u.estado === "disponible"   ? "bg-green-100 text-green-700"
                              : u.estado === "en_uso"     ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                            }`}>
                              {u.estado_display}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-slate-400">{u.condicion_display || "—"}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(u.fecha_ingreso).toLocaleString("es-GT", {
                              dateStyle: "short", timeStyle: "short"
                            })}
                          </td>
                          <td className="px-3 py-2 text-gray-500 dark:text-slate-400 max-w-[160px] truncate">{u.observaciones || "—"}</td>
                        </tr>
                      ))}
                      {detailUnidades.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-gray-400 italic">
                            Sin unidades registradas
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: KARDEX individual ── */}
      {openCardex && cardexProducto && (
        <Modal title={`KARDEX — ${cardexProducto.nombre}`} onClose={() => setOpenCardex(false)} wide>
          <div className="space-y-4">

            {/* Info del producto */}
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg px-4 py-2.5 text-sm">
              <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded px-2 py-0.5">
                {cardexProducto.cod_producto ?? "—"}
              </span>
              <span className="text-gray-700 dark:text-slate-300 font-medium truncate flex-1">{cardexProducto.nombre}</span>
              <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
                Stock actual: <span className={`font-bold ${cardexProducto.stock_actual <= 0 ? "text-red-600" : "text-green-600"}`}>
                  {cardexProducto.stock_actual}
                </span> {cardexProducto.unidad_medida_display ?? "uds."}
              </span>
            </div>

            {/* Tabs Entrada / Salida */}
            <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg w-fit">
              <button type="button" onClick={() => setCardexTab("entrada")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  cardexTab === "entrada"
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-white"
                }`}>
                ↑ Entrada
              </button>
              <button type="button" onClick={() => setCardexTab("salida")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  cardexTab === "salida"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-white"
                }`}>
                ↓ Salida
              </button>
            </div>

            {/* ── Formulario Entrada ── */}
            {cardexTab === "entrada" && (
              <form onSubmit={handleCardexEntradaSubmit} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-green-800 dark:text-green-400">Registrar Entrada de Stock</h3>
                <div className="grid grid-cols-3 gap-3">
                  {/* Cantidad — solo si NO controla serie */}
                  {!cardexProducto.controla_serie ? (
                    <div>
                      <FormLabel>Cantidad *</FormLabel>
                      <input type="number" min="1" required value={cardexEntrada.cantidad}
                        onChange={(e) => setCardexEntrada({ ...cardexEntrada, cantidad: e.target.value })}
                        className={inp_cls} />
                    </div>
                  ) : (
                    /* Tag-input de números de serie */
                    <div className="col-span-3">
                      <FormLabel>
                        Números de Serie *{" "}
                        <span className="text-green-600 dark:text-green-400 font-normal">
                          ({cardexSeriales.length} ingresado{cardexSeriales.length !== 1 ? "s" : ""})
                        </span>
                      </FormLabel>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={cardexSerialInput}
                          onChange={(e) => setCardexSerialInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              const sn = cardexSerialInput.trim();
                              if (!sn) return;
                              if (cardexSeriales.includes(sn)) { alert(`El serial "${sn}" ya está en la lista.`); return; }
                              setCardexSeriales((prev) => [...prev, sn]);
                              setCardexSerialInput("");
                            }
                          }}
                          placeholder="Escribí el serial y presioná Enter…"
                          className={inp_cls}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const sn = cardexSerialInput.trim();
                            if (!sn) return;
                            if (cardexSeriales.includes(sn)) { alert(`El serial "${sn}" ya está en la lista.`); return; }
                            setCardexSeriales((prev) => [...prev, sn]);
                            setCardexSerialInput("");
                          }}
                          className="shrink-0 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                        >
                          +
                        </button>
                      </div>
                      {cardexSeriales.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-700 border border-green-200 dark:border-green-800 rounded-lg min-h-[2.5rem]">
                          {cardexSeriales.map((sn) => (
                            <span key={sn} className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-xs font-mono px-2 py-1 rounded-full">
                              {sn}
                              <button
                                type="button"
                                onClick={() => setCardexSeriales((prev) => prev.filter((s) => s !== sn))}
                                className="text-green-600 hover:text-red-500 font-bold leading-none"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Costo */}
                  <div>
                    <FormLabel>
                      Costo Unitario{" "}
                      <span className="text-green-600 dark:text-green-400 font-normal">(actualiza CPP)</span>
                    </FormLabel>
                    <input type="number" min="0" step="0.01" value={cardexEntrada.costo_unitario}
                      onChange={(e) => setCardexEntrada({ ...cardexEntrada, costo_unitario: e.target.value })}
                      placeholder="0.00" className={inp_cls} />
                  </div>
                  {/* Condición */}
                  <div>
                    <FormLabel>Condición del ítem</FormLabel>
                    <select value={cardexEntrada.condicion}
                      onChange={(e) => setCardexEntrada({ ...cardexEntrada, condicion: e.target.value })}
                      className={inp_cls}>
                      <option value="">— Seleccionar —</option>
                      {CONDICIONES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  {/* Proveedor */}
                  <div className="col-span-2">
                    <FormLabel>Proveedor</FormLabel>
                    <ProveedorSearch proveedores={proveedores} value={cardexEntrada.proveedor}
                      onChange={(v) => setCardexEntrada({ ...cardexEntrada, proveedor: v })} />
                  </div>
                  {/* Responsable */}
                  <div>
                    <FormLabel>Responsable</FormLabel>
                    <select value={cardexEntrada.responsable}
                      onChange={(e) => setCardexEntrada({ ...cardexEntrada, responsable: e.target.value })}
                      className={inp_cls}>
                      <option value="">— Sin asignar —</option>
                      {personal.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  {/* Factura */}
                  <div>
                    <FormLabel>N° de Factura</FormLabel>
                    <input value={cardexEntrada.numero_factura}
                      onChange={(e) => setCardexEntrada({ ...cardexEntrada, numero_factura: e.target.value })}
                      className={inp_cls} />
                  </div>
                  {/* OC */}
                  <div className="col-span-2">
                    <FormLabel>Orden de Compra</FormLabel>
                    <OCSearch compras={ocsPendientes} value={cardexEntrada.orden_compra}
                      onChange={(v) => setCardexEntrada({ ...cardexEntrada, orden_compra: v })}
                      inputClass={inp_cls} />
                  </div>
                  {/* Observación */}
                  <div className="col-span-3">
                    <FormLabel>Observación</FormLabel>
                    <input value={cardexEntrada.observacion}
                      onChange={(e) => setCardexEntrada({ ...cardexEntrada, observacion: e.target.value })}
                      placeholder="Notas adicionales…"
                      className={inp_cls} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium">
                    Registrar Entrada
                  </button>
                </div>
              </form>
            )}

            {/* ── Formulario Salida ── */}
            {cardexTab === "salida" && (
              <form onSubmit={handleCardexSalidaSubmit} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-400">Registrar Salida de Stock</h3>
                <div className="grid grid-cols-3 gap-3">
                  {/* Cantidad — solo si NO controla serie */}
                  {!cardexProducto.controla_serie ? (
                    <div>
                      <FormLabel>Cantidad *</FormLabel>
                      <input type="number" min="1" required value={cardexSalida.cantidad}
                        onChange={(e) => setCardexSalida({ ...cardexSalida, cantidad: e.target.value })}
                        className={inp_cls} />
                    </div>
                  ) : (
                    /* Selector de unidades disponibles */
                    <div className="col-span-3">
                      <FormLabel>
                        Unidades a retirar *{" "}
                        <span className="text-red-600 dark:text-red-400 font-normal">
                          ({cardexUnidadesSelec.length} seleccionada{cardexUnidadesSelec.length !== 1 ? "s" : ""})
                        </span>
                      </FormLabel>
                      {unidadesDisponibles.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-2">Sin unidades disponibles en stock.</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto border border-red-200 dark:border-red-800 rounded-lg bg-white dark:bg-slate-700 divide-y divide-gray-100 dark:divide-slate-600">
                          {unidadesDisponibles.map((u) => (
                            <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20">
                              <input
                                type="checkbox"
                                className="accent-red-600"
                                checked={cardexUnidadesSelec.includes(u.id)}
                                onChange={(e) => {
                                  setCardexUnidadesSelec((prev) =>
                                    e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                                  );
                                }}
                              />
                              <span className="font-mono text-xs text-gray-800 dark:text-slate-200">{u.numero_serie}</span>
                              {u.condicion_display && (
                                <span className="text-xs text-gray-400 dark:text-slate-400">{u.condicion_display}</span>
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Motivo */}
                  <div>
                    <FormLabel>Motivo de Salida *</FormLabel>
                    <select required value={cardexSalida.motivo_salida}
                      onChange={(e) => setCardexSalida({ ...cardexSalida, motivo_salida: e.target.value })}
                      className={inp_cls}>
                      <option value="">— Seleccionar —</option>
                      {MOTIVOS_SALIDA.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  {/* Condición */}
                  <div>
                    <FormLabel>Condición al salir</FormLabel>
                    <select value={cardexSalida.condicion}
                      onChange={(e) => setCardexSalida({ ...cardexSalida, condicion: e.target.value })}
                      className={inp_cls}>
                      <option value="">— Seleccionar —</option>
                      {CONDICIONES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  {/* Vale de salida */}
                  <div>
                    <FormLabel>Vale de Salida</FormLabel>
                    <input value={cardexSalida.vale_salida}
                      onChange={(e) => setCardexSalida({ ...cardexSalida, vale_salida: e.target.value })}
                      placeholder="N° vale o documento"
                      className={inp_cls} />
                  </div>
                  {/* Referencia OT */}
                  <div>
                    <FormLabel>Referencia OT</FormLabel>
                    <input value={cardexSalida.referencia_ot}
                      onChange={(e) => setCardexSalida({ ...cardexSalida, referencia_ot: e.target.value })}
                      placeholder="Ej: OT-0001"
                      className={inp_cls} />
                  </div>
                  {/* Responsable */}
                  <div>
                    <FormLabel>Responsable</FormLabel>
                    <select value={cardexSalida.responsable}
                      onChange={(e) => setCardexSalida({ ...cardexSalida, responsable: e.target.value })}
                      className={inp_cls}>
                      <option value="">— Sin asignar —</option>
                      {personal.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  {/* Observación */}
                  <div className="col-span-3">
                    <FormLabel>Observación</FormLabel>
                    <input value={cardexSalida.observacion}
                      onChange={(e) => setCardexSalida({ ...cardexSalida, observacion: e.target.value })}
                      placeholder="Notas adicionales…"
                      className={inp_cls} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium">
                    Registrar Salida
                  </button>
                </div>
              </form>
            )}

            {/* ── Historial de movimientos ── */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Historial</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 text-xs">
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-right">Cant.</th>
                      <th className="px-3 py-2 text-right">Costo</th>
                      <th className="px-3 py-2 text-left">Motivo / Proveedor</th>
                      <th className="px-3 py-2 text-left">Referencia</th>
                      <th className="px-3 py-2 text-left">Condición</th>
                      <th className="px-3 py-2 text-left">Responsable</th>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Obs.</th>
                      <th className="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.length === 0 && (
                      <tr><td colSpan={10} className="text-center py-4 text-gray-400 dark:text-slate-500 text-xs italic">Sin movimientos registrados</td></tr>
                    )}
                    {movimientos.map((m) => {
                      const seriales = m.tipo === "entrada"
                        ? (m.unidades_ingresadas ?? [])
                        : (m.unidades_egresadas ?? []);
                      const tieneSeriales = seriales.length > 0;
                      const expandido = expandedCardex.has(m.id);
                      return (
                        <>
                          <tr
                            key={m.id}
                            onClick={() => toggleExpand(setExpandedCardex, m.id)}
                            className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer select-none"
                          >
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                m.tipo === "entrada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>{m.tipo_display}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold dark:text-slate-200">{m.cantidad}</td>
                            <td className="px-3 py-2 text-right text-xs text-gray-500 dark:text-slate-400">
                              {m.tipo === "entrada" && m.costo_unitario ? fmt(m.costo_unitario) : "—"}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600 dark:text-slate-300">
                              {m.tipo === "entrada"
                                ? (m.proveedor_nombre || m.numero_factura || "—")
                                : (m.motivo_salida_display || m.vale_salida || "—")
                              }
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400 font-mono">
                              {m.tipo === "entrada" ? (m.orden_compra || "—") : (m.referencia_ot || "—")}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400">
                              {m.condicion_display || "—"}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400">
                              {m.responsable_nombre || "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-500 dark:text-slate-400 text-xs whitespace-nowrap">
                              {new Date(m.fecha).toLocaleString("es-GT")}
                            </td>
                            <td className="px-3 py-2 text-gray-500 dark:text-slate-400 text-xs max-w-[100px] truncate">
                              {m.observacion || "—"}
                            </td>
                            <td className="px-2 py-2 text-center text-teal-600 text-xs font-bold">
                              {tieneSeriales ? (expandido ? "▲" : "▼") : ""}
                            </td>
                          </tr>
                          {tieneSeriales && expandido && (
                            <tr key={`${m.id}-seriales`} className="bg-teal-50/60 dark:bg-teal-900/10">
                              <td colSpan={10} className="px-4 py-2">
                                <p className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide mb-1.5">
                                  Números de serie — {m.tipo === "entrada" ? "ingresados" : "retirados"}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {seriales.map((u) => (
                                    <span key={u.id} className={`inline-flex items-center gap-1.5 font-mono text-xs px-2 py-1 rounded-full border ${
                                      u.estado === "disponible"
                                        ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300"
                                        : u.estado === "en_uso"
                                        ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300"
                                        : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
                                    }`}>
                                      {u.numero_serie}
                                      <span className="text-[9px] font-normal opacity-70">{u.estado_display}</span>
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
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
            <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg w-fit">
              <button type="button" onClick={() => setBulkTab("entradas")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  bulkTab === "entradas" ? "bg-green-600 text-white shadow-sm" : "text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-white"
                }`}>
                ↑ Entradas {bulkEntradas.filter(r => r.producto && r.cantidad).length > 0 && (
                  <span className="ml-1 bg-white text-green-700 rounded-full px-1.5 text-xs font-bold">
                    {bulkEntradas.filter(r => r.producto && r.cantidad).length}
                  </span>
                )}
              </button>
              <button type="button" onClick={() => setBulkTab("salidas")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  bulkTab === "salidas" ? "bg-red-600 text-white shadow-sm" : "text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-white"
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
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "19%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "2%" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-green-50 text-green-800 text-xs">
                      <th className="px-2 py-2 text-left font-medium">Producto *</th>
                      <th className="px-2 py-2 text-left font-medium">Cant. / Seriales *</th>
                      <th className="px-2 py-2 text-left font-medium">Costo Unit.</th>
                      <th className="px-2 py-2 text-left font-medium">Proveedor</th>
                      <th className="px-2 py-2 text-left font-medium">N° Factura</th>
                      <th className="px-2 py-2 text-left font-medium">Orden Compra</th>
                      <th className="px-2 py-2 text-left font-medium">Observación</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {bulkEntradas.map((row, i) => {
                      const prod = productos.find((p) => String(p.id) === String(row.producto));
                      const esSeriado = !!prod?.controla_serie;
                      const expandido = expandedBulkE.has(row._id);
                      return (
                        <>
                          <tr key={row._id} className="border-b border-gray-100 dark:border-slate-700">
                            <td className="px-1 py-1.5">
                              <ProductoSearch productos={productos} value={row.producto}
                                onChange={(v) => handleBulkEntradaProducto(i, v)} />
                            </td>
                            <td className="px-1 py-1.5">
                              {!esSeriado ? (
                                <input type="number" min="1" value={row.cantidad}
                                  onChange={(e) => updateBulkEntrada(i, "cantidad", e.target.value)}
                                  className="bulk-inp w-full text-right" />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(setExpandedBulkE, row._id)}
                                  className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                    row.numeros_serie.length > 0
                                      ? "border-green-400 bg-green-50 text-green-700"
                                      : "border-gray-300 bg-white text-gray-500"
                                  }`}
                                >
                                  <span>{row.numeros_serie.length} S/N</span>
                                  <span className="text-[10px]">{expandido ? "▲" : "▼"}</span>
                                </button>
                              )}
                            </td>
                            <td className="px-1 py-1.5">
                              <input type="number" min="0" step="0.01" value={row.costo_unitario}
                                onChange={(e) => updateBulkEntrada(i, "costo_unitario", e.target.value)}
                                placeholder="0.00" className="bulk-inp w-full text-right" />
                            </td>
                            <td className="px-1 py-1.5">
                              <ProveedorSearch proveedores={proveedores} value={row.proveedor}
                                onChange={(v) => updateBulkEntrada(i, "proveedor", v)} />
                            </td>
                            <td className="px-1 py-1.5">
                              <input value={row.numero_factura}
                                onChange={(e) => updateBulkEntrada(i, "numero_factura", e.target.value)}
                                placeholder="Factura" className="bulk-inp w-full" />
                            </td>
                            <td className="px-1 py-1.5">
                              <OCSearch compras={ocsPendientes} value={row.orden_compra}
                                onChange={(v) => updateBulkEntrada(i, "orden_compra", v)} />
                            </td>
                            <td className="px-1 py-1.5">
                              <input value={row.observacion}
                                onChange={(e) => updateBulkEntrada(i, "observacion", e.target.value)}
                                placeholder="Opcional" className="bulk-inp w-full" />
                            </td>
                            <td className="px-1 py-1.5 text-center">
                              {bulkEntradas.length > 1 && (
                                <button type="button"
                                  onClick={() => {
                                    setBulkEntradas((r) => r.filter((_, idx) => idx !== i));
                                    setExpandedBulkE((prev) => { const n = new Set(prev); n.delete(row._id); return n; });
                                    setBulkSerialInputs((prev) => { const n = { ...prev }; delete n[row._id]; return n; });
                                  }}
                                  className="text-red-400 hover:text-red-600 font-bold text-sm">✕</button>
                              )}
                            </td>
                          </tr>
                          {/* Sub-fila de seriales para productos con controla_serie */}
                          {esSeriado && expandido && (
                            <tr key={`${row._id}-sn`} className="bg-green-50/60 dark:bg-green-900/10">
                              <td colSpan={8} className="px-3 py-2">
                                <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1.5">
                                  Números de serie a ingresar
                                </p>
                                <div className="flex gap-2 mb-2">
                                  <input
                                    type="text"
                                    value={bulkSerialInputs[row._id] ?? ""}
                                    onChange={(e) => setBulkSerialInputs((prev) => ({ ...prev, [row._id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === ",") {
                                        e.preventDefault();
                                        addBulkSerial(i, row, bulkSerialInputs[row._id] ?? "");
                                      }
                                    }}
                                    placeholder="Escribí el serial y presioná Enter…"
                                    className="flex-1 border border-green-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addBulkSerial(i, row, bulkSerialInputs[row._id] ?? "")}
                                    className="shrink-0 px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                                  >
                                    +
                                  </button>
                                </div>
                                {row.numeros_serie.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {row.numeros_serie.map((sn) => (
                                      <span key={sn} className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-xs font-mono px-2 py-0.5 rounded-full">
                                        {sn}
                                        <button type="button" onClick={() => removeBulkSerial(i, row, sn)}
                                          className="text-green-600 hover:text-red-500 font-bold leading-none">✕</button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
                <button type="button" onClick={() => setBulkEntradas((r) => [...r, mkEntrada()])}
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
                    <col style={{ width: "30%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "23%" }} />
                    <col style={{ width: "3%" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-red-50 text-red-800 text-xs">
                      <th className="px-2 py-2 text-left font-medium">Producto *</th>
                      <th className="px-2 py-2 text-left font-medium">Cant. / Unidades *</th>
                      <th className="px-2 py-2 text-left font-medium">Vale de Salida</th>
                      <th className="px-2 py-2 text-left font-medium">Referencia OT</th>
                      <th className="px-2 py-2 text-left font-medium">Observación</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {bulkSalidas.map((row, i) => {
                      const prod = productos.find((p) => String(p.id) === String(row.producto));
                      const esSeriado = !!prod?.controla_serie;
                      const expandido = expandedBulkS.has(row._id);
                      const unidDisp = bulkSalidasUnidades[row._id] ?? [];
                      return (
                        <>
                          <tr key={row._id} className="border-b border-gray-100 dark:border-slate-700">
                            <td className="px-1 py-1.5">
                              <ProductoSearch productos={productos} value={row.producto}
                                onChange={(v) => handleBulkSalidaProducto(i, row, v)} />
                            </td>
                            <td className="px-1 py-1.5">
                              {!esSeriado ? (
                                <input type="number" min="1" value={row.cantidad}
                                  onChange={(e) => updateBulkSalida(i, "cantidad", e.target.value)}
                                  className="bulk-inp w-full text-right" />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(setExpandedBulkS, row._id)}
                                  className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                    row.unidades_ids.length > 0
                                      ? "border-red-400 bg-red-50 text-red-700"
                                      : "border-gray-300 bg-white text-gray-500"
                                  }`}
                                >
                                  <span>{row.unidades_ids.length} sel.</span>
                                  <span className="text-[10px]">{expandido ? "▲" : "▼"}</span>
                                </button>
                              )}
                            </td>
                            <td className="px-1 py-1.5">
                              <input value={row.vale_salida}
                                onChange={(e) => updateBulkSalida(i, "vale_salida", e.target.value)}
                                placeholder="Nº vale" className="bulk-inp w-full" />
                            </td>
                            <td className="px-1 py-1.5">
                              <input value={row.referencia_ot}
                                onChange={(e) => updateBulkSalida(i, "referencia_ot", e.target.value)}
                                placeholder="OT-0001" className="bulk-inp w-full" />
                            </td>
                            <td className="px-1 py-1.5">
                              <input value={row.observacion}
                                onChange={(e) => updateBulkSalida(i, "observacion", e.target.value)}
                                placeholder="Opcional" className="bulk-inp w-full" />
                            </td>
                            <td className="px-1 py-1.5 text-center">
                              {bulkSalidas.length > 1 && (
                                <button type="button"
                                  onClick={() => {
                                    setBulkSalidas((r) => r.filter((_, idx) => idx !== i));
                                    setExpandedBulkS((prev) => { const n = new Set(prev); n.delete(row._id); return n; });
                                    setBulkSalidasUnidades((prev) => { const n = { ...prev }; delete n[row._id]; return n; });
                                  }}
                                  className="text-red-400 hover:text-red-600 font-bold text-sm">✕</button>
                              )}
                            </td>
                          </tr>
                          {/* Sub-fila de selección de unidades */}
                          {esSeriado && expandido && (
                            <tr key={`${row._id}-units`} className="bg-red-50/60 dark:bg-red-900/10">
                              <td colSpan={6} className="px-3 py-2">
                                <p className="text-[10px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1.5">
                                  Unidades disponibles — seleccioná las que salen
                                </p>
                                {unidDisp.length === 0 ? (
                                  <p className="text-xs text-gray-400 italic">Sin unidades disponibles en stock.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {unidDisp.map((u) => {
                                      const selec = row.unidades_ids.includes(u.id);
                                      return (
                                        <label key={u.id}
                                          className={`inline-flex items-center gap-1.5 cursor-pointer font-mono text-xs px-2 py-1 rounded-full border transition-colors ${
                                            selec
                                              ? "bg-red-600 border-red-600 text-white"
                                              : "bg-white border-gray-300 text-gray-700 hover:border-red-400"
                                          }`}
                                        >
                                          <input type="checkbox" className="sr-only"
                                            checked={selec}
                                            onChange={() => toggleBulkUnidad(i, row, u.id)} />
                                          {u.numero_serie}
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
                <button type="button" onClick={() => setBulkSalidas((r) => [...r, mkSalida()])}
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

      {/* ── Modal: Historial Global de Movimientos ─────────────────────────── */}
      {openHistorial && (
        <Modal
          title="Historial Global de Movimientos"
          onClose={() => { setOpenHistorial(false); setHistSearch(""); setHistPage(1); setHistData({ count: 0, results: [] }); }}
          size="full"
        >
          {/* Barra de búsqueda */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={histSearch}
                onChange={(e) => { setHistSearch(e.target.value); setHistPage(1); }}
                placeholder="Buscar por código, nombre, marca, modelo, categoría, N/S…"
                className="w-full border rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {histSearch && (
                <button
                  type="button"
                  onClick={() => { setHistSearch(""); setHistPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                >×</button>
              )}
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {histData.count} registro{histData.count !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left w-6"></th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-right">Cant.</th>
                  <th className="px-3 py-2 text-right">Costo Unit.</th>
                  <th className="px-3 py-2 text-left">Referencia</th>
                  <th className="px-3 py-2 text-left">Factura</th>
                  <th className="px-3 py-2 text-left">Responsable</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {histLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400 text-sm">Cargando…</td>
                  </tr>
                ) : histData.results.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400 text-sm">Sin movimientos</td>
                  </tr>
                ) : histData.results.map((mv) => {
                  const isExp = expandedHist.has(mv.id);
                  const tipoColor = mv.tipo === "entrada"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700";
                  const seriales = [
                    ...(mv.unidades_ingresadas ?? []),
                    ...(mv.unidades_egresadas ?? []),
                  ];
                  return (
                    <>
                      <tr
                        key={mv.id}
                        onClick={() => toggleExpand(setExpandedHist, mv.id)}
                        className="hover:bg-gray-50 cursor-pointer select-none"
                      >
                        <td className="px-3 py-2 text-gray-400 text-xs font-mono">
                          {isExp ? "▼" : "▶"}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoColor}`}>
                            {mv.tipo === "entrada" ? "Entrada" : "Salida"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-800">{mv.producto_nombre ?? mv.producto}</div>
                          {mv.cod_producto && (
                            <div className="text-xs text-gray-400">{mv.cod_producto}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {mv.tipo === "salida" ? "-" : "+"}{mv.cantidad}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {mv.costo_unitario != null
                            ? `Q${Number(mv.costo_unitario).toLocaleString("es-GT", { minimumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs">
                          {mv.orden_compra || mv.vale_salida || mv.referencia_ot || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs">
                          {mv.numero_factura || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs">
                          {mv.responsable_nombre ?? mv.responsable ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                          {mv.fecha
                            ? new Date(mv.fecha).toLocaleString("es-GT", {
                                dateStyle: "short", timeStyle: "short",
                              })
                            : "—"}
                        </td>
                      </tr>
                      {isExp && (
                        <tr key={`${mv.id}-det`} className="bg-indigo-50">
                          <td></td>
                          <td colSpan={8} className="px-4 py-3">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-gray-700 mb-2">
                              {mv.proveedor_nombre && (
                                <div><span className="font-medium">Proveedor:</span> {mv.proveedor_nombre}</div>
                              )}
                              {mv.numero_factura && (
                                <div><span className="font-medium">Factura:</span> {mv.numero_factura}</div>
                              )}
                              {mv.motivo_salida && (
                                <div><span className="font-medium">Motivo:</span> {mv.motivo_salida}</div>
                              )}
                              {mv.condicion && (
                                <div><span className="font-medium">Condición:</span> {mv.condicion}</div>
                              )}
                              {mv.observacion && (
                                <div className="col-span-2"><span className="font-medium">Obs:</span> {mv.observacion}</div>
                              )}
                            </div>
                            {seriales.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Números de serie:</p>
                                <div className="flex flex-wrap gap-1">
                                  {seriales.map((u) => {
                                    const chipColor =
                                      u.estado === "disponible" ? "bg-emerald-100 text-emerald-700" :
                                      u.estado === "en_uso"     ? "bg-blue-100 text-blue-700" :
                                                                   "bg-gray-200 text-gray-500";
                                    return (
                                      <span key={u.id} className={`px-2 py-0.5 rounded text-xs font-mono ${chipColor}`}>
                                        {u.numero_serie}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {histData.count > HIST_PAGE_SIZE && (
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                disabled={histPage === 1}
                onClick={() => setHistPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >← Anterior</button>

              <div className="flex items-center gap-1">
                {(() => {
                  const totalPages = Math.ceil(histData.count / HIST_PAGE_SIZE);
                  const pages = [];
                  for (let i = 1; i <= totalPages; i++) {
                    if (i === 1 || i === totalPages || (i >= histPage - 2 && i <= histPage + 2)) {
                      pages.push(i);
                    } else if (pages[pages.length - 1] !== "…") {
                      pages.push("…");
                    }
                  }
                  return pages.map((p, idx) =>
                    p === "…" ? (
                      <span key={`ell-${idx}`} className="px-1 text-gray-400 text-sm">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setHistPage(p)}
                        className={`w-8 h-8 text-sm rounded-lg ${
                          p === histPage
                            ? "bg-indigo-600 text-white font-medium"
                            : "border hover:bg-gray-50 text-gray-700"
                        }`}
                      >{p}</button>
                    )
                  );
                })()}
              </div>

              <button
                type="button"
                disabled={histPage >= Math.ceil(histData.count / HIST_PAGE_SIZE)}
                onClick={() => setHistPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >Siguiente →</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
