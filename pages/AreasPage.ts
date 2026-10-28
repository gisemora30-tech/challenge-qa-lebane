import { expect, type Page, type Locator } from '@playwright/test';

export class AreasPage {
  readonly page: Page;
  readonly precioM2Input: Locator;
  readonly pisosInput: Locator;
  readonly unidadesPorPisoInput: Locator;
  readonly tipologiasInput: Locator;
  readonly nombreListaInput: Locator;
  readonly guardarButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.precioM2Input = page.locator(
      'input[name="precioListaMetroCuadrado"]'
    );

    this.pisosInput = page.locator(
      'input[name="pisos"]'
    );

    this.unidadesPorPisoInput = page.locator(
      'input[name="unidadesPorPiso"]'
    );

    this.tipologiasInput = page.locator(
      '[data-cy="new-renderer-field-tipologias"]'
    );

    this.nombreListaInput = page.locator(
      'input[name="versionListaPrecios"]'
    );

    this.guardarButton = page.getByRole('button', {
      name: 'Guardar',
      exact: true,
    });
  }

  async completarConfiguracion(nombreLista: string) {
    await this.precioM2Input.fill('2000');
    await this.pisosInput.fill('1');
    await this.unidadesPorPisoInput.fill('2');

    await this.tipologiasInput.fill('Dos ambientes');

    await this.page.getByRole('option', {
      name: 'Dos ambientes',
      exact: true,
    }).click();

    await this.tipologiasInput.press('Escape');

    await this.nombreListaInput.fill(nombreLista);

    await expect(this.nombreListaInput).toHaveValue(
      nombreLista
    );
  }

  async guardar() {
    await this.guardarButton.click();

    await expect(
      this.page.getByText(/[ÁA]reas del proyecto creadas/i)
    ).toBeVisible();
  }

  async abrirUnidades() {
    await this.page.getByRole('tab', {
      name: 'Unidades',
      exact: true,
    }).click();
  }

  async verificarListaInicial(nombreLista: string) {
    const listaButton = this.page
      .locator('span[aria-label]')
      .filter({
        has: this.page.getByRole('button', {
          name: nombreLista,
          exact: true,
        }),
      })
      .getByRole('button');

    await expect(listaButton).toBeVisible();
    await expect(listaButton).toHaveText(nombreLista);

    await expect(
      this.page.getByText('101', { exact: true })
    ).toBeVisible();

    await expect(
      this.page.getByText('102', { exact: true })
    ).toBeVisible();

    await expect(
      this.page.getByText('2 filas', { exact: true })
    ).toBeVisible();
  }
}