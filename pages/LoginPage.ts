import { expect, type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly ingresarButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');

    this.ingresarButton = page.getByRole('button', {
      name: 'Ingresar',
      exact: true,
    });
  }

  async abrir() {
    // Esperamos que empiece a cargar el documento.
    await this.page.goto('/sign-in', {
      waitUntil: 'commit',
      timeout: 30_000,
    });

    // Comprobamos que el formulario esté visible.
    await expect(this.emailInput).toBeVisible({
      timeout: 20_000,
    });
  }

  async iniciarSesion(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.ingresarButton.click();
  }
}