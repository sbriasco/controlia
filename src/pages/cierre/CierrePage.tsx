import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, FileBarChart, Download, ChevronRight, Loader2, RefreshCcw, Undo2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { cierreService } from '../../services/cierre.service';
import { empleadoService } from '../../services/empleado.service';
import { novedadService } from '../../services/novedad.service';
import type { Empleado, Novedad, CierreMensual } from '../../types';

const periodoLabel = (periodo: string) => {
  if (!periodo) return '';
  const [year, month] = periodo.split('-');
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${months[parseInt(month) - 1]} ${year}`;
};

export function CierrePage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';

  const [cierres, setCierres] = useState<CierreMensual[]>([]);
  const [selectedCierreId, setSelectedCierreId] = useState<number | null>(null);
  const [selectedCierreData, setSelectedCierreData] = useState<CierreMensual | null>(null);
  
  const [nuevoPeriodo, setNuevoPeriodo] = useState('');
  
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Inicializar listado de cierres
  useEffect(() => {
    loadCierres();
  }, []);

  const loadCierres = async () => {
    try {
      const data = await cierreService.getAll();
      setCierres(data);
      if (data.length > 0 && !selectedCierreId) {
        setSelectedCierreId(data[0].id);
      }
      
      // Sugerir mes actual para consolidar
      const hoy = new Date();
      const sugerido = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
      if (!data.find(c => c.periodo === sugerido)) {
        setNuevoPeriodo(sugerido);
      } else {
        const proximo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
        setNuevoPeriodo(`${proximo.getFullYear()}-${String(proximo.getMonth() + 1).padStart(2, '0')}`);
      }
    } catch (err) {
      console.error('Error cargando cierres', err);
    }
  };

  // Cargar datos cuando se selecciona un cierre
  useEffect(() => {
    if (!selectedCierreId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [cierreDetalle, novs, emps] = await Promise.all([
          cierreService.getById(selectedCierreId),
          novedadService.getAll({ periodo: cierres.find(c => c.id === selectedCierreId)?.periodo }),
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
  }, [selectedCierreId, cierres]);

  const handleConsolidar = async (periodoToConsolidate: string) => {
    if (!periodoToConsolidate) return;
    setActionLoading(true);
    try {
      const nuevo = await cierreService.consolidar(periodoToConsolidate);
      await loadCierres();
      setSelectedCierreId(nuevo.id);
      alert('Período consolidado exitosamente. Revisá el borrador.');
    } catch (err: any) {
      alert('Error al consolidar: ' + err.message);
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
      alert('Período cerrado definitivamente.');
    } catch (err: any) {
      alert('Error al cerrar: ' + err.message);
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
      alert('Período reabierto como borrador.');
    } catch (err: any) {
      alert('Error al reabrir: ' + err.message);
    } finally {
      setActionLoading(false);
    }
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
    <div className="animate-fade-in">
      {/* Header Selector */}
      <div className="page-toolbar">
        <div className="page-toolbar-left" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <select 
            className="form-control" 
            style={{ width: '200px', fontWeight: 600 }}
            value={selectedCierreId || ''}
            onChange={(e) => setSelectedCierreId(Number(e.target.value))}
          >
            {cierres.length === 0 && <option value="">No hay cierres</option>}
            {cierres.map(c => (
              <option key={c.id} value={c.id}>
                {periodoLabel(c.periodo)} {c.estado === 'cerrado' ? '(Cerrado)' : '(Borrador)'}
              </option>
            ))}
          </select>
          
          {isAdmin && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderLeft: '1px solid #ccc', paddingLeft: '16px' }}>
              <input 
                type="month" 
                className="form-control" 
                value={nuevoPeriodo} 
                onChange={(e) => setNuevoPeriodo(e.target.value)}
                style={{ padding: '6px' }}
              />
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => handleConsolidar(nuevoPeriodo)}
                disabled={actionLoading || !nuevoPeriodo}
              >
                <RefreshCcw size={14} /> Consolidar Mes
              </button>
            </div>
          )}
        </div>

        {selectedCierreData && (
          <div className="page-toolbar-right">
            <span className={`badge badge-${selectedCierreData.estado}`}>
              {selectedCierreData.estado === 'cerrado' ? '✓ Período Cerrado' : '⏳ En Borrador'}
            </span>
          </div>
        )}
      </div>

      {!selectedCierreId && cierres.length === 0 && !loading && (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <h3>Aún no hay períodos consolidados</h3>
          <p>Seleccioná un mes arriba y clickeá "Consolidar Mes" para comenzar.</p>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gris-texto)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
          <div>Cargando datos del período...</div>
        </div>
      ) : selectedCierreData && (
        <>
          {/* Status overview for draft */}
          {selectedCierreData.estado === 'borrador' && isAdmin && (
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
              <div className="stat-card">
                <div className="stat-icon yellow"><AlertTriangle size={24} /></div>
                <div className="stat-info">
                  <span className="stat-label">Novedades Pendientes</span>
                  <span className="stat-value">{pendingNovedades}</span>
                  <span className="stat-change down">Requieren resolución antes de cerrar</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue"><FileBarChart size={24} /></div>
                <div className="stat-info">
                  <span className="stat-label">Estado</span>
                  <span className="stat-value" style={{ fontSize: '1.2rem' }}>En revisión</span>
                  <span className="stat-change">El resumen es un borrador temporal</span>
                </div>
              </div>
            </div>
          )}

          {/* Wizard steps for admin in draft */}
          {selectedCierreData.estado === 'borrador' && isAdmin && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <h3 className="card-title">Proceso de Cierre — {periodoLabel(selectedCierreData.periodo)}</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: '16px', overflowX: 'auto' }}>
                  {[
                    { step: 1, title: 'Revisión', desc: 'Verificar fichadas y novedades pendientes', active: pendingNovedades > 0 },
                    { step: 2, title: 'Resumen', desc: 'Generar resumen por empleado', active: pendingNovedades === 0 },
                    { step: 3, title: 'Exportación', desc: 'Exportar a sistemas externos', active: false },
                  ].map((s) => (
                    <div
                      key={s.step}
                      style={{
                        flex: 1,
                        minWidth: 180,
                        padding: '20px',
                        background: s.active ? 'var(--azul-principal-light)' : 'var(--gris-muy-claro)',
                        borderRadius: '12px',
                        border: s.active ? '2px solid var(--azul-principal)' : '2px solid transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        position: 'relative',
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: s.active ? 'var(--azul-principal)' : 'var(--gris-medio)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 700,
                      }}>
                        {s.step}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{s.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>{s.desc}</div>
                      {s.step < 3 && (
                        <ChevronRight
                          size={16}
                          style={{
                            position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--gris-medio)',
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button className="btn btn-outline" disabled={actionLoading} onClick={() => handleConsolidar(selectedCierreData.periodo)}>
                  <RefreshCcw size={16} /> Recalcular Borrador
                </button>
                <button 
                  className="btn btn-primary" 
                  disabled={pendingNovedades > 0 || actionLoading}
                  onClick={handleCerrar}
                >
                  <CheckCircle size={16} /> Aprobar y Cerrar Definitivamente
                </button>
              </div>
            </div>
          )}

          {/* Reopen banner for closed periods */}
          {selectedCierreData.estado === 'cerrado' && isAdmin && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--verde-light)', padding: '12px 20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--verde)' }}>
              <div>
                <strong style={{ color: 'var(--verde)' }}>Período Cerrado Inmutable</strong>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Cerrado por: {selectedCierreData.usuarioNombre || 'Sistema'} el {selectedCierreData.fechaCierre ? new Date(selectedCierreData.fechaCierre).toLocaleString('es-AR') : ''}</p>
              </div>
              <button className="btn btn-sm btn-outline" style={{ borderColor: 'var(--rojo)', color: 'var(--rojo)' }} onClick={handleReabrir}>
                <Undo2 size={14} /> Reabrir Período
              </button>
            </div>
          )}

          {/* Summary table */}
          {selectedCierreData.resumenEmpleados && selectedCierreData.resumenEmpleados.length > 0 ? (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Resumen de Preliquidación</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline btn-sm" onClick={exportExcel}><Download size={14} /> Excel</button>
                  <button className="btn btn-outline btn-sm" onClick={exportCSV}><Download size={14} /> CSV</button>
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
                                  width: 28, height: 28, borderRadius: '50%',
                                  background: 'var(--azul-principal-light)', color: 'var(--azul-principal)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '11px', fontWeight: 600,
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
    </div>
  );
}
