/**
 * Helpers compartidos para los tests E2E.
 * Requiere que el backend Django esté corriendo en localhost:8000
 * con un usuario de prueba: usuario=admin_e2e / pass=E2Etest1234!
 */

export const ADMIN_USER = { username: "admin_e2e", password: "E2Etest1234!" }
export const BASE_URL   = "http://localhost:5173"

export async function login(page, { username, password } = ADMIN_USER) {
  await page.goto("/login")
  await page.getByPlaceholder(/ingresá tu usuario/i).fill(username)
  await page.getByPlaceholder("••••••••").fill(password)
  await page.getByRole("button", { name: /iniciar sesión/i }).click()
  await page.waitForURL("/")
}

export async function createAdminUser(apiContext) {
  // Crea el usuario de prueba directo contra la API Django si no existe.
  // Llamado una sola vez en globalSetup.
  await apiContext.post("http://localhost:8000/api/usuarios/", {
    data: {
      username:  ADMIN_USER.username,
      password:  ADMIN_USER.password,
      email:     "e2e@test.com",
      first_name: "E2E",
      last_name:  "Admin",
      rol:        "admin",
    },
  })
}
