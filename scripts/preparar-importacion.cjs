const ExcelJS = require('exceljs');
const path = require('node:path');

function normalizar(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

async function prepararImportacion() {
  const carpetaDatos = path.resolve(
    __dirname,
    '..',
    'test-data'
  );

  const archivoOriginal = path.join(
    carpetaDatos,
    'template_unidades_27-10-2026-23_37.xlsx'
  );

  const archivoSalida = path.join(
    carpetaDatos,
    'unidades-importacion.xlsx'
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(archivoOriginal);

  let hojaUnidades;
  let filaEncabezados;
  let columnas;

  // Buscamos los encabezados sin depender del nombre de la hoja.
  for (const hoja of workbook.worksheets) {
    hoja.eachRow((fila, numeroFila) => {
      if (hojaUnidades) {
        return;
      }

      const mapa = new Map();

      fila.eachCell((celda, numeroColumna) => {
        mapa.set(normalizar(celda.text), numeroColumna);
      });

      if (
        mapa.has('numerodeunidad') &&
        mapa.has('tipologia') &&
        mapa.has('precio') &&
        mapa.has('moneda')
      ) {
        hojaUnidades = hoja;
        filaEncabezados = numeroFila;
        columnas = mapa;
      }
    });
  }

  if (!hojaUnidades) {
    throw new Error(
      'No se encontraron los encabezados de unidades.'
    );
  }

  const unidades = [
    {
      'Numero de unidad': 201,
      Tipologia: 'Dos ambientes',
      Orientacion: 'Norte',
      'M2 cubiertos': 40,
      'M2 semi cubiertos': 5,
      'M2 descubiertos': 0,
      'M2 Comunes': 5,
      'M2 totales': 50,
      Precio: 150000,
      Moneda: 'ARS',
      Estado: 'DISPONIBLE',
      Piso: 2,
    },
    {
      'Numero de unidad': 202,
      Tipologia: 'Dos ambientes',
      Orientacion: 'Norte',
      'M2 cubiertos': 50,
      'M2 semi cubiertos': 5,
      'M2 descubiertos': 0,
      'M2 Comunes': 5,
      'M2 totales': 60,
      Precio: 180000,
      Moneda: 'ARS',
      Estado: 'DISPONIBLE',
      Piso: 2,
    },
  ];

  // Validamos que existan todas las columnas necesarias.
  for (const encabezado of Object.keys(unidades[0])) {
    if (!columnas.has(normalizar(encabezado))) {
      throw new Error(
        `Falta una columna requerida: ${encabezado}`
      );
    }
  }

  // Si hay ejemplos o instrucciones debajo, detenemos la edición
  // para revisarlos antes de sobrescribirlos.
  let contieneDatos = false;

  hojaUnidades.eachRow((fila, numeroFila) => {
    if (numeroFila <= filaEncabezados) {
      return;
    }

    fila.eachCell((celda) => {
      if (celda.text.trim() !== '') {
        contieneDatos = true;
      }
    });
  });

  if (contieneDatos) {
    throw new Error(
      'El template tiene contenido debajo de los encabezados. ' +
      'Pegá este mensaje en el chat para revisarlo.'
    );
  }

  // Completamos dos filas. Las columnas opcionales quedan vacías.
  unidades.forEach((unidad, indice) => {
    const fila = hojaUnidades.getRow(
      filaEncabezados + indice + 1
    );

    for (const [encabezado, valor] of Object.entries(unidad)) {
      const columna = columnas.get(normalizar(encabezado));
      fila.getCell(columna).value = valor;
    }
  });

  // Guardamos una copia y conservamos el original.
  await workbook.xlsx.writeFile(archivoSalida);

  // Leemos la copia para comprobar los valores guardados.
  const comprobacion = new ExcelJS.Workbook();
  await comprobacion.xlsx.readFile(archivoSalida);

  const hojaGuardada = comprobacion.getWorksheet(
    hojaUnidades.name
  );

  unidades.forEach((unidad, indice) => {
    for (const [encabezado, esperado] of Object.entries(unidad)) {
      const columna = columnas.get(normalizar(encabezado));

      const obtenido = hojaGuardada
        .getRow(filaEncabezados + indice + 1)
        .getCell(columna)
        .value;

      if (obtenido !== esperado) {
        throw new Error(
          `Falló la verificación de ${encabezado} ` +
          `en la unidad ${unidad['Numero de unidad']}.`
        );
      }
    }
  });

  console.log('Archivo generado y verificado:');
  console.log(archivoSalida);
  console.table(unidades);
}

prepararImportacion().catch((error) => {
  console.error('No se pudo preparar el archivo:');
  console.error(error.message);
  process.exitCode = 1;
});