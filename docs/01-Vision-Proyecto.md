# 📋 Sistema de Seguimiento de Producción — Documento de Presentación

## 🎯 ¿Qué problema resuelve?

Hoy el avance de una **orden de corte** —desde que se decide cortar la tela hasta que la prenda queda terminada— pasa por muchas manos y muchos sectores: corte, bordado, preparación de avíos, confección (propia o en talleres externos), ojal y botón, plancha y terminación. En el camino, una misma orden se puede **dividir en varias partes** que avanzan a ritmos distintos: una parte se manda a bordar mientras otra espera avíos, una se envía a un taller y otra a otro, y así. Algunas divisiones son por cantidad de prendas; otras son por componentes de la misma prenda antes de Confección, como mangas a bordar, piezas a estampar y resto en espera. En ese segundo caso las ramas pueden tener la misma cantidad del corte original porque no representan prendas duplicadas.

Sin un sistema centralizado, es difícil saber en un momento dado:
- ¿En qué etapa está cada parte de una orden?
- ¿Cuánto tiempo lleva en esa etapa?
- ¿Hay algo trabado que nadie está viendo?
- ¿Qué orden salió con fecha estimada vencida?

Este sistema resuelve exactamente eso: **da visibilidad en tiempo real del recorrido completo de cada orden de corte**, sector por sector, hasta que queda lista para despacho.

## 🏭 Contexto de la fábrica

La empresa fabrica indumentaria de trabajo (comprando todos los materiales: telas, cierres, etiquetas, grifas, tancas, cordones, etc.) y además comercializa productos de terceros (calzado de seguridad, chalecos reflectivos, botas de lluvia) que **no forman parte de este sistema**, ya que no pasan por un proceso productivo propio.

La producción involucra dos plantas (depósito de tela y corte / bordado, armado de avíos y despacho a talleres) que el sistema trata como un único flujo continuo, sin necesidad de diferenciarlas.

Parte del proceso se terceriza en **talleres externos** (confección, ojal y botón, plancha), que se dan de alta en el sistema como proveedores de servicio.

## 👥 ¿Quién lo usa?

- **Administradores** (Gerencia, Producción, Administración): visibilidad total, pueden crear y modificar cualquier orden, forzar cambios de etapa, y gestionar el maestro de datos (clientes, artículos, talleres, usuarios).
- **Usuarios de sector** (Corte, Bordado, Estampado, Avíos, Confección interna, Atraque, Ojal y Botón, Plancha, Terminación): cada uno opera únicamente su propia etapa — marca inicio y fin de su parte del proceso, y deja notas relevantes.

## 🧵 ¿Cómo funciona, en criollo?

1. Se **crea una orden de corte** con su artículo, tela(s), colores y talles.
2. Antes de cortar, se chequea si están los materiales. Si falta algo, se puede **empezar con lo que hay** (por ejemplo, cortar solo los talles S y M porque todavía no llegó la tela para el resto).
3. A medida que la orden avanza, se puede **dividir en partes**: unas van a bordado, otras a estampado y otras esperan; unas se mandan a un taller externo, otras a otro; los avíos pueden completarse de a poco. Cuando la división es por componentes decorativos de la prenda, esas ramas se vuelven a reunir antes de Confección para que el producto siga avanzando como una unidad.
4. Cada sector marca cuándo **empieza y termina** su parte del trabajo, y puede dejar una nota.
5. Si algo necesita corrección, la orden se marca en estado **"Arreglo"** con el detalle de qué corregir.
6. **Gerencia y Producción** ven en todo momento un tablero con el estado de todas las órdenes activas, reciben avisos si algo se demora más de lo esperado o si una fecha estimada no se cumplió.
7. Cuando la orden llega a **Terminación**, su recorrido dentro del sistema se da por finalizado (el despacho al cliente queda fuera de este sistema, ya que un pedido puede combinar varias órdenes de corte).

## ✅ Qué incluye el MVP (primera versión)

- Gestión de órdenes de corte y su división dinámica en partes.
- Flujo completo de etapas: Corte → Bordado/Estampado → Avíos → Confección (interna o taller) → Atraque → Ojal y Botón → Avíos de terminación → Plancha → Terminación.
- Registro de inicio/fin de cada etapa, con cálculo automático de días transcurridos.
- Estado de "Arreglo" con nota.
- Fecha estimada de finalización opcional por etapa, con aviso si se incumple.
- Notificaciones dentro de la app (cuellos de botella, incumplimiento de fechas, ingreso y finalización de trabajos).
- Dashboard doble: vista Kanban y vista de lista/tabla.
- Alta y gestión de Clientes, Proveedores, Talleres externos, Telas, Avíos, Curvas de talles, Artículos y Usuarios, con baja lógica/reactivación.
- Stock operativo de telas y avíos en una ruta propia de Stock. Permite ver saldos generales, cargar ingresos/compras, consultar detalle y corregir stock. El stock de telas se compone como sumatoria de rollos; cada rollo guarda código, lote, cantidad original y cantidad disponible.

## 🚫 Qué NO incluye esta primera versión

- Valuación, precios, costos, reservas y consumo automático por orden. El MVP sí contempla ingresos/compras, saldos, detalle por rollo/avío y ajustes manuales.
- Facturación o costos.
- Gestión de pedidos de cliente (que agrupan varias órdenes).
- Escaneo por código QR (queda planificado para una segunda etapa).
- Integraciones externas (contabilidad, e-commerce, etc.).
- Notificaciones por email/Telegram (se evalúan a futuro; el MVP es solo dentro de la app).

## 🚀 Visión a futuro

- Maestro de artículos con avíos y etapas pre-configuradas (hoy se eligen manualmente al crear cada orden).
- Generación de etiquetas QR por parte, para que cada sector escanee y confirme el cambio de etapa desde el piso de planta.
- Notificaciones por Telegram.
- Evolución de stock hacia consumo automático por orden, reservas, valuación y pedidos de cliente.
