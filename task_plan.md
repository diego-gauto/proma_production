# Plan - Proveedores, stock inicial y ajustes ABM

## Objetivo
Actualizar modelo y vistas ABM para reflejar que telas y avios son entidades puras, proveedores son entidad propia, y los ingresos de stock vinculan proveedor + material. Para telas, el stock se compone de rollos con codigo y lote.

## Fases
1. Relevar modelo/API actual y definir cambios minimos compatibles. status: complete
2. Backend: migracion, entidades, DTOs/servicios/controladores/tests para proveedores e ingresos/rollos. status: complete
3. Frontend: columnas ABM, nuevo recurso Proveedores, paginacion, perfil/logout y ajustes de header/listados. status: complete
4. Docs: actualizar PRD y plan de implementacion. status: complete
5. Verificacion: build/test backend+frontend y smoke local. status: complete

## Decisiones
- Sin precio por ahora.
- Proveedor no va dentro de tela/avio.
- Tela stock se modela por rollos. Cada rollo guarda codigo y lote por ahora.
- Avios tendran ingresos con cantidad, sin proveedor embebido en el maestro.

## Errores
- Test rojo inicial correcto: fabrics aceptaba supplier directo.
- Backend unitario fallo por seed demo con supplier; corregido.
- API providers devolvio 500 por TypeORM con leftJoin + skip/take; corregido con findAndCount.
