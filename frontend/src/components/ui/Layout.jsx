import { Link, useLocation } from "react-router-dom";
import logoLight from "../../assets/logo-light.png";
import logoDark from "../../assets/logo-dark.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faUsers,
  faTruckRampBox,
  faScrewdriverWrench,
  faFileInvoiceDollar,
  faBoxesStacked,
  faCartShopping,
  faSliders,
  faSun,
  faMoon,
  faFileInvoice,
  faChartBar,
  faRightFromBracket,
  faCircleUser,
  faGear,
  faHandHoldingDollar,
} from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../contexts/AuthContext";

const NAV_MAIN = [
  { to: "/",                label: "Dashboard",          icon: faGaugeHigh,          exact: true },
  { to: "/clientes",        label: "Clientes",           icon: faUsers },
  { to: "/proveedores",     label: "Proveedores",        icon: faTruckRampBox },
  { to: "/ordenes-trabajo", label: "Órdenes de Trabajo", icon: faScrewdriverWrench },
  { to: "/cotizaciones",    label: "Cotizaciones",       icon: faFileInvoiceDollar },
  { to: "/inventario",      label: "Inventario",         icon: faBoxesStacked },
  { to: "/compras",         label: "Compras",            icon: faCartShopping },
  { to: "/facturacion",     label: "Facturación",        icon: faFileInvoice },
  { to: "/cxc",             label: "Cuentas x Cobrar",   icon: faHandHoldingDollar },
  { to: "/reportes",        label: "Reportes",           icon: faChartBar },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { dark, toggle } = useTheme();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900 font-sans transition-colors duration-200">
      {/* ── Sidebar ── */}
      <aside className="w-60 bg-slate-800 dark:bg-slate-950 text-white flex flex-col shrink-0 shadow-lg">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-700 dark:border-slate-800 flex items-center gap-3">
          <img
            src={dark ? logoDark : logoLight}
            alt="ORDIK ERP"
            className="h-8 w-auto object-contain shrink-0"
          />
          <div>
            <span className="text-lg font-bold tracking-widest text-white">ORDIK</span>
            <span className="block text-xs text-slate-400 font-normal tracking-wide mt-0.5">Sistema ERP</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_MAIN.map(({ to, label, icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-150
                  ${active
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
              >
                <FontAwesomeIcon icon={icon} className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}

          {/* Separador */}
          <div className="my-2 mx-4 border-t border-slate-700 dark:border-slate-800" />

          {/* Datos Maestros */}
          <Link
            to="/maestros"
            className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-150
              ${pathname.startsWith("/maestros")
                ? "bg-purple-600 text-white font-semibold shadow-sm"
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
          >
            <FontAwesomeIcon icon={faSliders} className="w-4 h-4 shrink-0" />
            <span>Datos Maestros</span>
          </Link>

          {/* Configuración — solo admin */}
          {user?.rol === "admin" && (
            <Link
              to="/configuracion"
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-150
                ${pathname.startsWith("/configuracion")
                  ? "bg-slate-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
            >
              <FontAwesomeIcon icon={faGear} className="w-4 h-4 shrink-0" />
              <span>Configuración</span>
            </Link>
          )}
        </nav>

        {/* Usuario + controles */}
        <div className="px-5 py-4 border-t border-slate-700 dark:border-slate-800 space-y-3">
          {/* Info usuario */}
          {user && (
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCircleUser} className="w-5 h-5 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.nombre || user.username}</p>
                <p className="text-xs text-slate-400 capitalize">{user.rol_display || user.rol}</p>
              </div>
            </div>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            title={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className="flex items-center gap-3 w-full text-sm text-slate-300 hover:text-white transition-colors"
          >
            <div
              className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                dark ? "bg-blue-500" : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                  dark ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
            <FontAwesomeIcon icon={dark ? faMoon : faSun} className="w-4 h-4" />
            <span>{dark ? "Modo oscuro" : "Modo claro"}</span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full text-sm text-slate-400 hover:text-red-400 transition-colors"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
