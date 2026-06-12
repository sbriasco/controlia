import { useState, useEffect } from 'react';
import { Search, Check, X, AlertCircle, Loader2, Undo2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { novedadService } from '../../services/novedad.service';
import { empleadoService } from '../../services/empleado.service';
import type { Empleado, Novedad, EstadoNovedad, TipoNovedad } from '../../types';

const tipoLabels: Record<TipoNovedad, string> = {
  tardanza: 'Tardanza',
  ausencia_justificada: 'Ausencia Justificada',
  ausencia_injustificada: 'Ausencia Injustificada',
  horas_extra_50: 'Horas Extra 50%',
  horas_extra_100: 'Horas Extra 100%',
  salida_anticipada: 'Salida Anticipada',
  licencia_enfermedad: 'Licencia Enfermedad',
  licencia_examen: 'Licencia Examen',
  vacaciones: 'Vacaciones',
  suspension: 'Suspensión',
  permiso_especial: 'Permiso Especial',
  descanso_excedido: 'Descanso Excedido',
  doble_fichada: 'Doble Fichada',
  descanso_no_tomado: 'Descanso No Tomado',
};

const tipoBadgeClass = (tipo: string): string => {
  if (tipo.includes('tardanza') || tipo.includes('descanso')) return 'badge-tardanza';
  if (tipo.includes('ausencia')) return 'badge-ausencia';
  if (tipo.includes('horas_extra')) return 'badge-horas-extra';
  return 'badge-licencia';
};

// Genera las opciones de período: últimos 6 meses
const generarPeriodos = (): { value: string; label: string }[] => {
  const periodos: { value: string; label: string }[] = [];
  const hoy = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    periodos.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return periodos;
};

const tipoFilterOptions: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos los tipos' },
  { value: 'tardanza', label: 'Tardanzas' },
  { value: 'ausencia_injustificada', label: 'Ausencias Injustificadas' },
  { value: 'ausencia_justificada', label: 'Ausencias Justificadas' },
  { value: 'horas_extra', label: 'Horas Extra' },
  { value: 'licencia_enfermedad', label: 'Licencia Enfermedad' },
  { value: 'licencia_examen', label: 'Licencia Examen' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'suspension', label: 'Suspensión' },
];

