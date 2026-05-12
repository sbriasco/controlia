import { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut as LogOutIcon, Clock, CalendarDays, AlertCircle, Loader2 } from 'lucide-react';
import { novedades } from '../../data/novedades'; // V2 mock - se reemplaza en V3
import { useAuth } from '../../context/AuthContext';
import { empleadoService } from '../../services/empleado.service';
import { horarioService } from '../../services/horario.service';
import { fichadaService } from '../../services/fichada.service';
import { novedadService } from '../../services/novedad.service';
import type { Empleado, Horario, Fichada, Novedad } from '../../types';

// ID del empleado demo (María Gómez = 2). En V3 vendrá del AuthContext real.
const EMPLEADO_DEMO_ID = 2;

export function EmpleadoDashboard() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [fichandoTipo, setFichandoTipo] = useState<'entrada' | 'salida' | null>(null);

  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [horario, setHorario] = useState<Horario | null>(null);
  const [myFichadas, setMyFichadas] = useState<Fichada[]>([]);
  const [myNovedades, setMyNovedades] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [fichadaError, setFichadaError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchFichadas = useCallback(async (empleadoId: number) => {
    const data = await fichadaService.getAll({ empleadoId });
    const sorted = [...data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setMyFichadas(sorted.slice(0, 8));
    // Determinar si el último registro fue una entrada (= está fichado)
    if (sorted.length > 0) {
      setIsClockedIn(sorted[0].tipo === 'entrada');
    } else {
      setIsClockedIn(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentEmpleadoId = user?.id ?? EMPLEADO_DEMO_ID;
        const [emp] = await Promise.all([empleadoService.getById(currentEmpleadoId)]);
        setEmpleado(emp);
        if (emp.horarioId) {
          const hor = await horarioService.getById(emp.horarioId);
          setHorario(hor);
        }
        await fetchFichadas(currentEmpleadoId);

        // Cargar novedades reales
        const hoy = new Date().toISOString().split('T')[0];
        const periodoActual = hoy.substring(0, 7);
        const primerDiaMes = periodoActual + '-01';

        // Ejecutar interpretación demo para el empleado actual
        await novedadService.processInterpretation(currentEmpleadoId, primerDiaMes, hoy);
        
        const novs = await novedadService.getAll({ 
          empleadoId: currentEmpleadoId, 
          periodo: periodoActual 
        });
        setMyNovedades(novs);

      } catch (err) {
        console.error('Error al cargar empleado:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchFichadas, user]);

  const timeStr = currentTime.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateStr = currentTime.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Ya no usamos el placeholder local
  // const myNovedadesMock = novedades
  //   .filter((n) => n.empleadoId === 2 && n.periodo === '2026-04')
  //   .slice(0, 5);

  const handleFichar = async (tipo: 'entrada' | 'salida') => {
    setFichandoTipo(tipo);
    setFichadaError(null);
    try {
      // Para mantener el enfoque local-as-UTC, enviamos la hora local actual 
      // pero con el sufijo Z para que se guarde tal cual en la DB sin desplazamientos.
      const d = new Date();
      const localTimestamp = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();

      const currentEmpleadoId = user?.id ?? EMPLEADO_DEMO_ID;
      await fichadaService.create({
        empleadoId: currentEmpleadoId,
        timestamp: localTimestamp,
        tipo,
        origen: 'manual',
      });
      await fetchFichadas(currentEmpleadoId); // Recargar lista actualizada
    } catch (err: any) {
      setFichadaError('No se pudo registrar la fichada. Intentá de nuevo.');
      console.error(err);
    } finally {
      setFichandoTipo(null);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Cargando panel...</div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <h2>Hola, {empleado ? empleado.nombre.split(' ')[0] : 'Empleado'} 👋</h2>
        <p>{horario ? `${horario.nombre} (${horario.horaEntrada} a ${horario.horaSalida})` : 'Sin horario asignado'}</p>
      </div>

      <div className="grid-2">
        {/* Clock Widget */}
        <div className="card">
          <div className="card-body">
            <div className="clock-widget">
              <div className="clock-time">{timeStr}</div>
              <div className="clock-date">{dateStr}</div>
              <div className={`clock-status ${isClockedIn ? 'in' : 'out'}`}>
                <Clock size={14} />
                {isClockedIn ? 'Dentro del turno — fichada de entrada registrada' : 'Sin fichar — registrá tu entrada'}
              </div>
              {fichadaError && (
                <div style={{ color: 'var(--rojo)', fontSize: '13px', textAlign: 'center', marginTop: '4px' }}>
                  {fichadaError}
                </div>
              )}
              <div className="clock-buttons">
                <button
                  className="clock-btn entrada"
                  disabled={isClockedIn || fichandoTipo !== null}
                  onClick={() => handleFichar('entrada')}
                  id="btn-fichar-entrada"
                >
                  {fichandoTipo === 'entrada'
                    ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Fichando...</>
                    : <><LogIn size={20} /> Entrada</>
                  }
                </button>
                <button
                  className="clock-btn salida"
                  disabled={!isClockedIn || fichandoTipo !== null}
                  onClick={() => handleFichar('salida')}
                  id="btn-fichar-salida"
                >
                  {fichandoTipo === 'salida'
                    ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Fichando...</>
                    : <><LogOutIcon size={20} /> Salida</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* My Schedule */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Mi Horario</h3>
            <CalendarDays size={18} style={{ color: 'var(--gris-texto)' }} />
          </div>
          <div className="card-body">
            {horario ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--gris-muy-claro)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--gris-texto)', fontSize: '14px' }}>Turno</span>
                  <span style={{ fontWeight: 600 }}>{horario.nombre}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--gris-muy-claro)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--gris-texto)', fontSize: '14px' }}>Horario</span>
                  <span style={{ fontWeight: 600 }}>{horario.horaEntrada} — {horario.horaSalida}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--gris-muy-claro)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--gris-texto)', fontSize: '14px' }}>Descanso</span>
                  <span style={{ fontWeight: 600 }}>{horario.descansoInicio ? `${horario.descansoInicio} — ${horario.descansoFin}` : 'Sin descanso'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--gris-muy-claro)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--gris-texto)', fontSize: '14px' }}>Días laborales</span>
                  <span style={{ fontWeight: 600 }}>{horario.diasSemana.length > 0 ? horario.diasSemana.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ') : 'Ninguno'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--gris-muy-claro)', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--gris-texto)', fontSize: '14px' }}>Tolerancia</span>
                  <span style={{ fontWeight: 600 }}>{horario.toleranciaEntrada} min</span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', color: 'var(--gris-texto)' }}>No tienes un horario asignado actualmente.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Fichadas */}
      <div className="dashboard-section" style={{ marginTop: '32px' }}>
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">Mis Últimas Fichadas</h3>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {myFichadas.map((f) => {
                    const d = new Date(f.timestamp);
                    return (
                      <tr key={f.id}>
                        <td>{d.toISOString().split('T')[0].split('-').reverse().join('/')}</td>
                        <td style={{ fontWeight: 600 }}>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* My Novedades */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">Mis Novedades del Período</h3>
        </div>
        <div className="card">
          <div className="card-body">
            {myNovedades.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><AlertCircle size={28} /></div>
                <div className="empty-state-title">Sin novedades</div>
                <div className="empty-state-text">No tenés novedades registradas en este período.</div>
              </div>
            ) : (
              <div className="activity-list">
                {myNovedades.map((n) => (
                  <div className="activity-item" key={n.id}>
                    <div className={`activity-dot ${n.tipo.includes('tardanza') ? 'yellow' :
                        n.tipo.includes('ausencia') ? 'red' :
                          n.tipo.includes('horas_extra') ? 'teal' : 'blue'
                      }`} />
                    <div className="activity-content">
                      <div className="activity-text">
                        {n.observacion}
                      </div>
                      <div className="activity-time">
                        {n.fechas[0]} · <span className={`badge badge-${n.estado}`}>{n.estado}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
