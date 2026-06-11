import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { rotacionService } from '../../services/rotacion.service';
import type { Rotacion } from '../../types';

export function RotacionesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [rotaciones, setRotaciones] = useState<Rotacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRotaciones = async () => {
    try {
      setLoading(true);
      const data = await rotacionService.getAll();
      setRotaciones(data);
      setError(null);
    } catch (err: any) {
      setError('Error al obtener rotaciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRotaciones();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Seguro que querés eliminar esta rotación?')) return;
    try {
      await rotacionService.delete(id);
      setRotaciones(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert('No se pudo eliminar: ' + err.message);
    }
  };

  const filtered = rotaciones.filter(r => 
    r.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rotaciones-page animate-fade-in" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Rotaciones de Turnos</h2>
          <p style={{ color: 'var(--gris-texto)', fontSize: '14px', margin: '4px 0 0' }}>Administrá los ciclos de horarios rotativos.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', padding: '0 10px' }}>
            <Search size={16} color="#888" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', padding: '8px', outline: 'none' }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/rotaciones/nuevo')}>
            <Plus size={16} /> Nueva Rotación
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}

      {loading ? (
        <div>Cargando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {filtered.map(rotacion => (
            <div key={rotacion.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{rotacion.nombre}</h3>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/rotaciones/${rotacion.id}`)}>
                    <Edit size={16} />
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rojo)' }} onClick={() => handleDelete(rotacion.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '15px' }}>
                <div><strong>Ciclo:</strong> {rotacion.cicloSemanas} semanas</div>
                <div><strong>Fecha de inicio base:</strong> {new Date(rotacion.fechaInicio).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</div>
              </div>

              <div>
                <strong style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Turnos por semana</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                  {rotacion.turnos.map(turno => (
                    <div key={turno.semana} style={{ display: 'flex', justifyContent: 'space-between', background: '#f5f5f5', padding: '8px 10px', borderRadius: '4px', fontSize: '13px' }}>
                      <span>Semana {turno.semana}</span>
                      <strong style={{ color: 'var(--azul-principal)' }}>{turno.horarios?.nombre || 'Desconocido'}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#888' }}>
              No se encontraron rotaciones.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
