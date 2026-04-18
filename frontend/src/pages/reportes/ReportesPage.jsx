import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { reportesService } from "../../services/api/reportes";

// ── Paleta ───────────────────────────────────────────────────────────────────
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const fmt = (n) =>
  `Q${parseFloat(n || 0).toLocaleString("es-GT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = "blue" }) {
  const colors = {
    blue:   "from-blue-500  to-blue-600",
    green:  "from-emerald-500 to-emerald-600",
    amber:  "from-amber-500 to-amber-600",
    red:    "from-red-500   to-red-600",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-5 text-white shadow`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({ title, children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ── Tooltip personalizado ─────────────────────────────────────────────────────
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

// ── Página principal ──────────────────────────────────────────────────────────
export default function ReportesPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await reportesService.getResumen();
        setData(data);
      } catch {
        setError("No se pudieron cargar los reportes.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">{error}</div>
    );
  }

  const { ventas_por_mes, ots_por_estatus, stock_bajo, compras_por_mes, facturas_estatus, kpis } = data;

  // Formatea mes "2025-01" → "Ene 25"
  const fmtMes = (m) => {
    const [y, mo] = m.split("-");
    const nombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${nombres[parseInt(mo) - 1]} ${y.slice(2)}`;
  };

  const ventasFmt   = ventas_por_mes.map((v) => ({ ...v, mes: fmtMes(v.mes) }));
  const comprasFmt  = compras_por_mes.map((v) => ({ ...v, mes: fmtMes(v.mes) }));

  // Pie de facturas: mapea estatus a español
  const estatusLabel = { borrador: "Borrador", emitida: "Emitida", pagada: "Pagada", anulada: "Anulada" };
  const facturasPie = facturas_estatus.map((f) => ({
    name: estatusLabel[f.estatus] ?? f.estatus,
    value: f.total,
  }));

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reportes</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Resumen ejecutivo del negocio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total facturado"
          value={fmt(kpis.total_facturado)}
          sub="Facturas emitidas y pagadas"
          color="blue"
        />
        <KpiCard
          label="Clientes activos"
          value={kpis.clientes_activos}
          sub="Con al menos una factura"
          color="green"
        />
        <KpiCard
          label="OTs abiertas"
          value={kpis.ots_abiertas}
          sub="Pendientes de cierre"
          color="amber"
        />
        <KpiCard
          label="Stock bajo"
          value={kpis.productos_stock_bajo}
          sub="Productos con stock < 5"
          color="red"
        />
      </div>

      {/* Gráficas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Ventas por mes */}
        <ChartCard title="Ventas por mes (emitidas + pagadas)">
          {ventasFmt.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ventasFmt} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Q${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip money />} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">Sin datos de ventas aún.</p>
          )}
        </ChartCard>

        {/* OTs por estatus */}
        <ChartCard title="Órdenes de trabajo por estatus">
          {ots_por_estatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={ots_por_estatus}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="estatus" tick={{ fontSize: 11 }} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {ots_por_estatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">Sin órdenes de trabajo.</p>
          )}
        </ChartCard>

        {/* Compras por mes */}
        <ChartCard title="Compras por mes (confirmadas + recibidas)">
          {comprasFmt.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={comprasFmt} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Q${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip money />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">Sin datos de compras aún.</p>
          )}
        </ChartCard>

        {/* Facturas por estatus */}
        <ChartCard title="Facturas por estatus">
          {facturasPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={facturasPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {facturasPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">Sin facturas aún.</p>
          )}
        </ChartCard>
      </div>

      {/* Tabla stock bajo */}
      {stock_bajo.length > 0 && (
        <ChartCard title={`Productos con stock bajo (${stock_bajo.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                  <th className="text-left py-2 font-semibold">Producto</th>
                  <th className="text-right py-2 font-semibold">Stock actual</th>
                  <th className="text-right py-2 font-semibold">Stock mínimo</th>
                  <th className="text-right py-2 font-semibold">Déficit</th>
                </tr>
              </thead>
              <tbody>
                {stock_bajo.map((p, i) => {
                  const deficit = (p.stock_minimo ?? 5) - p.stock_actual;
                  return (
                    <tr
                      key={i}
                      className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="py-2 font-medium text-slate-800 dark:text-slate-200">{p.nombre}</td>
                      <td className="py-2 text-right">
                        <span className={`font-semibold ${p.stock_actual <= 0 ? "text-red-600" : "text-amber-600"}`}>
                          {p.stock_actual}
                        </span>
                      </td>
                      <td className="py-2 text-right text-slate-500">{p.stock_minimo ?? 5}</td>
                      <td className="py-2 text-right">
                        {deficit > 0 ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            -{deficit}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </div>
  );
}
