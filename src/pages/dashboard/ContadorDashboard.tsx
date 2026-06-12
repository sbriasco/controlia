import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileBarChart, Download, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { cierreService } from '../../services/cierre.service';
import { empleadoService } from '../../services/empleado.service';
import type { Empleado, CierreMensual } from '../../types';

export function ContadorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cierres, setCierres] = useState<CierreMensual[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [emps, cierresData] = await Promise.all([
          empleadoService.getAll(),
          cierreService.getAll(),
        ]);
        setEmpleados(emps);
        setCierres(cierresData);
        
        // Fetch details for the last closed period
        const cerrados = cierresData.filter((c) => c.estado === 'cerrado');
        if (cerrados.length > 0) {
          const last = cerrados[0]; // because it's ordered desc
          const detail = await cierreService.getById(last.id);
          setCierres(prev => prev.map(c => c.id === detail.id ? detail : c));
        }

      } catch (err) {
        console.error('Error fetching data for ContadorDashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const cierresCerrados = cierres.filter((c) => c.estado === 'cerrado');
  const lastCierre = cierresCerrados[0]; // Ordered desc

  const periodoLabel = (periodo: string) => {
    if (!periodo) return '';
    const [year, month] = periodo.split('-');
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const getExportData = () => {
    if (!lastCierre?.resumenEmpleados) return [];
    return lastCierre.resumenEmpleados.map(re => {
      const emp = empleados.find((e) => e.id === re.empleadoId);
      return {
        'Legajo': emp?.legajo || '',
        'Apellido y Nombre': `${emp?.apellido || ''}, ${emp?.nombre || ''}`,
        'Días Trabajados': re.diasTrabajados,
        'Ausencias Justificadas': re.ausenciasJustificadas,
        'Ausencias Injustificadas': re.ausenciasInjustificadas,
        'Horas Extra 50% (min)': re.horasExtra50,
        'Horas Extra 100% (min)': re.horasExtra100,
        'Tardanzas (min)': re.tardanzasAcumuladas
      };
    });
  };

  const exportExcel = () => {
    const data = getExportData();
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumen");
    XLSX.writeFile(wb, `Resumen_Preliquidacion_${lastCierre?.periodo}.xlsx`);
  };

  const exportCSV = () => {
    const data = getExportData();
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Resumen_Preliquidacion_${lastCierre?.periodo}.csv`;
    link.click();
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <h2>Bienvenido, {user?.nombre || 'Contador'} 📊</h2>
        <p>Acceso a resúmenes de preliquidación y exportación de informes</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><FileBarChart size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Períodos Cerrados</span>
            <span className="stat-value">{cierresCerrados.length}</span>
            <span className="stat-change up">Disponibles para exportar</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Calendar size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Último Cierre</span>
            <span className="stat-value" style={{ fontSize: '1.5rem' }}>
              {lastCierre ? periodoLabel(lastCierre.periodo) : '—'}
            </span>
            <span className="stat-change up">
              {lastCierre?.fechaCierre ? `Cerrado el ${new Date(lastCierre.fechaCierre).toLocaleDateString('es-AR')}` : ''}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><Download size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Empleados en Resumen</span>
            <span className="stat-value">
              {lastCierre?.resumenEmpleados?.length || 0}
            </span>
            <span className="stat-change up">en el último período</span>
          </div>
        </div>
      </div>

      {/* Last month summary table */}
      {lastCierre && lastCierre.resumenEmpleados && (
        <div className="dashboard-section" style={{ marginTop: '32px' }}>
          <div className="dashboard-section-header">
            <h3 className="dashboard-section-title">
              Resumen de Preliquidación — {periodoLabel(lastCierre.periodo)}
            </h3>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/cierre')}>
              Ver detalle <ArrowRight size={14} />
            </button>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gris-texto)' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                  <div>Cargando datos de empleados...</div>
                </div>
              ) : (
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Empleado</th>
                        <th>Días Trab.</th>
                        <th>Ausencias Just.</th>
                        <th>Ausencias Injust.</th>
                        <th>Hs Extra 50%</th>
                        <th>Hs Extra 100%</th>
                        <th>Tardanzas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastCierre.resumenEmpleados.map((re) => {
                        const emp = empleados.find((e) => e.id === re.empleadoId);
                        if (!emp) return null;
                        return (
                          <tr key={re.empleadoId}>
                            <td style={{ fontWeight: 500 }}>{emp.nombre} {emp.apellido}</td>
                            <td>{re.diasTrabajados}</td>
                            <td>{re.ausenciasJustificadas}</td>
                            <td>
                              {re.ausenciasInjustificadas > 0 ? (
                                <span style={{ color: 'var(--rojo)', fontWeight: 600 }}>{re.ausenciasInjustificadas}</span>
                              ) : '0'}
                            </td>
                            <td>{re.horasExtra50 > 0 ? `${Math.floor(re.horasExtra50 / 60)}h ${re.horasExtra50 % 60}m` : '—'}</td>
                            <td>{re.horasExtra100 > 0 ? `${Math.floor(re.horasExtra100 / 60)}h ${re.horasExtra100 % 60}m` : '—'}</td>
                            <td>{re.tardanzasAcumuladas > 0 ? `${re.tardanzasAcumuladas} min` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export options */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">Exportar Informes</h3>
        </div>
        <div className="quick-actions" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <button className="quick-action" id="export-excel" onClick={exportExcel} disabled={!lastCierre}>
            <div className="quick-action-icon" style={{ background: 'var(--verde-light)', color: 'var(--verde)' }}>
              <Download size={18} />
            </div>
            Exportar Excel (Último Cierre)
          </button>
          <button className="quick-action" id="export-csv" onClick={exportCSV} disabled={!lastCierre}>
            <div className="quick-action-icon" style={{ background: 'var(--azul-principal-light)', color: 'var(--azul-principal)' }}>
              <Download size={18} />
            </div>
            Exportar CSV (Último Cierre)
          </button>
        </div>
      </div>
    </div>
  );
}
