import { useEffect, useRef, useState, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { reportesService } from "../../services/api/reportes";

// ── Paleta ────────────────────────────────────────────────────────────────────
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

const fmt = (n) =>
  `Q${parseFloat(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMes = (m) => {
  const [y, mo] = m.split("-");
  const nombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${nombres[parseInt(mo) - 1]} ${y.slice(2)}`;
};

// ── Tabs config ───────────────────────────────────────────────────────────────
const ALL_TABS = [
  {
    id: "ventas",     label: "Ventas",            hasDate: true,
    roles: ["admin", "supervisor", "contador"],
  },
  {
    id: "compras",    label: "Compras",            hasDate: true,
    roles: ["admin", "supervisor", "bodeguero", "contador"],
  },
  {
    id: "cxc",        label: "Cuentas por Cobrar", hasDate: false,
    roles: ["admin", "supervisor", "contador"],
  },
  {
    id: "inventario", label: "Inventario",          hasDate: false,
    roles: ["admin", "supervisor", "bodeguero", "contador"],
  },
  {
    id: "ots",        label: "Órdenes de Trabajo",  hasDate: true,
    roles: ["admin", "supervisor", "vendedor", "bodeguero", "contador"],
  },
];

// ── Primitivos ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = "blue" }) {
  const bg = {
    blue:   "from-blue-500 to-blue-600",
    green:  "from-emerald-500 to-emerald-600",
    amber:  "from-amber-500 to-amber-600",
    red:    "from-red-500 to-red-600",
    violet: "from-violet-500 to-violet-600",
    teal:   "from-teal-500 to-teal-600",
  };
  return (
    <div className={`bg-gradient-to-br ${bg[color]} rounded-2xl p-5 text-white shadow`}>
      <p className="text-xs font-medium opacity-75 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1 leading-tight">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label, money = false }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {money ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

const ESTATUS_BADGE = {
  emitida:   "bg-blue-100 text-blue-700",
  pagada:    "bg-emerald-100 text-emerald-700",
  borrador:  "bg-slate-100 text-slate-600",
  anulada:   "bg-red-100 text-red-700",
  pendiente: "bg-amber-100 text-amber-700",
  parcial:   "bg-orange-100 text-orange-700",
  vencida:   "bg-red-100 text-red-700",
  Pendiente: "bg-amber-100 text-amber-700",
  Confirmada:"bg-blue-100 text-blue-700",
  Recibida:  "bg-emerald-100 text-emerald-700",
  Cancelada: "bg-red-100 text-red-700",
  ok:        "bg-emerald-100 text-emerald-700",
  bajo:      "bg-amber-100 text-amber-700",
  sin_stock: "bg-red-100 text-red-700",
};

function Badge({ val, label }) {
  const cls = ESTATUS_BADGE[val] ?? "bg-slate-100 text-slate-600";
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label ?? val}</span>;
}

