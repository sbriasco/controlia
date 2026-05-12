# Plan de Implementación: V3 - Motor de Reglas e Interpretación

> **Para trabajadores agenticos:** SUB-HABILIDAD REQUERIDA: Usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan la sintaxis de checkbox (`- [ ]`) para seguimiento.

**Meta:** Implementar la detección automática de tardanzas y ausencias y mostrarlas en el Dashboard.

**Arquitectura:** Servicio de backend (Node/Prisma) para la lógica de interpretación + API REST + Integración React.

**Tech Stack:** Node.js, Express, Prisma, Vitest (para TDD), React.

---

### Tarea 1: Configuración de Ambiente de Testing (Backend)

**Archivos:**
- Modificar: `backend/package.json`

- [ ] **Paso 1: Instalar Vitest**
    Ejecutar: `npm install -D vitest` en la carpeta `backend`.
- [ ] **Paso 2: Agregar script de test**
    Modificar `package.json`: `"test": "vitest"`.

### Tarea 2: Servicio de Interpretación (Lógica Core con TDD)

**Archivos:**
- Crear: `backend/src/services/interpretation.service.ts`
- Crear: `backend/src/services/__tests__/interpretation.service.test.ts`

- [ ] **Paso 1: Escribir test fallido para Tardanza**
```typescript
import { describe, it, expect } from 'vitest';
import { InterpretationService } from '../interpretation.service';

describe('InterpretationService', () => {
  it('debe detectar una tardanza si la fichada es después del horario', () => {
    const horario = { horaentrada: '09:00', diassemana: '1,2,3,4,5' };
    const fichada = { timestamp: '2026-05-09T09:15:00Z', tipo: 'entrada' };
    const resultado = InterpretationService.checkTardanza(fichada, horario);
    expect(resultado.tardanza).toBe(15);
  });
});
```
- [ ] **Paso 2: Ejecutar test y verificar que falla**
- [ ] **Paso 3: Implementar lógica mínima de `checkTardanza`**
- [ ] **Paso 4: Verificar que el test pasa**
- [ ] **Paso 5: Repetir para Ausencias y Horas Extra (TDD)**

### Tarea 3: Persistencia y API Endpoint

**Archivos:**
- Crear: `backend/src/controllers/interpretation.controller.ts`
- Modificar: `backend/src/routes/index.ts` (o similar para registrar la ruta)

- [ ] **Paso 1: Crear controlador para procesar rango**
    Debe limpiar novedades automáticas previas y guardar las nuevas.
- [ ] **Paso 2: Registrar ruta `POST /api/interpretation/process`**

### Tarea 4: Integración con Dashboard (Frontend)

**Archivos:**
- Modificar: `src/pages/dashboard/AdminDashboard.tsx`
- Modificar: `src/pages/dashboard/EmpleadoDashboard.tsx`

- [ ] **Paso 1: Llamar al proceso de interpretación al cargar el Dashboard**
- [ ] **Paso 2: Reemplazar datos mock por datos reales de la base de datos**
- [ ] **Paso 3: Verificar visualmente los resultados**