/// <reference types="node" />

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ProyectoPage } from '../pages/ProyectoPage';
import { AreasPage } from '../pages/AreasPage';

test('Crear un proyecto con su lista inicial de precios', async ({
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
  const nombreProyecto = `QA Gisela - ${identificador}`;
  const nombreLista = `Lista inicial QA - ${identificador}`;

  const loginPage = new LoginPage(page);
  const proyectoPage = new ProyectoPage(page);
  const areasPage = new AreasPage(page);

  await test.step('Iniciar sesión', async () => {
    await loginPage.abrir();
    await loginPage.iniciarSesion(email, password);
  });

  await test.step('Completar y registrar el proyecto', async () => {
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

  await test.step('Abrir la configuración de stock', async () => {
    // Ubicamos la tarjeta de stock y su botón Agregar.
    const tarjetaStock = page
      .getByText(/^Stock de unidades/)
      .locator('xpath=ancestor::div[.//button][1]');

    await tarjetaStock.getByRole('button', {
      name: /^\+?\s*Agregar$/,
    }).click();

    await expect(
      areasPage.precioM2Input
    ).toBeVisible();
  });

  await test.step('Configurar unidades y guardar la lista', async () => {
    await areasPage.completarConfiguracion(nombreLista);
    await areasPage.guardar();
  });

  await test.step('Verificar la lista y sus dos unidades', async () => {
    // Obtenemos el ID del proyecto desde la URL actual.
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
});