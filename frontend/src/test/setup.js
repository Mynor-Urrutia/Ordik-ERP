import "@testing-library/jest-dom"
import { vi } from "vitest"

// localStorage mock
const storage = {}
Object.defineProperty(window, "localStorage", {
  value: {
    getItem:    (k)    => storage[k] ?? null,
    setItem:    (k, v) => { storage[k] = String(v) },
    removeItem: (k)    => { delete storage[k] },
    clear:      ()     => { Object.keys(storage).forEach(k => delete storage[k]) },
  },
})

// window.alert mock — evita "not implemented" noise en jsdom
window.alert = vi.fn()
window.prompt = vi.fn()
