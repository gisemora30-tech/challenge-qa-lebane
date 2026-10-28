/// <reference types="node" />

import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import { access } from 'node:fs/promises';
import { LoginPage } from '../pages/LoginPage';
import { ProyectoPage } from '../pages/ProyectoPage';
import { AreasPage } from '../pages/AreasPage';
import { UnidadesPage } from '../pages/UnidadesPage';
import { ImportacionPage } from '../pages/ImportacionPage';

type UnidadProyecto = {
  id: number;
  numero: string;
};

type RespuestaProyecto = {
  id: number;
  unidades: UnidadProyecto[];
};

test('Eliminar la última unidad, su lista y verificar que la unidad desaparece del proyecto', async ({
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

  await access(rutaArchivo);

  const identificador = Date.now();
  const nombreProyecto = `QA Ultima unidad - ${identificador}`;
  const nombreListaInicial = `Lista inicial QA - ${identificador}`;

  let proyectoId = '';
  let nombreListaImportada = '';
  let urlConsultaProyecto = '';
  let autorizacion: string | undefined;

  let idsIniciales: number[] = [];
  let idUnidad201 = 0;
  let idUnidad202 = 0;

  const loginPage = new LoginPage(page);
  const proyectoPage = new ProyectoPage(page);
  const areasPage = new AreasPage(page);
  const unidadesPage = new UnidadesPage(page);
  const importacionPage = new ImportacionPage(page);

  const consultarUnidadesProyecto =
    async (): Promise<UnidadProyecto[]> => {
      const respuesta = await page.request.get(
        urlConsultaProyecto,
        {
          headers: autorizacion
            ? { authorization: autorizacion }
            : {},
          maxRedirects: 0,
        }
      );

      expect(
        respuesta.ok(),
        'La consulta del proyecto debe responder correctamente'
      ).toBeTruthy();

      const datos =
        await respuesta.json() as RespuestaProyecto;

      expect(datos.id).toBe(Number(proyectoId));

      expect(
        Array.isArray(datos.unidades),
        'El proyecto debe incluir el arreglo unidades'
      ).toBe(true);

      return datos.unidades;
    };

  const verificarListaEliminada = async () => {
    await areasPage.verificarListaInicial(
      nombreListaInicial
    );

    await expect(unidadesPage.filas).toHaveCount(2);

    await page.getByRole('button', {
      name: nombreListaInicial,
      exact: true,
    }).click();

    const menu = page.getByRole('menu');

    await expect(menu).toBeVisible();

    await expect(
      menu.getByText(nombreListaInicial, {
        exact: true,
      })
    ).toBeVisible();

    await expect(
      menu.getByText(nombreListaImportada, {
        exact: true,
      })
    ).toHaveCount(0);

    const fondoMenu = page.locator(
      '.MuiPopover-root.MuiModal-root .MuiBackdrop-root'
    );

    await expect(fondoMenu).toHaveCount(1);

    await fondoMenu.click({
      position: { x: 1, y: 1 },
    });

    await expect(
      page.locator('[role="menu"]')
    ).toBeHidden();

    await expect(
      page.locator('#root')
    ).not.toHaveAttribute('aria-hidden', 'true');
  };

  const verificarUnidadesEliminadasDelProyecto = async () => {
    const idsEsperados = [...idsIniciales].sort(
      (a, b) => a - b
    );

    await expect.poll(
      async () => {
        const unidades = await consultarUnidadesProyecto();

        return unidades
          .map((unidad) => unidad.id)
          .sort((a, b) => a - b);
      },
      {
        message:
          'El proyecto debe conservar únicamente las unidades iniciales',
      }
    ).toEqual(idsEsperados);

    const unidades = await consultarUnidadesProyecto();
    const idsActuales = unidades.map((unidad) => unidad.id);

    expect(idsActuales).not.toContain(idUnidad201);
    expect(idsActuales).not.toContain(idUnidad202);
  };

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

  await test.step('Crear la lista inicial y obtener sus unidades', async () => {
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

    const coincidencia = new URL(page.url()).pathname.match(
      /\/proyecto\/(\d+)/
    );

    if (!coincidencia) {
      throw new Error(
        `No se pudo obtener el ID del proyecto desde: ${page.url()}`
      );
    }

    proyectoId = coincidencia[1];

    const [respuestaProyecto] = await Promise.all([
      page.waitForResponse((respuesta) => {
        const url = new URL(respuesta.url());

        return (
          respuesta.request().method() === 'GET' &&
          url.pathname === `/proyect/${proyectoId}` &&
          respuesta.status() === 200
        );
      }),

      (async () => {
        await page.goto(`/proyecto/${proyectoId}/areas`, {
          waitUntil: 'commit',
        });

        await areasPage.abrirUnidades();

        await areasPage.verificarListaInicial(
          nombreListaInicial
        );
      })(),
    ]);

    // Reutilizamos una consulta real, sin imprimir autenticación.
    urlConsultaProyecto = respuestaProyecto.url();

    const headers =
      await respuestaProyecto.request().allHeaders();

    autorizacion = headers.authorization;

    const unidades = await consultarUnidadesProyecto();

    expect(
      unidades.map((unidad) => unidad.numero).sort()
    ).toEqual(['101', '102']);

    idsIniciales = unidades.map((unidad) => unidad.id);
  });

  await test.step('Importar otra lista y comprobar que el proyecto contiene ambas', async () => {
    nombreListaImportada = await importacionPage.importarArchivo(
      rutaArchivo
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

    const unidades = await consultarUnidadesProyecto();

    expect(unidades).toHaveLength(4);

    expect(
      unidades.map((unidad) => unidad.numero).sort()
    ).toEqual(['101', '102', '201', '202']);

    const unidad201 = unidades.find(
      (unidad) => unidad.numero === '201'
    );

    const unidad202 = unidades.find(
      (unidad) => unidad.numero === '202'
    );

    if (!unidad201 || !unidad202) {
      throw new Error(
        'No se encontraron las unidades importadas en el proyecto'
      );
    }

    idUnidad201 = unidad201.id;
    idUnidad202 = unidad202.id;

    expect(
      unidades.map((unidad) => unidad.id)
    ).toEqual(expect.arrayContaining(idsIniciales));
  });

  await test.step('Eliminar 202 y dejar una sola unidad en la lista', async () => {
    await unidadesPage.eliminarUnidad(
      '202',
      nombreListaImportada
    );

    await unidadesPage.verificarUnidad(
      '201',
      'ARS',
      '150.000'
    );

    await expect(unidadesPage.filas).toHaveCount(1);

    await expect(
      page.getByRole('button', {
        name: nombreListaImportada,
        exact: true,
      })
    ).toBeVisible();
  });

  await test.step('Verificar el aviso y eliminar la última unidad', async () => {
    const fila201 = unidadesPage.filas.filter({
      has: page
        .locator('td[data-column-id="numero"]')
        .getByText('201', { exact: true }),
    });

    await expect(fila201).toHaveCount(1);

    await fila201
      .locator('td[data-column-id="menu"]')
      .getByRole('button')
      .click();

    const confirmacion = page.getByRole('dialog').filter({
      has: page.getByText('Eliminar unidad', {
        exact: true,
      }),
    });

    await expect(confirmacion).toBeVisible();

    await expect(confirmacion).toContainText(
      'unidad 201'
    );

    await expect(confirmacion).toContainText(
      nombreListaImportada
    );

    await expect(confirmacion).toContainText(
      'Al quitar esta unidad, la lista de precios quedará vacia y será eliminada.'
    );

    await confirmacion.getByRole('button', {
      name: 'Confirmar',
      exact: true,
    }).click();

    await expect(confirmacion).toBeHidden();
  });

  await test.step('Caso 6: verificar que desapareció la lista vacía', async () => {
    await verificarListaEliminada();
  });

  await test.step('Caso 7: verificar que las unidades sin lista desaparecieron del proyecto', async () => {
    await verificarUnidadesEliminadasDelProyecto();
  });

  await test.step('Recargar y verificar la persistencia de ambos resultados', async () => {
    await page.reload({ waitUntil: 'commit' });
    await areasPage.abrirUnidades();

    await verificarListaEliminada();
    await verificarUnidadesEliminadasDelProyecto();
  });
});