# Challenge QA Automation — Lebane

Automatización de la funcionalidad Lista de precios de unidades con Playwright y TypeScript.

La solución cubre los siete escenarios mínimos del ejercicio mediante seis tests independientes. Los escenarios de eliminación de la última unidad y eliminación de una unidad sin lista se verifican dentro del mismo test.

## Requisitos

- Node.js 24.x y npm.
- Google Chrome instalado.
- Una cuenta habilitada para operar en el ambiente de pruebas de Lebane.
- Acceso a https://tst.lebane.app.

El proyecto de Playwright se llama `chromium`, pero utiliza Google Chrome mediante `channel: 'chrome'`.

## Instalación

```powershell
npm.cmd ci
```

En Windows se utiliza `npm.cmd` y `npx.cmd` para evitar que PowerShell intente ejecutar los archivos `.ps1` cuando la política de ejecución los bloquea.

En otros sistemas se pueden utilizar `npm` y `npx`.

## Credenciales

Crear un archivo `.env` en la raíz tomando como referencia `.env.example`:

```dotenv
LEBANE_EMAIL=
LEBANE_PASSWORD=
```

Completar los valores localmente con una cuenta autorizada.

El archivo `.env` está excluido de Git. Las credenciales no se incluyen en los tests ni en este README.

## Ejecución

Ejecutar la suite del challenge:

```powershell
npm.cmd test
```

Ejecutar mostrando el navegador:

```powershell
npm.cmd run test:headed
```

Listar los tests sin ejecutarlos:

```powershell
npm.cmd test -- --list
```

Ejecutar un archivo individual:

```powershell
npx.cmd playwright test tests/eliminar-ultima-unidad.spec.ts --headed
```

Abrir el último reporte HTML:

```powershell
npm.cmd run test:report
```

El comando `npm test` selecciona explícitamente los seis archivos del challenge.

## Cobertura

| Escenario de la consigna | Archivo | Verificación principal |
|---|---|---|
| 1. Crear proyecto con lista inicial | `tests/proyecto.spec.ts` | Lista con nombre propio, unidades 101 y 102 y dos filas |
| 2. Agregar unidad manualmente | `tests/unidades.spec.ts` | Unidad 103 con precio 150.000 ARS y persistencia al recargar |
| 3. Cargar unidades por template | `tests/importacion.spec.ts` | Nueva lista con 201 y 202 y sus precios; conservación de la lista inicial |
| 4. Modificar precio | `tests/editar-precio.spec.ts` | Cambio de 201 de 150.000 a 160.000 ARS; 202 conserva 180.000 ARS |
| 5. Eliminar una unidad conservando la lista | `tests/eliminar-unidad.spec.ts` | Elimina 102 y conserva la lista con 101, también después de recargar |
| 6. Eliminar la última unidad | `tests/eliminar-ultima-unidad.spec.ts` | Aviso específico, eliminación automática de la lista vacía y persistencia |
| 7. Eliminar una unidad que queda sin lista | `tests/eliminar-ultima-unidad.spec.ts` | Los IDs eliminados desaparecen del proyecto; se conservan los IDs iniciales |

## Organización

- `pages/LoginPage.ts`: navegación e inicio de sesión.
- `pages/ProyectoPage.ts`: formulario y registro del proyecto.
- `pages/AreasPage.ts`: configuración de stock y lista inicial.
- `pages/UnidadesPage.ts`: creación, moneda, precio, eliminación y verificaciones de unidades.
- `pages/ImportacionPage.ts`: carga del Excel y selección de listas.
- `tests/`: escenarios automatizados.
- `test-data/`: template original y archivo de importación.
- `scripts/preparar-importacion.cjs`: preparación del Excel.
- `.github/workflows/playwright.yml`: ejecución en GitHub Actions.

## Datos de prueba

Cada test crea su propio proyecto y una lista inicial con nombres que incluyen `Date.now()`.

Los números de unidad pueden repetirse entre proyectos porque cada escenario trabaja con sus propios datos.

El formulario utiliza una razón social existente, `GC QA SA`. Sus datos se cargan automáticamente y no se modifican.

Los tests crean datos en el ambiente de pruebas. No incluyen una limpieza general de los proyectos creados.

### Excel de importación

El archivo utilizado es:

```text
test-data/unidades-importacion.xlsx
```

Contiene:

| Unidad | Tipología | Precio | Moneda |
|---|---|---:|---|
| 201 | Dos ambientes | 150000 | ARS |
| 202 | Dos ambientes | 180000 | ARS |

El archivo ya generado debe estar disponible en el repositorio para ejecutar los tests de importación.

Para regenerarlo desde el template original:

```powershell
npm.cmd run prepare:import
```

El script lee:

```text
test-data/template_unidades_27-10-2026-23_37.xlsx
```

Genera una copia, conserva el original y vuelve a leer la salida para verificar los valores escritos. Se detiene si detecta contenido debajo de los encabezados del template.

## Decisiones de automatización

### Page Object Model

Los Page Objects concentran los localizadores y las acciones de la interfaz. Los tests describen los escenarios mediante `test.step`.

### Localización de unidades

Las filas se identifican por el número exacto de unidad y las columnas por `data-column-id`.

No se depende de la posición de la fila: el orden puede cambiar después de guardar o recargar.

### Edición de celdas

Los editores aparecen fuera de la tabla, en contenedores con `role="tooltip"`.

Después de editar el precio se confirma con Enter y se hace clic fuera del editor. El resultado se verifica en la celda y posteriormente al recargar.

