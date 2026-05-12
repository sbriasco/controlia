export class InterpretationService {
  /**
   * Convierte un Date a minutos del día en zona horaria de Argentina.
   */
  private static getMinutesInArgentina(date: Date): number {
    // Al usar el enfoque "local-as-UTC", los componentes UTC de la fecha 
    // ya contienen el horario local de Argentina que queremos procesar.
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

  /**
   * Calcula la tardanza en minutos comparando una fichada de entrada con el horario.
   */
  static checkTardanza(fichada: { timestamp: Date, tipo: string }, horario: { horaentrada: Date }): number {
    if (fichada.tipo !== 'entrada') return 0;

    const totalMinutes = this.getMinutesInArgentina(fichada.timestamp);
    const expectedTotalMinutes = this.getMinutesInArgentina(horario.horaentrada);

    const diff = totalMinutes - expectedTotalMinutes;
    
    return diff > 0 ? diff : 0;
  }

  /**
   * Determina si hay una ausencia.
   */
  static checkAusencia(isLaborable: boolean, fichadas: { tipo: string }[]): boolean {
    if (!isLaborable) return false;
    
    const hasEntrada = fichadas.some(f => f.tipo === 'entrada');
    return !hasEntrada;
  }

  /**
   * Calcula horas extra en minutos.
   */
  static checkHorasExtra(fichada: { timestamp: Date, tipo: string }, horario: { horasalida: Date, umbralhorasextra: number }): number {
    if (fichada.tipo !== 'salida') return 0;

    const totalMinutes = this.getMinutesInArgentina(fichada.timestamp);
    const expectedTotalMinutes = this.getMinutesInArgentina(horario.horasalida);

    const diff = totalMinutes - expectedTotalMinutes;
    
    // Solo se cuentan si superan el umbral configurado
    return diff >= horario.umbralhorasextra ? diff : 0;
  }

  /**
   * Analiza la jornada completa de un día y devuelve los resultados detectados.
   */
  static analizarJornada(isLaborable: boolean, fichadas: any[], horario: any) {
    const ausencia = this.checkAusencia(isLaborable, fichadas);
    
    let tardanza = false;
    let minutosTardanza = 0;
    let horasExtra = 0;

    if (!ausencia && isLaborable) {
      const entrada = fichadas.find(f => f.tipo === 'entrada');
      if (entrada) {
        minutosTardanza = this.checkTardanza(entrada, horario);
        if (minutosTardanza > (horario.toleranciaentrada || 0)) {
          tardanza = true;
        }
      }

      const salidas = fichadas.filter(f => f.tipo === 'salida');
      if (salidas.length > 0) {
        const ultimaSalida = salidas[salidas.length - 1];
        horasExtra = this.checkHorasExtra(ultimaSalida, horario);
      }
    }

    return {
      ausencia,
      tardanza,
      minutosTardanza,
      horasExtra
    };
  }
}