export function NovedadesPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';

  const periodos = generarPeriodos();
  const [periodo, setPeriodo] = useState(periodos[0].value);
  const [statusFilter, setStatusFilter] = useState<EstadoNovedad | 'todas'>('todas');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [search, setSearch] = useState('');

  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newNovedadData, setNewNovedadData] = useState({
    empleadoId: user?.rol === 'admin' ? 0 : user?.id || 0,
    tipo: 'vacaciones',
    fechaInicio: '',
    fechaFin: '',
    observacion: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [novs, emps] = await Promise.all([
        novedadService.getAll({ periodo }),
        empleadoService.getAll(),
      ]);
      setNovedades(novs);
      setEmpleados(emps);
    } catch (err) {
      console.error('Error cargando novedades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periodo]);

  const handleUpdateEstado = async (id: number, estado: 'aprobada' | 'rechazada' | 'pendiente') => {
    try {
      const res = await novedadService.updateEstado(id, estado, user?.id);
      setNovedades(prev => prev.map(n => n.id === id ? res : n));
    } catch (err: any) {
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  const getFechasArray = (start: string, end: string) => {
    const dates = [];
    let current = new Date(start);
    const endDate = new Date(end);
    while (current <= endDate) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const handleSubmitNovedad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNovedadData.empleadoId || !newNovedadData.fechaInicio || !newNovedadData.fechaFin) {
      alert('Completá todos los campos obligatorios');
      return;
    }
    setIsSubmitting(true);
    try {
      const fechas = getFechasArray(newNovedadData.fechaInicio, newNovedadData.fechaFin);
      const res = await novedadService.create({
        empleadoId: newNovedadData.empleadoId,
        tipo: newNovedadData.tipo,
        fechas,
        observacion: newNovedadData.observacion
      });
      setNovedades(prev => [res, ...prev]);
      setShowNewModal(false);
      setNewNovedadData({
        empleadoId: user?.rol === 'admin' ? 0 : user?.id || 0,
        tipo: 'vacaciones',
        fechaInicio: '',
        fechaFin: '',
        observacion: ''
      });
    } catch (err: any) {
      alert('Error al crear novedad: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrado local
  const filtered = novedades.filter(n => {
    // Filtro por estado
    if (statusFilter !== 'todas' && n.estado !== statusFilter) return false;

    // Filtro por tipo
    if (tipoFilter !== 'todos') {
      if (tipoFilter === 'horas_extra') {
        if (!n.tipo.startsWith('horas_extra')) return false;
      } else if (n.tipo !== tipoFilter) {
        return false;
      }
    }

    // Filtro por búsqueda de nombre (solo admin)
    if (search) {
      const emp = empleados.find(e => e.id === n.empleadoId);
      if (!emp) return false;
      const fullName = `${emp.nombre} ${emp.apellido} ${emp.legajo}`.toLowerCase();
      if (!fullName.includes(search.toLowerCase())) return false;
    }

    // Si no es admin, solo mostrar las del usuario actual
    if (!isAdmin && n.empleadoId !== (user?.id ?? 0)) return false;

    return true;
  });

  const statusCounts = {
    todas: novedades.length,
    pendiente: novedades.filter(n => n.estado === 'pendiente').length,
    aprobada: novedades.filter(n => n.estado === 'aprobada').length,
    rechazada: novedades.filter(n => n.estado === 'rechazada').length,
  };

  const getEmpleadoName = (id: number) => {
    const emp = empleados.find(e => e.id === id);
    return emp ? `${emp.nombre} ${emp.apellido}` : `#${id}`;
  };

  const periodoLabel = periodos.find(p => p.value === periodo)?.label || periodo;

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="page-toolbar-left">
          {isAdmin && (
            <div className="search-bar">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar empleado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                id="search-novedades"
              />
            </div>
          )}
          <div className="filter-tabs">
            {(['todas', 'pendiente', 'aprobada', 'rechazada'] as const).map((status) => (
              <button
                key={status}
                className={`filter-tab ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span style={{ marginLeft: 4, opacity: 0.6 }}>({statusCounts[status]})</span>
              </button>
            ))}
          </div>
        </div>
        <div className="page-toolbar-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => setShowNewModal(true)}
            style={{ padding: '6px 12px' }}
          >
            Nueva Novedad
          </button>
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              backgroundColor: 'var(--gris-muy-claro)',
              color: 'var(--text-h)',
              cursor: 'pointer',
            }}
            id="filtro-tipo-novedad"
          >
            {tipoFilterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              backgroundColor: 'var(--gris-muy-claro)',
              color: 'var(--text-h)',
              cursor: 'pointer',
            }}
            id="filtro-periodo"
          >
            {periodos.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gris-texto)' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
              <div>Cargando novedades de {periodoLabel}...</div>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table" id="tabla-novedades">
                <thead>
                  <tr>
                    {isAdmin && <th>Empleado</th>}
                    <th>Tipo</th>
                    <th>Fecha(s)</th>
                    <th>Cantidad</th>
                    <th>Origen</th>
                    <th>Estado</th>
                    <th>Observación</th>
                    {isAdmin && <th>Revisado por</th>}
                    {isAdmin && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 6}>
                        <div className="empty-state" style={{ padding: '40px' }}>
                          <div className="empty-state-icon"><AlertCircle size={28} /></div>
                          <div className="empty-state-title">Sin novedades</div>
                          <div className="empty-state-text">
                            No hay novedades en {periodoLabel} para los filtros seleccionados.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((n) => (
                      <tr key={n.id}>
                        {isAdmin && (
                          <td style={{ fontWeight: 500 }}>{getEmpleadoName(n.empleadoId)}</td>
                        )}
                        <td>
                          <span className={`badge ${tipoBadgeClass(n.tipo)}`}>
                            {tipoLabels[n.tipo as TipoNovedad] || n.tipo}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          {n.fechas.length > 2
                            ? `${n.fechas[0]} → ${n.fechas[n.fechas.length - 1]}`
                            : n.fechas.join(', ')}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {n.cantidad} {n.unidad}
                        </td>
                        <td>
                          <span className={`badge ${n.origen === 'automatica' ? 'badge-biometrico' : 'badge-manual'}`}>
                            {n.origen === 'automatica' ? '⚡ Automática' : '✏️ Manual'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${n.estado}`}>
                            {n.estado.charAt(0).toUpperCase() + n.estado.slice(1)}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--gris-texto)', maxWidth: '200px' }}>
                          <span className="truncate" style={{ display: 'block' }}>{n.observacion || '—'}</span>
                        </td>
                        {isAdmin && (
                          <td style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>
                            {n.usuarioAccion ? (
                              <>
                                <span style={{ fontWeight: 500, color: 'var(--text-h)' }}>{n.usuarioAccion.nombre}</span>
                                <br />
                                {n.fechaAccion ? new Date(n.fechaAccion).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                              </>
                            ) : '—'}
                          </td>
                        )}
                        {isAdmin && (
                          <td>
                            {n.estado === 'pendiente' ? (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn btn-sm btn-success" title="Aprobar" onClick={() => handleUpdateEstado(n.id, 'aprobada')}>
                                  <Check size={14} />
                                </button>
                                <button className="btn btn-sm btn-danger" title="Rechazar" onClick={() => handleUpdateEstado(n.id, 'rechazada')}>
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                className="btn btn-sm btn-outline" 
                                title="Deshacer y volver a Pendiente" 
                                onClick={() => handleUpdateEstado(n.id, 'pendiente')}
                              >
                                <Undo2 size={14} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {showNewModal && (
        <div className="modal-backdrop" onClick={() => setShowNewModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Cargar Nueva Novedad</h3>
              <button className="modal-close" onClick={() => setShowNewModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmitNovedad}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {isAdmin && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Empleado *</label>
                    <select 
                      required
                      value={newNovedadData.empleadoId} 
                      onChange={e => setNewNovedadData({...newNovedadData, empleadoId: Number(e.target.value)})}
                      className="form-control"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                    >
                      <option value="0">Seleccionar empleado...</option>
                      {empleados.filter(e => e.estado === 'activo').map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Tipo de Novedad *</label>
                  <select 
                    required
                    value={newNovedadData.tipo} 
                    onChange={e => setNewNovedadData({...newNovedadData, tipo: e.target.value})}
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                  >
                    <option value="vacaciones">Vacaciones</option>
                    <option value="licencia_enfermedad">Licencia Enfermedad</option>
                    <option value="licencia_examen">Licencia Examen</option>
                    <option value="permiso_especial">Permiso Especial / Turno Médico</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Fecha Inicio *</label>
                    <input 
                      required type="date" 
                      value={newNovedadData.fechaInicio} 
                      onChange={e => setNewNovedadData({...newNovedadData, fechaInicio: e.target.value})}
                      className="form-control"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Fecha Fin *</label>
                    <input 
                      required type="date" 
                      min={newNovedadData.fechaInicio}
                      value={newNovedadData.fechaFin} 
                      onChange={e => setNewNovedadData({...newNovedadData, fechaFin: e.target.value})}
                      className="form-control"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} 
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Observación</label>
                  <textarea 
                    value={newNovedadData.observacion}
                    onChange={e => setNewNovedadData({...newNovedadData, observacion: e.target.value})}
                    className="form-control"
                    rows={3}
                    placeholder="Detalles adicionales (opcional)"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowNewModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando...' : 'Cargar Novedad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
