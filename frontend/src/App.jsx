import { Routes, Route } from "react-router-dom";
import Layout from "./components/ui/Layout";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ClientesPage from "./pages/clientes/ClientesPage";
import ProveedoresPage from "./pages/proveedores/ProveedoresPage";
import OrdenesTrabajoPage from "./pages/ordenes-trabajo/OrdenesTrabajoPage";
import CotizacionesPage from "./pages/cotizaciones/CotizacionesPage";
import InventarioPage from "./pages/inventario/InventarioPage";
import ComprasPage from "./pages/compras/ComprasPage";
import MaestrosPage from "./pages/maestros/MaestrosPage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/proveedores" element={<ProveedoresPage />} />
        <Route path="/ordenes-trabajo" element={<OrdenesTrabajoPage />} />
        <Route path="/cotizaciones" element={<CotizacionesPage />} />
        <Route path="/inventario" element={<InventarioPage />} />
        <Route path="/compras" element={<ComprasPage />} />
        <Route path="/maestros" element={<MaestrosPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
