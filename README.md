# Ordik ERP

Sistema ERP interno construido con Django REST Framework + React 18, orientado a empresas de servicios y ferretería en Guatemala.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Django 5 + Django REST Framework |
| Frontend | React 18 + Vite + Tailwind CSS |
| Base de datos | MySQL (utf8mb4, timezone `America/Guatemala`) |
| PDF | ReportLab (OC, Cotizaciones, Inventario) |

---

## Módulos

| Módulo | API | Descripción |
|--------|-----|-------------|
| Clientes | `/api/clientes/` | Perfil 360°: datos, sector, historial de OTs y cotizaciones, KPIs |
| Proveedores | `/api/proveedores/` | Perfil con historial de compras, KPIs, clasificación por categoría e info bancaria |
| Órdenes de Trabajo | `/api/ordenes-trabajo/` | OTs vinculadas a clientes y cotizaciones |
| Cotizaciones | `/api/cotizaciones/` | Cotizaciones con IVA + ISR por línea, exportación PDF, creación de OT desde cotización |
| Inventario | `/api/inventario/` | Productos + KARDEX inmutable, unidades seriadas, exportación PDF |
| Compras | `/api/compras/` | OCs header/detalle, historial de cambios, movimientos de kardex vinculados, PDF profesional |
| Maestros | `/api/maestros/` | Tipos de pago, tipos de producto, tipos de trabajo, personal, marcas, modelos, empresa |

---

## Funcionalidades principales

### Cotizaciones
- Colores de estatus diferenciados: Borrador (gris), Enviada (azul), Aprobada (verde), Rechazada (rojo), Vencida (naranja)
- Modal de detalle con ítems, totales desglosados (subtotal / IVA / ISR) y condiciones comerciales
- Exportación a PDF con diseño profesional (logo empresa, condiciones, tabla de ítems, firmas)
- Creación de Orden de Trabajo directamente desde la cotización, pre-cargando ítems, tipo de trabajo y cliente

### Compras (Órdenes de Compra)
- Ciclo completo: Pendiente → Confirmada → En tránsito → Recibida → Cancelada
- Modal de detalle con 3 tabs: Productos solicitados, Recepción (comparativo solicitado vs recibido), Historial de cambios
- Datos financieros del proveedor (banco, número de cuenta, tipo de cuenta) visibles en el detalle y en el PDF
- PDF profesional para enviar al proveedor: datos de empresa, datos a facturar, lugar de entrega, tabla de ítems, totales con IVA, áreas de firma
- Movimientos de KARDEX vinculados automáticamente por correlativo de OC

### Inventario / KARDEX
- Filtro de stock en la columna: por defecto solo muestra productos con stock; toggle para incluir también los agotados
- Exportación PDF del listado en landscape A4 con indicador visual por nivel de stock (verde / amarillo / rojo) y leyenda
- El PDF respeta el filtro activo: incluye o excluye productos sin stock según el toggle
- KARDEX masivo: registro de múltiples entradas/salidas en una sola operación
- Soporte de unidades seriadas (números de serie individuales por unidad)
- Costo Promedio Ponderado (CPP) calculado automáticamente en cada entrada

### Proveedores
- Información financiera y bancaria visible en el perfil (banco, cuenta, tipo de cuenta, condición de pago preferida)

### Layout
- Logo adaptable: cambia entre logo claro y logo oscuro al alternar el modo de la interfaz (dark mode)

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

## Datos de demo

El repositorio incluye `backend/seed_ferreteria.py`, un script que popula la base de datos con datos realistas para una ferretería guatemalteca.

```bash
cd backend
python -c "
import sys, os, io
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import django; django.setup()
exec(open('seed_ferreteria.py', encoding='utf-8').read())
"
```

Genera:
- **Empresa**: Ferretería La Fortaleza, S.A. (NIT, dirección, datos de contacto)
- **Maestros**: 6 tipos de pago, 12 tipos de trabajo, 8 colaboradores, 10 tipos de producto, 10 marcas
- **Proveedores**: 6 proveedores con información bancaria completa
- **Clientes**: 10 clientes de distintos sectores (construcción, gobierno, salud, retail, etc.)
- **Productos**: 52 artículos en 10 categorías con stock, precios, ubicaciones y CPP
- **Compras**: 8 órdenes de compra con historial de cambios de estatus
- **Cotizaciones**: 10 cotizaciones con ítems, IVA y condiciones comerciales
- **Órdenes de Trabajo**: 10 OTs vinculadas a cotizaciones y clientes
- **KARDEX**: 35 movimientos (19 entradas por OC + 16 salidas por OT y uso interno)

---

## Estructura del proyecto

```
backend/
├── manage.py
├── requirements.txt
├── seed_ferreteria.py           # Script de datos demo
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
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
    ├── assets/                  # logos claro/oscuro para sidebar
    ├── components/ui/           # DataTable, Modal, Layout, Tooltip
    ├── hooks/                   # useTheme
    ├── pages/                   # Un folder por módulo
    └── services/api/            # Axios por módulo
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

- **KARDEX inmutable**: los movimientos de inventario no se pueden editar ni eliminar — solo GET y POST.
- **Stock automático**: `MovimientoInventario.save()` actualiza `stock_actual` y recalcula el CPP del producto en cada entrada.
- **Cotizaciones**: `subtotal_unitario` y `total` son propiedades calculadas (no columnas en DB).
- **Compras**: modelo header/detalle — `Compra` + `CompraItem` con serializer anidado. El correlativo se genera automáticamente al guardar.
- **KARDEX vinculado a OC**: las entradas se registran con `orden_compra = correlativo` para que el detalle de la OC muestre el comparativo solicitado vs recibido en tiempo real.
- **Generación de PDFs**: todos los PDFs se generan en el backend con ReportLab y se devuelven como `application/pdf` para descarga directa desde el frontend (patrón blob + anchor click).

---

## Pendiente (producción)

- [ ] Autenticación — JWT o session
- [ ] Variables de entorno de producción
- [ ] `collectstatic`
- [ ] Configuración gunicorn + nginx
