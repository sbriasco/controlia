import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { horarioService } from '../../services/horario.service';
import type { Horario } from '../../types';
import { Save, ArrowLeft } from 'lucide-react';

export function HorarioForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<Omit<Horario, 'id'>>({
    nombre: '',
    tipo: 'fijo',
    diasSemana: [],
    horaEntrada: '08:00',
    horaSalida: '17:00',
    toleranciaEntrada: 15,
    toleranciaSalida: 0,
    descansoInicio: '',
    descansoFin: '',
    minutosMinDescanso: 0,
    umbralHorasExtra: 30,
  });

  const [horasRequeridas, setHorasRequeridas] = useState<number>(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      horarioService.getById(Number(id))
        .then(data => {
          setFormData(data);
          
          // Si es flexible, calcular las horas requeridas a partir de las horas configuradas
          if (data.tipo === 'flexible') {
            const [entH] = data.horaEntrada.split(':').map(Number);
            const [salH] = data.horaSalida.split(':').map(Number);
            let diffHours = salH - entH;
            if (diffHours < 0) diffHours += 24;
            setHorasRequeridas(diffHours || 8);
          }
        })
        .catch(err => {
          console.error(err);
          setError('Error al cargar el horario');
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const dias = new Set(prev.diasSemana);
      if (checked) {
        dias.add(value);
      } else {
        dias.delete(value);
      }
      return { ...prev, diasSemana: Array.from(dias) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = { ...formData };
    
    // Si es flexible, computamos valores de forma inteligente y transparente para el motor de base de datos
    if (payload.tipo === 'flexible') {
      payload.horaEntrada = '09:00';
      const salH = (9 + horasRequeridas) % 24;
      payload.horaSalida = `${String(salH).padStart(2, '0')}:00`;
      payload.toleranciaEntrada = 1440; // Evita falsas tardanzas en horario libre
      payload.toleranciaSalida = 1440;   // Evita salidas anticipadas en horario libre
      payload.descansoInicio = undefined;
      payload.descansoFin = undefined;
      payload.minutosMinDescanso = 0;
    } else {
      if (!payload.descansoInicio) payload.descansoInicio = undefined;
      if (!payload.descansoFin) payload.descansoFin = undefined;
    }

    try {
      if (isEditing) {
        await horarioService.update(Number(id), payload);
      } else {
        await horarioService.create(payload);
      }
      navigate('/horarios');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar el horario');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' };

  if (loading && isEditing) return <div style={{ padding: '20px' }}>Cargando datos del horario...</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/horarios')} className="btn btn-ghost btn-sm" style={{ padding: '5px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ margin: 0 }}>{isEditing ? 'Editar Horario' : 'Nuevo Horario'}</h2>
      </div>

      {error && <div style={{ padding: '15px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '20px' }}>{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit} className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Nombre del Horario *</label>
              <input required type="text" name="nombre" value={formData.nombre} onChange={handleChange} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Tipo de Horario *</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} style={inputStyle}>
                <option value="fijo">Fijo</option>
                <option value="rotativo">Rotativo</option>
                <option value="flexible">Flexible</option>
                <option value="parcial">Parcial</option>
              </select>
            </div>

            {formData.tipo === 'flexible' ? (
              /* Configuración simplificada y limpia para Horario Flexible */
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ width: '50%', paddingRight: '7.5px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Horas Diarias Requeridas *</label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    max="24" 
                    value={horasRequeridas} 
                    onChange={(e) => setHorasRequeridas(Number(e.target.value))} 
                    style={inputStyle} 
                  />
                </div>
              </div>
            ) : (
              /* Campos tradicionales para otros horarios */
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Hora Entrada *</label>
                  <input required type="time" name="horaEntrada" value={formData.horaEntrada} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Hora Salida *</label>
                  <input required type="time" name="horaSalida" value={formData.horaSalida} onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Tolerancia Entrada (min)</label>
                  <input required type="number" name="toleranciaEntrada" value={formData.toleranciaEntrada} onChange={handleChange} style={inputStyle} min="0" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Tolerancia Salida (min)</label>
                  <input required type="number" name="toleranciaSalida" value={formData.toleranciaSalida} onChange={handleChange} style={inputStyle} min="0" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Inicio Descanso</label>
                  <input type="time" name="descansoInicio" value={formData.descansoInicio || ''} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Fin Descanso</label>
                  <input type="time" name="descansoFin" value={formData.descansoFin || ''} onChange={handleChange} style={inputStyle} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Descanso Mínimo (min)</label>
                  <input required type="number" name="minutosMinDescanso" value={formData.minutosMinDescanso} onChange={handleChange} style={inputStyle} min="0" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Umbral Horas Extra (min)</label>
                  <input required type="number" name="umbralHorasExtra" value={formData.umbralHorasExtra} onChange={handleChange} style={inputStyle} min="0" />
                </div>
              </>
            )}
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: 500 }}>Días Laborables *</label>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => (
                <label key={dia} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    value={dia}
                    checked={formData.diasSemana.includes(dia)}
                    onChange={handleCheckboxChange}
                  />
                  {dia.charAt(0).toUpperCase() + dia.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => navigate('/horarios')} className="btn btn-ghost" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} /> {loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Horario')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
