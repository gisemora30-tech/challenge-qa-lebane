import { expect, type Locator, type Page } from '@playwright/test';

export class UnidadesPage {
  readonly page: Page;
  readonly tabla: Locator;
  readonly filas: Locator;
  readonly adicionarUnidadButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.tabla = page.locator(
      '[data-table-id="units-table"] table'
    );

    this.filas = this.tabla.locator('tbody tr');

    this.adicionarUnidadButton = page.getByRole('button', {
      name: 'Adicionar unidad',
      exact: true,
    });
  }

  private filaPorNumero(numero: string): Locator {
    return this.filas.filter({
      has: this.page
        .locator('td[data-column-id="numero"]')
        .getByText(numero, { exact: true }),
    });
  }

  private celda(fila: Locator, columna: string): Locator {
    return fila.locator(`td[data-column-id="${columna}"]`);
  }

  async adicionarUnidad(numero: string): Promise<void> {
    await expect(this.tabla).toBeVisible();

    await expect(this.filaPorNumero(numero)).toHaveCount(0);

    const celdasNumero = this.filas.locator(
      'td[data-column-id="numero"]'
    );

    const numerosAnteriores = (
      await celdasNumero.allTextContents()
    ).map((texto) => texto.trim());

    await this.adicionarUnidadButton.click();

    let numeroInicial = '';

    await expect.poll(
      async () => {
        const numerosActuales = (
          await celdasNumero.allTextContents()
        ).map((texto) => texto.trim());

        const nuevos = numerosActuales.filter(
          (valor) => !numerosAnteriores.includes(valor)
        );

        if (nuevos.length === 1) {
          numeroInicial = nuevos[0];
        }

        return nuevos.length;
      },
      {
        message: 'Debe aparecer una única fila nueva de unidad',
      }
    ).toBe(1);

    const filaNueva = this.filas.filter({
      has: this.page
        .locator('td[data-column-id="numero"]')
        .filter({ hasText: this.textoExacto(numeroInicial) }),
    });

    await expect(filaNueva).toHaveCount(1);

    await this.celda(filaNueva, 'numero')
      .locator(':scope > div')
      .click();

    const editorNumero = this.page
      .getByRole('tooltip')
      .getByPlaceholder('Valor...', { exact: true });

    await expect(editorNumero).toBeVisible();
    await editorNumero.fill(numero);
    await editorNumero.press('Enter');

    await expect(editorNumero).toBeHidden();
    await expect(this.filaPorNumero(numero)).toHaveCount(1);
  }

  async cambiarMoneda(
    numero: string,
    moneda: 'ARS' | 'USD'
  ): Promise<void> {
    const celdaMoneda = this.celda(
      this.filaPorNumero(numero),
      'moneda'
    );

    await celdaMoneda.getByTitle(/.+/).click();

    const editorMoneda = this.page
      .getByRole('tooltip')
      .filter({
        has: this.page.getByPlaceholder(
          'Buscar una opción',
          { exact: true }
        ),
      });

    await expect(editorMoneda).toBeVisible();

    await editorMoneda.getByTitle(moneda, {
      exact: true,
    }).click();

    await expect(celdaMoneda).toHaveText(moneda);

    await this.page.getByRole('tab', {
      name: 'Unidades',
      exact: true,
    }).click();

    await expect(editorMoneda).toBeHidden();
  }

  async completarPrecio(
    numero: string,
    precio: number
  ): Promise<void> {
    const celdaPrecio = this.celda(
      this.filaPorNumero(numero),
      'precio'
    );

    await celdaPrecio
      .locator(':scope > div')
      .click();

    const editorPrecio = this.page
      .getByRole('tooltip')
      .getByPlaceholder('Valor...', { exact: true });

    await expect(editorPrecio).toBeVisible();
    await editorPrecio.fill(String(precio));
    await editorPrecio.press('Enter');

    // Enter puede dejar el editor abierto.
    // Hacemos clic fuera para finalizar la edición.
    await this.page.getByRole('tab', {
      name: 'Unidades',
      exact: true,
    }).click();

    await expect(editorPrecio).toBeHidden();

    const precioFormateado = new Intl.NumberFormat(
      'es-AR',
      {
        maximumFractionDigits: 0,
      }
    ).format(precio);

    await expect(celdaPrecio).toHaveText(precioFormateado);
  }

  async eliminarUnidad(
    numero: string,
    nombreLista: string
  ): Promise<void> {
    const fila = this.filaPorNumero(numero);

    await expect(fila).toHaveCount(1);

    // La columna menu contiene la papelera de esta unidad.
    await this.celda(fila, 'menu')
      .getByRole('button')
      .click();

    const confirmacion = this.page.getByRole('dialog').filter({
      has: this.page.getByText('Eliminar unidad', {
        exact: true,
      }),
    });

    await expect(confirmacion).toBeVisible();

    // Comprobamos el destino antes de confirmar la eliminación.
    await expect(confirmacion).toContainText(
      `unidad ${numero}`
    );

    await expect(confirmacion).toContainText(nombreLista);

    await confirmacion.getByRole('button', {
      name: 'Confirmar',
      exact: true,
    }).click();

    await expect(confirmacion).toBeHidden();

    await this.verificarUnidadAusente(numero);
  }

  async verificarUnidadAusente(numero: string): Promise<void> {
    await expect(
      this.filaPorNumero(numero)
    ).toHaveCount(0);
  }

  async verificarUnidad(
    numero: string,
    moneda: string,
    precioVisible: string
  ): Promise<void> {
    const fila = this.filaPorNumero(numero);

    await expect(fila).toHaveCount(1);

    await expect(
      this.celda(fila, 'numero')
    ).toHaveText(numero);

    await expect(
      this.celda(fila, 'moneda')
    ).toHaveText(moneda);

    await expect(
      this.celda(fila, 'precio')
    ).toHaveText(precioVisible);
  }

  private textoExacto(texto: string): RegExp {
    const textoEscapado = texto.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    return new RegExp(`^\\s*${textoEscapado}\\s*$`);
  }
}