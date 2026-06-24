import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, FileBarChart, Download, ChevronRight, Loader2, RefreshCcw, Undo2, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { cierreService } from '../../services/cierre.service';
import { empleadoService } from '../../services/empleado.service';
import { novedadService } from '../../services/novedad.service';
import type { Empleado, Novedad, CierreMensual } from '../../types';
import './CierrePage.css';

const periodoLabel = (periodo: string) => {
  if (!periodo) return '';
  const [year, month] = periodo.split('-');
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${months[parseInt(month) - 1]} ${year}`;
};

const currentMonthStr = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
};

export function CierrePage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';

  const [cierres, setCierres] = useState<CierreMensual[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedCierreData, setSelectedCierreData] = useState<CierreMensual | null>(null);
  
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Inicializar listado de cierres
  useEffect(() => {
    loadCierres();
  }, []);

  const loadCierres = async () => {
    try {
      const data = await cierreService.getAll();
      setCierres(data);
      
      const current = currentMonthStr();
      if (!selectedPeriod) {
        if (data.length > 0) {
          // Si el mes actual ya tiene un cierre, lo seleccionamos, sino el más nuevo
          const currentHasClosure = data.find(c => c.periodo === current);
          if (currentHasClosure) {
            setSelectedPeriod(current);
          } else {
            const sorted = [...data].sort((a, b) => b.periodo.localeCompare(a.periodo));
            setSelectedPeriod(sorted[0].periodo);
          }
        } else {
          setSelectedPeriod(current);
        }
      }
    } catch (err) {
      console.error('Error cargando cierres', err);
    }
  };

  // Cargar datos cuando se selecciona un periodo
  useEffect(() => {
    if (!selectedPeriod) return;

    const existingCierre = cierres.find(c => c.periodo === selectedPeriod);
    if (!existingCierre) {
      setSelectedCierreData(null);
      setNovedades([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [cierreDetalle, novs, emps] = await Promise.all([
          cierreService.getById(existingCierre.id),
          novedadService.getAll({ periodo: selectedPeriod }),
          empleadoService.getAll(),
        ]);
        setSelectedCierreData(cierreDetalle);
        setNovedades(novs);
        setEmpleados(emps);
      } catch (err) {
        console.error('Error fetching data for CierrePage', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedPeriod, cierres]);

  const handleConsolidar = async (periodoToConsolidate: string) => {
    if (!periodoToConsolidate) return;
    setActionLoading(true);
    try {
      const nuevo = await cierreService.consolidar(periodoToConsolidate);
      await loadCierres();
      setSelectedPeriod(nuevo.periodo);
      showToast('Período consolidado exitosamente. Revisá el borrador.', 'success');
    } catch (err: any) {
      showToast('Error al consolidar: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCerrar = async () => {
    if (!selectedCierreData || !user) return;
    if (!window.confirm('¿Estás seguro de cerrar este período? No se podrán modificar ni agregar más fichadas o novedades.')) return;
    
    setActionLoading(true);
    try {
      await cierreService.cerrar(selectedCierreData.id, user.id);
      await loadCierres();
      showToast('Período cerrado definitivamente.', 'success');
    } catch (err: any) {
      showToast('Error al cerrar: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReabrir = async () => {
    if (!selectedCierreData) return;
    if (!window.confirm('CUIDADO: Estás por reabrir un período cerrado. Esto permitirá modificar datos nuevamente. ¿Continuar?')) return;
    
    setActionLoading(true);
    try {
      await cierreService.reabrir(selectedCierreData.id);
      await loadCierres();
      showToast('Período reabierto como borrador.', 'success');
    } catch (err: any) {
      showToast('Error al reabrir: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Merge de cierres consolidados + candidato de Mayo 2026 en adelante para el selector
  const getPeriodOptions = () => {
    const optionsMap = new Map<string, { value: string; label: string; status?: 'cerrado' | 'borrador' }>();
    
    // 1. Agregar los meses candidatos desde Mayo 2026 hasta el mes actual
    const startYear = 2026;
    const startMonth = 5; // Mayo
    const hoy = new Date();
    const currentYear = hoy.getFullYear();
    const currentMonth = hoy.getMonth() + 1;

    let y = startYear;
    let m = startMonth;
    while (y < currentYear || (y === currentYear && m <= currentMonth)) {
      const value = `${y}-${String(m).padStart(2, '0')}`;
      optionsMap.set(value, {
        value,
        label: periodoLabel(value)
      });
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    
    // 2. Sobrescribir o añadir desde el backend con sus respectivos estados reales
    cierres.forEach(c => {
      optionsMap.set(c.periodo, {
        value: c.periodo,
        label: `${periodoLabel(c.periodo)}`,
        status: c.estado
      });
    });

    return Array.from(optionsMap.values()).sort((a, b) => b.value.localeCompare(a.value));
  };

  // -- Funciones de Exportación --
  const getExportData = () => {
    if (!selectedCierreData?.resumenEmpleados) return [];
    return selectedCierreData.resumenEmpleados.map(re => {
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
    XLSX.writeFile(wb, `Resumen_Preliquidacion_${selectedCierreData?.periodo}.xlsx`);
  };

  const exportCSV = () => {
    const data = getExportData();
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Resumen_Preliquidacion_${selectedCierreData?.periodo}.csv`;
    link.click();
  };

  const pendingNovedades = novedades.filter((n) => n.estado === 'pendiente').length;

  return (
    <div className="cierre-container">
      {/* Header con Selector único de Período */}
      <div className="cierre-header">
        <div className="cierre-selector-section">
          <label className="cierre-selector-label">Período Mensual:</label>
          <select 
            className="cierre-select" 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            {getPeriodOptions().map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label} {opt.status === 'cerrado' ? '✓' : opt.status === 'borrador' ? '⏳' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedPeriod && (
          <div>
            {!selectedCierreData ? (
              <span className="cierre-status-badge unconsolidated">
                ● Sin Consolidar
              </span>
            ) : selectedCierreData.estado === 'cerrado' ? (
              <span className="cierre-status-badge cerrado">
                ✓ Cerrado
              </span>
            ) : (
              <span className="cierre-status-badge borrador">
                ⏳ Borrador en Revisión
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gris-texto)' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
          <div>Cargando datos del período...</div>
        </div>
      ) : !selectedCierreData ? (
        /* Empty State: Período Sin Consolidar */
        <div className="cierre-empty-card">
          <div className="cierre-empty-icon">
            <Calendar size={32} />
          </div>
          <h3 className="cierre-empty-title">
            Período {periodoLabel(selectedPeriod)} sin consolidar
          </h3>
          <p className="cierre-empty-desc">
            Aún no se ha consolidado este mes. Al hacerlo, el sistema calculará de forma automática las horas trabajadas, ausencias, tardanzas y horas extra de cada empleado para generar un borrador preliminar.
          </p>
          {isAdmin ? (
            <button 
              className="cierre-primary-btn" 
              onClick={() => handleConsolidar(selectedPeriod)}
              disabled={actionLoading || !selectedPeriod}
            >
              {actionLoading ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <RefreshCcw size={16} />
              )}
              Consolidar Período Ahora
            </button>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--rojo)', fontWeight: 600 }}>
              Solo los usuarios administradores pueden consolidar nuevos períodos.
            </p>
          )}
        </div>
      ) : (
        /* Período Consolidado (Borrador o Cerrado) */
        <>
          {/* Visualización del Proceso y Alertas (Solo Borrador + Admin) */}
          {selectedCierreData.estado === 'borrador' && isAdmin && (
            <>
              {/* Alertas Rápidas */}
              <div className="stats-grid">
                <div className="stat-card">
                  {pendingNovedades > 0 ? (
                    <>
                      <div className="stat-icon red"><AlertTriangle size={24} /></div>
                      <div className="stat-info">
                        <span className="stat-label">Novedades Pendientes</span>
                        <span className="stat-value">{pendingNovedades}</span>
                        <span className="stat-change down">Se deben aprobar o rechazar antes de cerrar</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="stat-icon green"><CheckCircle size={24} /></div>
                      <div className="stat-info">
                        <span className="stat-label">Novedades</span>
                        <span className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--verde)' }}>¡Todo resuelto!</span>
                        <span className="stat-change up">No quedan novedades pendientes por revisar</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="stat-card">
                  <div className="stat-icon blue"><FileBarChart size={24} /></div>
                  <div className="stat-info">
                    <span className="stat-label">Estado del Borrador</span>
                    <span className="stat-value" style={{ fontSize: '1.25rem' }}>Listo para revisión</span>
                    <span className="stat-change">Puedes recalcular en caso de cambios en fichadas</span>
                  </div>
                </div>
              </div>

              {/* Wizard Steps */}
              <div className="cierre-process-card">
                <div className="cierre-wizard-steps">
                  <div className={`cierre-wizard-step ${pendingNovedades > 0 ? 'active' : 'completed'}`}>
                    <div className="cierre-step-number">1</div>
                    <div className="cierre-step-title">Revisar Novedades</div>
                    <div className="cierre-step-desc">
                      {pendingNovedades > 0 
                        ? `Quedan ${pendingNovedades} novedades pendientes.` 
                        : 'Todas las novedades han sido resueltas.'}
                    </div>
                    <ChevronRight className="cierre-step-connector" size={16} />
                  </div>
                  
                  <div className={`cierre-wizard-step ${pendingNovedades === 0 ? 'active' : ''}`}>
                    <div className="cierre-step-number">2</div>
                    <div className="cierre-step-title">Validar Datos y Recalcular</div>
                    <div className="cierre-step-desc">Asegúrate de que no haya fichadas faltantes. Recalcula si hiciste correcciones.</div>
                    <ChevronRight className="cierre-step-connector" size={16} />
                  </div>

                  <div className="cierre-wizard-step">
                    <div className="cierre-step-number">3</div>
                    <div className="cierre-step-title">Aprobar y Cerrar</div>
                    <div className="cierre-step-desc">Cierra definitivamente el período para inmutar los datos y habilitar al contador.</div>
                  </div>
                </div>

                <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button 
                    className="btn btn-outline" 
                    disabled={actionLoading} 
                    onClick={() => handleConsolidar(selectedCierreData.periodo)}
                  >
                    {actionLoading ? (
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <RefreshCcw size={16} />
                    )}
                    Recalcular Borrador
                  </button>
                  <button 
                    className="btn btn-primary" 
                    disabled={pendingNovedades > 0 || actionLoading}
                    onClick={handleCerrar}
                  >
                    {actionLoading ? (
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Aprobar y Cerrar Definitivamente
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Banner de Período Cerrado */}
          {selectedCierreData.estado === 'cerrado' && (
            <div className="cierre-closed-banner">
              <div>
                <div className="cierre-closed-title">
                  <CheckCircle size={20} />
                  Período Cerrado e Inmutable
                </div>
                <div className="cierre-closed-details">
                  Cerrado por: <strong>{selectedCierreData.usuarioNombre || 'Sistema'}</strong> el {selectedCierreData.fechaCierre ? new Date(selectedCierreData.fechaCierre).toLocaleString('es-AR') : ''}
                </div>
              </div>
              {isAdmin && (
                <button 
                  className="btn btn-sm btn-outline" 
                  style={{ borderColor: 'var(--rojo)', color: 'var(--rojo)' }} 
                  onClick={handleReabrir}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: '4px' }} />
                  ) : (
                    <Undo2 size={14} style={{ marginRight: '4px' }} />
                  )}
                  Reabrir Período
                </button>
              )}
            </div>
          )}

          {/* Tabla de Resumen */}
          {selectedCierreData.resumenEmpleados && selectedCierreData.resumenEmpleados.length > 0 ? (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Resumen de Preliquidación — {periodoLabel(selectedCierreData.periodo)}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline btn-sm" onClick={exportExcel}>
                    <Download size={14} /> Excel
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={exportCSV}>
                    <Download size={14} /> CSV
                  </button>
                </div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="data-table-wrapper">
                  <table className="data-table" id="tabla-cierre">
                    <thead>
                      <tr>
                        <th>Empleado</th>
                        <th>Días Trab.</th>
                        <th>Aus. Just.</th>
                        <th>Aus. Injust.</th>
                        <th>Hs Extra 50%</th>
                        <th>Hs Extra 100%</th>
                        <th>Tardanzas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCierreData.resumenEmpleados.map((re) => {
                        const emp = empleados.find((e) => e.id === re.empleadoId);
                        if (!emp) return null;
                        return (
                          <tr key={re.empleadoId}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  background: 'var(--azul-principal-light)',
                                  color: 'var(--azul-principal)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}>
                                  {emp.nombre[0]}{emp.apellido[0]}
                                </div>
                                <span style={{ fontWeight: 500 }}>{emp.nombre} {emp.apellido}</span>
                              </div>
                            </td>
                            <td style={{ fontWeight: 600 }}>{re.diasTrabajados}</td>
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
              </div>
            </div>
          ) : (
             <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
               <p>No hay empleados activos con datos para este período.</p>
             </div>
          )}
        </>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' && <CheckCircle size={18} style={{ color: 'var(--verde)' }} />}
            {toast.type === 'error' && <AlertTriangle size={18} style={{ color: 'var(--rojo)' }} />}
            {toast.type === 'warning' && <AlertTriangle size={18} style={{ color: 'var(--amarillo)' }} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
