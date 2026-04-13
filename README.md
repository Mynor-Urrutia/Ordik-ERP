# Ordik ERP

Sistema ERP interno construido con Django REST Framework + React 18.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Django 5 + Django REST Framework |
| Frontend | React 18 + Vite + Tailwind CSS |
| Base de datos | MySQL (utf8mb4, timezone `America/Guatemala`) |
| PDF | ReportLab |

---

## Módulos

| Módulo | API | Descripción |
|--------|-----|-------------|
| Clientes | `/api/clientes/` | Gestión de clientes con NIT |
| Proveedores | `/api/proveedores/` | Gestión de proveedores |
| Órdenes de Trabajo | `/api/ordenes-trabajo/` | OTs vinculadas a clientes y cotizaciones |
| Cotizaciones | `/api/cotizaciones/` | Cotizaciones con IVA + ISR por línea, exportación PDF |
| Inventario | `/api/inventario/` | Productos + CARDEX (ledger de movimientos inmutable) |
| Compras | `/api/compras/` | Compras header/detalle vinculadas a proveedores e inventario |
| Maestros | `/api/maestros/` | Tablas de referencia (tipos de pago, tipos de producto, etc.) |

---

## Requisitos previos

- Python 3.11+
- Node.js 18+
- MySQL 8+

---

## Instalación

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Creá el archivo `.env` en `backend/` con:

```env
SECRET_KEY=tu-secret-key
DB_NAME=ordik_erp
DB_USER=tu-usuario
DB_PASSWORD=tu-password
DB_HOST=localhost
DB_PORT=3306
```

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver        # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

Vite proxea `/api/*` → `http://localhost:8000` — sin problemas de CORS en desarrollo.

---

## Estructura del proyecto

```
backend/
├── manage.py
├── requirements.txt
├── config/
│   ├── settings/
│   │   ├── base.py          # Configuración compartida
│   │   ├── development.py   # DEBUG=True, CORS abierto
│   │   └── production.py    # Variables desde entorno
│   └── urls.py
└── apps/
    ├── clientes/
    ├── proveedores/
    ├── ordenes_trabajo/
    ├── cotizaciones/
    ├── inventario/
    ├── compras/
    └── maestros/

frontend/
├── vite.config.js
└── src/
    ├── App.jsx
    ├── components/ui/       # DataTable, Modal, Layout reutilizables
    ├── pages/               # Un folder por módulo
    └── services/api/        # Axios por módulo
```

---

## Comandos útiles

```bash
# Correr tests (backend)
python manage.py test

# Correr tests de un módulo específico
python manage.py test apps.clientes

# Build frontend
cd frontend && npm run build

# Lint frontend
cd frontend && npm run lint
```

---

## Decisiones de diseño

- **CARDEX inmutable**: los movimientos de inventario no se pueden editar ni eliminar — solo GET y POST.
- **Stock automático**: `MovimientoInventario.save()` actualiza `stock_actual` del producto automáticamente.
- **Cotizaciones**: `subtotal_unitario` y `total` son propiedades calculadas (no columnas en DB).
- **Compras**: modelo header/detalle — `Compra` + `CompraItem` con serializer anidado.

---

## Pendiente (producción)

- [ ] Autenticación — JWT o session
- [ ] Variables de entorno de producción
- [ ] `collectstatic`
- [ ] Configuración gunicorn + nginx
