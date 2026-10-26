# Auditoría funcional del recorrido de producción

## Objetivo
Verificar con datos reales el recorrido completo desde altas y stock hasta Corte, Bordado, Estampado, Avíos y Confección, sin implementar nuevas reglas hasta conocer los resultados.

## Fases
- [ ] Preparar entorno y datos de prueba trazables.
- [ ] Verificar altas de cliente, tela, stock, artículo y taller.
- [ ] Verificar creación de orden y fechas por etapa.
- [ ] Verificar escenarios de tela: faltante, parcial y completa.
- [~] Verificar corte parcial, corte terminado y disponibilidad para Confección. Cierre parcial corregido y probado; falta continuar el recorrido completo.
- [ ] Verificar Bordado, Estampado y Avíos, incluyendo bloqueos y paralelismo.
- [ ] Verificar asignación, envío y entregas parciales de Confección.
- [ ] Consolidar fallas, reglas faltantes y propuesta de implementación.

## Restricciones
- No hacer commit durante la auditoría.
- No marcar un caso como correcto solo por HTTP 200 o por compilación.
- Cada caso debe tener evidencia de API y, cuando corresponda, de pantalla.

## Errores encontrados
| Error | Intento | Resolución |
| Corte parcial puede finalizarse y deja la parte `PENDIENTE` sin etapa | 1 | Pendiente de corrección y nueva prueba |
| Respuesta de asignación incluye `assignedBy.passwordHash` | 1 | Pendiente de corrección y nueva prueba |
|---|---:|---|
