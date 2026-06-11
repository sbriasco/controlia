import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import { reglaService } from '../../services/regla.service';
import type { ReglaEmpresa } from '../../types';

export const ReglasPage: React.FC = () => {
  const [reglas, setReglas] = useState<ReglaEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadReglas();
  }, []);

  const loadReglas = async () => {
    try {
      setLoading(true);
      const data = await reglaService.getAll();
      setReglas(data);
      
      const values: Record<string, string> = {};
      data.forEach(r => {
        values[r.clave] = r.valor;
      });
      setEditingValues(values);
      setError(null);
    } catch (err) {
      setError('Error al cargar reglas de configuración');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (clave: string, value: string) => {
    setEditingValues(prev => ({ ...prev, [clave]: value }));
  };

  const handleSave = async (clave: string) => {
    try {
      setSavingKeys(prev => ({ ...prev, [clave]: true }));
      await reglaService.update(clave, editingValues[clave]);
      
      // Update local state to reflect saved value
      setReglas(prev => prev.map(r => 
        r.clave === clave ? { ...r, valor: editingValues[clave] } : r
      ));
    } catch (err: any) {
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setSavingKeys(prev => ({ ...prev, [clave]: false }));
    }
  };

  const hasChanges = (clave: string) => {
    const original = reglas.find(r => r.clave === clave)?.valor;
    return original !== editingValues[clave];
  };

  if (loading) return <div className="loading-state">Cargando configuración...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reglas de Empresa</h1>
          <p className="page-description">Parametrización del motor de interpretación y reglas generales</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {reglas.map((regla) => {
          const isChanged = hasChanges(regla.clave);
          const isSaving = savingKeys[regla.clave];
          const isBoolean = regla.valor === 'true' || regla.valor === 'false';

          return (
            <div key={regla.id} className="stat-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ padding: '0.6rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <Settings size={22} className="text-slate-600" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>
                    {formatClave(regla.clave)}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.4' }}>
                    {regla.descripcion || 'Sin descripción'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                {isBoolean ? (
                  <select
                    className="form-select"
                    style={{ flex: 1, backgroundColor: isChanged ? '#fff' : '#f8fafc' }}
                    value={editingValues[regla.clave]}
                    onChange={(e) => handleValueChange(regla.clave, e.target.value)}
                  >
                    <option value="true">Activado</option>
                    <option value="false">Desactivado</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1, backgroundColor: isChanged ? '#fff' : '#f8fafc' }}
                    value={editingValues[regla.clave]}
                    onChange={(e) => handleValueChange(regla.clave, e.target.value)}
                  />
                )}
                
                <button 
                  className={`btn ${isChanged ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.5rem 1rem' }}
                  disabled={!isChanged || isSaving}
                  onClick={() => handleSave(regla.clave)}
                >
                  <Save size={16} />
                  <span style={{ fontSize: '0.9rem' }}>{isSaving ? 'Guardando...' : isChanged ? 'Guardar' : 'Guardado'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper para hacer las claves más legibles
function formatClave(clave: string) {
  return clave
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
