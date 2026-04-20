import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserPlus, faEdit, faTrash, faKey, faShieldHalved, faUsers,
  faCheck, faMinus, faEye, faFileInvoiceDollar, faCircleCheck, faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import usuariosService from "../../services/api/usuarios";
import { empresaService } from "../../services/api/maestros";
import Modal from "../../components/ui/Modal";

// ── Constantes ────────────────────────────────────────────────────────────────
const ROL_CHOICES = [
  { value: "admin",      label: "Administrador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "vendedor",   label: "Vendedor" },
  { value: "bodeguero",  label: "Bodeguero" },
  { value: "contador",   label: "Contador" },
];

const ROL_BADGE = {
  admin:      "bg-purple-100 text-purple-700",
  supervisor: "bg-blue-100   text-blue-700",
  vendedor:   "bg-green-100  text-green-700",
  bodeguero:  "bg-amber-100  text-amber-700",
  contador:   "bg-rose-100   text-rose-700",
};

const MODULE_LABELS = {
  dashboard:    "Dashboard",
  clientes:     "Clientes",
  proveedores:  "Proveedores",
  cotizaciones: "Cotizaciones",
  ordenes:      "Órdenes de Trabajo",
  inventario:   "Inventario",
  compras:      "Compras",
  facturacion:  "Facturación",
  reportes:     "Reportes",
  maestros:     "Datos Maestros",
  configuracion:"Configuración",
};

const PERM_CONFIG = {
  full:  { label: "Completo", icon: faCheck, cls: "text-green-600 bg-green-50" },
  read:  { label: "Solo ver", icon: faEye,   cls: "text-blue-600  bg-blue-50"  },
  none:  { label: "Sin acceso", icon: faMinus, cls: "text-slate-400 bg-slate-50" },
};

const EMPTY_FORM = {
  username: "", email: "", first_name: "", last_name: "",
  password: "", rol: "vendedor", is_active: true,
};

const EMPTY_PWD = { password: "" };

const inputCls = "w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelCls = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1";

// ── Helpers UI ────────────────────────────────────────────────────────────────
function PermBadge({ level }) {
  const cfg = PERM_CONFIG[level] ?? PERM_CONFIG.none;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      <FontAwesomeIcon icon={cfg.icon} className="text-[10px]" />
      {cfg.label}
    </span>
  );
}