function DataTable({ headers, rows, empty = "Sin datos." }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            {headers.map((h, i) => (
              <th
                key={i}
                className={`py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ${h.right ? "text-right" : "text-left"}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="py-10 text-center text-sm text-slate-400">{empty}</td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={`py-2.5 px-3 ${headers[j]?.right ? "text-right" : ""}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorMsg({ msg }) {
  return (
    <div className="flex items-center justify-center h-64 text-red-500 text-sm">{msg}</div>
  );
}

// ── Reporte: Ventas ───────────────────────────────────────────────────────────
function ReporteVentas({ data }) {
  const { kpis, ventas_por_mes, tabla } = data;
  const meses = ventas_por_mes.map((v) => ({ ...v, mes: fmtMes(v.mes) }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Total facturado" value={fmt(kpis.total_ingresos)} sub="Facturas emitidas y pagadas" color="blue" />
        <KpiCard label="Cantidad de facturas" value={kpis.cantidad_facturas} color="green" />
        <KpiCard label="Promedio por factura" value={fmt(kpis.promedio_factura)} color="violet" />
      </div>

      <ChartCard title="Ventas por mes">
        {meses.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={meses} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Q${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip money />} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400 text-center py-12">Sin ventas en el período.</p>
        )}
      </ChartCard>

      <ChartCard title={`Facturas (${tabla.length})`}>
        <DataTable
          headers={[
            { label: "N°" }, { label: "Cliente" }, { label: "Fecha" },
            { label: "Estatus" }, { label: "Total", right: true },
          ]}
          rows={tabla.map((f) => [
            <span className="font-mono text-xs text-slate-500">{f.correlativo}</span>,
            <span className="font-medium text-slate-800 dark:text-slate-200">{f.cliente}</span>,
            <span className="text-slate-500">{f.fecha}</span>,
            <Badge val={f.estatus} />,
            <span className="font-semibold text-slate-800 dark:text-slate-200">{fmt(f.total)}</span>,
          ])}
          empty="Sin facturas en el período."
        />
      </ChartCard>
    </div>
  );
}

// ── Reporte: Compras ──────────────────────────────────────────────────────────
function ReporteCompras({ data }) {
  const { kpis, compras_por_mes, tabla } = data;
  const meses = compras_por_mes.map((v) => ({ ...v, mes: fmtMes(v.mes) }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Total comprado" value={fmt(kpis.total_comprado)} sub="Órdenes confirmadas y recibidas" color="teal" />
        <KpiCard label="Órdenes de compra" value={kpis.cantidad_ordenes} color="blue" />
        <KpiCard label="Promedio por orden" value={fmt(kpis.promedio_orden)} color="violet" />
      </div>

      <ChartCard title="Compras por mes">
        {meses.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={meses} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Q${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip money />} />
              <Line type="monotone" dataKey="total" stroke="#14b8a6" strokeWidth={2} dot={{ r: 4, fill: "#14b8a6" }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400 text-center py-12">Sin compras en el período.</p>
        )}
      </ChartCard>

      <ChartCard title={`Órdenes de compra (${tabla.length})`}>
        <DataTable
          headers={[
            { label: "N°" }, { label: "Proveedor" }, { label: "Fecha" },
            { label: "Estatus" }, { label: "Total", right: true },
          ]}
          rows={tabla.map((c) => [
            <span className="font-mono text-xs text-slate-500">{c.correlativo}</span>,
            <span className="font-medium text-slate-800 dark:text-slate-200">{c.proveedor}</span>,
            <span className="text-slate-500">{c.fecha}</span>,
            <Badge val={c.estatus} />,
            <span className="font-semibold text-slate-800 dark:text-slate-200">{fmt(c.total)}</span>,
          ])}
          empty="Sin órdenes de compra en el período."
        />
      </ChartCard>
    </div>
  );
}

// ── Reporte: CxC ─────────────────────────────────────────────────────────────
function ReporteCxC({ data }) {
  const { kpis, por_estatus, tabla } = data;

  const LABEL = { pendiente: "Pendiente", parcial: "Parcial", pagada: "Pagada", vencida: "Vencida" };
  const pieData = por_estatus.map((e) => ({ name: LABEL[e.estatus] ?? e.estatus, value: e.total }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total pendiente" value={fmt(kpis.total_pendiente)} sub="Pendiente + parcial + vencido" color="amber" />
        <KpiCard label="Total vencido" value={fmt(kpis.total_vencido)} color="red" />
        <KpiCard label="Total cobrado" value={fmt(kpis.total_cobrado)} color="green" />
        <KpiCard label="Cuentas activas" value={kpis.cantidad_cuentas} color="blue" />
      </div>

      {pieData.length > 0 && (
        <ChartCard title="Distribución por estatus">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                paddingAngle={3} dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <ChartCard title={`Cuentas por cobrar (${tabla.length})`}>
        <DataTable
          headers={[
            { label: "Factura" }, { label: "Cliente" }, { label: "Vencimiento" },
            { label: "Original", right: true }, { label: "Saldo", right: true }, { label: "Estatus" },
          ]}
          rows={tabla.map((c) => [
            <span className="font-mono text-xs text-slate-500">{c.factura}</span>,
            <span className="font-medium text-slate-800 dark:text-slate-200">{c.cliente}</span>,
            <span className="text-slate-500">{c.fecha_vencimiento}</span>,
            <span className="text-slate-600 dark:text-slate-300">{fmt(c.monto_original)}</span>,
            <span className={`font-semibold ${c.saldo_pendiente > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {fmt(c.saldo_pendiente)}
            </span>,
            <Badge val={c.estatus} />,
          ])}
          empty="Sin cuentas por cobrar."
        />
      </ChartCard>
    </div>
  );
}

// ── Reporte: Inventario ───────────────────────────────────────────────────────
function ReporteInventario({ data }) {
  const { kpis, tabla } = data;

  const ESTADO_LABEL = { ok: "OK", bajo: "Stock bajo", sin_stock: "Sin stock" };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total productos" value={kpis.total_productos} color="blue" />
        <KpiCard label="Sin stock" value={kpis.sin_stock} color="red" />
        <KpiCard label="Stock bajo" value={kpis.stock_bajo} sub="Menor al mínimo" color="amber" />
        <KpiCard label="Valor inventario" value={fmt(kpis.valor_inventario)} sub="Stock × precio venta" color="green" />
      </div>

      <ChartCard title={`Productos activos (${tabla.length})`}>
        <DataTable
          headers={[
            { label: "Producto" }, { label: "Código" },
            { label: "Stock actual", right: true }, { label: "Stock mínimo", right: true },
            { label: "Costo unitario", right: true }, { label: "Estado" },
          ]}
          rows={tabla.map((p) => [
            <span className="font-medium text-slate-800 dark:text-slate-200">{p.nombre}</span>,
            <span className="font-mono text-xs text-slate-400">{p.codigo || "—"}</span>,
            <span className={`font-semibold tabular-nums ${
              p.stock_actual <= 0 ? "text-red-600"
              : p.stock_actual < p.stock_minimo ? "text-amber-600"
              : "text-emerald-600"
            }`}>
              {p.stock_actual}
            </span>,
            <span className="text-slate-500 tabular-nums">{p.stock_minimo}</span>,
            <span className="text-slate-600 dark:text-slate-300">{fmt(p.costo_unitario)}</span>,
            <Badge val={p.estado} label={ESTADO_LABEL[p.estado]} />,
          ])}
          empty="Sin productos activos."
        />
      </ChartCard>
    </div>
  );
}

// ── Reporte: OTs ─────────────────────────────────────────────────────────────
function ReporteOTs({ data }) {
  const { kpis, por_estatus, tabla } = data;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total OTs" value={kpis.total} color="blue" />
        <KpiCard label="Abiertas" value={kpis.abiertas} color="amber" />
        <KpiCard label="En curso" value={kpis.en_curso} color="violet" />
        <KpiCard label="Finalizadas" value={kpis.finalizadas} color="green" />
      </div>

      {por_estatus.length > 0 && (
        <ChartCard title="OTs por estatus">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={por_estatus}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="estatus" tick={{ fontSize: 11 }} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" radius={[0,4,4,0]}>
                {por_estatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <ChartCard title={`Órdenes de trabajo (${tabla.length})`}>
        <DataTable
          headers={[
            { label: "N°" }, { label: "Cliente" }, { label: "Tipo" },
            { label: "Técnico" }, { label: "Estatus" }, { label: "Creación" }, { label: "Cierre" },
          ]}
          rows={tabla.map((o) => [
            <span className="font-mono text-xs text-slate-500">{o.correlativo}</span>,
            <span className="font-medium text-slate-800 dark:text-slate-200">{o.cliente}</span>,
            <span className="text-slate-600 dark:text-slate-300 max-w-[140px] truncate block">{o.tipo_trabajo}</span>,
            <span className="text-slate-500">{o.tecnico}</span>,
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{o.estatus}</span>,
            <span className="text-slate-500">{o.fecha_creacion}</span>,
            <span className="text-slate-400">{o.fecha_finalizado ?? "—"}</span>,
          ])}
          empty="Sin órdenes de trabajo en el período."
        />
      </ChartCard>
    </div>
  );
}

// ── Default: inicio del año actual ───────────────────────────────────────────
const thisYear = new Date().getFullYear();
const DEFAULT_DESDE = `${thisYear}-01-01`;
const DEFAULT_HASTA = new Date().toISOString().split("T")[0];

const FETCHER = {
  ventas:     (p) => reportesService.getVentas(p),
  compras:    (p) => reportesService.getCompras(p),
  cxc:        ()  => reportesService.getCxC(),
  inventario: ()  => reportesService.getInventario(),
  ots:        (p) => reportesService.getOTs(p),
};

// ── Página ────────────────────────────────────────────────────────────────────
export default function ReportesPage() {
  const { user } = useAuth();
  const rol = user?.rol ?? "";

  const TABS = useMemo(
    () => ALL_TABS.filter((t) => t.roles.includes(rol)),
    [rol]
  );

  const [tab,        setTab]        = useState(() => TABS[0]?.id ?? "");
  const [fechaDesde, setFechaDesde] = useState(DEFAULT_DESDE);
  const [fechaHasta, setFechaHasta] = useState(DEFAULT_HASTA);
  const [fetchKey,   setFetchKey]   = useState(0);
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  // Si el tab activo deja de estar disponible (cambio de rol), ir al primero
  useEffect(() => {
    if (TABS.length > 0 && !TABS.find((t) => t.id === tab)) {
      setTab(TABS[0].id);
    }
  }, [TABS, tab]);

  // Ref para que el efecto siempre lea las fechas actuales sin agregarlas como dep
  const fechaRef = useRef({ fechaDesde, fechaHasta });
  useEffect(() => { fechaRef.current = { fechaDesde, fechaHasta }; });

  const currentTab = TABS.find((t) => t.id === tab);

  useEffect(() => {
    let cancelled = false;

    const currentTabLocal = TABS.find((t) => t.id === tab);
    const { fechaDesde: fd, fechaHasta: fh } = fechaRef.current;
    const params = currentTabLocal?.hasDate
      ? { fecha_desde: fd, fecha_hasta: fh }
      : undefined;

    setLoading(true);
    setError(null);
    setData(null);

    const fetchData = async () => {
      try {
        const res = await FETCHER[tab](params);
        if (!cancelled) {
          setData(res.data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail ?? "No se pudieron cargar los datos. Verificá tu conexión.");
          setLoading(false);
        }
      }
    };
    fetchData();

    return () => { cancelled = true; };
  }, [tab, fetchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reportes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Análisis detallado por módulo</p>
        </div>

        {currentTab?.hasDate && (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-slate-500 dark:text-slate-400">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <label className="text-xs text-slate-500 dark:text-slate-400">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setFetchKey((k) => k + 1)}
              className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setData(null); setTab(t.id); }}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading && <Spinner />}
      {error   && <ErrorMsg msg={error} />}
      {data && !loading && (
        <>
          {tab === "ventas"     && <ReporteVentas     data={data} />}
          {tab === "compras"    && <ReporteCompras    data={data} />}
          {tab === "cxc"        && <ReporteCxC        data={data} />}
          {tab === "inventario" && <ReporteInventario data={data} />}
          {tab === "ots"        && <ReporteOTs        data={data} />}
        </>
      )}
    </div>
  );
}
