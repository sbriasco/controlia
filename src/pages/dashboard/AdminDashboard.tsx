import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Clock, AlertTriangle, TrendingUp,
  UserPlus, ClipboardList, FileBarChart, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { empleadoService } from '../../services/empleado.service';
import { novedadService } from '../../services/novedad.service';
import { fichadaService } from '../../services/fichada.service';
import { getHorarioForDate } from '../../utils/rotacion';
import type { Empleado, Fichada, Novedad } from '../../types';

export function AdminDashboard() {
  const navigate = useNavigate();

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [novedadesReal, setNovedadesReal] = useState<Novedad[]>([]);
  const [fichadasReal, setFichadasReal] = useState<Fichada[]>([]);

  const getFichadasVersion = () => localStorage.getItem('fichadasVersion') || '0';
  const getEmpleadosVersion = () => localStorage.getItem('empleadosVersion') || '0';
  const getHorariosVersion = () => localStorage.getItem('horariosVersion') || '0';
  const getInterpretationVersionKey = (periodo: string) => `dashboardInterpretationVersion:${periodo}`;

  // Función auxiliar para obtener fecha de hoy en formato local YYYY-MM-DD
  const getTodayDateString = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  };

  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Función para obtener empleados que trabajan un día específico y ya ingresaron en esa fecha
  const getEmpleadosQueTrabajan = (diaDeLaSemana: number, fecha: string): Empleado[] => {
    const fechaConsulta = parseLocalDate(fecha);
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const nombreDia = dayNames[diaDeLaSemana];

    return empleados.filter(e => {
      if (e.estado !== 'activo') return false;
      const horarioActivo = getHorarioForDate(e, fecha);
      if (!horarioActivo) return false;
      
      const matchHiringDate = !e.fechaIngreso || parseLocalDate(e.fechaIngreso.substring(0, 10)) <= fechaConsulta;
      return horarioActivo.diasSemana.includes(nombreDia) && matchHiringDate;
    });
  };

  const getLocalDateStringFromTimestamp = (timestamp: string): string => {
    // Al usar local-as-UTC, extraemos los componentes UTC para obtener la fecha "local" original
    const d = new Date(timestamp);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const emps = await empleadoService.getAll();
        setEmpleados(emps);

        // Solo reprocesar interpretación si hubo cambios de fichadas.
        const hoy = getTodayDateString();
        const primerDiaMes = hoy.substring(0, 7) + '-01';
        const periodo = hoy.substring(0, 7);
        const versionActual = getFichadasVersion();
        const empleadosVersionActual = getEmpleadosVersion();
        const horariosVersionActual = getHorariosVersion();
        const interpretationVersionKey = getInterpretationVersionKey(periodo);
        const versionProcesada = localStorage.getItem(interpretationVersionKey) || '';
        // Agregamos 'hoy' a la versión compuesta para forzar el recálculo cuando cambia de día
        const versionCompuestaActual = `${versionActual}|${empleadosVersionActual}|${horariosVersionActual}|${hoy}`;
        
        const activos = emps.filter(e => e.estado === 'activo');
        if (versionCompuestaActual !== versionProcesada) {
          await Promise.all(activos.map(e => 
            novedadService.processInterpretation(e.id, primerDiaMes, hoy)
          ));
          localStorage.setItem(interpretationVersionKey, versionCompuestaActual);
        }

        // Obtener fichadas reales para calcular presentes
        const fichadas = await fichadaService.getAll();
        setFichadasReal(fichadas);
        
        const novs = await novedadService.getAll({ periodo });
        
        // Filtrar novedades para que solo incluyan empleados activos
        const novedadesActivos = novs.filter(n => 
          emps.some(e => e.id === n.empleadoId && e.estado === 'activo')
        );
        setNovedadesReal(novedadesActivos);
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        // Intentionally left blank.
      }
    };

    loadData();

    const onFichadasChanged = () => {
      loadData();
    };

    const onEmpleadosChanged = () => {
      loadData();
    };

    const onHorariosChanged = () => {
      loadData();
    };

    window.addEventListener('fichadas:changed', onFichadasChanged as EventListener);
    window.addEventListener('empleados:changed', onEmpleadosChanged as EventListener);
    window.addEventListener('horarios:changed', onHorariosChanged as EventListener);
    return () => {
      window.removeEventListener('fichadas:changed', onFichadasChanged as EventListener);
      window.removeEventListener('empleados:changed', onEmpleadosChanged as EventListener);
      window.removeEventListener('horarios:changed', onHorariosChanged as EventListener);
    };
  }, []);

  const activeEmployees = empleados.filter((e) => e.estado === 'activo').length;
  const pendingNovedades = novedadesReal.filter((n) => n.estado === 'pendiente').length;
  
  const hoy = getTodayDateString();
  const hoyComo_dayOfWeek = new Date().getDay();
  const empleadosTrabajandoHoy = getEmpleadosQueTrabajan(hoyComo_dayOfWeek, hoy);

  const tardanzasToday = new Set(
    novedadesReal
      .filter(n => 
        n.fechas.includes(hoy) && 
        n.tipo === 'tardanza' &&
        empleadosTrabajandoHoy.some(e => e.id === n.empleadoId)
      )
      .map(n => n.empleadoId)
  ).size;

  // Calcular tardanzas de ayer para comparar
  const ayerDate = new Date();
  ayerDate.setDate(ayerDate.getDate() - 1);
  const ayer = `${ayerDate.getFullYear()}-${String(ayerDate.getMonth() + 1).padStart(2, '0')}-${String(ayerDate.getDate()).padStart(2, '0')}`;
  const ayerDayOfWeek = ayerDate.getDay();
  const empleadosTrabajandoAyer = getEmpleadosQueTrabajan(ayerDayOfWeek, ayer);
  const tardanzasYesterday = new Set(
    novedadesReal
      .filter(n => 
        n.fechas.includes(ayer) && 
        n.tipo === 'tardanza' &&
        empleadosTrabajandoAyer.some(e => e.id === n.empleadoId)
      )
      .map(n => n.empleadoId)
  ).size;
  const tardanzasDiff = tardanzasToday - tardanzasYesterday;
  // Tipos de novedades para el gráfico
  const licenciaTipos = ['licencia_enfermedad', 'licencia_examen', 'vacaciones', 'suspension', 'permiso_especial'];
  const counts = {
    tardanzas: novedadesReal.filter(n => n.tipo === 'tardanza').length,
    extras: novedadesReal.filter(n => n.tipo.startsWith('horas_extra')).length,
    ausencias: novedadesReal.filter(n => n.tipo.startsWith('ausencia')).length,
    licencias: novedadesReal.filter(n => licenciaTipos.includes(n.tipo)).length,
  };

  const dynamicNovedadesPorTipo = [
    { name: 'Tardanzas', value: counts.tardanzas, color: '#F59E0B' },
    { name: 'Horas Extra', value: counts.extras, color: '#17BEBB' },
    { name: 'Ausencias', value: counts.ausencias, color: '#EF4444' },
    { name: 'Licencias', value: counts.licencias, color: '#2563EB' },
  ];

  // Presentes: empleados que registraron una ENTRADA hoy y estaban asignados a trabajar hoy.
  const presentToday = new Set(
    fichadasReal
      .filter(f => f.tipo === 'entrada' && getLocalDateStringFromTimestamp(f.timestamp) === hoy)
      .filter(f => empleadosTrabajandoHoy.some(e => e.id === f.empleadoId))
      .map(f => f.empleadoId)
  ).size;

  // Calcular datos para el gráfico de los últimos 7 días móviles (Hoy a la derecha)
  const getRollingLast7Days = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      // i=6 es hoy, i=0 es hace 6 días
      d.setDate(d.getDate() - (6 - i));
      
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');
      const dayOfWeekNum = d.getDay();
      
      // Obtener solo empleados que trabajan ese día
      const empleadosDelDia = getEmpleadosQueTrabajan(dayOfWeekNum, dStr);
      const novsDia = novedadesReal.filter(n => n.fechas.includes(dStr));
      
      const ausentesList = novsDia
        .filter(n => 
          n.tipo.startsWith('ausencia') && 
          empleadosDelDia.some(e => e.id === n.empleadoId)
        )
        .map(n => n.empleadoId);

      const ausentes = new Set(ausentesList).size;
      
      // Presentes: empleados con al menos una entrada registrada ese día y asignados a trabajar.
      const presentes = new Set(
        fichadasReal
          .filter(f => f.tipo === 'entrada' && getLocalDateStringFromTimestamp(f.timestamp) === dStr)
          .filter(f => empleadosDelDia.some(e => e.id === f.empleadoId))
          .map(f => f.empleadoId)
      ).size;

      const tardanzas = new Set(
        novsDia
          .filter(n =>
            n.tipo === 'tardanza' &&
            empleadosDelDia.some(e => e.id === n.empleadoId)
          )
          .map(n => n.empleadoId)
      ).size;
      
      return {
        day: i === 6 ? 'Hoy' : dayName.charAt(0).toUpperCase() + dayName.slice(1),
        presentes,
        ausentes,
        tardanzas,
        totalEmpleados: empleadosDelDia.length,
      };
    });
  };

  // Componente personalizado para el tooltip
  const CustomTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{data.day}</p>
          <p style={{ margin: '4px 0', color: '#10B981' }}>Presentes: {data.presentes} de {data.totalEmpleados}</p>
          <p style={{ margin: '4px 0', color: '#EF4444' }}>Ausentes: {data.ausentes}</p>
          <p style={{ margin: '4px 0', color: '#F59E0B' }}>Tardanzas: {data.tardanzas}</p>
        </div>
      );
    }
    return null;
  };

  const last7Days = getRollingLast7Days();

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <h2>Buenos días, Administrador 👋</h2>
        <p>Resumen del estado actual del sistema</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" id="stat-empleados">
          <div className="stat-icon blue"><Users size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Empleados Activos</span>
            <span className="stat-value">{activeEmployees}</span>

          </div>
        </div>
        <div className="stat-card" id="stat-presentes">
          <div className="stat-icon green"><Clock size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Presentes Hoy</span>
            <span className="stat-value">{presentToday}</span>
            <span className="stat-change up">de {empleadosTrabajandoHoy.length} que trabajan hoy</span>
          </div>
        </div>
        <div className="stat-card" id="stat-tardanzas">
          <div className="stat-icon yellow"><AlertTriangle size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Tardanzas Hoy</span>
            <span className="stat-value">{tardanzasToday}</span>
            {tardanzasDiff !== 0 && (
              <span className={`stat-change ${tardanzasDiff > 0 ? 'down' : 'up'}`}>
                {tardanzasDiff > 0 ? `+${tardanzasDiff}` : tardanzasDiff} vs ayer
              </span>
            )}
            {tardanzasDiff === 0 && tardanzasToday > 0 && (
              <span className="stat-change">igual que ayer</span>
            )}
          </div>
        </div>
        <div className="stat-card" id="stat-novedades">
          <div className="stat-icon red"><TrendingUp size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Nov. Pendientes</span>
            <span className="stat-value">{pendingNovedades}</span>
            <span className="stat-change down">requieren revisión</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="quick-action" onClick={() => navigate('/empleados/nuevo')} id="qa-nuevo-empleado">
          <div className="quick-action-icon" style={{ background: 'var(--azul-principal-light)', color: 'var(--azul-principal)' }}>
            <UserPlus size={18} />
          </div>
          Nuevo Empleado
        </button>
        <button className="quick-action" onClick={() => navigate('/fichadas')} id="qa-fichadas">
          <div className="quick-action-icon" style={{ background: 'var(--verde-light)', color: 'var(--verde)' }}>
            <Clock size={18} />
          </div>
          Ver Fichadas
        </button>
        <button className="quick-action" onClick={() => navigate('/novedades')} id="qa-novedades">
          <div className="quick-action-icon" style={{ background: 'var(--amarillo-light)', color: 'var(--amarillo)' }}>
            <ClipboardList size={18} />
          </div>
          Gestionar Novedades
        </button>
        <button className="quick-action" onClick={() => navigate('/cierre')} id="qa-cierre">
          <div className="quick-action-icon" style={{ background: 'var(--turquesa-light)', color: 'var(--turquesa)' }}>
            <FileBarChart size={18} />
          </div>
          Cierre Mensual
        </button>
      </div>

      {/* Charts row */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Asistencia Semanal</h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    allowDecimals={false}
                    domain={[0, 'dataMax']}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC' }}
                    content={<CustomTooltip />}
                  />
                  <Bar 
                    dataKey="presentes" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]} 
                    name="Presentes"
                    barSize={20}
                  />
                  <Bar 
                    dataKey="tardanzas" 
                    fill="#F59E0B" 
                    radius={[4, 4, 0, 0]} 
                    name="Tardanzas"
                    barSize={20}
                  />
                  <Bar 
                    dataKey="ausentes" 
                    fill="#EF4444" 
                    radius={[4, 4, 0, 0]} 
                    name="Ausentes"
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Novedades por Tipo</h3>
          </div>
          <div className="card-body">
            <div className="chart-container" style={{ display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={dynamicNovedadesPorTipo}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {dynamicNovedadesPorTipo.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dynamicNovedadesPorTipo.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                    <span style={{ color: '#64748B' }}>{item.name}</span>
                    <span style={{ fontWeight: 600, marginLeft: 'auto' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actividad Reciente — fichadas reales */}
      <div className="dashboard-section" style={{ marginTop: 'var(--space-8)' }}>
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">Actividad Reciente</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/fichadas')}>
            Ver todo <ArrowRight size={14} />
          </button>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="activity-list">
              {fichadasReal
                .filter(f => getLocalDateStringFromTimestamp(f.timestamp) === hoy)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5)
                .map((f) => {
                  const emp = empleados.find(e => e.id === f.empleadoId);
                  const hora = new Date(f.timestamp).toISOString().slice(11, 16);
                  const nombre = emp ? `${emp.nombre} ${emp.apellido}` : `Empleado #${f.empleadoId}`;
                  return (
                    <div className="activity-item" key={f.id}>
                      <div className={`activity-dot ${f.tipo === 'entrada' ? 'green' : 'blue'}`} />
                      <div className="activity-content">
                        <div className="activity-text">
                          {nombre} — {f.tipo === 'entrada' ? 'entrada' : 'salida'} a las {hora}
                        </div>
                        <div className="activity-time">{f.origen}</div>
                      </div>
                    </div>
                  );
                })}
              {fichadasReal.filter(f => getLocalDateStringFromTimestamp(f.timestamp) === hoy).length === 0 && (
                <div style={{ padding: '16px', color: 'var(--gris-texto)', textAlign: 'center' }}>
                  Sin fichadas registradas hoy.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
