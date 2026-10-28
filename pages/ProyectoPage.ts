import { expect, type Page, type Locator } from '@playwright/test';

export type DatosProyecto = {
  nombre: string;
  moneda: string;
  pais: string;
  estado: string;
  ciudad: string;
  direccion: string;
  numero: string;
  fechaInicio: string;
  fechaFin: string;
  tipoConstruccion: string;
  modalidadAjuste: string;
  razonSocial: string;
};

export class ProyectoPage {
  readonly page: Page;
  readonly nombreInput: Locator;
  readonly monedaInput: Locator;
  readonly paisInput: Locator;
  readonly estadoInput: Locator;
  readonly ciudadInput: Locator;
  readonly direccionInput: Locator;
  readonly numeroInput: Locator;
  readonly fechaInicioInput: Locator;
  readonly fechaFinInput: Locator;
  readonly tipoConstruccionInput: Locator;
  readonly modalidadAjusteInput: Locator;
  readonly razonSocialInput: Locator;
  readonly registrarButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nombreInput = page.locator(
      'input[name="nombreProyecto"]'
    );

    this.monedaInput = page.locator(
      '[data-cy="new-renderer-field-moneda"]'
    );

    this.paisInput = page.locator(
      '[data-cy="new-renderer-field-pais"]'
    );

    this.estadoInput = page.locator(
      '[data-cy="new-renderer-field-estado"]'
    );

    this.ciudadInput = page.locator(
      '[data-cy="new-renderer-field-ciudad"]'
    );

    this.direccionInput = page.locator(
      '[data-cy="new-renderer-field-calle"]'
    );

    this.numeroInput = page.locator(
      '[data-cy="new-renderer-field-numeroPuerta"]'
    );

    this.fechaInicioInput = page.locator(
      '[data-cy="new-renderer-field-fechaInicio"]'
    );

    this.fechaFinInput = page.locator(
      '[data-cy="new-renderer-field-fechaFin"]'
    );

    this.tipoConstruccionInput = page.locator(
      '[data-cy="new-renderer-field-tipoConstruccion"]'
    );

    this.modalidadAjusteInput = page.locator(
      '[data-cy="new-renderer-field-modalidadAjuste"]'
    );

    this.razonSocialInput = page
      .locator('[name="razonSocial"]')
      .getByRole('combobox');

    this.registrarButton = page.getByRole('button', {
      name: 'Registrar',
      exact: true,
    });
  }

  async abrirDesdeInicio() {
    // Registramos las esperas antes de abrir el formulario.
    const [respuestaMonedas, respuestaRazonesSociales] =
      await Promise.all([
        this.page.waitForResponse((respuesta) => {
          const url = new URL(respuesta.url());

          return (
            respuesta.request().method() === 'GET' &&
            url.pathname === '/monedas/all' &&
            respuesta.status() === 200
          );
        }),

        this.page.waitForResponse((respuesta) => {
          const url = new URL(respuesta.url());

          return (
            respuesta.request().method() === 'GET' &&
            url.pathname === '/razon-social/all' &&
            respuesta.status() === 200
          );
        }),

        this.page.getByRole('button', {
          name: 'Agregar proyecto',
          exact: true,
        }).click(),
      ]);

    // Esperamos también la recepción completa de ambos cuerpos.
    await Promise.all([
      respuestaMonedas.finished(),
      respuestaRazonesSociales.finished(),
    ]);

    await expect(this.nombreInput).toBeVisible();
    await expect(this.monedaInput).toBeEditable();
  }

  private async seleccionarOpcion(
    campo: Locator,
    valor: string
  ) {
    await expect(campo).toBeEditable();
    await campo.fill(valor);

    await this.page.getByRole('option', {
      name: valor,
      exact: true,
    }).click();

    await expect(campo).toHaveValue(valor);
  }

  private async completarFecha(
    campo: Locator,
    fecha: string
  ) {
    await expect(campo).toBeVisible();
    await expect(campo).toBeEditable();

    // Cargamos la fecha completa.
    await campo.fill(fecha);
    await expect(campo).toHaveValue(fecha);

    // Comprobamos que el formulario la conserve al salir.
    await campo.press('Tab');
    await expect(campo).toHaveValue(fecha);
  }

  async completarFormulario(datos: DatosProyecto) {
    await this.nombreInput.fill(datos.nombre);

    await this.seleccionarOpcion(
      this.monedaInput,
      datos.moneda
    );

    await this.seleccionarOpcion(
      this.paisInput,
      datos.pais
    );

    await this.seleccionarOpcion(
      this.estadoInput,
      datos.estado
    );

    await this.seleccionarOpcion(
      this.ciudadInput,
      datos.ciudad
    );

    await this.direccionInput.fill(datos.direccion);
    await this.numeroInput.fill(datos.numero);

    await this.completarFecha(
      this.fechaInicioInput,
      datos.fechaInicio
    );

    await this.completarFecha(
      this.fechaFinInput,
      datos.fechaFin
    );

    await this.seleccionarOpcion(
      this.tipoConstruccionInput,
      datos.tipoConstruccion
    );

    await this.seleccionarOpcion(
      this.modalidadAjusteInput,
      datos.modalidadAjuste
    );

    await this.seleccionarOpcion(
      this.razonSocialInput,
      datos.razonSocial
    );
  }
}