import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { rotacionService } from '../../services/rotacion.service';
import { horarioService } from '../../services/horario.service';
import type { Horario, Rotacion } from '../../types';

export function RotacionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  
  const [horariosDisponibles, setHorariosDisponibles] = useState<Horario[]>([]);

  const [formData, setFormData] = useState<Partial<Rotacion>>({
    nombre: '',
    cicloSemanas: 2,
    fechaInicio: new Date().toISOString().split('T')[0],
    turnos: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const horarios = await horarioService.getAll();
        setHorariosDisponibles(horarios);

        if (isEditing) {
          const rotacion = await rotacionService.getById(Number(id));
          setFormData({
            ...rotacion,
            fechaInicio: rotacion.fechaInicio ? new Date(rotacion.fechaInicio).toISOString().split('T')[0] : '',
          });
        } else {
          // Initialize empty turnos based on default cicloSemanas
          setFormData(prev => ({
            ...prev,
            turnos: Array.from({ length: prev.cicloSemanas || 2 }).map((_, i) => ({
              id: 0,
              rotacionId: 0,
              semana: i + 1,
              horarioId: 0
            }))
          }));
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [id, isEditing]);

  const handleCicloChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val < 1 || val > 52) return;
    
    setFormData(prev => {
      const currentTurnos = prev.turnos || [];
      const newTurnos = Array.from({ length: val }).map((_, i) => {
        const semana = i + 1;
        const existing = currentTurnos.find(t => t.semana === semana);
        return existing || { id: 0, rotacionId: 0, semana, horarioId: 0 };
      });
      
      return {
        ...prev,
        cicloSemanas: val,
        turnos: newTurnos
      };
    });
  };

  const handleTurnoChange = (semana: number, horarioId: number) => {
    setFormData(prev => ({
      ...prev,
      turnos: (prev.turnos || []).map(t => t.semana === semana ? { ...t, horarioId } : t)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar que todos los turnos tengan horario asignado
    if (formData.turnos?.some(t => !t.horarioId || t.horarioId === 0)) {
      setError('Debes asignar un horario para cada semana del ciclo.');
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        await rotacionService.update(Number(id), formData);
      } else {
        await rotacionService.create(formData);
      }
      navigate('/rotaciones');
    } catch (err: any) {
      setError(err.message || 'Error al guardar la rotación');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando datos...</div>;
  }

  return (
    <div className="rotacion-form-page animate-fade-in" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/rotaciones')} style={{ padding: '8px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
          {isEditing ? 'Editar Rotación' : 'Nueva Rotación'}
        </h2>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--rojo-light, #ffebee)', color: 'var(--rojo)', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Nombre de la Rotación *</label>
                <input required type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="form-control" placeholder="Ej: Rotación 2x2" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Ciclo en Semanas *</label>
                <input required type="number" min="1" max="52" value={formData.cicloSemanas} onChange={handleCicloChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Fecha de Inicio Base *</label>
                <input required type="date" value={formData.fechaInicio} onChange={e => setFormData({ ...formData, fechaInicio: e.target.value })} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }} />
                <span style={{ fontSize: '11px', color: '#888', display: 'block', marginTop: '4px' }}>Esta fecha marca el inicio de la Semana 1.</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', margin: '10px 0' }}></div>

            <h3 style={{ fontSize: '16px', margin: '0 0 10px 0' }}>Asignación de Turnos</h3>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 15px 0' }}>Selecciona qué horario le corresponde al empleado para cada semana del ciclo.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {formData.turnos?.map(turno => (
                <div key={turno.semana} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#f5f5f5', padding: '15px', borderRadius: '6px' }}>
                  <div style={{ width: '100px', fontWeight: 600 }}>Semana {turno.semana}</div>
                  <div style={{ flex: 1 }}>
                    <select 
                      required
                      value={turno.horarioId} 
                      onChange={e => handleTurnoChange(turno.semana, Number(e.target.value))} 
                      className="form-control" 
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}
                    >
                      <option value="0">Seleccione un horario...</option>
                      {horariosDisponibles.map(h => (
                        <option key={h.id} value={h.id}>{h.nombre} ({h.horaEntrada} - {h.horaSalida})</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/rotaciones')} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={16} /> {loading ? 'Guardando...' : 'Guardar Rotación'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
