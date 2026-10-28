/// <reference types="node" />

import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import { access } from 'node:fs/promises';
import { LoginPage } from '../pages/LoginPage';
import { ProyectoPage } from '../pages/ProyectoPage';
import { AreasPage } from '../pages/AreasPage';
import { UnidadesPage } from '../pages/UnidadesPage';
import { ImportacionPage } from '../pages/ImportacionPage';

test('Importar unidades creando una nueva lista y conservar la lista inicial', async ({
  page,
}) => {
  const email = process.env.LEBANE_EMAIL;
  const password = process.env.LEBANE_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Faltan LEBANE_EMAIL o LEBANE_PASSWORD en el archivo .env'
    );
  }

  const rutaArchivo = path.resolve(
    __dirname,
    '..',
    'test-data',
    'unidades-importacion.xlsx'
  );

  // Si falta el Excel, fallamos antes de crear datos en Lebane.
  try {
    await access(rutaArchivo);
  } catch {
    throw new Error(
      `No se encontró el archivo para importar: ${rutaArchivo}`
    );
  }

  const identificador = Date.now();
  const nombreProyecto = `QA Importacion - ${identificador}`;
  const nombreListaInicial = `Lista inicial QA - ${identificador}`;

  let nombreListaImportada = '';

  const loginPage = new LoginPage(page);
  const proyectoPage = new ProyectoPage(page);
  const areasPage = new AreasPage(page);
  const unidadesPage = new UnidadesPage(page);
  const importacionPage = new ImportacionPage(page);

  await test.step('Iniciar sesión', async () => {
    await loginPage.abrir();
    await loginPage.iniciarSesion(email, password);
  });

  await test.step('Crear un proyecto para este caso', async () => {
    await proyectoPage.abrirDesdeInicio();

    await proyectoPage.completarFormulario({
      nombre: nombreProyecto,
      moneda: 'ARS',
      pais: 'Argentina',
      estado: 'Capital Federal',
      ciudad: 'Caballito',
      direccion: 'Avenida Rivadavia',
      numero: '5000',
      fechaInicio: '28/10/2026',
      fechaFin: '28/10/2027',
      tipoConstruccion: 'Edificio residencial',
      modalidadAjuste: 'Definitivo',
      razonSocial: 'GC QA SA',
    });

    await expect(
      proyectoPage.registrarButton
    ).toBeEnabled();

    await proyectoPage.registrarButton.click();

    await expect(
      page.getByText('Comienza a operar tu proyecto', {
        exact: true,
      })
    ).toBeVisible();
  });

  await test.step('Crear una lista inicial con dos unidades', async () => {
    const tarjetaStock = page
      .getByText(/^Stock de unidades/)
      .locator('xpath=ancestor::div[.//button][1]');

    await tarjetaStock.getByRole('button', {
      name: /^\+?\s*Agregar$/,
    }).click();

    await expect(
      areasPage.precioM2Input
    ).toBeVisible();

    await areasPage.completarConfiguracion(
      nombreListaInicial
    );

    await areasPage.guardar();
  });

  await test.step('Abrir Unidades y verificar la lista inicial', async () => {
    const coincidencia = new URL(page.url()).pathname.match(
      /\/proyecto\/(\d+)/
    );

    if (!coincidencia) {
      throw new Error(
        `No se pudo obtener el ID del proyecto desde: ${page.url()}`
      );
    }

    const proyectoId = coincidencia[1];

    await page.goto(`/proyecto/${proyectoId}/areas`, {
      waitUntil: 'commit',
    });

    await areasPage.abrirUnidades();

    await areasPage.verificarListaInicial(
      nombreListaInicial
    );
  });

  await test.step('Importar el Excel y obtener la nueva lista', async () => {
    nombreListaImportada = await importacionPage.importarArchivo(
      rutaArchivo
    );

    expect(nombreListaImportada).not.toBe(
      nombreListaInicial
    );
  });

  await test.step('Verificar las unidades importadas y sus precios', async () => {
    await unidadesPage.verificarUnidad(
      '201',
      'ARS',
      '150.000'
    );

    await unidadesPage.verificarUnidad(
      '202',
      'ARS',
      '180.000'
    );

    await expect(
      page.getByText('2 filas', { exact: true })
    ).toBeVisible();

    const tabla = page.locator(
      '[data-table-id="units-table"] table'
    );

    await expect(
      tabla.locator('tbody tr')
    ).toHaveCount(2);
  });

  await test.step('Comprobar que la lista inicial se conserva', async () => {
    await importacionPage.seleccionarLista(
      nombreListaInicial,
      nombreListaImportada
    );

    await areasPage.verificarListaInicial(
      nombreListaInicial
    );

    // Las unidades importadas pertenecen a la nueva lista.
    const tabla = page.locator(
      '[data-table-id="units-table"] table'
    );

    await expect(
      tabla
        .locator('tbody td[data-column-id="numero"]')
        .getByText('201', { exact: true })
    ).toHaveCount(0);

    await expect(
      tabla
        .locator('tbody td[data-column-id="numero"]')
        .getByText('202', { exact: true })
    ).toHaveCount(0);
  });

  await test.step('Recargar y verificar la persistencia de la importación', async () => {
    await page.reload({ waitUntil: 'commit' });
    await areasPage.abrirUnidades();

    await importacionPage.seleccionarLista(
      nombreListaImportada,
      nombreListaInicial
    );

    await unidadesPage.verificarUnidad(
      '201',
      'ARS',
      '150.000'
    );

    await unidadesPage.verificarUnidad(
      '202',
      'ARS',
      '180.000'
    );

    await expect(
      page.getByText('2 filas', { exact: true })
    ).toBeVisible();
  });
});