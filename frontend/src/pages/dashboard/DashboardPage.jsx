import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ordenesTrabajoService } from "../../services/api/ordenesTrabajo";
import { cotizacionesService } from "../../services/api/cotizaciones";
import { comprasService } from "../../services/api/compras";
import { clientesService } from "../../services/api/clientes";
import { inventarioService } from "../../services/api/inventario";

const fmt = (n) =>
  `Q${parseFloat(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtK = (n) => {
  const num = parseFloat(n || 0);
  if (num >= 1000000) return `Q${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000)    return `Q${(num / 1000).toFixed(1)}K`;
  return fmt(num);
};

// ── KPI Card estilo Matoxi — gradiente + ícono + valor ───────────────────────
function KpiCard({ label, value, sub, gradient, icon, linkTo }) {
  const content = (
    <div className={`${gradient} rounded-2xl p-5 text-white shadow-lg relative overflow-hidden`}>
      {/* Círculo decorativo de fondo */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-6 w-32 h-32 rounded-full bg-white/10" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-3xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
        </div>
        <div className="bg-white/20 rounded-xl p-2.5 shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );

  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ label, value, total, color = "bg-blue-500" }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{value}</span>
      <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
    </div>
  );
}

// ── Badge de estatus ─────────────────────────────────────────────────────────
const statusBadge = (label, cls) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
);

