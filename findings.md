# Hallazgos de auditoría

## Estado inicial
- Se creó un set de auditoría con cliente, proveedor, tela, ingreso de 100 unidades, avío, artículo con Bordado y Estampado, taller de Confección y orden `AUD-ORDEN-1792430461168`.
- La orden se crea automáticamente en `CORTE`, con parte `EN_PROCESO` y evento de Corte abierto. Esto coincide con la regla de negocio.
- La orden creada tiene un avío de Confección en `FALTANTE`.
- Se registró un corte parcial de 8 sobre 20; el endpoint devolvió `stageFinished: false` y la carga quedó visible en la parte.
- La asignación a Confección acepta esas 8 unidades aunque el corte total sea 20. Esto coincide con la regla solicitada.
- La respuesta de asignación expone `assignedBy.passwordHash`: hallazgo crítico de seguridad que debe corregirse antes de cerrar la etapa.
- Se pudo finalizar Corte con solo 8 de 20 unidades. El sistema cerró el evento y dejó la parte en `PENDIENTE` sin etapa actual, en vez de mantenerla como parcial/en Corte o impedir el cierre. Esto contradice el recorrido solicitado y rompe la trazabilidad.
- Todavía no se verificaron fechas estimadas, faltante/parcial/completa de tela, Bordado, Estampado, Avíos, envío y entregas parciales de Confección.

## Correcciones verificadas
- Se agregó una validación de cierre completo de Corte: una parte de 20 con 8 cortadas devuelve 400 y mantiene el evento abierto.
- Las entregas de Confección ahora requieren avíos de categoría `CONFECCION` preparados en cantidad suficiente.
- Las entregas actualizan solo columnas escalares de la asignación; se eliminó el 500 causado por cascada al guardar relaciones cargadas.
- Las respuestas de asignaciones y eventos de etapa ya no serializan `passwordHash`.
- Con avíos preparados, una entrega parcial válida devuelve 201, conserva estado `EN_CONFECCION` y acumula la cantidad entregada.

- Se incorporó el límite de entregas por avíos parciales: con 150 prendas asignadas y avíos disponibles para 100, intentar entregar 101 devuelve 409 indicando máximo 100.
