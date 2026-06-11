/**
 * Motor de Interpretación V4 — Controlia
 * 
 * Este servicio contiene la lógica pura del motor de reglas.
 * Recibe datos crudos (fichadas, horario, configuración) y retorna
 * el resultado de la interpretación sin efectos secundarios.
 * 
 * Las fichadas son inmutables (dato crudo). Este servicio genera
 * interpretaciones que se persisten como novedades.
 */

interface FichadaRaw {
  id: number;
  tipo: string;
  timestamp: Date;
}

interface HorarioData {
  horaentrada: Date;
  horasalida: Date;
  toleranciaentrada: number;
  toleranciasalida: number;
  descansoinicio: Date | null;
  descansofin: Date | null;
  minutosmindescanso: number;
  umbralhorasextra: number;
  diassemana: string;
}

export interface DobleFichadaDetectada {
  tipo: string;
  timestamps: string[];
}

export interface ResultadoJornada {
  ausencia: boolean;
  tardanza: boolean;
  minutosTardanza: number;
  horasExtra: number;
  tipoHorasExtra: 'horas_extra_50' | 'horas_extra_100';
  salidaAnticipada: boolean;
  minutosSalidaAnticipada: number;
  dobleFichadas: DobleFichadaDetectada[];
  descansoNoTomado: boolean;
}

export interface ReglasConfig {
  doble_fichada_umbral_minutos: number;
  salida_anticipada_tolerancia_minutos: number;
  horas_extra_tipo_domingo_feriado: number;
  horas_extra_tipo_habil: number;
  descanso_no_tomado_habilitar: boolean;
  ausencia_auto_estado: string;
}

export class InterpretationService {

