/// <reference types="node" />

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('Ingresar a Lebane con credenciales válidas', async ({ page }) => {
  const email = process.env.LEBANE_EMAIL;
  const password = process.env.LEBANE_PASSWORD;

  // Comprobamos que las credenciales estén configuradas.
  if (!email || !password) {
    throw new Error(
      'Faltan LEBANE_EMAIL o LEBANE_PASSWORD en el archivo .env'
    );
  }

  // Creamos el objeto que contiene las acciones del login.
  const loginPage = new LoginPage(page);

  // Abrimos el login e ingresamos las credenciales.
  await loginPage.abrir();
  await loginPage.iniciarSesion(email, password);

  // Verificamos que aparezca una opción de la pantalla principal.
  await expect(
    page.getByRole('button', {
      name: 'Agregar proyecto',
      exact: true,
    })
  ).toBeVisible();
});