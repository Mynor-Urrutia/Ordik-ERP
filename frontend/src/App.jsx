import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import Layout from "./components/ui/Layout";

import LoginPage         from "./pages/auth/LoginPage";
import DashboardPage     from "./pages/dashboard/DashboardPage";
import ClientesPage      from "./pages/clientes/ClientesPage";
import ProveedoresPage   from "./pages/proveedores/ProveedoresPage";
import OrdenesTrabajoPage from "./pages/ordenes-trabajo/OrdenesTrabajoPage";
import CotizacionesPage  from "./pages/cotizaciones/CotizacionesPage";
import InventarioPage    from "./pages/inventario/InventarioPage";
import ComprasPage       from "./pages/compras/ComprasPage";
import MaestrosPage      from "./pages/maestros/MaestrosPage";
import FacturacionPage     from "./pages/facturacion/FacturacionPage";
import ReportesPage        from "./pages/reportes/ReportesPage";
import ConfiguracionPage   from "./pages/configuracion/ConfiguracionPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/"                element={<DashboardPage />} />
                  <Route path="/clientes"         element={<ClientesPage />} />
                  <Route path="/proveedores"      element={<ProveedoresPage />} />
                  <Route path="/ordenes-trabajo"  element={<OrdenesTrabajoPage />} />
                  <Route path="/cotizaciones"     element={<CotizacionesPage />} />
                  <Route path="/inventario"       element={<InventarioPage />} />
                  <Route path="/compras"          element={<ComprasPage />} />
                  <Route path="/maestros"         element={<MaestrosPage />} />
                  <Route path="/facturacion"      element={<FacturacionPage />} />
                  <Route path="/reportes"         element={<ReportesPage />} />
                  <Route path="/configuracion"    element={<ConfiguracionPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
