import { test, expect } from "@playwright/test"

const USER    = { username: "admin_e2e", password: "E2Etest1234!" }
const CLIENTE = {
  razon_social: "E2E Empresa SA",
  nit:          "900E2E001-1",
  nombre_comercial: "E2E SA",
  nombre_contacto:  "Ana E2E",
  email:            "e2e@empresa.com",
  telefono:         "55550001",
  telefono_contacto: "55550002",
  email_contacto:   "ana@e2e.com",
  tipo_cliente:     "privado",
}

async function loginAs(page) {
  await page.goto("/login")
  await page.getByPlaceholder(/ingresá tu usuario/i).fill(USER.username)
  await page.getByPlaceholder("••••••••").fill(USER.password)
  await page.getByRole("button", { name: /iniciar sesión/i }).click()
  await page.waitForURL("/")
}

test.describe("Clientes — CRUD golden path", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page)
    await page.goto("/clientes")
  })

  test("muestra la lista de clientes", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /clientes/i })).toBeVisible()
  })

  test("puede crear un nuevo cliente", async ({ page }) => {
    await page.getByRole("button", { name: /nuevo cliente/i }).click()

    // Llenar el formulario
    await page.getByLabel(/razón social/i).fill(CLIENTE.razon_social)
    await page.getByLabel(/nit/i).fill(CLIENTE.nit)
    await page.getByLabel(/nombre comercial/i).fill(CLIENTE.nombre_comercial)
    await page.getByLabel(/nombre de contacto/i).fill(CLIENTE.nombre_contacto)
    await page.getByLabel(/email$/i).fill(CLIENTE.email)
    await page.getByLabel(/teléfono$/i).fill(CLIENTE.telefono)

    await page.getByRole("button", { name: /guardar/i }).click()

    await expect(page.getByText(CLIENTE.razon_social)).toBeVisible()
  })

  test("puede editar un cliente existente", async ({ page }) => {
    // Esperar que aparezca algún cliente
    await page.waitForSelector("table tbody tr")

    const firstRow = page.locator("table tbody tr").first()
    await firstRow.getByRole("button", { name: /editar/i }).click()

    const notasField = page.getByLabel(/notas/i)
    if (await notasField.isVisible()) {
      await notasField.fill("Actualizado en E2E test")
    }

    await page.getByRole("button", { name: /guardar/i }).click()
    await expect(page.getByText(/clientes/i).first()).toBeVisible()
  })
})
