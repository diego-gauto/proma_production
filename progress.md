# Progreso de auditoría

## 2026-10-19
- Se inició la auditoría funcional solicitada.
- No se modificó código de negocio ni se hizo commit.
- Se ejecutaron altas y creación de orden con datos reales de auditoría.
- Se verificó el primer escenario de corte parcial y se encontraron dos fallas: finalización prematura de Corte y exposición de `passwordHash`.
- Se escribieron tests rojos, se corrigieron y quedaron 12/12 específicos y 36/36 en la suite completa.
- Verificación real: corte parcial 400, entrega sin avíos 400, entrega válida 201 en `EN_CONFECCION`, respuesta de asignación sin `passwordHash`.
- Se agregó el test de límite de avíos parciales; suite completa final: 37/37 tests OK.
- Integración real: 150 prendas asignadas, avíos para 100, entrega de 101 rechazada con 409 y máximo 100.
