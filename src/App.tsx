import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EmpleadosPage } from './pages/empleados/EmpleadosPage';
import { EmpleadoForm } from './pages/empleados/EmpleadoForm';
import { HorariosPage } from './pages/horarios/HorariosPage';
import { HorarioForm } from './pages/horarios/HorarioForm';
import { RotacionesPage } from './pages/rotaciones/RotacionesPage';
import { RotacionForm } from './pages/rotaciones/RotacionForm';
import { FichadasPage } from './pages/fichadas/FichadasPage';
import { NovedadesPage } from './pages/novedades/NovedadesPage';
import { CierrePage } from './pages/cierre/CierrePage';
import { FeriadosPage } from './pages/feriados/FeriadosPage';
import { ReglasPage } from './pages/reglas/ReglasPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="empleados" element={<EmpleadosPage />} />
            <Route path="empleados/nuevo" element={<EmpleadoForm />} />
            <Route path="empleados/:id" element={<EmpleadoForm />} />
            <Route path="horarios" element={<HorariosPage />} />
            <Route path="horarios/nuevo" element={<HorarioForm />} />
            <Route path="horarios/:id" element={<HorarioForm />} />
            <Route path="rotaciones" element={<RotacionesPage />} />
            <Route path="rotaciones/nuevo" element={<RotacionForm />} />
            <Route path="rotaciones/:id" element={<RotacionForm />} />
            <Route path="fichadas" element={<FichadasPage />} />
            <Route path="novedades" element={<NovedadesPage />} />
            <Route path="cierre" element={<CierrePage />} />
            <Route path="cierres" element={<CierrePage />} />
            <Route path="feriados" element={<FeriadosPage />} />
            <Route path="reglas" element={<ReglasPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
