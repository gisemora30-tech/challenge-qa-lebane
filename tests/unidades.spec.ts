/// <reference types="node" />

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ProyectoPage } from '../pages/ProyectoPage';
import { AreasPage } from '../pages/AreasPage';
import { UnidadesPage } from '../pages/UnidadesPage';

test('Agregar una unidad manualmente con precio y verificar persistencia', async ({
  page,
}) => {
  const email = process.env.LEBANE_EMAIL;
  const password = process.env.LEBANE_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Faltan LEBANE_EMAIL o LEBANE_PASSWORD en el archivo .env'
    );
  }

  const identificador = Date.now();
  const nombreProyecto = `QA Unidad manual - ${identificador}`;
  const nombreLista = `Lista unidad manual QA - ${identificador}`;

  const numeroUnidad = '103';
  const moneda = 'ARS';
  const precio = 150000;
  const precioVisible = '150.000';

  const loginPage = new LoginPage(page);
  const proyectoPage = new ProyectoPage(page);
  const areasPage = new AreasPage(page);
  const unidadesPage = new UnidadesPage(page);

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

  await test.step('Crear la lista inicial con dos unidades', async () => {
    const tarjetaStock = page
      .getByText(/^Stock de unidades/)
      .locator('xpath=ancestor::div[.//button][1]');

    await tarjetaStock.getByRole('button', {
      name: /^\+?\s*Agregar$/,
    }).click();

    await expect(
      areasPage.precioM2Input
    ).toBeVisible();

    await areasPage.completarConfiguracion(nombreLista);
    await areasPage.guardar();
  });

  await test.step('Abrir Unidades y comprobar el estado inicial', async () => {
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
    await areasPage.verificarListaInicial(nombreLista);
  });

  await test.step('Adicionar una unidad y escribir su número', async () => {
    await unidadesPage.adicionarUnidad(numeroUnidad);
  });

  await test.step('Seleccionar ARS y cargar el precio', async () => {
    await unidadesPage.cambiarMoneda(numeroUnidad, moneda);
    await unidadesPage.completarPrecio(numeroUnidad, precio);
  });

  await test.step('Verificar la unidad y las tres filas', async () => {
    await unidadesPage.verificarUnidad(
      numeroUnidad,
      moneda,
      precioVisible
    );

    await expect(
      page.getByText('3 filas', { exact: true })
    ).toBeVisible();
  });

  await test.step('Recargar y verificar que los datos persisten', async () => {
    await page.reload({ waitUntil: 'commit' });
    await areasPage.abrirUnidades();

    await unidadesPage.verificarUnidad(
      numeroUnidad,
      moneda,
      precioVisible
    );

    await expect(
      page.getByText('3 filas', { exact: true })
    ).toBeVisible();
  });
});