  /**
   * Convierte un Date (almacenado como local-as-UTC) a minutos del día.
   */
  static getMinutesInArgentina(date: Date): number {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

  /**
   * Detecta tardanza: diferencia entre la primera entrada y la hora de entrada esperada.
   * Solo se marca como tardanza si supera la tolerancia configurada en el horario.
   */
  static checkTardanza(fichada: FichadaRaw, horario: HorarioData): number {
    if (fichada.tipo !== 'entrada') return 0;
    const fichadaMin = this.getMinutesInArgentina(fichada.timestamp);
    const entradaMin = this.getMinutesInArgentina(horario.horaentrada);
    const diff = fichadaMin - entradaMin;
    return diff > 0 ? diff : 0;
  }

  /**
   * Detecta ausencia: día laborable sin fichada de entrada.
   */
  static checkAusencia(isLaborable: boolean, fichadas: FichadaRaw[]): boolean {
    if (!isLaborable) return false;
    return !fichadas.some(f => f.tipo === 'entrada');
  }

  /**
   * Detecta horas extra: diferencia entre la última salida y la hora de salida esperada.
   * Solo cuenta si supera el umbral configurado en el horario.
   * Retorna los minutos extra (0 si no aplica).
   */
  static checkHorasExtra(fichada: FichadaRaw, horario: HorarioData): number {
    if (fichada.tipo !== 'salida') return 0;
    const fichadaMin = this.getMinutesInArgentina(fichada.timestamp);
    const salidaMin = this.getMinutesInArgentina(horario.horasalida);
    const diff = fichadaMin - salidaMin;
    if (diff >= horario.umbralhorasextra) {
      return diff;
    }
    return 0;
  }

  /**
   * Detecta salida anticipada: el empleado se fue antes de lo esperado.
   * Se considera salida anticipada si la salida fue antes de (horaSalida - toleranciaSalida).
   */
  static checkSalidaAnticipada(fichada: FichadaRaw, horario: HorarioData): number {
    if (fichada.tipo !== 'salida') return 0;
    const fichadaMin = this.getMinutesInArgentina(fichada.timestamp);
    const salidaMin = this.getMinutesInArgentina(horario.horasalida);
    const tolerancia = horario.toleranciasalida || 0;
    const limiteAnticipado = salidaMin - tolerancia;
    
    if (fichadaMin < limiteAnticipado) {
      return limiteAnticipado - fichadaMin;
    }
    return 0;
  }

  /**
   * Detecta dobles fichadas: dos marcas del mismo tipo en un período corto.
   * Ej: dos entradas seguidas sin salida intermedia, o dos fichadas del mismo tipo
   * dentro de un umbral de minutos configurable.
   */
  static checkDobleFichadas(fichadas: FichadaRaw[], umbralMinutos: number): DobleFichadaDetectada[] {
    const duplicados: DobleFichadaDetectada[] = [];
    
    for (let i = 0; i < fichadas.length - 1; i++) {
      const current = fichadas[i];
      const next = fichadas[i + 1];
      
      if (current.tipo === next.tipo) {
        const diffMs = Math.abs(next.timestamp.getTime() - current.timestamp.getTime());
        const diffMin = diffMs / (1000 * 60);
        
        // Dos fichadas del mismo tipo dentro del umbral → anomalía
        if (diffMin <= umbralMinutos) {
          duplicados.push({
            tipo: current.tipo,
            timestamps: [
              current.timestamp.toISOString(),
              next.timestamp.toISOString()
            ]
          });
        }
      }
    }
    
    return duplicados;
  }

  /**
   * Detecta descanso no tomado: si el horario tiene una pausa mínima requerida,
   * verifica que haya existido una interrupción de al menos `minutosMinDescanso`
   * entre fichadas de salida y re-entrada durante la jornada.
   */
  static checkDescansoNoTomado(fichadas: FichadaRaw[], horario: HorarioData): boolean {
    // Si no tiene descanso configurado o el mínimo es 0, no aplica
    if (!horario.descansoinicio || !horario.descansofin || horario.minutosmindescanso <= 0) {
      return false;
    }

    // Buscar pares salida→entrada (descanso) durante la jornada
    const salidas = fichadas.filter(f => f.tipo === 'salida');
    const entradas = fichadas.filter(f => f.tipo === 'entrada');

    // Si solo hay una entrada y una salida, no hubo pausa intermedia
    if (entradas.length <= 1 && salidas.length <= 1) {
      // No hubo fichada intermedia de descanso → descanso no tomado
      return true;
    }

    // Buscar si existe una pausa >= minutosMinDescanso
    // Iterar fichadas en orden y buscar pares salida→entrada
    for (let i = 0; i < fichadas.length - 1; i++) {
      if (fichadas[i].tipo === 'salida' && fichadas[i + 1].tipo === 'entrada') {
        const salidaMin = this.getMinutesInArgentina(fichadas[i].timestamp);
        const reentradaMin = this.getMinutesInArgentina(fichadas[i + 1].timestamp);
        const pausa = reentradaMin - salidaMin;
        
        if (pausa >= horario.minutosmindescanso) {
          return false; // Encontró una pausa suficiente
        }
      }
    }

    // No encontró una pausa suficiente
    return true;
  }

  /**
   * Función principal: analiza una jornada completa de un empleado para una fecha.
   * 
   * @param isLaborable - Si el día es laborable para este empleado
   * @param fichadas - Fichadas del día, ordenadas por timestamp
   * @param horario - Horario aplicable al empleado para esa fecha
   * @param esDomingoOFeriado - Si es domingo o feriado (para horas extra 50/100%)
   * @param reglas - Reglas parametrizables de la empresa
   */
  static analizarJornada(
    isLaborable: boolean,
    fichadas: FichadaRaw[],
    horario: HorarioData,
    esDomingoOFeriado: boolean,
    reglas: ReglasConfig
  ): ResultadoJornada {
    const resultado: ResultadoJornada = {
      ausencia: false,
      tardanza: false,
      minutosTardanza: 0,
      horasExtra: 0,
      tipoHorasExtra: esDomingoOFeriado ? 'horas_extra_100' : 'horas_extra_50',
      salidaAnticipada: false,
      minutosSalidaAnticipada: 0,
      dobleFichadas: [],
      descansoNoTomado: false
    };

    // 1. Verificar ausencia
    resultado.ausencia = this.checkAusencia(isLaborable, fichadas);
    if (resultado.ausencia) {
      return resultado;
    }

    // Si no es laborable y no hay fichadas, no hay nada que analizar
    if (!isLaborable && fichadas.length === 0) {
      return resultado;
    }

    // 2. Detectar dobles fichadas (anomalías)
    resultado.dobleFichadas = this.checkDobleFichadas(
      fichadas, 
      reglas.doble_fichada_umbral_minutos
    );

    // 3. Tardanza (solo en día laborable)
    if (isLaborable) {
      const primeraEntrada = fichadas.find(f => f.tipo === 'entrada');
      if (primeraEntrada) {
        const minutosTardanza = this.checkTardanza(primeraEntrada, horario);
        if (minutosTardanza > (horario.toleranciaentrada || 0)) {
          resultado.tardanza = true;
          resultado.minutosTardanza = minutosTardanza;
        }
      }
    }

    // 4. Horas extra (última salida del día)
    const salidas = fichadas.filter(f => f.tipo === 'salida');
    if (salidas.length > 0) {
      const ultimaSalida = salidas[salidas.length - 1];
      resultado.horasExtra = this.checkHorasExtra(ultimaSalida, horario);
    }

    // 5. Salida anticipada (solo en día laborable, última salida)
    if (isLaborable && salidas.length > 0) {
      const ultimaSalida = salidas[salidas.length - 1];
      const minutosAnticipados = this.checkSalidaAnticipada(ultimaSalida, horario);
      if (minutosAnticipados > 0) {
        resultado.salidaAnticipada = true;
        resultado.minutosSalidaAnticipada = minutosAnticipados;
      }
    }

    // 6. Descanso no tomado (solo si está habilitado en reglas y es laborable)
    if (isLaborable && reglas.descanso_no_tomado_habilitar) {
      resultado.descansoNoTomado = this.checkDescansoNoTomado(fichadas, horario);
    }

    return resultado;
  }
}
