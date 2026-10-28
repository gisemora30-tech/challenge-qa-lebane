/// <reference types="node" />

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ProyectoPage } from '../pages/ProyectoPage';
import { AreasPage } from '../pages/AreasPage';
import { UnidadesPage } from '../pages/UnidadesPage';

test('Eliminar una unidad y conservar la lista cuando quedan otras', async ({
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
  const nombreProyecto = `QA Eliminar unidad - ${identificador}`;
  const nombreLista = `Lista eliminar QA - ${identificador}`;

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

  await test.step('Crear una lista con las unidades 101 y 102', async () => {
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

    await page.goto(`/proyecto/${coincidencia[1]}/areas`, {
      waitUntil: 'commit',
    });

    await areasPage.abrirUnidades();
    await areasPage.verificarListaInicial(nombreLista);
  });

  await test.step('Eliminar la unidad 102 y confirmar', async () => {
    await unidadesPage.eliminarUnidad('102', nombreLista);
  });

  await test.step('Verificar que la lista conserva solamente 101', async () => {
    await expect(
      page.getByRole('button', {
        name: nombreLista,
        exact: true,
      })
    ).toBeVisible();

    await unidadesPage.verificarUnidad(
      '101',
      'ARS',
      '0,00'
    );

    await unidadesPage.verificarUnidadAusente('102');

    await expect(
      unidadesPage.filas
    ).toHaveCount(1);

    await expect(
      page.getByText('1 filas', { exact: true })
    ).toBeVisible();
  });

  await test.step('Recargar y comprobar que la eliminación persiste', async () => {
    await page.reload({ waitUntil: 'commit' });
    await areasPage.abrirUnidades();

    await expect(
      page.getByRole('button', {
        name: nombreLista,
        exact: true,
      })
    ).toBeVisible();

    // Verificamos la unidad restante antes de comprobar la ausencia.
    // Así una tabla vacía durante la carga no alcanza para pasar.
    await unidadesPage.verificarUnidad(
      '101',
      'ARS',
      '0,00'
    );

    await unidadesPage.verificarUnidadAusente('102');

    await expect(
      unidadesPage.filas
    ).toHaveCount(1);

    await expect(
      page.getByText('1 filas', { exact: true })
    ).toBeVisible();
  });
});
