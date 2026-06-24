import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, DownloadCloud, Loader2 } from 'lucide-react';
import { feriadoService } from '../../services/feriado.service';
import type { Feriado } from '../../types';

export const FeriadosPage: React.FC = () => {
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeriado, setEditingFeriado] = useState<Feriado | null>(null);
  
  const [formData, setFormData] = useState({
    fecha: '',
    descripcion: '',
    tipo: 'nacional'
  });

  const [anioFiltro, setAnioFiltro] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadFeriados();
  }, [anioFiltro]);

  const loadFeriados = async () => {
    try {
      setLoading(true);
      const data = await feriadoService.getAll(anioFiltro);
      setFeriados(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar feriados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportarFeriadosAr = async () => {
    if (!window.confirm(`¿Quieres importar los feriados nacionales de Argentina para el año ${anioFiltro}?`)) return;
    try {
      setImporting(true);
      const res = await feriadoService.importar(anioFiltro);
      alert(`Se importaron ${res.importedCount} feriados nuevos.`);
      loadFeriados();
    } catch (err: any) {
      alert(err.message || 'Error al importar feriados');
    } finally {
      setImporting(false);
    }
  };

  const handleOpenModal = (feriado?: Feriado) => {
    if (feriado) {
      setEditingFeriado(feriado);
      setFormData({
        fecha: feriado.fecha,
        descripcion: feriado.descripcion,
        tipo: feriado.tipo
      });
    } else {
      setEditingFeriado(null);
      setFormData({
        fecha: '',
        descripcion: '',
        tipo: 'nacional'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFeriado) {
        await feriadoService.update(editingFeriado.id, formData as Partial<Feriado>);
      } else {
        await feriadoService.create(formData as any);
      }
      setIsModalOpen(false);
      loadFeriados();
    } catch (err: any) {
      alert(err.message || 'Error al guardar el feriado');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este feriado?')) {
      try {
        await feriadoService.delete(id);
        loadFeriados();
      } catch (err) {
        alert('Error al eliminar');
      }
    }
  };

  if (loading) return <div className="loading-state">Cargando feriados...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Feriados</h1>
          <p className="page-description">Gestión de feriados y días no laborables</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            className="form-select"
            value={anioFiltro}
            onChange={(e) => setAnioFiltro(Number(e.target.value))}
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
          <button className="btn btn-outline" onClick={handleImportarFeriadosAr} disabled={importing}>
            {importing ? <Loader2 size={20} className="animate-spin" /> : <DownloadCloud size={20} />}
            <span>Importar AR</span>
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={20} />
            <span>Nuevo Feriado</span>
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {feriados.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center" style={{ padding: '2rem' }}>
                  No hay feriados cargados para este año
                </td>
              </tr>
            ) : (
              feriados.map((feriado) => (
                <tr key={feriado.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={16} className="text-gray-400" />
                      {feriado.fecha}
                    </div>
                  </td>
                  <td>{feriado.descripcion}</td>
                  <td>
                    <span className={`status-badge ${feriado.tipo === 'nacional' ? 'status-aprobada' : feriado.tipo === 'provincial' ? 'status-pendiente' : 'status-rechazada'}`}>
                      {feriado.tipo}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ color: 'var(--azul-principal)', minWidth: 'auto', padding: '4px 8px', height: '32px' }}
                        title="Editar"
                        onClick={() => handleOpenModal(feriado)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ color: 'var(--rojo)', minWidth: 'auto', padding: '4px 8px', height: '32px' }}
                        title="Eliminar"
                        onClick={() => handleDelete(feriado.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingFeriado ? 'Editar Feriado' : 'Nuevo Feriado'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Descripción</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="Ej: Día del Trabajador"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-select"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  >
                    <option value="nacional">Nacional</option>
                    <option value="provincial">Provincial</option>
                    <option value="empresa">Día de la Empresa</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingFeriado ? 'Guardar Cambios' : 'Crear Feriado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
