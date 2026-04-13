import { Link, useLocation } from "react-router-dom";

// ── Íconos SVG ───────────────────────────────────────────────────────────────
const IconDashboard = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
);
const IconClientes = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.916-3.5M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a4 4 0 015.916-3.5M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconProveedores = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1" />
  </svg>
);
const IconOT = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);
const IconCotizaciones = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);
const IconInventario = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const IconCompras = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);
const IconMaestros = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const NAV_MAIN = [
  { to: "/", label: "Dashboard", icon: <IconDashboard />, exact: true },
  { to: "/clientes", label: "Clientes", icon: <IconClientes /> },
  { to: "/proveedores", label: "Proveedores", icon: <IconProveedores /> },
  { to: "/ordenes-trabajo", label: "Órdenes de Trabajo", icon: <IconOT /> },
  { to: "/cotizaciones", label: "Cotizaciones", icon: <IconCotizaciones /> },
  { to: "/inventario", label: "Inventario", icon: <IconInventario /> },
  { to: "/compras", label: "Compras", icon: <IconCompras /> },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-60 bg-slate-800 text-white flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-slate-700">
          <span className="text-lg font-bold tracking-wide">Ordik</span>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {/* Módulos principales */}
          {NAV_MAIN.map(({ to, label, icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-slate-700 ${
                  active ? "bg-slate-700 font-semibold border-l-4 border-blue-400 pl-4" : ""
                }`}
              >
                {icon}
                <span>{label}</span>
              </Link>
            );
          })}

          {/* Separador */}
          <div className="my-2 mx-4 border-t border-slate-700" />

          {/* Datos Maestros */}
          <Link
            to="/maestros"
            className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-slate-700 ${
              pathname.startsWith("/maestros") ? "bg-slate-700 font-semibold border-l-4 border-purple-400 pl-4" : ""
            }`}
          >
            <IconMaestros />
            <span>Datos Maestros</span>
          </Link>
        </nav>
      </aside>

      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
