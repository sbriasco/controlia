# Especificación Técnica: V3 - Motor de Reglas e Interpretación

**Estado:** Borrador (Esperando revisión del usuario)
**Fecha:** 2026-05-09
**Proyecto:** Controlia (GADS V3)

## 1. Objetivo
Implementar el núcleo de la lógica de negocio para detectar automáticamente tardanzas y ausencias basadas en las fichadas reales y los horarios asignados a los empleados. Los resultados deben ser persistentes y visualizables en el Dashboard.

## 2. Requerimientos Funcionales (V3)
- **Detección de Tardanzas**: Comparar la primera fichada de "entrada" del día con el horario de entrada esperado.
- **Detección de Ausencias**: Identificar días laborables (según el horario) que no tengan ninguna fichada de entrada.
- **Persistencia**: Los eventos detectados deben guardarse en la tabla `novedades` con `origen: 'automatica'`.
- **Visualización**: Actualizar el Dashboard para mostrar estos datos en tiempo real.

## 3. Arquitectura del Motor de Reglas

### 3.1 Backend (Node.js + Prisma)
Se implementará un `InterpretationService` que encapsule la lógica de comparación.

**Reglas de Interpretación (V3 - Simples):**
1.  **Día Laborable**: Se determina mediante el campo `diassemana` en la tabla `horarios`. (Ej: "1,2,3,4,5" para Lun-Vie).
2.  **Tardanza**: 
    - Si `fichada_entrada.time > horario.horaentrada`.
    - El valor registrado será el delta en minutos.
3.  **Ausencia**:
    - Si hoy es `laborable` y no hay fichada de entrada registrada al momento de la consulta (para días pasados).

**Flujo de Datos:**
- El cliente solicita un reporte o carga el Dashboard.
- El backend ejecuta `InterpretationService.processRange(empleadoId, start, end)`.
- Se eliminan `novedades` automáticas previas en ese rango para ese empleado.
- Se insertan las nuevas novedades detectadas.

### 3.2 Frontend (React)
- Modificación de `AdminDashboard` y `EmpleadoDashboard` para mostrar el conteo real de novedades desde la base de datos.

## 4. Modelo de Datos (Prisma)
- `fichadas`: `timestamp`, `tipo`.
- `horarios`: `horaentrada`, `horasalida`, `diassemana`.
- `novedades`: `tipo` ('tardanza', 'ausencia_injustificada'), `cantidad`, `unidad`, `origen` ('automatica').

## 5. Plan de Pruebas (TDD)
- Test 1: Entrada 09:15 en horario 09:00 -> Tardanza 15 min.
- Test 2: Sin entrada en día laboral -> Ausencia 1 día.
- Test 3: Recalcular -> No duplica datos.