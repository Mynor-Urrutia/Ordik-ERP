import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { comprasService } from "../../services/api/compras";
import { proveedoresService } from "../../services/api/proveedores";
import { inventarioService } from "../../services/api/inventario";
import { tiposPagoService } from "../../services/api/maestros";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  `Q${parseFloat(n || 0).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = { proveedor: "", fecha_despacho: today(), tipo_pago: "", num_cotizacion_proveedor: "", notas: "" };
const EMPTY_ITEM = { producto: "", cantidad: "1", costo_unitario: "" };

// ── AutocompleteSearch ────────────────────────────────────────────────────────
function AutocompleteSearch({
  items, value, onChange, filterFn, renderBadge, renderOption, placeholder = "Buscar…",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const [pos, setPos]     = useState({ top: 0, left: 0, width: 0 });
  const inputRef          = useRef(null);

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
        <div className="flex items-center gap-1.5 border border-blue-400 bg-blue-50 rounded-lg px-3 py-2 w-full min-h-[2.4rem]">
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
function ProductoSearch({ productos, value, onChange }) {
  const filterFn = useCallback(
    (p, q) => p.nombre?.toLowerCase().includes(q) || p.cod_producto?.toLowerCase().includes(q),
    []
  );
  const renderBadge = useCallback((p) => (
    <>
      <span className="font-mono text-blue-700 font-semibold text-xs shrink-0">{p.cod_producto}</span>
      <span className="text-gray-700 text-xs truncate flex-1 ml-1">{p.nombre}</span>
    </>
  ), []);
  const renderOption = useCallback((p) => (
    <>
      <span className="font-mono text-blue-600 font-semibold text-xs w-24 shrink-0">{p.cod_producto ?? "—"}</span>
      <span className="text-gray-800 text-xs truncate flex-1">{p.nombre}</span>
      <span className={`text-xs font-medium shrink-0 ${p.stock_actual <= 0 ? "text-red-500" : "text-green-600"}`}>
        stock: {p.stock_actual}
      </span>
    </>
  ), []);

  return (
    <AutocompleteSearch
      items={productos} value={value} onChange={onChange}
      filterFn={filterFn} renderBadge={renderBadge} renderOption={renderOption}
      placeholder="Código o nombre del producto…"
    />
  );
}

// ── ProveedorSearch ───────────────────────────────────────────────────────────
function ProveedorSearch({ proveedores, value, onChange }) {
  const filterFn = useCallback(
    (p, q) => p.razon_social?.toLowerCase().includes(q) || p.nit?.toLowerCase().includes(q),
    []
  );
  const renderBadge = useCallback((p) => (
    <>
      <span className="text-gray-700 text-sm truncate flex-1">{p.razon_social}</span>
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
      items={proveedores} value={value} onChange={onChange}
      filterFn={filterFn} renderBadge={renderBadge} renderOption={renderOption}
      placeholder="Razón social o NIT…"
    />
  );
}

// ── Vista previa de la OC ─────────────────────────────────────────────────────
function PreviewOC({ form, formItems, proveedores, productos, tiposPago, onBack, onConfirm, saving }) {
  const proveedor = proveedores.find((p) => String(p.id) === String(form.proveedor));
  const tipoPago  = tiposPago.find((t) => String(t.id) === String(form.tipo_pago));

  const itemsConDatos = formItems.map((it) => {
    const prod = productos.find((p) => String(p.id) === String(it.producto));
    return { ...it, prod };
  });

  const total = itemsConDatos.reduce(
    (acc, it) => acc + (parseFloat(it.costo_unitario) || 0) * (parseInt(it.cantidad) || 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* Encabezado OC */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Orden de Compra</p>
            <p className="text-lg font-bold text-blue-800">Se generará automáticamente</p>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
            Pendiente de guardar
          </span>
        </div>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Proveedor</p>
            <p className="font-semibold text-gray-800">{proveedor?.razon_social ?? "—"}</p>
            <p className="text-xs text-gray-400">{proveedor?.nit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Fecha Despacho</p>
            <p className="font-semibold text-gray-800">
              {form.fecha_despacho
                ? new Date(form.fecha_despacho + "T00:00:00").toLocaleDateString("es-GT", {
                    day: "2-digit", month: "long", year: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Tipo de Pago</p>
            <p className="font-semibold text-gray-800">
              {tipoPago ? `${tipoPago.nombre}${tipoPago.dias_plazo > 0 ? ` (${tipoPago.dias_plazo} días)` : ""}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">N° Cot. Proveedor</p>
            <p className="font-semibold text-gray-800">{form.num_cotizacion_proveedor || "—"}</p>
          </div>
        </div>
        {form.notas && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-gray-500 mb-0.5">Notas</p>
            <p className="text-sm text-gray-700">{form.notas}</p>
          </div>
        )}
      </div>

      {/* Tabla de productos */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">
          Productos a comprar
          <span className="ml-2 text-xs font-normal text-gray-400">({itemsConDatos.length} línea{itemsConDatos.length !== 1 ? "s" : ""})</span>
        </p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Código</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Producto</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Cant.</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Costo Unit.</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itemsConDatos.map((it, i) => {
                const subtotal = (parseFloat(it.costo_unitario) || 0) * (parseInt(it.cantidad) || 0);
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-blue-600 font-semibold">
                      {it.prod?.cod_producto ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-800">{it.prod?.nombre ?? `#${it.producto}`}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{it.cantidad}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{fmt(it.costo_unitario)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{fmt(subtotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-700">TOTAL</td>
                <td className="px-4 py-3 text-right font-bold text-blue-700 text-base">{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-between items-center pt-2 border-t">
        <button type="button" onClick={onBack}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
          ← Volver a editar
        </button>
        <button type="button" onClick={onConfirm} disabled={saving}
          className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60">
          {saving ? "Guardando…" : "Confirmar y Guardar OC"}
        </button>
      </div>
    </div>
  );
}

// ── Modal Detalle OC ──────────────────────────────────────────────────────────
function DetalleOC({ oc, onClose }) {
  const total = (oc.items ?? []).reduce(
    (acc, it) => acc + (parseFloat(it.costo_unitario) || 0) * (parseInt(it.cantidad) || 0),
    0
  );

  const fechaCreacion = oc.fecha_creacion
    ? new Date(oc.fecha_creacion).toLocaleString("es-GT", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  const fechaDespacho = oc.fecha_despacho
    ? new Date(oc.fecha_despacho + "T00:00:00").toLocaleDateString("es-GT", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "—";

  return (
    <Modal title="Detalle de Orden de Compra" onClose={onClose} wide>
      <div className="space-y-5">

        {/* Cabecera OC */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-1">
                Orden de Compra
              </p>
              <p className="text-2xl font-bold tracking-wide">{oc.correlativo || `COM-${String(oc.id).padStart(4,"0")}`}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-blue-200 text-xs mb-0.5">Registrada</p>
              <p className="font-medium">{fechaCreacion}</p>
            </div>
          </div>
        </div>

        {/* Info general */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium mb-1">Proveedor</p>
            <p className="font-semibold text-gray-800 text-sm">{oc.proveedor_nombre ?? `#${oc.proveedor}`}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium mb-1">Fecha de Despacho</p>
            <p className="font-semibold text-gray-800 text-sm">{fechaDespacho}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium mb-1">Tipo de Pago</p>
            {oc.tipo_pago_nombre ? (
              <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {oc.tipo_pago_nombre}
              </span>
            ) : (
              <p className="text-gray-400 text-sm">—</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium mb-1">N° Cot. Proveedor</p>
            <p className="font-semibold text-gray-800 text-sm">
              {oc.num_cotizacion_proveedor || <span className="text-gray-400 font-normal">—</span>}
            </p>
          </div>
        </div>

        {oc.notas && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-600 font-medium mb-0.5">Notas</p>
            <p className="text-sm text-amber-900">{oc.notas}</p>
          </div>
        )}

        {/* Tabla de productos */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Productos
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({(oc.items ?? []).length} línea{(oc.items ?? []).length !== 1 ? "s" : ""})
            </span>
          </p>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">Código</th>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">Producto</th>
                  <th className="px-4 py-2.5 text-right font-medium text-xs">Cantidad</th>
                  <th className="px-4 py-2.5 text-right font-medium text-xs">Costo Unit.</th>
                  <th className="px-4 py-2.5 text-right font-medium text-xs">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(oc.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-400 text-xs italic">
                      Sin productos registrados
                    </td>
                  </tr>
                ) : (
                  (oc.items ?? []).map((it, i) => {
                    const subtotal = (parseFloat(it.costo_unitario) || 0) * (parseInt(it.cantidad) || 0);
                    return (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-2.5 font-mono text-xs text-blue-600 font-semibold whitespace-nowrap">
                          {it.producto_cod ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-gray-800">{it.producto_nombre ?? `#${it.producto}`}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{it.cantidad}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{fmt(it.costo_unitario)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{fmt(subtotal)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-700 text-sm">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700 text-base">
                    {fmt(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-1 border-t">
          <button onClick={onClose}
            className="px-5 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ComprasPage() {
  const [items, setItems]         = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [tiposPago, setTiposPago] = useState([]);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formItems, setFormItems] = useState([{ ...EMPTY_ITEM }]);
  const [editing, setEditing]     = useState(null);
  const [detalle, setDetalle]     = useState(null);
  const [open, setOpen]           = useState(false);
  const [step, setStep]           = useState(1); // 1=formulario, 2=preview
  const [saving, setSaving]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [busqueda, setBusqueda]   = useState("");
  const [sortKey, setSortKey]     = useState("id");
  const [sortDir, setSortDir]     = useState("desc");

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
      const [p, pr, tp] = await Promise.all([
        proveedoresService.getAll(),
        inventarioService.getProductos(),
        tiposPagoService.getAll({ activo: true }),
      ]);
      setProveedores(p.data.results ?? p.data);
      setProductos(pr.data.results ?? pr.data);
      setTiposPago(tp.data.results ?? tp.data);
    } catch (e) { console.error(e); }
  };

  const proveedorMap = useMemo(
    () => Object.fromEntries(proveedores.map((p) => [p.id, p.razon_social])),
    [proveedores]
  );

  // ── Tabla ────────────────────────────────────────────────────────────────
  const columnas = useMemo(() => [
    {
      key: "correlativo",
      label: "OC",
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-blue-600">
          {r.correlativo || `COM-${String(r.id).padStart(4, "0")}`}
        </span>
      ),
    },
    {
      key: "proveedor",
      label: "Proveedor",
      sortable: true,
      render: (r) => r.proveedor_nombre ?? proveedorMap[r.proveedor] ?? `#${r.proveedor}`,
    },
    {
      key: "fecha_despacho",
      label: "Fecha Despacho",
      sortable: true,
      render: (r) =>
        r.fecha_despacho
          ? new Date(r.fecha_despacho + "T00:00:00").toLocaleDateString("es-GT")
          : "—",
    },
    {
      key: "tipo_pago",
      label: "Tipo Pago",
      render: (r) =>
        r.tipo_pago_nombre ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {r.tipo_pago_nombre}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        ),
    },
    {
      key: "total",
      label: "Total",
      sortable: true,
      render: (r) => {
        const t = (r.items ?? []).reduce(
          (acc, it) =>
            acc + (parseFloat(it.costo_unitario) || 0) * (parseInt(it.cantidad) || 0),
          0
        );
        return fmt(t);
      },
    },
    {
      key: "items",
      label: "# Ítems",
      render: (r) => r.items?.length ?? 0,
    },
  ], [proveedorMap]);

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let result = q
      ? items.filter((r) => {
          const nombre = r.proveedor_nombre ?? proveedorMap[r.proveedor] ?? "";
          const tpago  = r.tipo_pago_nombre ?? "";
          return (
            nombre.toLowerCase().includes(q) ||
            (r.correlativo ?? "").toLowerCase().includes(q) ||
            tpago.toLowerCase().includes(q)
          );
        })
      : [...items];

    result.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "es");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [items, busqueda, proveedorMap, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Form ─────────────────────────────────────────────────────────────────
  const addItem    = () => setFormItems((fi) => [...fi, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setFormItems((fi) => fi.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) =>
    setFormItems((fi) => fi.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  const canPreview = () => {
    if (!form.proveedor || !form.fecha_despacho) return false;
    return formItems.every(
      (it) => it.producto && parseInt(it.cantidad) > 0 && parseFloat(it.costo_unitario) > 0
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canPreview()) return;
    setStep(2);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        proveedor: parseInt(form.proveedor),
        tipo_pago: form.tipo_pago ? parseInt(form.tipo_pago) : null,
        items: formItems.map((it) => ({
          producto: parseInt(it.producto),
          cantidad: parseInt(it.cantidad),
          costo_unitario: it.costo_unitario,
        })),
      };
      editing
        ? await comprasService.update(editing.id, payload)
        : await comprasService.create(payload);
      close(); load();
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({
      proveedor: item.proveedor,
      fecha_despacho: item.fecha_despacho,
      tipo_pago: item.tipo_pago ?? "",
      num_cotizacion_proveedor: item.num_cotizacion_proveedor ?? "",
      notas: item.notas ?? "",
    });
    setFormItems(
      item.items?.length
        ? item.items.map((it) => ({
            producto: it.producto,
            cantidad: String(it.cantidad),
            costo_unitario: it.costo_unitario,
          }))
        : [{ ...EMPTY_ITEM }]
    );
    setStep(1);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta orden de compra?")) return;
    await comprasService.remove(id);
    load();
  };

  const close = () => {
    setOpen(false); setEditing(null);
    setForm(EMPTY_FORM); setFormItems([{ ...EMPTY_ITEM }]);
    setStep(1);
  };

  const subtotalFila = (it) =>
    (parseFloat(it.costo_unitario) || 0) * (parseInt(it.cantidad) || 0);
  const total = formItems.reduce((acc, it) => acc + subtotalFila(it), 0);

  return (
    <div>
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold text-gray-800">Órdenes de Compra</h1>
        <button
          onClick={() => { setStep(1); setOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Nueva Orden de Compra
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por OC, proveedor, tipo de pago…"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          extra={(row) => (
            <button
              onClick={() => setDetalle(row)}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Ver
            </button>
          )}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>

      {/* Modal Detalle */}
      {detalle && <DetalleOC oc={detalle} onClose={() => setDetalle(null)} />}

      {/* Modal */}
      {open && (
        <Modal
          title={
            step === 1
              ? editing ? "Editar Orden de Compra" : "Nueva Orden de Compra"
              : "Vista Previa — Orden de Compra"
          }
          onClose={close}
          wide
        >
          {step === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Paso 1 — Formulario */}

              {/* Indicador de pasos */}
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <span className="flex items-center gap-1 text-blue-600 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  Datos de la OC
                </span>
                <span className="flex-1 border-t border-dashed border-gray-300" />
                <span className="flex items-center gap-1 text-gray-400">
                  <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px]">2</span>
                  Vista previa
                </span>
              </div>

              {/* Encabezado */}
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Despacho *</label>
                  <input
                    type="date"
                    value={form.fecha_despacho}
                    onChange={(e) => setForm({ ...form, fecha_despacho: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">N° Cotización Proveedor</label>
                  <input
                    type="text"
                    value={form.num_cotizacion_proveedor}
                    onChange={(e) => setForm({ ...form, num_cotizacion_proveedor: e.target.value })}
                    placeholder="Ej. COT-2026-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                  <input
                    type="text"
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    placeholder="Observaciones…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Productos */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Productos a comprar
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({formItems.length} línea{formItems.length !== 1 ? "s" : ""})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    + Agregar producto
                  </button>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Producto</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 w-20">Cant.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 w-32">Costo Unit.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 w-24">Subtotal</th>
                        <th className="px-3 py-2 w-6" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formItems.map((it, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1.5">
                            <ProductoSearch
                              productos={productos}
                              value={it.producto}
                              onChange={(v) => updateItem(i, "producto", v)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number" min="1" value={it.cantidad}
                              onChange={(e) => updateItem(i, "cantidad", e.target.value)}
                              required
                              className="w-full border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number" min="0" step="0.01" value={it.costo_unitario}
                              onChange={(e) => updateItem(i, "costo_unitario", e.target.value)}
                              required
                              className="w-full border border-gray-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right font-medium">
                            {fmt(subtotalFila(it))}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {formItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(i)}
                                className="text-red-400 hover:text-red-600 font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={3} className="px-3 py-2.5 text-right font-semibold text-sm text-gray-700">
                          TOTAL
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-sm text-blue-700">
                          {fmt(total)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Acciones paso 1 */}
              <div className="flex justify-between items-center pt-2 border-t">
                <button
                  type="button"
                  onClick={close}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canPreview()}
                  className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editing ? "Ver vista previa →" : "Vista previa →"}
                </button>
              </div>
            </form>
          ) : (
            /* Paso 2 — Vista previa */
            <>
              {/* Indicador de pasos */}
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                <span className="flex items-center gap-1 text-gray-400">
                  <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px]">✓</span>
                  Datos de la OC
                </span>
                <span className="flex-1 border-t border-dashed border-gray-300" />
                <span className="flex items-center gap-1 text-blue-600 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                  Vista previa
                </span>
              </div>
              <PreviewOC
                form={form}
                formItems={formItems}
                proveedores={proveedores}
                productos={productos}
                tiposPago={tiposPago}
                onBack={() => setStep(1)}
                onConfirm={handleConfirm}
                saving={saving}
              />
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
