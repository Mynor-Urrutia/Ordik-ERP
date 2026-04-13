import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ordenesTrabajoService } from "../../services/api/ordenesTrabajo";
import { cotizacionesService } from "../../services/api/cotizaciones";
import { comprasService } from "../../services/api/compras";

const fmt = (n) =>
  `Q${parseFloat(n || 0).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function StatCard({ label, value, sub, color = "blue", icon }) {
  const colors = {
    blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   icon: "text-blue-400" },
    green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  icon: "text-green-400" },
    amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  icon: "text-amber-400" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", icon: "text-purple-400" },
    teal:   { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200",   icon: "text-teal-400" },
    red:    { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    icon: "text-red-400" },
  };
  const c = colors[color];

  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-4 flex items-start gap-3`}>
      <div className={`${c.icon} mt-0.5`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, to, linkLabel }) {
  return (
    <div className="flex justify-between items-center mb-3">
      <h2 className="text-base font-semibold text-gray-700">{title}</h2>
      {to && (
        <Link to={to} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [ots, setOts] = useState([]);
  const [cots, setCots] = useState([]);
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ordenesTrabajoService.getAll(),
      cotizacionesService.getAll(),
      comprasService.getAll(),
    ]).then(([o, c, co]) => {
      setOts(o.data.results ?? o.data);
      setCots(c.data.results ?? c.data);
      setCompras(co.data.results ?? co.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Cargando dashboard…</p>
      </div>
    );
  }

  // ── OT stats ────────────────────────────────────────────────────────────────
  const otPendiente  = ots.filter((o) => !o.fecha_inicio && !o.fecha_finalizado).length;
  const otEnCurso    = ots.filter((o) => o.fecha_inicio && !o.fecha_finalizado).length;
  const otFinalizada = ots.filter((o) => !!o.fecha_finalizado).length;

  // ── Cotizaciones stats ───────────────────────────────────────────────────────
  const cotBorrador  = cots.filter((c) => c.estatus === "borrador").length;
  const cotEnviada   = cots.filter((c) => c.estatus === "enviada").length;
  const cotAprobada  = cots.filter((c) => c.estatus === "aprobada").length;
  const cotRechazada = cots.filter((c) => c.estatus === "rechazada").length;
  const cotMontoAprobado = cots
    .filter((c) => c.estatus === "aprobada")
    .reduce((acc, c) => acc + parseFloat(c.total || 0), 0);

  // ── Compras stats ─────────────────────────────────────────────────────────────
  const comprasTotal = compras.reduce((acc, c) => {
    const t = (c.items ?? []).reduce(
      (s, it) => s + (parseFloat(it.costo_unitario) || 0) * (parseInt(it.cantidad) || 0),
      0
    );
    return acc + t;
  }, 0);
  const comprasContado = compras.filter((c) => c.tipo_pago === "contado").length;
  const comprasCredito = compras.filter((c) => c.tipo_pago === "credito").length;

  // ── Recientes ────────────────────────────────────────────────────────────────
  const recentOts  = [...ots].sort((a, b) => b.id - a.id).slice(0, 5);
  const recentCots = [...cots].sort((a, b) => b.id - a.id).slice(0, 5);

  return (
    <div className="space-y-7">
      <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>

      {/* ── Órdenes de Trabajo ── */}
      <section>
        <SectionHeader title="Órdenes de Trabajo" to="/ordenes-trabajo" linkLabel="Ver todas" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total OT"
            value={ots.length}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            label="Pendientes"
            value={otPendiente}
            color="amber"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="En Curso"
            value={otEnCurso}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <StatCard
            label="Finalizadas"
            value={otFinalizada}
            color="green"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Tabla recientes OT */}
        <div className="mt-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700 text-white text-left">
                <th className="px-4 py-2.5 font-medium text-xs">N°</th>
                <th className="px-4 py-2.5 font-medium text-xs">Cliente</th>
                <th className="px-4 py-2.5 font-medium text-xs">Tipo</th>
                <th className="px-4 py-2.5 font-medium text-xs">Técnico</th>
                <th className="px-4 py-2.5 font-medium text-xs">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentOts.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400 text-xs">Sin órdenes</td></tr>
              )}
              {recentOts.map((o, i) => (
                <tr key={o.id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <td className="px-4 py-2 text-xs font-mono">OT-{String(o.id).padStart(4, "0")}</td>
                  <td className="px-4 py-2 text-xs">{o.cliente_nombre ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{o.tipo_trabajo_display}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{o.tecnico_asignado || "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      o.fecha_finalizado ? "bg-green-100 text-green-700" :
                      o.fecha_inicio     ? "bg-blue-100 text-blue-700"  :
                                           "bg-gray-100 text-gray-600"
                    }`}>
                      {o.fecha_finalizado ? "Finalizado" : o.fecha_inicio ? "En curso" : "Pendiente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Cotizaciones ── */}
      <section>
        <SectionHeader title="Cotizaciones" to="/cotizaciones" linkLabel="Ver todas" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Total" value={cots.length} color="purple"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
          />
          <StatCard label="Borrador" value={cotBorrador} color="blue"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
          />
          <StatCard label="Enviadas" value={cotEnviada} color="amber"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
          />
          <StatCard label="Aprobadas" value={cotAprobada} sub={fmt(cotMontoAprobado)} color="green"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard label="Rechazadas" value={cotRechazada} color="red"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        {/* Tabla recientes cotizaciones */}
        <div className="mt-3 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700 text-white text-left">
                <th className="px-4 py-2.5 font-medium text-xs">N°</th>
                <th className="px-4 py-2.5 font-medium text-xs">Cliente</th>
                <th className="px-4 py-2.5 font-medium text-xs">Tipo</th>
                <th className="px-4 py-2.5 font-medium text-xs">Estatus</th>
                <th className="px-4 py-2.5 font-medium text-xs text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentCots.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400 text-xs">Sin cotizaciones</td></tr>
              )}
              {recentCots.map((c, i) => (
                <tr key={c.id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <td className="px-4 py-2 text-xs font-mono">COT-{String(c.id).padStart(4, "0")}</td>
                  <td className="px-4 py-2 text-xs">{c.cliente_nombre}</td>
                  <td className="px-4 py-2 text-xs">{c.tipo === "productos" ? "Productos" : "Servicios"}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      { borrador: "bg-gray-100 text-gray-600", enviada: "bg-blue-100 text-blue-700",
                        aprobada: "bg-green-100 text-green-700", rechazada: "bg-red-100 text-red-700" }[c.estatus] ?? ""
                    }`}>
                      {c.estatus_display}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-right font-medium">{fmt(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Compras ── */}
      <section>
        <SectionHeader title="Compras" to="/compras" linkLabel="Ver todas" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Compras" value={compras.length} color="teal"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
          />
          <StatCard label="Monto Total" value={fmt(comprasTotal)} color="teal"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard label="Al Contado" value={comprasContado} color="green"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
          />
          <StatCard label="A Crédito" value={comprasCredito} color="amber"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
          />
        </div>
      </section>
    </div>
  );
}
