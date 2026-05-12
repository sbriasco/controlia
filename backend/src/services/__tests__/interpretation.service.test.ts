import { describe, it, expect } from 'vitest';
import { InterpretationService } from '../interpretation.service';

describe('InterpretationService', () => {
  it('debe detectar una tardanza si la fichada de entrada es después del horario', () => {
    // Horario: 09:00, Fichada: 09:15
    const horario = { 
      horaentrada: new Date('1970-01-01T09:00:00Z'), 
      diassemana: '1,2,3,4,5' 
    };
    const fichada = { 
      timestamp: new Date('2026-05-09T09:15:00Z'), 
      tipo: 'entrada' 
    };
    
    const resultado = InterpretationService.checkTardanza(fichada, horario);
    
    expect(resultado).toBe(15); // 15 minutos de tardanza
  });

  it('debe retornar 0 si la fichada es exactamente a la hora o antes', () => {
    const horario = { 
      horaentrada: new Date('1970-01-01T09:00:00Z'), 
      diassemana: '1,2,3,4,5' 
    };
    const fichada = { 
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
      const fichadas = [
        { tipo: 'entrada', timestamp: new Date('2026-05-09T09:00:00Z') }
      ];
      
      const resultado = InterpretationService.checkAusencia(isLaborable, fichadas);
      
      expect(resultado).toBe(false);
    });
  });

  describe('checkHorasExtra', () => {
    it('debe detectar horas extra si la salida es después del horario + umbral', () => {
      const horario = { 
        horasalida: new Date('1970-01-01T18:00:00Z'),
        umbralhorasextra: 30 
      };
      // Salida: 19:45 (105 min extra)
      const fichada = { 
        timestamp: new Date('2026-05-09T19:45:00Z'), 
        tipo: 'salida' 
      };
      
      const resultado = InterpretationService.checkHorasExtra(fichada, horario);
      
      expect(resultado).toBe(105);
    });

    it('debe retornar 0 si las horas extra no superan el umbral', () => {
      const horario = { 
        horasalida: new Date('1970-01-01T18:00:00Z'),
        umbralhorasextra: 30 
      };
      // Salida: 18:20 (20 min extra, menor al umbral de 30)
      const fichada = { 
        timestamp: new Date('2026-05-09T18:20:00Z'), 
        tipo: 'salida' 
      };
      
      const resultado = InterpretationService.checkHorasExtra(fichada, horario);
      
      expect(resultado).toBe(0);
    });
  });
});
