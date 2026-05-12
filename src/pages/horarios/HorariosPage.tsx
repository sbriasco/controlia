import { useState, useEffect } from 'react';
import { Plus, Edit, Clock, Users, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { horarioService } from '../../services/horario.service';
import { empleadoService } from '../../services/empleado.service';
import type { Horario, Empleado } from '../../types';

export function HorariosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.rol === 'admin';

  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async (showLoader = false) => {
      try {
        if (showLoader) setLoading(true);
        const [horariosData, empleadosData] = await Promise.all([
          horarioService.getAll(),
          empleadoService.getAll()
        ]);
        setHorarios(horariosData);
        setEmpleados(empleadosData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError('No se pudieron cargar los horarios.');
      } finally {
        if (showLoader) setLoading(false);
      }
    };

    fetchData(true);

    const onHorariosChanged = () => {
      fetchData(false);
    };

    window.addEventListener('horarios:changed', onHorariosChanged as EventListener);
    return () => {
      window.removeEventListener('horarios:changed', onHorariosChanged as EventListener);
    };
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este horario?')) return;
    try {
      await horarioService.delete(id);
      setHorarios(prev => prev.filter(h => h.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar horario');
    }
  };

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  }

  // For employee view, show only their assigned schedule
  if (!isAdmin) {
    // We assume the user has their ID or something in the context, but for now we fallback:
    // This logic might need adjustment depending on how we map User to Empleado
    const myHorario = horarios.find((h) => h.id === 2); // Fallback mock value or fetch from real user data if available
    return (
      <div className="animate-fade-in">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Mi Horario Asignado</h3>
          </div>
          <div className="card-body">
            {myHorario ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { label: 'Nombre del Turno', value: myHorario.nombre },
                  { label: 'Tipo', value: myHorario.tipo.charAt(0).toUpperCase() + myHorario.tipo.slice(1) },
                  { label: 'Hora Entrada', value: myHorario.horaEntrada },
                  { label: 'Hora Salida', value: myHorario.horaSalida },
                  { label: 'Tolerancia Entrada', value: `${myHorario.toleranciaEntrada} min` },
                  { label: 'Tolerancia Salida', value: `${myHorario.toleranciaSalida} min` },
                  { label: 'Descanso', value: myHorario.descansoInicio ? `${myHorario.descansoInicio} — ${myHorario.descansoFin}` : 'Sin descanso' },
                  { label: 'Días', value: myHorario.diasSemana.join(', ') },
                ].map((item) => (
                  <div key={item.label} style={{ padding: '12px 16px', background: 'var(--gris-muy-claro)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--gris-texto)', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px' }}>No tienes un horario asignado o no se pudo cargar.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="page-toolbar-left">
          <span style={{ fontSize: '14px', color: 'var(--gris-texto)' }}>
            {horarios.length} horarios configurados{loading ? ' · Actualizando...' : ''}
          </span>
        </div>
        <div className="page-toolbar-right">
          <button className="btn btn-primary" id="btn-nuevo-horario" onClick={() => navigate('/horarios/nuevo')}>
            <Plus size={16} /> Nuevo Horario
          </button>
        </div>
      </div>

      {/* Horarios Cards */}
      <div className="grid-3">
        {horarios.map((h) => {
          const assignedCount = empleados.filter((e) => e.horarioId === h.id && e.estado === 'activo').length;
          return (
            <div className="card" key={h.id}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 className="card-title" style={{ fontSize: '15px', margin: 0 }}>{h.nombre}</h3>
                <div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/horarios/${h.id}`)}>
                    <Edit size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'red' }} onClick={() => handleDelete(h.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge badge-${h.tipo === 'fijo' ? 'activo' : h.tipo === 'rotativo' ? 'pendiente' : 'licencia'}`}>
                      {h.tipo.charAt(0).toUpperCase() + h.tipo.slice(1)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--gris-texto)' }}>
                      <Users size={12} /> {assignedCount} empleados
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--azul-profundo)' }}>
                    <Clock size={20} style={{ color: 'var(--azul-principal)' }} />
                    {h.horaEntrada} — {h.horaSalida}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div style={{ padding: '8px', background: 'var(--gris-muy-claro)', borderRadius: '6px' }}>
                      <div style={{ color: 'var(--gris-texto)' }}>Tolerancia entrada</div>
                      <div style={{ fontWeight: 600, marginTop: '2px' }}>{h.toleranciaEntrada} min</div>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--gris-muy-claro)', borderRadius: '6px' }}>
                      <div style={{ color: 'var(--gris-texto)' }}>Umbral hs extra</div>
                      <div style={{ fontWeight: 600, marginTop: '2px' }}>{h.umbralHorasExtra} min</div>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--gris-muy-claro)', borderRadius: '6px' }}>
                      <div style={{ color: 'var(--gris-texto)' }}>Descanso</div>
                      <div style={{ fontWeight: 600, marginTop: '2px' }}>{h.descansoInicio ? `${h.descansoInicio} — ${h.descansoFin}` : 'N/A'}</div>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--gris-muy-claro)', borderRadius: '6px' }}>
                      <div style={{ color: 'var(--gris-texto)' }}>Descanso mín.</div>
                      <div style={{ fontWeight: 600, marginTop: '2px' }}>{h.minutosMinDescanso} min</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>
                    <strong>Días:</strong> {h.diasSemana.length > 0 ? h.diasSemana.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ') : 'Ninguno'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