// ── Tab: Usuarios ─────────────────────────────────────────────────────────────
function UsuariosTab() {
  const [usuarios,   setUsuarios]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [pwdModal,   setPwdModal]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [pwdForm,    setPwdForm]    = useState(EMPTY_PWD);
  const [saving,     setSaving]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await usuariosService.getAll();
      setUsuarios(data.results ?? data);
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      username: u.username, email: u.email ?? "",
      first_name: u.first_name ?? "", last_name: u.last_name ?? "",
      password: "", rol: u.rol, is_active: u.is_active,
    });
    setModalOpen(true);
  };

  const openPwd = (u) => {
    setEditing(u);
    setPwdForm(EMPTY_PWD);
    setPwdModal(true);
  };

  const handleSave = async () => {
    if (!form.username || !form.rol) return;
    if (!editing && !form.password) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing) { delete payload.password; delete payload.username; }
      if (editing) {
        await usuariosService.update(editing.id, payload);
      } else {
        await usuariosService.create(payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudo guardar el usuario.");
    } finally {
      setSaving(false);
    }
  };

  const handlePwd = async () => {
    if (!pwdForm.password || pwdForm.password.length < 8) return;
    setSaving(true);
    try {
      await usuariosService.cambiarPassword(editing.id, pwdForm);
      setPwdModal(false);
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudo cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!confirm(`¿Eliminar al usuario "${u.username}"? Esta acción no se puede deshacer.`)) return;
    try {
      await usuariosService.remove(u.id);
      load();
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudo eliminar el usuario.");
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Usuarios del sistema</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} registrado{usuarios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          <FontAwesomeIcon icon={faUserPlus} />
          Nuevo usuario
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">Usuario</th>
                <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Rol</th>
                <th className="text-left px-4 py-3 font-semibold">Estado</th>
                <th className="text-right px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.username[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800 dark:text-white">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.nombre || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROL_BADGE[u.rol] ?? "bg-slate-100 text-slate-600"}`}>
                      {u.rol_display}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        title="Editar"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        <FontAwesomeIcon icon={faEdit} className="text-xs" />
                      </button>
                      <button
                        onClick={() => openPwd(u)}
                        title="Cambiar contraseña"
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                      >
                        <FontAwesomeIcon icon={faKey} className="text-xs" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        title="Eliminar"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear / editar */}
      {modalOpen && (
        <Modal title={editing ? "Editar usuario" : "Nuevo usuario"} onClose={() => setModalOpen(false)}>
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-2 gap-3">
              {!editing && (
                <div className="col-span-2">
                  <label className={labelCls}>Usuario *</label>
                  <input className={inputCls} value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="nombre.usuario" />
                </div>
              )}
              <div>
                <label className={labelCls}>Nombre</label>
                <input className={inputCls} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Apellido</label>
                <input className={inputCls} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Email</label>
                <input className={inputCls} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              {!editing && (
                <div className="col-span-2">
                  <label className={labelCls}>Contraseña * (mín. 8 caracteres)</label>
                  <input className={inputCls} type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
                </div>
              )}
              <div>
                <label className={labelCls}>Rol *</label>
                <select className={inputCls} value={form.rol} onChange={(e) => set("rol", e.target.value)}>
                  {ROL_CHOICES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Estado</label>
                <select className={inputCls} value={form.is_active ? "1" : "0"} onChange={(e) => set("is_active", e.target.value === "1")}>
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.username || !form.rol || (!editing && !form.password)}
                className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal cambiar contraseña */}
      {pwdModal && (
        <Modal title={`Cambiar contraseña — ${editing?.username}`} onClose={() => setPwdModal(false)}>
          <div className="space-y-4 p-1">
            <div>
              <label className={labelCls}>Nueva contraseña (mín. 8 caracteres)</label>
              <input
                className={inputCls}
                type="password"
                value={pwdForm.password}
                onChange={(e) => setPwdForm({ password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPwdModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={handlePwd}
                disabled={saving || pwdForm.password.length < 8}
                className="px-5 py-2 text-sm bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors"
              >
                {saving ? "Guardando…" : "Cambiar contraseña"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Roles y Permisos ─────────────────────────────────────────────────────
function RolesPermisosTab() {
  const [matrix,  setMatrix]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatrix = async () => {
      try {
        const { data } = await usuariosService.getRolesPermisos();
        setMatrix(data);
      } catch (err) {
        alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudo cargar la matriz de permisos.");
      } finally {
        setLoading(false);
      }
    };
    fetchMatrix();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!matrix) return null;

  const roles = ROL_CHOICES;
  const modules = Object.keys(MODULE_LABELS);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Roles y permisos</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Vista de solo lectura — los permisos son fijos por rol en el sistema.
        </p>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(PERM_CONFIG).map(([key, cfg]) => (
          <span key={key} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
            <FontAwesomeIcon icon={cfg.icon} className="text-[11px]" />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Matriz */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-44">
                Módulo
              </th>
              {roles.map((r) => (
                <th key={r.value} className="text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider">
                  <span className={`px-2 py-0.5 rounded-full ${ROL_BADGE[r.value]}`}>{r.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((mod, idx) => (
              <tr
                key={mod}
                className={`border-t border-slate-100 dark:border-slate-700 ${
                  idx % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-700/20"
                }`}
              >
                <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-300">
                  {MODULE_LABELS[mod]}
                </td>
                {roles.map((r) => (
                  <td key={r.value} className="px-3 py-3 text-center">
                    <PermBadge level={matrix[mod]?.[r.value] ?? "none"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
// ── Tab: FEL / Certificador ───────────────────────────────────────────────────
function FelTab() {
  const [form,    setForm]    = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await empresaService.get();
        setForm({
          fel_habilitado: data.fel_habilitado ?? false,
          fel_proveedor:  data.fel_proveedor  ?? "",
          fel_api_url:    data.fel_api_url    ?? "",
          fel_api_key:    data.fel_api_key    ?? "",
          fel_nis:        data.fel_nis        ?? "",
        });
      } catch (err) {
        alert(err.response?.data ? JSON.stringify(err.response.data) : "No se pudo cargar la configuración FEL.");
      }
    };
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await empresaService.update({ ...form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data ? JSON.stringify(err.response.data) : "Error al guardar la configuración FEL.");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <p className="text-sm text-slate-400 py-8 text-center">Cargando…</p>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      {/* Estado actual */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
        form.fel_habilitado
          ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
          : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
      }`}>
        <FontAwesomeIcon
          icon={form.fel_habilitado ? faCircleCheck : faCircleXmark}
          className={`text-lg ${form.fel_habilitado ? "text-emerald-600" : "text-amber-500"}`}
        />
        <div>
          <p className={`text-sm font-semibold ${form.fel_habilitado ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
            {form.fel_habilitado ? "FEL habilitado — el sistema emitirá facturas electrónicas." : "FEL no configurado — los documentos se generarán como recibos."}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {form.fel_habilitado
              ? "Las facturas se enviarán al certificador para su validación ante la SAT."
              : "Configurá los datos del certificador para habilitar la facturación electrónica (FEL)."}
          </p>
        </div>
      </div>

      {/* Toggle FEL */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => set("fel_habilitado", !form.fel_habilitado)}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.fel_habilitado ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.fel_habilitado ? "translate-x-5" : ""}`} />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Habilitar facturación electrónica (FEL)</span>
        </label>
      </div>

      {/* Datos del certificador */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Datos del certificador</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Proveedor certificador</label>
            <input value={form.fel_proveedor} onChange={(e) => set("fel_proveedor", e.target.value)}
              placeholder="Ej: INFILE, G4S, Megaprint…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>NIS / ID emisor</label>
            <input value={form.fel_nis} onChange={(e) => set("fel_nis", e.target.value)}
              placeholder="ID asignado por el certificador" className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>URL del API</label>
            <input value={form.fel_api_url} onChange={(e) => set("fel_api_url", e.target.value)}
              placeholder="https://api.certificador.gt/v1/" className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>API Key / Token de autenticación</label>
            <input type="password" value={form.fel_api_key} onChange={(e) => set("fel_api_key", e.target.value)}
              placeholder="Token proporcionado por el certificador" className={inputCls} />
            <p className="text-xs text-slate-400 mt-1">Se almacena de forma segura y nunca se muestra en reportes ni PDFs.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-semibold">
          {saving ? "Guardando…" : "Guardar configuración FEL"}
        </button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Guardado correctamente.</span>}
      </div>
    </form>
  );
}

const TABS = [
  { id: "usuarios",       label: "Usuarios",        icon: faUsers },
  { id: "roles-permisos", label: "Roles y permisos", icon: faShieldHalved },
  { id: "fel",            label: "FEL / Certificador", icon: faFileInvoiceDollar },
];

export default function ConfiguracionPage() {
  const [tab, setTab] = useState("usuarios");

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Configuración</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de usuarios y control de accesos</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              tab === t.id
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FontAwesomeIcon icon={t.icon} className="text-xs" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === "usuarios"       && <UsuariosTab />}
      {tab === "roles-permisos" && <RolesPermisosTab />}
      {tab === "fel"            && <FelTab />}
    </div>
  );
}
