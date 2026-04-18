import { test, expect } from "@playwright/test"

/**
 * E2E — Autenticación
 * Requiere backend corriendo + usuario admin_e2e creado.
 * Crear con: python manage.py shell -c "
 *   from django.contrib.auth.models import User
 *   from apps.usuarios.models import PerfilUsuario
 *   u = User.objects.create_user('admin_e2e', password='E2Etest1234!')
 *   PerfilUsuario.objects.create(user=u, rol='admin')
 * "
 */

const USER = { username: "admin_e2e", password: "E2Etest1234!" }

test.describe("Login / Logout", () => {
  test("página de login renderiza campos y botón", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByPlaceholder(/ingresá tu usuario/i)).toBeVisible()
    await expect(page.getByPlaceholder("••••••••")).toBeVisible()
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible()
  })

  test("credenciales inválidas muestran error", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder(/ingresá tu usuario/i).fill("noexiste")
    await page.getByPlaceholder("••••••••").fill("malclave")
    await page.getByRole("button", { name: /iniciar sesión/i }).click()
    await expect(page.getByText(/usuario o contraseña incorrectos/i)).toBeVisible()
  })

  test("usuario no autenticado es redirigido al login", async ({ page }) => {
    await page.goto("/clientes")
    await expect(page).toHaveURL(/\/login/)
  })

  test("login exitoso lleva al dashboard", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder(/ingresá tu usuario/i).fill(USER.username)
    await page.getByPlaceholder("••••••••").fill(USER.password)
    await page.getByRole("button", { name: /iniciar sesión/i }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByText("Dashboard")).toBeVisible()
  })

  test("logout limpia sesión y redirige a login", async ({ page }) => {
    // Login
    await page.goto("/login")
    await page.getByPlaceholder(/ingresá tu usuario/i).fill(USER.username)
    await page.getByPlaceholder("••••••••").fill(USER.password)
    await page.getByRole("button", { name: /iniciar sesión/i }).click()
    await expect(page).toHaveURL("/")

    // Logout
    await page.getByRole("button", { name: /cerrar sesión|salir|logout/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
