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
    await expect(page.getByRole("heading", { name: "Nuevo Cliente" })).toBeVisible()

    // Los inputs se identifican por placeholder (labels no tienen for= asociado)
    await page.getByPlaceholder("Nombre legal completo").fill(CLIENTE.razon_social)
    await page.getByPlaceholder(/ej: 1234567/i).fill(CLIENTE.nit)
    await page.getByPlaceholder("Marca o nombre de fantasía").fill(CLIENTE.nombre_comercial)

    await page.getByRole("button", { name: /crear cliente/i }).click()

    await expect(page.getByText(CLIENTE.razon_social)).toBeVisible({ timeout: 10000 })
  })

  test("puede editar un cliente existente", async ({ page }) => {
    await page.waitForSelector("table tbody tr")

    const firstRow = page.locator("table tbody tr").first()
    await firstRow.getByRole("button", { name: "Editar" }).click()
    await expect(page.getByText("Editar Cliente")).toBeVisible()

    // Cambiar nombre comercial como campo seguro de editar
    const nombreComercial = page.getByPlaceholder("Marca o nombre de fantasía")
    await nombreComercial.clear()
    await nombreComercial.fill("Actualizado E2E")

    await page.getByRole("button", { name: /actualizar cliente/i }).click()
    await expect(page.getByRole("heading", { name: /clientes/i })).toBeVisible({ timeout: 10000 })
  })
})
