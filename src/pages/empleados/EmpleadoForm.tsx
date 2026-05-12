import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { empleadoService } from '../../services/empleado.service';
import { horarioService } from '../../services/horario.service';
import type { Empleado, Horario } from '../../types';

export function EmpleadoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [horariosDisponibles, setHorariosDisponibles] = useState<Horario[]>([]);

  const [formData, setFormData] = useState<Partial<Empleado>>({
    legajo: '',
    nombre: '',
    apellido: '',
    dni: '',
    cuil: '',
    fechaIngreso: new Date().toISOString().split('T')[0],
    categoriaLaboral: '',
    convenio: '',
    tipoJornada: 'completa',
    horarioId: 0,
    diasDescanso: [],
    modalidadFichada: 'biometrico',
    estado: 'activo',
    email: '',
    telefono: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const horarios = await horarioService.getAll();
        setHorariosDisponibles(horarios);

        if (isEditing) {
          const empleado = await empleadoService.getById(Number(id));
          setFormData({
            ...empleado,
            dni: empleado.dni ? String(empleado.dni).replace(/\D/g, '') : '',
            cuil: empleado.cuil ? String(empleado.cuil).replace(/\D/g, '') : '',
            fechaIngreso: empleado.fechaIngreso ? new Date(empleado.fechaIngreso).toISOString().split('T')[0] : '',
          });
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const normalizedValue = (name === 'dni' || name === 'cuil') ? value.replace(/\D/g, '') : value;
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: name === 'horarioId' ? Number(normalizedValue) : normalizedValue,
      };

      // Auto-completar el Tipo de Jornada en base al Horario seleccionado (pero dejándolo editable)
      if (name === 'horarioId') {
        const horarioSeleccionado = horariosDisponibles.find(h => h.id === Number(value));
        if (horarioSeleccionado) {
          if (horarioSeleccionado.tipo === 'parcial') {
            newData.tipoJornada = 'parcial';
          } else if (horarioSeleccionado.tipo === 'flexible') {
            newData.tipoJornada = 'flexible';
          } else {
            newData.tipoJornada = 'completa'; // fijo o rotativo
          }

          // Invertir los días laborables para obtener los días de descanso sugeridos
          const todosLosDias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
          const diasLaborales = horarioSeleccionado.diasSemana || [];
          newData.diasDescanso = todosLosDias.filter(d => !diasLaborales.includes(d));
        }
      }

      return newData;
    });
  };

  const handleDiasDescanso = (dia: string) => {
    setFormData((prev) => {
      const dias = prev.diasDescanso || [];
      if (dias.includes(dia)) {
        return { ...prev, diasDescanso: dias.filter(d => d !== dia) };
      }
      return { ...prev, diasDescanso: [...dias, dia] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Sanitizar y validar DNI/CUIL antes de enviar
      const payload: any = { ...formData };
      payload.dni = (payload.dni || '').toString().replace(/\D/g, '');
      payload.cuil = (payload.cuil || '').toString().replace(/\D/g, '');

      if (payload.dni.length < 7 || payload.dni.length > 10) {
        setError('DNI inválido: debe tener entre 7 y 10 dígitos');
        setLoading(false);
        return;
      }
      if (payload.cuil.length < 10 || payload.cuil.length > 12) {
        setError('CUIL inválido: debe tener entre 10 y 12 dígitos');
        setLoading(false);
        return;
      }

      if (isEditing) {
        await empleadoService.update(Number(id), payload);
      } else {
        await empleadoService.create(payload as any);
      }
      navigate('/empleados');
    } catch (err: any) {
      // Mostrar detalles de validación si vienen desde el backend
      if (err && err.details && Array.isArray(err.details)) {
        const msgs = err.details.map((d: any) => `${d.field}: ${d.message}`);
        setError(msgs.join(' — '));
      } else {
        setError(err.message || 'Error al guardar el empleado');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando datos...</div>;
  }

  return (
    <div className="empleado-form-page animate-fade-in" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/empleados')} style={{ padding: '8px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
          {isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}
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
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Nombre *</label>
                <input required type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Apellido *</label>
                <input required type="text" name="apellido" value={formData.apellido} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>DNI *</label>
                <input required type="text" name="dni" value={formData.dni} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>CUIL *</label>
                <input required type="text" name="cuil" value={formData.cuil} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Legajo *</label>
                <input required type="text" name="legajo" value={formData.legajo} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Fecha Ingreso *</label>
                <input required type="date" name="fechaIngreso" value={formData.fechaIngreso} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Categoría Laboral *</label>
                <input required type="text" name="categoriaLaboral" value={formData.categoriaLaboral} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Convenio</label>
                <input type="text" name="convenio" value={formData.convenio} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', margin: '10px 0' }}></div>

            <h3 style={{ fontSize: '16px', margin: '0' }}>Horario y Jornada</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Tipo Jornada *</label>
                <select name="tipoJornada" value={formData.tipoJornada} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }}>
                  <option value="completa">Completa</option>
                  <option value="parcial">Parcial</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Horario Asignado *</label>
                <select name="horarioId" value={formData.horarioId} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }}>
                  <option value="0">Seleccione un horario...</option>
                  {horariosDisponibles.map(h => (
                    <option key={h.id} value={h.id}>{h.nombre} ({h.horaEntrada} - {h.horaSalida})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Modalidad de Fichada *</label>
                <select name="modalidadFichada" value={formData.modalidadFichada} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }}>
                  <option value="biometrico">Biométrico</option>
                  <option value="qr">QR</option>
                  <option value="pin">PIN</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Estado *</label>
                <select name="estado" value={formData.estado} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#f9f9f9', color: 'var(--text-h)' }}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 500 }}>Días de Descanso *</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => (
                  <label key={dia} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                    <input type="checkbox" checked={formData.diasDescanso?.includes(dia)} onChange={() => handleDiasDescanso(dia)} />
                    {dia.charAt(0).toUpperCase() + dia.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/empleados')} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || !formData.horarioId}>
                <Save size={16} /> {loading ? 'Guardando...' : 'Guardar Empleado'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
