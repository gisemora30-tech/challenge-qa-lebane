import { expect, type Locator, type Page } from '@playwright/test';
import * as path from 'node:path';

export class ImportacionPage {
  readonly page: Page;
  readonly menu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.menu = page.getByRole('menu');
  }

  async importarArchivo(rutaArchivo: string): Promise<string> {
    await this.page.getByRole('button', {
      name: 'Templates',
      exact: true,
    }).click();

    await this.menu.getByText(
      'Cargar Template de Unidades',
      { exact: true }
    ).click();

    const dialogoCarga = this.page.getByRole('dialog').filter({
      has: this.page.getByText(
        'Cargar Template de Unidades',
        { exact: true }
      ),
    });

    await expect(dialogoCarga).toBeVisible();

    const selectorArchivo = this.page.waitForEvent('filechooser');

    await dialogoCarga.getByText(
      'Seleccionar desde mi computadora',
      { exact: true }
    ).click();

    const archivo = await selectorArchivo;
    await archivo.setFiles(rutaArchivo);

    await expect(
      dialogoCarga.getByText(path.basename(rutaArchivo), {
        exact: true,
      })
    ).toBeVisible();

    const cargarButton = dialogoCarga.getByRole('button', {
      name: 'Cargar',
      exact: true,
    });

    await expect(cargarButton).toBeEnabled();
    await cargarButton.click();

    const tituloReporte = this.page.getByText(
      'Descarga de reporte de template',
      { exact: true }
    );

    await expect(tituloReporte).toBeVisible();

    await this.page.getByRole('button', {
      name: 'Cerrar',
      exact: true,
    }).click();

    await expect(tituloReporte).toBeHidden();

    await this.page.getByRole('tab', {
      name: 'Unidades',
      exact: true,
    }).click();

    await this.esperarPaginaAccesible();

    const nuevaListaButton = this.page.getByRole('button', {
      name: /^Lista precios \d{2}\/\d{2}\/\d{4}$/,
    });

    await expect(nuevaListaButton).toBeVisible();

    const numeros = this.page.locator(
      '[data-table-id="units-table"] tbody ' +
      'td[data-column-id="numero"]'
    );

    await expect(
      numeros.getByText('201', { exact: true })
    ).toBeVisible();

    await expect(
      numeros.getByText('202', { exact: true })
    ).toBeVisible();

    return (
      await nuevaListaButton.innerText()
    ).replace(/\s+/g, ' ').trim();
  }

  async seleccionarLista(
    nombreLista: string,
    otraLista: string
  ): Promise<void> {
    await this.esperarPaginaAccesible();

    const selector = this.page.getByRole('button', {
      name: nombreLista,
      exact: true,
    }).or(
      this.page.getByRole('button', {
        name: otraLista,
        exact: true,
      })
    );

    await expect(selector).toHaveCount(1);
    await expect(selector).toBeVisible();
    await selector.click();

    await expect(this.menu).toBeVisible();

    await expect(
      this.menu.getByText(nombreLista, { exact: true })
    ).toBeVisible();

    await expect(
      this.menu.getByText(otraLista, { exact: true })
    ).toBeVisible();

    await this.menu.getByText(nombreLista, {
      exact: true,
    }).click();

    // La aplicación oculta las opciones al seleccionar,
    // pero el modal del menú puede permanecer activo.
    await expect(
      this.page.locator('[role="menu"]')
    ).toBeHidden();

    const fondoMenu = this.page.locator(
      '.MuiPopover-root.MuiModal-root .MuiBackdrop-root'
    );

    // Si el modal sigue presente, cerramos con un clic fuera.
    if (
      await this.page.locator('#root').getAttribute(
        'aria-hidden'
      ) === 'true'
    ) {
      await expect(fondoMenu).toHaveCount(1);
      await expect(fondoMenu).toBeVisible();

      await fondoMenu.click({
        position: { x: 1, y: 1 },
      });

      await expect(fondoMenu).toBeHidden();
    }

    await this.esperarPaginaAccesible();

    await expect(
      this.page.getByRole('button', {
        name: nombreLista,
        exact: true,
      })
    ).toBeVisible();
  }

  private async esperarPaginaAccesible(): Promise<void> {
    const raiz = this.page.locator('#root');

    await expect(raiz).toBeAttached();

    await expect(raiz).not.toHaveAttribute(
      'aria-hidden',
      'true'
    );
  }
}