// ── Widget card blanca ────────────────────────────────────────────────────────
function Card({ title, linkTo, linkLabel, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {linkTo && (
          <Link to={linkTo} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {linkLabel ?? "Ver todo"} →
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Tabla minimalista ─────────────────────────────────────────────────────────
function MiniTable({ headers, rows, empty }) {
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map((h, i) => (
              <th key={i} className={`px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide ${h.right ? "text-right" : "text-left"}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={headers.length} className="px-5 py-8 text-center text-sm text-gray-400">{empty}</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={`px-5 py-3 ${headers[j]?.right ? "text-right" : ""}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Íconos SVG ────────────────────────────────────────────────────────────────
const icons = {
  ot:        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  cotizacion:<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  compra:    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
  clientes:  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  inventario:<svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  money:     <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  check:     <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  clock:     <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [ots, setOts]           = useState([]);
  const [cots, setCots]         = useState([]);
  const [compras, setCompras]   = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      ordenesTrabajoService.getAll(),
      cotizacionesService.getAll(),
      comprasService.getAll(),
      clientesService.getAll(),
      inventarioService.getProductos(),
    ]).then(([o, c, co, cl, pr]) => {
      setOts(o.data.results ?? o.data);
      setCots(c.data.results ?? c.data);
      setCompras(co.data.results ?? co.data);
      setClientes(cl.data.results ?? cl.data);
      setProductos(pr.data.results ?? pr.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const otPendiente  = ots.filter((o) => !o.fecha_inicio && !o.fecha_finalizado).length;
  const otEnCurso    = ots.filter((o) => o.fecha_inicio && !o.fecha_finalizado).length;
  const otFinalizada = ots.filter((o) => !!o.fecha_finalizado).length;

  const cotAprobada  = cots.filter((c) => c.estatus === "aprobada").length;
  const cotEnviada   = cots.filter((c) => c.estatus === "enviada").length;
  const cotBorrador  = cots.filter((c) => c.estatus === "borrador").length;
  const cotRechazada = cots.filter((c) => c.estatus === "rechazada").length;
  const cotMontoAprobado = cots
    .filter((c) => c.estatus === "aprobada")
    .reduce((acc, c) => acc + parseFloat(c.total || 0), 0);

  const comprasTotal = compras.reduce((acc, c) =>
    acc + (c.items ?? []).reduce(
      (s, it) => s + (parseFloat(it.costo_unitario) || 0) * (parseInt(it.cantidad) || 0), 0
    ), 0
  );

  const stockBajo = productos.filter((p) => p.stock_actual <= (p.stock_minimo ?? 0)).length;

  const recentOts  = [...ots].sort((a, b) => b.id - a.id).slice(0, 5);
  const recentCots = [...cots].sort((a, b) => b.id - a.id).slice(0, 5);

  const today = new Date().toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">

      {/* ── Banner de bienvenida ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg">
        <div>
          <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Panel de Control</p>
          <h1 className="text-2xl font-bold">Bienvenido a Ordik ERP</h1>
          <p className="text-white/50 text-sm mt-1 capitalize">{today}</p>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="text-white/50 text-xs">Clientes registrados</p>
            <p className="text-2xl font-bold">{clientes.length}</p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-right">
            <p className="text-white/50 text-xs">Productos en catálogo</p>
            <p className="text-2xl font-bold">{productos.length}</p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Órdenes de Trabajo"
          value={ots.length}
          sub={`${otEnCurso} en curso · ${otPendiente} pendientes`}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          icon={icons.ot}
          linkTo="/ordenes-trabajo"
        />
        <KpiCard
          label="Cotizaciones"
          value={cots.length}
          sub={`${cotAprobada} aprobadas · ${fmtK(cotMontoAprobado)}`}
          gradient="bg-gradient-to-br from-violet-500 to-violet-700"
          icon={icons.cotizacion}
          linkTo="/cotizaciones"
        />
        <KpiCard
          label="Órdenes de Compra"
          value={compras.length}
          sub={`Total: ${fmtK(comprasTotal)}`}
          gradient="bg-gradient-to-br from-teal-500 to-teal-700"
          icon={icons.compra}
          linkTo="/compras"
        />
        <KpiCard
          label="Stock Bajo"
          value={stockBajo}
          sub={`de ${productos.length} productos`}
          gradient={stockBajo > 0
            ? "bg-gradient-to-br from-rose-500 to-rose-700"
            : "bg-gradient-to-br from-emerald-500 to-emerald-700"}
          icon={icons.inventario}
          linkTo="/inventario"
        />
      </div>

      {/* ── Fila central ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Distribución OTs */}
        <Card title="Estado de Órdenes de Trabajo" linkTo="/ordenes-trabajo">
          <div className="space-y-4">
            <ProgressBar label="Pendientes" value={otPendiente}  total={ots.length} color="bg-amber-400" />
            <ProgressBar label="En curso"   value={otEnCurso}    total={ots.length} color="bg-blue-500"  />
            <ProgressBar label="Finalizadas"value={otFinalizada} total={ots.length} color="bg-emerald-500" />
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 flex justify-around text-center">
            {[
              { label: "Pendientes", val: otPendiente, cls: "text-amber-600" },
              { label: "En curso",   val: otEnCurso,   cls: "text-blue-600" },
              { label: "Finalizadas",val: otFinalizada,cls: "text-emerald-600" },
            ].map((s) => (
              <div key={s.label}>
                <p className={`text-2xl font-bold ${s.cls}`}>{s.val}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Distribución cotizaciones */}
        <Card title="Estado de Cotizaciones" linkTo="/cotizaciones">
          <div className="space-y-4">
            <ProgressBar label="Borrador"   value={cotBorrador}  total={cots.length} color="bg-gray-400"     />
            <ProgressBar label="Enviadas"   value={cotEnviada}   total={cots.length} color="bg-blue-500"     />
            <ProgressBar label="Aprobadas"  value={cotAprobada}  total={cots.length} color="bg-emerald-500"  />
            <ProgressBar label="Rechazadas" value={cotRechazada} total={cots.length} color="bg-rose-500"     />
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">Monto aprobado</p>
            <p className="text-xl font-bold text-emerald-600 text-center mt-0.5">{fmt(cotMontoAprobado)}</p>
          </div>
        </Card>

        {/* Resumen compras */}
        <Card title="Órdenes de Compra" linkTo="/compras">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="bg-teal-50 rounded-xl p-3">
                {icons.compra}
              </div>
              <div>
                <p className="text-xs text-gray-400">Total invertido</p>
                <p className="text-xl font-bold text-gray-800">{fmt(comprasTotal)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{compras.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">OC registradas</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{stockBajo === 0 ? "✓" : stockBajo}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stockBajo === 0 ? "Stock OK" : "Stock bajo"}</p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-blue-600 font-medium">Proveedores activos</span>
              <Link to="/proveedores" className="text-xs text-blue-600 hover:underline font-semibold">Ver →</Link>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Tablas recientes ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* OTs recientes */}
        <Card title="Últimas Órdenes de Trabajo" linkTo="/ordenes-trabajo">
          <MiniTable
            empty="Sin órdenes registradas"
            headers={[
              { label: "N°" }, { label: "Cliente" }, { label: "Estado" },
            ]}
            rows={recentOts.map((o) => [
              <span className="font-mono text-xs text-gray-500">OT-{String(o.id).padStart(4,"0")}</span>,
              <span className="text-sm font-medium text-gray-800">{o.cliente_nombre ?? "—"}</span>,
              o.fecha_finalizado
                ? statusBadge("Finalizado", "bg-emerald-100 text-emerald-700")
                : o.fecha_inicio
                  ? statusBadge("En curso", "bg-blue-100 text-blue-700")
                  : statusBadge("Pendiente", "bg-amber-100 text-amber-700"),
            ])}
          />
        </Card>

        {/* Cotizaciones recientes */}
        <Card title="Últimas Cotizaciones" linkTo="/cotizaciones">
          <MiniTable
            empty="Sin cotizaciones registradas"
            headers={[
              { label: "N°" }, { label: "Cliente" }, { label: "Estatus" }, { label: "Total", right: true },
            ]}
            rows={recentCots.map((c) => [
              <span className="font-mono text-xs text-gray-500">COT-{String(c.id).padStart(4,"0")}</span>,
              <span className="text-sm font-medium text-gray-800 max-w-[120px] truncate block">{c.cliente_nombre}</span>,
              {
                borrador:  statusBadge("Borrador",  "bg-gray-100 text-gray-600"),
                enviada:   statusBadge("Enviada",   "bg-blue-100 text-blue-700"),
                aprobada:  statusBadge("Aprobada",  "bg-emerald-100 text-emerald-700"),
                rechazada: statusBadge("Rechazada", "bg-rose-100 text-rose-700"),
              }[c.estatus] ?? statusBadge(c.estatus, "bg-gray-100 text-gray-600"),
              <span className="text-sm font-semibold text-gray-800">{fmt(c.total)}</span>,
            ])}
          />
        </Card>
      </div>

    </div>
  );
}
