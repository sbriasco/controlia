import { describe, it, expect } from 'vitest';
import { InterpretationService } from '../interpretation.service';

describe('InterpretationService', () => {
  it('debe detectar una tardanza si la fichada de entrada es después del horario', () => {
    // Horario: 09:00, Fichada: 09:15
    const horario: any = { 
      horaentrada: new Date('1970-01-01T09:00:00Z'), 
      diassemana: '1,2,3,4,5' 
    };
    const fichada: any = { 
      timestamp: new Date('2026-05-09T09:15:00Z'), 
      tipo: 'entrada' 
    };
    
    const resultado = InterpretationService.checkTardanza(fichada, horario);
    
    expect(resultado).toBe(15); // 15 minutos de tardanza
  });

  it('debe retornar 0 si la fichada es exactamente a la hora o antes', () => {
    const horario: any = { 
      horaentrada: new Date('1970-01-01T09:00:00Z'), 
      diassemana: '1,2,3,4,5' 
    };
    const fichada: any = { 
      timestamp: new Date('2026-05-09T08:55:00Z'), 
      tipo: 'entrada' 
    };
    
    const resultado = InterpretationService.checkTardanza(fichada, horario);
    
    expect(resultado).toBe(0);
  });

  describe('checkAusencia', () => {
    it('debe detectar una ausencia si no hay fichada de entrada en un día laboral', () => {
      const isLaborable = true;
      const fichadas: any[] = []; // Sin fichadas
      
      const resultado = InterpretationService.checkAusencia(isLaborable, fichadas);
      
      expect(resultado).toBe(true);
    });

    it('no debe detectar ausencia si no es día laboral', () => {
      const isLaborable = false;
      const fichadas: any[] = [];
      
      const resultado = InterpretationService.checkAusencia(isLaborable, fichadas);
      
      expect(resultado).toBe(false);
    });

    it('no debe detectar ausencia si hay al menos una fichada de entrada', () => {
      const isLaborable = true;
      const fichadas: any[] = [
        { tipo: 'entrada', timestamp: new Date('2026-05-09T09:00:00Z') }
      ];
      
      const resultado = InterpretationService.checkAusencia(isLaborable, fichadas);
      
      expect(resultado).toBe(false);
    });
  });

  describe('checkHorasExtra', () => {
    it('debe detectar horas extra si la salida es después del horario + umbral', () => {
      const horario: any = { 
        horasalida: new Date('1970-01-01T18:00:00Z'),
        umbralhorasextra: 30 
      };
      // Salida: 19:45 (105 min extra)
      const fichada: any = { 
        timestamp: new Date('2026-05-09T19:45:00Z'), 
        tipo: 'salida' 
      };
      
      const resultado = InterpretationService.checkHorasExtra(fichada, horario);
      
      expect(resultado).toBe(105);
    });

    it('debe retornar 0 si las horas extra no superan el umbral', () => {
      const horario: any = {
        horasalida: new Date('1970-01-01T18:00:00Z'),
        umbralhorasextra: 30
      };
      // Salida: 18:20 (20 min extra, menor al umbral de 30)
      const fichada: any = {
        timestamp: new Date('2026-05-09T18:20:00Z'),
        tipo: 'salida'
      };

      const resultado = InterpretationService.checkHorasExtra(fichada, horario);

      expect(resultado).toBe(0);
    });
  });

  describe('jornada en feriado o domingo (recargo 100%)', () => {
    const horario: any = {
      horaentrada: new Date('1970-01-01T09:00:00Z'),
      horasalida: new Date('1970-01-01T18:00:00Z'),
      toleranciaentrada: 5,
      toleranciasalida: 5,
      descansoinicio: new Date('1970-01-01T13:00:00Z'),
      descansofin: new Date('1970-01-01T14:00:00Z'),
      minutosmindescanso: 60,
      umbralhorasextra: 15,
      diassemana: 'lunes,martes,miercoles,jueves,viernes',
    };
    const reglas: any = {
      doble_fichada_umbral_minutos: 5,
      salida_anticipada_tolerancia_minutos: 10,
      horas_extra_tipo_domingo_feriado: 100,
      horas_extra_tipo_habil: 50,
      descanso_no_tomado_habilitar: true,
      ausencia_auto_estado: 'pendiente',
    };

    it('cuenta TODO el tiempo trabajado en un feriado como horas extra al 100%', () => {
      // Jornada normal en un feriado: 08:55→13:00 (245) + 14:00→18:00 (240) = 485 min
      const fichadas: any[] = [
        { id: 1, tipo: 'entrada', timestamp: new Date('2026-06-15T08:55:00Z') },
        { id: 2, tipo: 'salida', timestamp: new Date('2026-06-15T13:00:00Z') },
        { id: 3, tipo: 'entrada', timestamp: new Date('2026-06-15T14:00:00Z') },
        { id: 4, tipo: 'salida', timestamp: new Date('2026-06-15T18:00:00Z') },
      ];

      const resultado = InterpretationService.analizarJornada(true, fichadas, horario, true, reglas);

      expect(resultado.horasExtra).toBe(485);
      expect(resultado.tipoHorasExtra).toBe('horas_extra_100');
      expect(resultado.feriadoTrabajado).toBe(true);
      // En jornada con recargo no se generan tardanza ni salida anticipada
      expect(resultado.tardanza).toBe(false);
      expect(resultado.salidaAnticipada).toBe(false);
    });

    it('no aplica recargo de feriado en un día hábil normal', () => {
      // Mismo turno pero NO es domingo/feriado: jornada justa, sin horas extra
      const fichadas: any[] = [
        { id: 1, tipo: 'entrada', timestamp: new Date('2026-06-16T08:55:00Z') },
        { id: 2, tipo: 'salida', timestamp: new Date('2026-06-16T13:00:00Z') },
        { id: 3, tipo: 'entrada', timestamp: new Date('2026-06-16T14:00:00Z') },
        { id: 4, tipo: 'salida', timestamp: new Date('2026-06-16T18:00:00Z') },
      ];

      const resultado = InterpretationService.analizarJornada(true, fichadas, horario, false, reglas);

      expect(resultado.horasExtra).toBe(0);
      expect(resultado.feriadoTrabajado).toBe(false);
    });
  });
});
