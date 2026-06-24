import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import { reglaService } from '../../services/regla.service';
import type { ReglaEmpresa } from '../../types';

interface RuleMetadata {
  title: string;
  description: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
}

const REGLAS_METADATA: Record<string, RuleMetadata> = {
  ausencia_auto_estado: {
    title: 'Estado de Ausencias Automáticas',
    description: 'Determina el estado inicial asignado a las ausencias que el motor de horarios detecta automáticamente. Se sugiere "Pendiente" para que debas revisarlas y justificarlas.',
    type: 'select',
    options: [
      { value: 'pendiente', label: 'Pendiente de Justificación' },
      { value: 'justificada', label: 'Justificada' },
      { value: 'injustificada', label: 'Injustificada' }
    ]
  },
  descanso_no_tomado_habilitar: {
    title: 'Detección de Descansos Omitidos',
    description: 'Analiza si los empleados omitieron registrar su descanso reglamentario y genera una novedad de advertencia en el cierre mensual.',
    type: 'select',
    options: [
      { value: 'true', label: 'Habilitado' },
      { value: 'false', label: 'Deshabilitado' }
    ]
  },
  doble_fichada_umbral_minutos: {
    title: 'Umbral de Doble Fichada (Minutos)',
    description: 'Intervalo mínimo de tiempo requerido entre dos registros idénticos seguidos para que el sistema descarte el segundo como un duplicado accidental (ej. doble clic).',
    type: 'number'
  },
  horas_extra_tipo_domingo_feriado: {
    title: 'Recargo en Domingos y Feriados (%)',
    description: 'Porcentaje de recargo salarial aplicado a las horas extraordinarias trabajadas durante días feriados nacionales, provinciales o domingos (típicamente 100%).',
    type: 'number'
  },
  horas_extra_tipo_habil: {
    title: 'Recargo en Días Hábiles (%)',
    description: 'Porcentaje de recargo salarial aplicado a las horas extraordinarias acumuladas durante días laborables hábiles de lunes a sábados (típicamente 50%).',
    type: 'number'
  },
  salida_anticipada_tolerancia_minutos: {
    title: 'Tolerancia de Salida Anticipada (Minutos)',
    description: 'Margen de minutos permitidos para fichar la salida antes del fin del turno establecido sin que se catalogue o penalice como una retirada anticipada.',
    type: 'number'
  }
};

export const ReglasPage: React.FC = () => {
  const [reglas, setReglas] = useState<ReglaEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

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
      showToast('Configuración guardada correctamente.', 'success');
    } catch (err: any) {
      showToast(`Error al guardar: ${err.message}`, 'error');
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
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reglas de Empresa</h1>
          <p className="page-description">Parametrización del motor de interpretación y reglas generales de asistencia</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {reglas.map((regla) => {
          const isChanged = hasChanges(regla.clave);
          const isSaving = savingKeys[regla.clave];
          const meta = REGLAS_METADATA[regla.clave];
          const isBoolean = regla.valor === 'true' || regla.valor === 'false';

          const title = meta?.title || regla.clave.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const description = meta?.description || regla.descripcion || 'Sin descripción';

          return (
            <div key={regla.id} className="stat-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ padding: '0.6rem', background: 'var(--azul-principal-light)', borderRadius: '10px', color: 'var(--azul-principal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--azul-profundo)', marginBottom: '0.25rem' }}>
                    {title}
                  </h3>
                  <p style={{ color: 'var(--gris-texto)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                    {description}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--gris-claro)' }}>
                {meta?.type === 'select' || isBoolean ? (
                  <select
                    className="form-select"
                    style={{ flex: 1, backgroundColor: isChanged ? '#fff' : 'var(--gris-muy-claro)' }}
                    value={editingValues[regla.clave]}
                    onChange={(e) => handleValueChange(regla.clave, e.target.value)}
                  >
                    {meta?.options ? (
                      meta.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))
                    ) : (
                      <>
                        <option value="true">Activado</option>
                        <option value="false">Desactivado</option>
                      </>
                    )}
                  </select>
                ) : (
                  <input
                    type={meta?.type === 'number' ? 'number' : 'text'}
                    min={meta?.type === 'number' ? 0 : undefined}
                    className="form-input"
                    style={{ flex: 1, backgroundColor: isChanged ? '#fff' : 'var(--gris-muy-claro)' }}
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

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? (
              <CheckCircle size={18} style={{ color: 'var(--verde)' }} />
            ) : (
              <AlertTriangle size={18} style={{ color: 'var(--rojo)' }} />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