### Selección de listas

Durante la exploración se observó que las opciones del menú podían quedar ocultas mientras el contenedor modal mantenía `aria-hidden="true"` en la página.

El Page Object completa el cierre con un clic en el fondo del menú y comprueba que la página vuelva a quedar accesible.

### Fechas

Se utiliza entrada secuencial por teclado para las fechas. Se comprueba el valor antes y después de salir del campo.

### Comprobación de unidades sin lista

La ausencia de una unidad en otra lista no demuestra que haya sido eliminada del proyecto.

Por eso el último test complementa las acciones de interfaz con una consulta autenticada a:

```text
GET /proyect/{id}
```

Antes de eliminar, comprueba que `unidades` contiene los registros de ambas listas y guarda sus IDs. Después comprueba que desaparecieron los IDs eliminados y permanecen los iniciales.

La URL y la autenticación se obtienen de una solicitud real de la aplicación. No se imprimen tokens ni headers de autenticación.

La consulta `/v2/proyectos/{id}/unidades` sin el parámetro `version` fue descartada como comprobación global: durante el diagnóstico devolvió solamente las unidades de una lista.

## Configuración

- Un worker y ejecución secuencial.
- Timeout de 60 segundos por test.
- Timeout de 10 segundos para las aserciones.
- Reporte de consola y HTML.
- Captura de pantalla ante fallos.
- Trace conservado ante fallos.
- `forbidOnly` habilitado en CI.
- Sin reintentos automáticos configurados.

Se utilizan esperas de Playwright y aserciones sobre resultados concretos. No se agregan pausas fijas para esperar que termine una operación.

## GitHub Actions

El workflow se ejecuta en pushes y pull requests dirigidos a `main` o `master`. También permite ejecución manual.

Pasos principales:

1. Descarga del repositorio.
2. Configuración de Node.js 24.
3. Instalación de dependencias con `npm ci`.
4. Instalación de Chrome y dependencias del sistema.
5. Comprobación de la existencia del Excel.
6. Ejecución de los seis tests.
7. Conservación del reporte HTML durante siete días.

Configurar estos Repository Secrets:

```text
LEBANE_EMAIL
LEBANE_PASSWORD
```

Ruta en GitHub:

```text
Settings → Secrets and variables → Actions → New repository secret
```

Los valores se entregan al proceso como variables de entorno. No se necesita subir `.env`.

La configuración de concurrencia evita ejecutar simultáneamente varios jobs de este workflow en el mismo repositorio.

Los reportes y traces pueden contener información de la sesión de prueba. Deben tratarse como evidencia de acceso restringido.

## Observaciones de la exploración

Estas observaciones no equivalen a defectos con causa técnica confirmada:

- Al eliminar manualmente la última unidad apareció “Error al eliminar la unidad”, aunque posteriormente se comprobó la eliminación de la lista. Requiere investigar la respuesta del servidor y la actualización de la interfaz.
- El reporte descargado después de importar mostraba “Datos correctos” en ambas filas, pero Excel solicitó reparar su contenido.
- Piso y Orientación aparecieron como “Seleccionar” después de importar. Se requiere revisar los valores admitidos y el procesamiento de esos campos; no se afirma que ambos tengan la misma causa.
- El contador muestra “1 filas”. Los tests verifican ese texto y, además, comprueban la cantidad real de filas.

La suite verifica los resultados de negocio descritos en la tabla de cobertura. No comprueba exhaustivamente todos los mensajes de notificación.

## Otros casos que testearía

| Caso adicional | Motivo |
|---|---|
| Lista inicial sin nombre | Cubrir la alternativa opcional indicada en la consigna |
| Nombre de proyecto o lista duplicado, largo o con caracteres especiales | Revisar validaciones y límites de los campos |
| Precio cero, negativo, decimal, vacío y extremadamente grande | Comprobar las reglas de precio y su formato |
| Cancelar una eliminación | Verificar que no cambien la unidad ni su lista |
| Eliminar una unidad asociada a más de una lista | Comprobar que se quite solo la asociación seleccionada y se conserve la unidad mientras tenga otra |
| Excel vacío, sin columnas obligatorias o con datos inválidos | Verificar validación, reporte y manejo de errores |
| Excel con filas válidas e inválidas | Determinar si la importación es parcial o atómica y comprobar su consistencia |
| Números de unidad duplicados en un Excel | Comprobar la política de duplicados |
| Formato incorrecto y archivo mayor al límite indicado | Verificar las restricciones de carga |
| Importación completa de Piso, Orientación y demás campos | Comprobar la fidelidad de todos los datos importados |
| Paginación, filtros y ordenamiento | Asegurar que las acciones afecten a la unidad correcta |
| Operaciones simultáneas desde dos sesiones | Detectar conflictos y pérdida de actualizaciones |
| Sesión vencida o usuario sin permisos | Verificar autorización y conservación de datos |
| Fallo de red durante guardado o eliminación | Comprobar consistencia, mensajes y posibilidad de recuperación |
| Otros navegadores | Detectar diferencias respecto de Chrome |

## Limitaciones

- La suite depende de un ambiente externo y de una cuenta con permisos suficientes.
- Los tests dependen de la existencia de la razón social utilizada.
- La cobertura automatizada actual utiliza listas iniciales con nombre.
- La comprobación por API depende del contrato observado de `/proyect/{id}`.
- Las fechas de creación de proyecto son datos fijos y deberán revisarse si cambian las restricciones temporales del formulario.
- No se verifica todavía la limpieza automática de los proyectos creados.