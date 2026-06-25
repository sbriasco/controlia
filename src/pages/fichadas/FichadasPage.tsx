import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Clock, ArrowUpRight, ArrowDownLeft, X, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fichadaService } from '../../services/fichada.service';
import { empleadoService } from '../../services/empleado.service';
import type { Fichada, Empleado } from '../../types';
import './FichadasPage.css';

// ── Helpers ────────────────────────────────────────────────────

const todayISO = () => {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
};

const formatFecha = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

interface FichadaConEmpleado extends Fichada {
  empleado?: { id: number; legajo: string; nombre: string; apellido: string };
}

// ── Component ──────────────────────────────────────────────────

export function FichadasPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';

  // State
  const [fichadas, setFichadas] = useState<FichadaConEmpleado[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(todayISO());
  const [showModal, setShowModal] = useState(false);

  // Modal form state
  const [form, setForm] = useState({
    empleadoId: '',
    fecha: todayISO(),
    hora: new Date().toTimeString().slice(0, 5),
    tipo: 'entrada' as 'entrada' | 'salida',
    motivo: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Load data ────────────────────────────────────────────────

  const loadFichadas = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    if (showLoader) setError(null);
    try {
      const params: { fecha?: string; empleadoId?: number } = {};
      if (dateFilter) params.fecha = dateFilter;
      if (!isAdmin && user?.empleadoId) params.empleadoId = user.empleadoId;

      const data = await fichadaService.getAll(params);
      setFichadas(data);
      if (showLoader) setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar fichadas');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [dateFilter, isAdmin, user?.empleadoId]);

  useEffect(() => {
    loadFichadas(true);
  }, [loadFichadas]);

  useEffect(() => {
    const onFichadasChanged = () => {
      loadFichadas(false);
    };

    window.addEventListener('fichadas:changed', onFichadasChanged as EventListener);
    return () => {
      window.removeEventListener('fichadas:changed', onFichadasChanged as EventListener);
    };
  }, [loadFichadas]);

  useEffect(() => {
    if (isAdmin) {
      empleadoService.getAll().then(setEmpleados).catch(() => {});
    }
  }, [isAdmin]);

  // ── Filter for search ────────────────────────────────────────

  const filtered = fichadas.filter((f) => {
    if (!search) return true;
    const emp = f.empleado;
    if (!emp) return false;
    return `${emp.nombre} ${emp.apellido} ${emp.legajo}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  // ── Stats ────────────────────────────────────────────────────

  const entradas = filtered.filter((f) => f.tipo === 'entrada').length;
  const salidas = filtered.filter((f) => f.tipo === 'salida').length;

  // ── Helpers ──────────────────────────────────────────────────

  const getEmpleadoLabel = (f: FichadaConEmpleado) => {
    if (f.empleado) return `${f.empleado.nombre} ${f.empleado.apellido}`;
    return `Empleado #${f.empleadoId}`;
  };

  const getInitials = (f: FichadaConEmpleado) => {
    if (!f.empleado) return '??';
    return `${f.empleado.nombre[0]}${f.empleado.apellido[0]}`;
  };

  // ── Submit fichada manual ─────────────────────────────────────

  const handleSubmit = async () => {
    if (submitting) return; // Guard contra doble-click
    if (!form.empleadoId) {
      setFormError('Seleccioná un empleado');
      return;
    }
    if (!form.fecha || !form.hora) {
      setFormError('Fecha y hora son requeridas');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      // Capturar los valores del form ANTES de cualquier reset
      const payload = {
        empleadoId: Number(form.empleadoId),
        timestamp: `${form.fecha}T${form.hora}:00Z`,
        tipo: form.tipo,
        origen: 'manual' as const,
        motivo: form.motivo || undefined,
        esCorreccion: false,
      };

      // Cerrar modal inmediatamente para evitar doble-click
      setShowModal(false);

      await fichadaService.create(payload);

      setForm({
        empleadoId: '',
        fecha: todayISO(),
        hora: new Date().toTimeString().slice(0, 5),
        tipo: 'entrada',
        motivo: '',
      });
      await loadFichadas(false);
    } catch (err: any) {
      setFormError(err.message || 'Error al registrar fichada');
      setShowModal(true); // Re-abrir modal para mostrar el error
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete fichada ────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta fichada manual?')) return;
    try {
      await fichadaService.delete(id);
      setFichadas((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar fichada');
    }
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="fichadas-page animate-fade-in">
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
                id="search-fichadas"
              />
            </div>
          )}
          <div className="form-group" style={{ minWidth: 160 }}>
            <input
              type="date"
              className="form-input"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              id="filter-fecha"
            />
          </div>
        </div>
        {isAdmin && (
          <div className="page-toolbar-right">
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
              id="btn-fichada-manual"
            >
              <Plus size={16} /> Fichada Manual
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon green"><ArrowUpRight size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Entradas</span>
            <span className="stat-value">{entradas}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><ArrowDownLeft size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Salidas</span>
            <span className="stat-value">{salidas}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><Clock size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Total Fichadas</span>
            <span className="stat-value">{filtered.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Fichadas del {dateFilter ? formatFecha(dateFilter) : 'período'}
          </h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', gap: '12px', color: 'var(--gris-texto)' }}>
              <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Cargando fichadas...</span>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', gap: '12px', color: 'var(--rojo)' }}>
              <AlertCircle size={22} />
              <span>{error}</span>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table" id="tabla-fichadas">
                <thead>
                  <tr>
                    {isAdmin && <th>Empleado</th>}
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Origen</th>
                    {isAdmin && <th>Motivo / Obs.</th>}
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 7 : 4}
                        style={{ textAlign: 'center', padding: '40px', color: 'var(--gris-texto)' }}
                      >
                        No hay fichadas para esta fecha
                      </td>
                    </tr>
                  ) : (
                    filtered.map((f) => {
                      const d = new Date(f.timestamp);
                      return (
                        <tr key={f.id}>
                          {isAdmin && (
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%',
                                  background: 'var(--azul-principal-light)',
                                  color: 'var(--azul-principal)',
                                  display: 'flex', alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px', fontWeight: 600, flexShrink: 0,
                                }}>
                                  {getInitials(f)}
                                </div>
                                <span style={{ fontWeight: 500, fontSize: '13px' }}>
                                  {getEmpleadoLabel(f)}
                                </span>
                              </div>
                            </td>
                          )}
                          <td>{d.toISOString().split('T')[0].split('-').reverse().join('/')}</td>
                          <td style={{ fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
                            {d.toISOString().slice(11, 16)}
                          </td>
                          <td>
                            <span className={`badge badge-${f.tipo}`}>
                              {f.tipo === 'entrada' ? '↗ Entrada' : '↙ Salida'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${f.origen}`}>
                              {f.origen.charAt(0).toUpperCase() + f.origen.slice(1)}
                            </span>
                          </td>
                          {isAdmin && (
                            <td style={{ fontSize: '12px', color: 'var(--gris-texto)', maxWidth: 220 }}>
                              {f.motivo || (f.esCorreccion ? '📝 Corrección' : '—')}
                            </td>
                          )}
                          {isAdmin && (
                            <td>
                              {f.origen === 'manual' && (
                                <button
                                  className="btn btn-icon btn-danger-ghost"
                                  title="Eliminar fichada manual"
                                  onClick={() => handleDelete(f.id)}
                                  style={{ padding: '4px', opacity: 0.6 }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal fichada manual ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Registrar Fichada Manual</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {formError && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--rojo-light, #fee2e2)',
                    color: 'var(--rojo, #dc2626)',
                    padding: '10px 14px', borderRadius: '8px',
                    fontSize: '13px',
                  }}>
                    <AlertCircle size={16} />
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Empleado *</label>
                  <select
                    className="form-select"
                    id="modal-empleado"
                    value={form.empleadoId}
                    onChange={(e) => setForm({ ...form, empleadoId: e.target.value })}
                  >
                    <option value="">Seleccionar empleado...</option>
                    {empleados
                      .filter((e) => e.estado === 'activo')
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre} {e.apellido} (#{e.legajo})
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Fecha *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.fecha}
                      onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hora *</label>
                    <input
                      type="time"
                      className="form-input"
                      value={form.hora}
                      onChange={(e) => setForm({ ...form, hora: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select
                    className="form-select"
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as 'entrada' | 'salida' })}
                  >
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Motivo <span style={{ color: 'var(--gris-texto)', fontWeight: 400 }}>(requerido para fichadas manuales)</span></label>
                  <textarea
                    className="form-textarea"
                    placeholder="Ej: Empleado olvidó fichar al ingresar..."
                    value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={submitting}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} id="btn-confirmar-fichada">
                {submitting ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Registrando...
                  </>
                ) : (
                  'Registrar Fichada'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
