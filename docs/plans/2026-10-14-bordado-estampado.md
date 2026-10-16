# Vistas de Bordado y Estampado

Objetivo: conservar la composición de Corte en listado y detalle, con una separación por parte decorable y cargas por lote, fecha y talle.

Regla confirmada por el usuario: todas las partes del artículo son obligatorias; una combinación diferente requiere otro artículo. La etapa termina solo al completar todas sus partes. Estampado aplica únicamente a artículos que lo incluyen.

1. Agregar pruebas de cargas independientes y finalización conjunta en SectorProgressService.
2. Incorporar parte de prenda y lote a las cargas mediante una nueva migración reversible. Mantener las cargas anteriores sin atribuirlas arbitrariamente cuando hay varias partes.
3. Adaptar listado sectorial y detalle al diseño existente de Corte. Mostrar cantidades pendientes e historial por parte; persistir por el endpoint autorizado del sector.
4. Ejecutar tests, compilación, migración/reversión y verificación funcional en localhost:3000/3001.

Base: rama creada desde develop; cambios locales previos preservados e identificados antes de empezar.

## Verificación realizada

- Backend: build correcto, 24 tests unitarios/integración y 10 tests e2e de órdenes correctos. Incluye permisos cruzados, exceso por parte, cargas parciales y rechazo de finalización manual con otra parte pendiente. Se conserva la prueba de Atraque incluido en Confección externa.
- Frontend: TypeScript sin errores y 23 tests correctos.
- Migración nueva: aplicada, revertida y reaplicada en base local.
- Chromium contra localhost:3000/3001: usuarios Bordado y Estampado reales, listado y detalle, capturas desktop/móvil, carga por parte, persistencia tras recarga y finalización conjunta. Sin overlay ni excepciones de ejecución.
- Revisión visual independiente: corregidos wrapping del encabezado móvil y estado agregado de partes. Ambos hallazgos confirmados como resueltos.
- Datos temporales del smoke test eliminados. Servidores locales activos. Cambios previos preservados; sin commit, merge ni despliegue.
- Datos históricos: quedan 6 cargas anteriores sin parte identificada. Se conservan; la interfaz advierte su existencia y no las atribuye arbitrariamente a pecho/manga. Requieren identificación operativa para contarlas por parte.
