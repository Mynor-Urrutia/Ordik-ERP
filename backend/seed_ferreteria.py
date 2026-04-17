"""
Seed de demo — Ferretería La Fortaleza
Ejecutar con: python manage.py shell < seed_ferreteria.py
"""
import os, django, random
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone

from apps.maestros.models import (
    Marca, Modelo, TipoPago, TipoTrabajo, TipoEstatus,
    TipoServicio, Personal, TipoCliente, TipoProducto, EmpresaConfig,
)
from apps.clientes.models import Cliente
from apps.proveedores.models import Proveedor
from apps.inventario.models import Producto, MovimientoInventario
from apps.cotizaciones.models import Cotizacion, CotizacionItem
from apps.compras.models import Compra, CompraItem, CompraHistorial
from apps.ordenes_trabajo.models import OrdenTrabajo

print("── Empresa ──────────────────────────────────────────────")
empresa = EmpresaConfig.objects.create(
    razon_social="Ferretería La Fortaleza, S.A.",
    nombre_comercial="Ferretería La Fortaleza",
    nit="3847291-5",
    tipo_sociedad="Sociedad Anónima",
    direccion="6a Avenida 12-35, Zona 1",
    municipio="Guatemala",
    departamento="Guatemala",
    pais="Guatemala",
    telefono="+502 2238-4500",
    telefono_secundario="+502 5512-8844",
    email="info@ferreteriafortaleza.com.gt",
    email_facturacion="facturacion@ferreteriafortaleza.com.gt",
    sitio_web="https://www.ferreteriafortaleza.com.gt",
    regimen_fiscal="utilidades",
    numero_rtu="47382910",
    numero_patente="23-2019-047",
    representante_legal="Carlos Roberto Menéndez López",
    giro_comercial="Venta al por mayor y menor de materiales de construcción, herramientas, plomería, electricidad y productos para el hogar.",
    moneda="GTQ",
)
print(f"  ✓ {empresa}")

print("── Tipos de Pago ────────────────────────────────────────")
tp_contado   = TipoPago.objects.create(nombre="Contado",        dias_plazo=0)
tp_8         = TipoPago.objects.create(nombre="Crédito 8 días", dias_plazo=8)
tp_15        = TipoPago.objects.create(nombre="Crédito 15 días",dias_plazo=15)
tp_30        = TipoPago.objects.create(nombre="Crédito 30 días",dias_plazo=30)
tp_60        = TipoPago.objects.create(nombre="Crédito 60 días",dias_plazo=60)
tp_90        = TipoPago.objects.create(nombre="Crédito 90 días",dias_plazo=90)
print("  ✓ 6 tipos de pago")

print("── Tipos de Trabajo ─────────────────────────────────────")
trabajos = [
    "Instalación Eléctrica", "Instalación de Plomería", "Albañilería y Concreto",
    "Carpintería", "Herrería y Soldadura", "Pintura y Acabados",
    "Instalación de Techos", "Impermeabilización", "Instalación de Ventanas y Puertas",
    "Instalación de Pisos y Azulejos", "Reparación General", "Consultoría Técnica",
]
tipos_trabajo = [TipoTrabajo.objects.create(nombre=n) for n in trabajos]
print(f"  ✓ {len(tipos_trabajo)} tipos de trabajo")

print("── Tipos de Estatus ─────────────────────────────────────")
for nombre, modulo in [
    ("Borrador",    "cotizaciones"),
    ("Enviada",     "cotizaciones"),
    ("Aprobada",    "cotizaciones"),
    ("Rechazada",   "cotizaciones"),
    ("Vencida",     "cotizaciones"),
    ("Pendiente",   "ordenes_trabajo"),
    ("En proceso",  "ordenes_trabajo"),
    ("En espera",   "ordenes_trabajo"),
    ("Finalizada",  "ordenes_trabajo"),
    ("Cancelada",   "ordenes_trabajo"),
]:
    TipoEstatus.objects.create(nombre=nombre, modulo=modulo)
print("  ✓ estatus cargados")

print("── Tipos de Servicio ────────────────────────────────────")
servicios = [
    ("Instalación",              "Servicio de instalación de materiales y equipos"),
    ("Reparación",               "Diagnóstico y reparación de instalaciones existentes"),
    ("Asesoría Técnica",         "Orientación profesional para proyectos de construcción"),
    ("Mantenimiento Preventivo", "Revisión y mantenimiento periódico de instalaciones"),
    ("Diseño y Presupuesto",     "Elaboración de planos básicos y presupuestos de obra"),
    ("Suministro de Materiales", "Entrega de materiales en sitio de construcción"),
]
for nombre, desc in servicios:
    TipoServicio.objects.create(nombre=nombre, descripcion=desc)
print(f"  ✓ {len(servicios)} tipos de servicio")

print("── Personal ─────────────────────────────────────────────")
personal_data = [
    ("Carlos Menéndez",      "Gerente General",         "cmenendez@fortaleza.com.gt",   "+502 5512-8844"),
    ("Andrea Castillo",      "Jefa de Ventas",          "acastillo@fortaleza.com.gt",   "+502 5501-2233"),
    ("Roberto Ajú",          "Bodeguero",               "raju@fortaleza.com.gt",        "+502 4423-1100"),
    ("María José Pérez",     "Asesora Comercial",       "mjperez@fortaleza.com.gt",     "+502 5598-4477"),
    ("Luis Fernando Orantes","Técnico Instalador",      "lorantes@fortaleza.com.gt",    "+502 4411-5566"),
    ("Diana Recinos",        "Contadora",               "drecinos@fortaleza.com.gt",    "+502 5530-9988"),
    ("Héctor Samayoa",       "Técnico Electricista",    "hsamayoa@fortaleza.com.gt",    "+502 4402-7744"),
    ("Sofía Barrios",        "Atención al Cliente",     "sbarrios@fortaleza.com.gt",    "+502 5567-3322"),
]
personal = []
for nombre, cargo, email, tel in personal_data:
    p = Personal.objects.create(nombre=nombre, cargo=cargo, email=email, telefono=tel)
    personal.append(p)
print(f"  ✓ {len(personal)} colaboradores")

print("── Tipos de Cliente ─────────────────────────────────────")
for tc in ["Constructora", "Empresa Privada", "Persona Individual", "Gobierno / Institución", "Contratista", "Distribuidor"]:
    TipoCliente.objects.create(nombre=tc)
print("  ✓ tipos de cliente")

print("── Tipos de Producto ────────────────────────────────────")
tipos_prod = {
    "Herramientas Manuales":      TipoProducto.objects.create(nombre="Herramientas Manuales",      margen_ganancia=35, descripcion="Martillos, destornilladores, llaves, alicates"),
    "Herramientas Eléctricas":    TipoProducto.objects.create(nombre="Herramientas Eléctricas",    margen_ganancia=30, descripcion="Taladros, amoladoras, sierras eléctricas"),
    "Materiales de Construcción": TipoProducto.objects.create(nombre="Materiales de Construcción", margen_ganancia=20, descripcion="Cemento, block, arena, piedrín"),
    "Plomería":                   TipoProducto.objects.create(nombre="Plomería",                   margen_ganancia=40, descripcion="Tubería PVC, llaves, accesorios de agua"),
    "Electricidad":               TipoProducto.objects.create(nombre="Electricidad",               margen_ganancia=38, descripcion="Cable, breakers, tomacorrientes, interruptores"),
    "Pintura y Acabados":         TipoProducto.objects.create(nombre="Pintura y Acabados",          margen_ganancia=32, descripcion="Pinturas, selladores, thinner, brochas"),
    "Fijaciones y Tornillería":   TipoProducto.objects.create(nombre="Fijaciones y Tornillería",   margen_ganancia=45, descripcion="Tornillos, clavos, anclajes, remaches"),
    "Seguridad Industrial":       TipoProducto.objects.create(nombre="Seguridad Industrial",       margen_ganancia=40, descripcion="Cascos, guantes, lentes, botas, arneses"),
    "Adhesivos y Químicos":       TipoProducto.objects.create(nombre="Adhesivos y Químicos",       margen_ganancia=42, descripcion="Pegamentos, solventes, desengrasantes"),
    "Iluminación":                TipoProducto.objects.create(nombre="Iluminación",                margen_ganancia=35, descripcion="Focos LED, luminarias, reflectores"),
}
print(f"  ✓ {len(tipos_prod)} tipos de producto")

print("── Marcas y Modelos ─────────────────────────────────────")
marcas_raw = {
    "Stanley":    ["FatMax", "Black & Decker Series", "Control Grip"],
    "DeWalt":     ["XR Series", "Atomic", "Flexvolt"],
    "Truper":     ["Tforce", "Maxter", "Pro"],
    "3M":         ["Scotch", "Command", "Peltor"],
    "Surtek":     ["Industrial", "Doméstico"],
    "Philips":    ["CorePro LED", "SlimStyle", "Master"],
    "Durman":     ["Red", "Green", "Plus"],
    "Loctite":    ["Power Flex", "Super Glue", "Threadlocker"],
    "Tramontina": ["Pro", "Master", "Expert"],
    "Condumex":   ["THHW-LS", "XLPE", "THW"],
}
marcas = {}
for nombre_marca, modelos_list in marcas_raw.items():
    m = Marca.objects.create(nombre=nombre_marca)
    marcas[nombre_marca] = m
    for mod in modelos_list:
        Modelo.objects.create(marca=m, nombre=mod)
print(f"  ✓ {len(marcas)} marcas")

print("── Proveedores ──────────────────────────────────────────")
proveedores_data = [
    {
        "razon_social": "Distribuidora Ferretera Centroamericana, S.A.",
        "nit": "2847391-6", "nombre_comercial": "DisFerro GT",
        "tipo_proveedor": "Bienes",
        "direccion_comercial": "Calzada Aguilar Batres 45-12, Zona 12",
        "municipio": "Guatemala", "departamento": "Guatemala",
        "telefono": "+502 2440-1200", "email": "ventas@disferrogt.com",
        "nombre_contacto": "Marcos Fuentes", "telefono_contacto": "+502 5589-3344",
        "tipo_pago": "Crédito 30 días",
        "banco": "Banco Industrial", "numero_cuenta": "041-000847-2", "tipo_cuenta": "Monetaria",
        "notas": "Principal proveedor de herramientas manuales y eléctricas. Descuento del 8% por volumen.",
    },
    {
        "razon_social": "Importadora de Materiales Eléctricos Guatemala, S.A.",
        "nit": "4921073-8", "nombre_comercial": "ImeGuat",
        "tipo_proveedor": "Bienes",
        "direccion_comercial": "13 Calle 7-55, Zona 9",
        "municipio": "Guatemala", "departamento": "Guatemala",
        "telefono": "+502 2362-7700", "email": "pedidos@imeguat.com",
        "nombre_contacto": "Patricia Solano", "telefono_contacto": "+502 5534-8812",
        "tipo_pago": "Crédito 15 días",
        "banco": "Banco G&T Continental", "numero_cuenta": "200-1094873-5", "tipo_cuenta": "Monetaria",
        "notas": "Proveedor exclusivo de cable Condumex y tableros eléctricos.",
    },
    {
        "razon_social": "Tuberías y Accesorios de Guatemala, S.A.",
        "nit": "7364820-1", "nombre_comercial": "TuboGuat",
        "tipo_proveedor": "Bienes",
        "direccion_comercial": "Avenida Petapa 32-50, Zona 12",
        "municipio": "Mixco", "departamento": "Guatemala",
        "telefono": "+502 2449-3300", "email": "info@tuboguat.com",
        "nombre_contacto": "Jorge Gramajo", "telefono_contacto": "+502 4400-7788",
        "tipo_pago": "Contado",
        "banco": "Banrural", "numero_cuenta": "10-000-94830-2", "tipo_cuenta": "Ahorro",
        "notas": "Proveedor de tubería PVC Durman. Precios especiales para compras mayores a Q5,000.",
    },
    {
        "razon_social": "Pinturas y Acabados Industriales de Guatemala",
        "nit": "5512840-9", "nombre_comercial": "PinturAcabados GT",
        "tipo_proveedor": "Bienes",
        "direccion_comercial": "Boulevard Vista Hermosa 25-10, Zona 15",
        "municipio": "Guatemala", "departamento": "Guatemala",
        "telefono": "+502 2369-4400", "email": "ventas@pinturaacabadosgt.com",
        "nombre_contacto": "Claudia Hernández", "telefono_contacto": "+502 5578-2211",
        "tipo_pago": "Crédito 30 días",
        "banco": "Banco Agromercantil (BAM)", "numero_cuenta": "3000-47291-8", "tipo_cuenta": "Monetaria",
        "notas": "Distribuidor autorizado Sherwin-Williams y Pintura Centroamericana.",
    },
    {
        "razon_social": "Suministros de Seguridad Industrial GT, S.A.",
        "nit": "9034721-4", "nombre_comercial": "SeguriSuma",
        "tipo_proveedor": "Bienes",
        "direccion_comercial": "6a Calle 1-36, Zona 4",
        "municipio": "Guatemala", "departamento": "Guatemala",
        "telefono": "+502 2332-5500", "email": "seguridad@segurisuma.com",
        "nombre_contacto": "Roberto Cifuentes", "telefono_contacto": "+502 5590-6634",
        "tipo_pago": "Crédito 15 días",
        "banco": "Banco Internacional", "numero_cuenta": "00-284739-1", "tipo_cuenta": "Monetaria",
        "notas": "Equipo de protección personal 3M y Honeywell. Capacitaciones gratuitas.",
    },
    {
        "razon_social": "Fijaciones y Tornillería del Centro, S.A.",
        "nit": "6128430-7", "nombre_comercial": "FijaCentro",
        "tipo_proveedor": "Bienes",
        "direccion_comercial": "9a Avenida 14-22, Zona 1",
        "municipio": "Guatemala", "departamento": "Guatemala",
        "telefono": "+502 2232-1188", "email": "pedidos@fijacentro.com",
        "nombre_contacto": "Ana Velásquez", "telefono_contacto": "+502 4455-9900",
        "tipo_pago": "Contado",
        "banco": "Banco Industrial", "numero_cuenta": "041-001234-9", "tipo_cuenta": "Monetaria",
        "notas": "Tornillería importada de alta calidad. Entrega en 24 horas.",
    },
]
proveedores = []
for pd in proveedores_data:
    pv = Proveedor.objects.create(**pd)
    proveedores.append(pv)
print(f"  ✓ {len(proveedores)} proveedores")

print("── Clientes ─────────────────────────────────────────────")
clientes_data = [
    {
        "razon_social": "Constructora Moderna Guatemala, S.A.",
        "nit": "4738201-5", "nombre_comercial": "ConsMod GT",
        "tipo_cliente": "privado", "sector": "Construcción",
        "direccion_comercial": "15 Calle 5-22, Zona 10",
        "municipio": "Guatemala", "departamento": "Guatemala",
        "telefono": "+502 2366-9900", "email": "proyectos@consmodgt.com",
        "nombre_contacto": "Ing. Fernando Ruiz", "telefono_contacto": "+502 5512-3344",
        "email_contacto": "fruiz@consmodgt.com",
    },
    {
        "razon_social": "Residenciales Vista del Valle, S.A.",
        "nit": "8293741-2", "nombre_comercial": "Vista del Valle",
        "tipo_cliente": "privado", "sector": "Inmobiliaria",
        "direccion_comercial": "Km 14.5 Carretera a El Salvador, Z.15",
        "municipio": "Guatemala", "departamento": "Guatemala",
        "telefono": "+502 2480-3322", "email": "compras@vistadelvalle.com.gt",
        "nombre_contacto": "Arq. Valeria Morales", "telefono_contacto": "+502 5534-7712",
        "email_contacto": "vmorales@vistadelvalle.com.gt",
    },
    {
        "razon_social": "Municipalidad de San Juan Sacatepéquez",
        "nit": "1792830-K", "nombre_comercial": "Muni SJS",
        "tipo_cliente": "publico", "sector": "Gobierno Municipal",
        "direccion_comercial": "1a Calle 1-55 frente al Parque Central",
        "municipio": "San Juan Sacatepéquez", "departamento": "Guatemala",
        "telefono": "+502 7760-9200", "email": "compras@munisjs.gob.gt",
        "nombre_contacto": "Lic. Oscar Batz", "telefono_contacto": "+502 4492-0011",
        "email_contacto": "obatz@munisjs.gob.gt",
    },
    {
        "razon_social": "Hotel y Restaurante El Mirador, S.A.",
        "nit": "5847201-3", "nombre_comercial": "Hotel El Mirador",
        "tipo_cliente": "privado", "sector": "Hotelería y Turismo",
        "direccion_comercial": "Avenida La Reforma 6-54, Zona 9",
        "municipio": "Guatemala", "departamento": "Guatemala",
        "telefono": "+502 2339-7700", "email": "mantenimiento@hotelmirador.com.gt",
        "nombre_contacto": "Marco Herrera", "telefono_contacto": "+502 5578-8844",
        "email_contacto": "mherrera@hotelmirador.com.gt",
    },
    {
        "razon_social": "Pedro Antonio Juárez López",
        "nit": "2938471-8",
        "tipo_cliente": "privado", "sector": "Particular",
        "municipio": "Mixco", "departamento": "Guatemala",
        "telefono": "+502 5512-0099", "email": "pjuarez@gmail.com",
    },
    {
        "razon_social": "Agropecuaria Los Pinos, S.A.",
        "nit": "6473820-1", "nombre_comercial": "Agro Los Pinos",
        "tipo_cliente": "privado", "sector": "Agropecuario",
        "direccion_comercial": "Km 42 Carretera a Escuintla",
        "municipio": "Escuintla", "departamento": "Escuintla",
        "telefono": "+502 7888-3300", "email": "admin@agrolospinos.com",
        "nombre_contacto": "Ernesto Solórzano", "telefono_contacto": "+502 4411-7700",
        "email_contacto": "esolorzano@agrolospinos.com",
    },
    {
        "razon_social": "Clínica Médica Santa Lucía, S.C.",
        "nit": "3847291-0", "nombre_comercial": "Clínica Santa Lucía",
        "tipo_cliente": "privado", "sector": "Salud",
        "direccion_comercial": "4a Calle 12-34, Zona 3",
        "municipio": "Quetzaltenango", "departamento": "Quetzaltenango",
        "telefono": "+502 7767-4400", "email": "administracion@clinicasantalucia.com",
        "nombre_contacto": "Dra. Mónica Cifuentes", "telefono_contacto": "+502 5556-2200",
        "email_contacto": "mcifuentes@clinicasantalucia.com",
    },
    {
        "razon_social": "Supermercados La Economía, S.A.",
        "nit": "7294031-6", "nombre_comercial": "Super La Economía",
        "tipo_cliente": "privado", "sector": "Retail / Supermercados",
        "direccion_comercial": "Calzada Roosevelt 34-12, Zona 7",
        "municipio": "Guatemala", "departamento": "Guatemala",
        "telefono": "+502 2439-5500", "email": "mantenimiento@supereconomia.com.gt",
        "nombre_contacto": "Karla Morán", "telefono_contacto": "+502 5512-4433",
        "email_contacto": "kmoran@supereconomia.com.gt",
    },
    {
        "razon_social": "Contratista Independiente Julio Sánchez",
        "nit": "4821039-7",
        "tipo_cliente": "privado", "sector": "Construcción / Contratista",
        "municipio": "Villa Nueva", "departamento": "Guatemala",
        "telefono": "+502 5590-1122", "email": "jsanchez.contratista@gmail.com",
    },
    {
        "razon_social": "Colegio Privado Sagrado Corazón",
        "nit": "5039284-3", "nombre_comercial": "Colegio Sagrado Corazón",
        "tipo_cliente": "privado", "sector": "Educación",
        "direccion_comercial": "12 Avenida 8-30, Zona 2",
        "municipio": "Guatemala", "departamento": "Guatemala",
        "telefono": "+502 2232-7700", "email": "administracion@colegiosc.edu.gt",
        "nombre_contacto": "Hna. Teresa Morales", "telefono_contacto": "+502 5534-0011",
        "email_contacto": "tmorales@colegiosc.edu.gt",
    },
]
clientes = []
for cd in clientes_data:
    cl = Cliente.objects.create(**cd)
    clientes.append(cl)
print(f"  ✓ {len(clientes)} clientes")

print("── Productos ────────────────────────────────────────────")
# (nombre, marca, categoría, unidad, costo, utilidad%, stock, stock_min, ubicacion, uso)
productos_data = [
    # HERRAMIENTAS MANUALES
    ("Martillo de Bola 16oz",        "Stanley",    "Herramientas Manuales",    "unidad",  95.00, 40, 45, 10, "Estante A-1", "Golpear clavos, doblado de metal"),
    ("Juego de Destornilladores x6", "Stanley",    "Herramientas Manuales",    "juego",   85.00, 38, 60, 15, "Estante A-1", "Ajuste de tornillos Phillips y plano"),
    ("Alicate de Presión 10\"",      "Truper",     "Herramientas Manuales",    "unidad",  72.00, 40, 35, 8,  "Estante A-2", "Sujeción y corte de materiales"),
    ("Llave Ajustable 12\"",         "Tramontina", "Herramientas Manuales",    "unidad",  88.00, 38, 30, 8,  "Estante A-2", "Ajuste de tuercas y pernos"),
    ("Nivel de Burbuja 60cm",        "Truper",     "Herramientas Manuales",    "unidad",  65.00, 42, 40, 10, "Estante A-3", "Nivelación de superficies"),
    ("Cinta Métrica 5m",             "Stanley",    "Herramientas Manuales",    "unidad",  45.00, 45, 80, 20, "Estante A-3", "Medición de distancias"),
    ("Sierra de Mano 20\"",          "Truper",     "Herramientas Manuales",    "unidad",  78.00, 38, 25, 6,  "Estante A-4", "Corte de madera y materiales blandos"),
    ("Juego de Llaves Allen Métricas","Surtek",    "Herramientas Manuales",    "juego",   55.00, 40, 50, 12, "Estante A-4", "Tornillos Allen métricos"),
    # HERRAMIENTAS ELÉCTRICAS
    ("Taladro Percutor 1/2\" 650W",  "DeWalt",     "Herramientas Eléctricas",  "unidad", 895.00, 30, 12, 3,  "Estante B-1", "Perforación en concreto, madera y metal"),
    ("Amoladora Angular 4.5\" 700W", "DeWalt",     "Herramientas Eléctricas",  "unidad", 720.00, 30, 10, 3,  "Estante B-1", "Corte y desbaste de metal"),
    ("Sierra Circular 7.5\" 1400W",  "DeWalt",     "Herramientas Eléctricas",  "unidad",1150.00, 28, 6,  2,  "Estante B-2", "Corte de madera en línea recta"),
    ("Lijadora de Banda 3\"x21\"",   "Stanley",    "Herramientas Eléctricas",  "unidad", 580.00, 30, 8,  2,  "Estante B-2", "Lijado de superficies de madera"),
    ("Pistola de Calor 1800W",       "Surtek",     "Herramientas Eléctricas",  "unidad", 320.00, 35, 14, 4,  "Estante B-3", "Decapado de pintura, doblado de PVC"),
    # PLOMERÍA
    ("Tubo PVC 1/2\" x 6m",         "Durman",     "Plomería",                 "unidad",  32.00, 45, 200, 50, "Bodega C-1", "Instalaciones de agua fría"),
    ("Tubo PVC 3/4\" x 6m",         "Durman",     "Plomería",                 "unidad",  48.00, 42, 150, 40, "Bodega C-1", "Instalaciones de agua fría, tuberías principales"),
    ("Tubo PVC 4\" x 6m (drenaje)", "Durman",     "Plomería",                 "unidad",  95.00, 38, 100, 25, "Bodega C-2", "Drenajes y aguas negras"),
    ("Llave de Paso 1/2\"",          "Surtek",     "Plomería",                 "unidad",  38.00, 50, 80,  20, "Estante C-3", "Control de flujo de agua"),
    ("Llave de Paso 3/4\"",          "Surtek",     "Plomería",                 "unidad",  52.00, 48, 60,  15, "Estante C-3", "Control de flujo en tuberías principales"),
    ("Codo PVC 1/2\" x 90°",        "Durman",     "Plomería",                 "unidad",   4.50, 55, 300, 80, "Estante C-4", "Cambio de dirección en tubería"),
    ("Teflón Industrial 3/4\"",      "3M",         "Plomería",                 "unidad",   8.00, 60, 200, 50, "Estante C-4", "Sellado de roscas en tuberías"),
    ("Pegamento PVC 250ml",          "Loctite",    "Adhesivos y Químicos",     "unidad",  45.00, 55, 80,  20, "Estante C-5", "Unión de tubería PVC"),
    # ELECTRICIDAD
    ("Cable THHN Cal.12 (rollo 100m)","Condumex",  "Electricidad",             "rollo",  480.00, 32, 25,  6,  "Estante D-1", "Instalaciones eléctricas residenciales"),
    ("Cable THHN Cal.10 (rollo 100m)","Condumex",  "Electricidad",             "rollo",  720.00, 30, 20,  5,  "Estante D-1", "Circuitos de mayor capacidad"),
    ("Breaker 1x15A",                "Surtek",     "Electricidad",             "unidad",  38.00, 50, 120, 30, "Estante D-2", "Protección de circuitos eléctricos"),
    ("Breaker 1x20A",                "Surtek",     "Electricidad",             "unidad",  42.00, 50, 100, 25, "Estante D-2", "Protección de circuitos de mayor carga"),
    ("Breaker 2x30A",                "Surtek",     "Electricidad",             "unidad",  95.00, 45, 50,  12, "Estante D-2", "Circuitos bifásicos, aire acondicionado"),
    ("Tomacorriente Doble 15A",      "Surtek",     "Electricidad",             "unidad",  22.00, 55, 200, 50, "Estante D-3", "Toma de corriente residencial"),
    ("Interruptor Sencillo",         "Surtek",     "Electricidad",             "unidad",  18.00, 55, 200, 50, "Estante D-3", "Control de iluminación"),
    ("Panel Eléctrico 8 Circuitos",  "Surtek",     "Electricidad",             "unidad", 485.00, 35, 15,  4,  "Estante D-4", "Distribución eléctrica residencial"),
    # PINTURA
    ("Pintura de Aceite Blanca 1gal","Truper",     "Pintura y Acabados",       "galon",  125.00, 35, 60,  15, "Estante E-1", "Pintado de madera y metal"),
    ("Pintura Látex Interior 1gal",  "Truper",     "Pintura y Acabados",       "galon",   98.00, 38, 80,  20, "Estante E-1", "Pintado de paredes interiores"),
    ("Pintura Látex Exterior 1gal",  "Truper",     "Pintura y Acabados",       "galon",  115.00, 35, 70,  18, "Estante E-2", "Pintado de fachadas"),
    ("Sellador Acrílico Blanco 1gal","Truper",     "Pintura y Acabados",       "galon",   88.00, 40, 45,  12, "Estante E-2", "Preparación de superficies antes de pintar"),
    ("Brocha 4\" Profesional",       "Truper",     "Pintura y Acabados",       "unidad",  32.00, 45, 100, 25, "Estante E-3", "Aplicación de pintura en áreas pequeñas"),
    ("Rodillo con Charola 9\"",      "Truper",     "Pintura y Acabados",       "unidad",  48.00, 42, 80,  20, "Estante E-3", "Aplicación de pintura en áreas grandes"),
    ("Thinner Corriente Litro",      "Truper",     "Pintura y Acabados",       "litro",   28.00, 45, 150, 30, "Estante E-4", "Diluyente para pinturas de aceite"),
    # FIJACIONES
    ("Clavos de Acero 2\" (libra)",  "Surtek",     "Fijaciones y Tornillería", "libra",   14.00, 55, 200, 50, "Estante F-1", "Fijación de madera"),
    ("Clavos de Acero 3\" (libra)",  "Surtek",     "Fijaciones y Tornillería", "libra",   16.00, 55, 180, 45, "Estante F-1", "Construcción general"),
    ("Tornillos Pared 3\" x3/8 (100u)","Surtek",   "Fijaciones y Tornillería", "paquete", 35.00, 55, 100, 25, "Estante F-2", "Instalaciones en paredes"),
    ("Taco Expansivo 3/8\" (50u)",   "Surtek",     "Fijaciones y Tornillería", "paquete", 28.00, 60, 120, 30, "Estante F-2", "Fijación en concreto"),
    ("Alambre de Amarre #18 (rollo)","Surtek",     "Fijaciones y Tornillería", "rollo",   85.00, 40, 40,  10, "Estante F-3", "Amarre en construcción"),
    # SEGURIDAD
    ("Casco de Seguridad ANSI",      "3M",         "Seguridad Industrial",     "unidad",  95.00, 40, 50,  12, "Estante G-1", "Protección cefálica en obra"),
    ("Guantes de Cuero Reforzado",   "3M",         "Seguridad Industrial",     "par",     55.00, 45, 80,  20, "Estante G-1", "Protección de manos"),
    ("Lentes de Seguridad Transparentes","3M",     "Seguridad Industrial",     "unidad",  32.00, 50, 100, 25, "Estante G-2", "Protección ocular"),
    ("Chaleco Reflectivo Naranja",   "3M",         "Seguridad Industrial",     "unidad",  65.00, 42, 40,  10, "Estante G-2", "Visibilidad en obra"),
    # ILUMINACIÓN
    ("Foco LED 12W E27 Luz Día",     "Philips",    "Iluminación",              "unidad",  38.00, 45, 150, 40, "Estante H-1", "Iluminación residencial y comercial"),
    ("Panel LED 12W Empotrable",     "Philips",    "Iluminación",              "unidad",  95.00, 38, 60,  15, "Estante H-1", "Cielos falsos y oficinas"),
    ("Reflector LED 50W Exterior",   "Philips",    "Iluminación",              "unidad", 195.00, 35, 30,  8,  "Estante H-2", "Iluminación de exteriores y parqueos"),
    # MATERIALES CONSTRUCCIÓN
    ("Cemento Progreso 42.5kg",      "Truper",     "Materiales de Construcción","unidad", 72.00, 18, 300, 80, "Bodega I-1", "Mezclas de concreto y repello"),
    ("Piedrín Triturado (m³)",       "Truper",     "Materiales de Construcción","unidad", 320.00, 15, 30,  8,  "Bodega I-2", "Agregado para concreto"),
    # ADHESIVOS
    ("Sikaflex-11FC (310ml)",        "Loctite",    "Adhesivos y Químicos",     "unidad",  95.00, 45, 30,  8,  "Estante J-1", "Sellado de juntas y fisuras"),
    ("Pegamento Contacto 250ml",     "Loctite",    "Adhesivos y Químicos",     "unidad",  42.00, 50, 60,  15, "Estante J-1", "Unión de materiales diversos"),
]

productos = []
prov_map = {p.razon_social: p for p in proveedores}
# Asignar proveedores por categoría
cat_prov = {
    "Herramientas Manuales":      prov_map["Distribuidora Ferretera Centroamericana, S.A."],
    "Herramientas Eléctricas":    prov_map["Distribuidora Ferretera Centroamericana, S.A."],
    "Plomería":                   prov_map["Tuberías y Accesorios de Guatemala, S.A."],
    "Electricidad":               prov_map["Importadora de Materiales Eléctricos Guatemala, S.A."],
    "Pintura y Acabados":         prov_map["Pinturas y Acabados Industriales de Guatemala"],
    "Fijaciones y Tornillería":   prov_map["Fijaciones y Tornillería del Centro, S.A."],
    "Seguridad Industrial":       prov_map["Suministros de Seguridad Industrial GT, S.A."],
    "Iluminación":                prov_map["Importadora de Materiales Eléctricos Guatemala, S.A."],
    "Materiales de Construcción": prov_map["Distribuidora Ferretera Centroamericana, S.A."],
    "Adhesivos y Químicos":       prov_map["Distribuidora Ferretera Centroamericana, S.A."],
}

for (nombre, marca, categoria, unidad, costo, utilidad, stock, stock_min, ubicacion, uso) in productos_data:
    prod = Producto.objects.create(
        nombre=nombre,
        marca=marca,
        categoria=categoria,
        unidad_medida=unidad,
        costo_unitario=Decimal(str(costo)),
        porcentaje_utilidad=Decimal(str(utilidad)),
        stock_actual=stock,
        stock_minimo=stock_min,
        stock_maximo=stock * 3,
        ubicacion=ubicacion,
        uso=uso,
        proveedor=cat_prov.get(categoria),
        activo=True,
    )
    productos.append(prod)

print(f"  ✓ {len(productos)} productos")

print("── Compras ──────────────────────────────────────────────")
# Helper para buscar producto por nombre parcial
def prod(nombre_parcial):
    return next(p for p in productos if nombre_parcial.lower() in p.nombre.lower())

hoy = date.today()

compras_data = [
    {
        "proveedor": proveedores[0],  # DisFerro GT
        "fecha_despacho": hoy - timedelta(days=45),
        "tipo_pago": tp_30,
        "num_cotizacion_proveedor": "COT-DFG-2024-089",
        "notas": "Pedido mensual de herramientas. Incluye descuento por volumen del 8%.",
        "estatus": "Recibida",
        "items": [
            ("Martillo de Bola 16oz", 20, 88.00),
            ("Juego de Destornilladores x6", 15, 78.00),
            ("Cinta Métrica 5m", 30, 40.00),
            ("Nivel de Burbuja 60cm", 12, 58.00),
        ],
    },
    {
        "proveedor": proveedores[1],  # ImeGuat
        "fecha_despacho": hoy - timedelta(days=30),
        "tipo_pago": tp_15,
        "num_cotizacion_proveedor": "IMEG-2024-0234",
        "notas": "Pedido urgente de material eléctrico para proyecto residencial.",
        "estatus": "Recibida",
        "items": [
            ("Cable THHN Cal.12", 10, 440.00),
            ("Cable THHN Cal.10", 8, 660.00),
            ("Breaker 1x15A", 50, 32.00),
            ("Breaker 1x20A", 40, 36.00),
            ("Panel Eléctrico 8 Circuitos", 5, 420.00),
        ],
    },
    {
        "proveedor": proveedores[2],  # TuboGuat
        "fecha_despacho": hoy - timedelta(days=22),
        "tipo_pago": tp_contado,
        "num_cotizacion_proveedor": "TBG-2024-0112",
        "notas": "Reposición de inventario de plomería.",
        "estatus": "Recibida",
        "items": [
            ("Tubo PVC 1/2\" x 6m", 80, 28.00),
            ("Tubo PVC 3/4\" x 6m", 60, 42.00),
            ("Tubo PVC 4\" x 6m", 40, 85.00),
            ("Llave de Paso 1/2\"", 30, 32.00),
            ("Codo PVC 1/2\"", 150, 3.80),
        ],
    },
    {
        "proveedor": proveedores[3],  # PinturAcabados
        "fecha_despacho": hoy - timedelta(days=18),
        "tipo_pago": tp_30,
        "num_cotizacion_proveedor": "PA-GT-2024-0567",
        "notas": "Pedido de pinturas para temporada alta de construcción.",
        "estatus": "Recibida",
        "items": [
            ("Pintura de Aceite Blanca 1gal", 25, 110.00),
            ("Pintura Látex Interior 1gal", 30, 85.00),
            ("Pintura Látex Exterior 1gal", 28, 100.00),
            ("Brocha 4\" Profesional", 40, 26.00),
            ("Rodillo con Charola 9\"", 30, 40.00),
        ],
    },
    {
        "proveedor": proveedores[4],  # SeguriSuma
        "fecha_despacho": hoy - timedelta(days=10),
        "tipo_pago": tp_15,
        "num_cotizacion_proveedor": "SS-2024-0088",
        "notas": "EPP para temporada de proyectos de construcción. Prioridad.",
        "estatus": "Confirmada",
        "items": [
            ("Casco de Seguridad ANSI", 20, 82.00),
            ("Guantes de Cuero Reforzado", 30, 45.00),
            ("Lentes de Seguridad", 40, 26.00),
            ("Chaleco Reflectivo", 15, 55.00),
        ],
    },
    {
        "proveedor": proveedores[0],  # DisFerro GT
        "fecha_despacho": hoy - timedelta(days=5),
        "tipo_pago": tp_30,
        "num_cotizacion_proveedor": "COT-DFG-2024-124",
        "notas": "Herramientas eléctricas DeWalt. Pedido especial para cliente constructora.",
        "estatus": "En tránsito",
        "items": [
            ("Taladro Percutor", 4, 820.00),
            ("Amoladora Angular", 3, 660.00),
            ("Sierra Circular", 2, 1050.00),
        ],
    },
    {
        "proveedor": proveedores[5],  # FijaCentro
        "fecha_despacho": hoy + timedelta(days=3),
        "tipo_pago": tp_contado,
        "num_cotizacion_proveedor": "FC-2024-0341",
        "notas": "Tornillería y fijaciones para reposición de inventario.",
        "estatus": "Pendiente",
        "items": [
            ("Clavos de Acero 2\"", 60, 12.00),
            ("Clavos de Acero 3\"", 50, 13.50),
            ("Tornillos Pared", 40, 30.00),
            ("Taco Expansivo", 40, 23.00),
        ],
    },
    {
        "proveedor": proveedores[1],  # ImeGuat
        "fecha_despacho": hoy + timedelta(days=7),
        "tipo_pago": tp_15,
        "num_cotizacion_proveedor": "IMEG-2024-0298",
        "notas": "Reposición iluminación LED. Nuevo catálogo Philips 2024.",
        "estatus": "Pendiente",
        "items": [
            ("Foco LED 12W", 80, 30.00),
            ("Panel LED 12W", 20, 78.00),
            ("Reflector LED 50W", 12, 165.00),
            ("Tomacorriente Doble", 60, 18.00),
            ("Interruptor Sencillo", 60, 14.00),
        ],
    },
]

compras_creadas = []
for cd in compras_data:
    compra = Compra(
        proveedor=cd["proveedor"],
        fecha_despacho=cd["fecha_despacho"],
        tipo_pago=cd["tipo_pago"],
        num_cotizacion_proveedor=cd["num_cotizacion_proveedor"],
        notas=cd["notas"],
        estatus=cd["estatus"],
    )
    compra.save()

    for (nombre_parcial, cantidad, costo) in cd["items"]:
        producto_obj = prod(nombre_parcial)
        CompraItem.objects.create(
            compra=compra,
            producto=producto_obj,
            cantidad=cantidad,
            costo_unitario=Decimal(str(costo)),
        )

    CompraHistorial.objects.create(
        compra=compra,
        tipo="creacion",
        descripcion=f"OC creada con {len(cd['items'])} producto(s)",
    )
    if cd["estatus"] != "Pendiente":
        CompraHistorial.objects.create(
            compra=compra,
            tipo="estatus",
            descripcion=f"Estatus cambiado: Pendiente → {cd['estatus']}",
            valor_anterior="Pendiente",
            valor_nuevo=cd["estatus"],
        )
    compras_creadas.append(compra)

print(f"  ✓ {len(compras_creadas)} órdenes de compra")

print("── Cotizaciones ─────────────────────────────────────────")
asesores = ["Andrea Castillo", "María José Pérez", "Carlos Menéndez"]

cotizaciones_data = [
    {
        "cliente": clientes[0],  # Constructora Moderna
        "tipo": "Proyecto Construcción",
        "estatus": "Aprobada",
        "asesor": asesores[0],
        "validez_dias": 30,
        "condiciones_pago": "Crédito 30 días",
        "tiempo_entrega": "Inmediata (en bodega)",
        "lugar_entrega": "Km 18.5 Carretera al Atlántico, Zona Industrial",
        "ot_referencia": "",
        "notas": "Cotización para Proyecto Residencial Quintas del Norte, Fase 2. Precios incluyen entrega en sitio.",
        "items": [
            ("Cemento Progreso 42.5kg",       50,  72.00, 12, 0),
            ("Tubo PVC 1/2\" x 6m",          100,  32.00, 12, 0),
            ("Tubo PVC 3/4\" x 6m",           60,  48.00, 12, 0),
            ("Codo PVC 1/2\" x 90°",         200,   4.50, 12, 0),
            ("Llave de Paso 1/2\"",            30,  38.00, 12, 0),
            ("Cable THHN Cal.12 (rollo 100m)", 8, 480.00, 12, 0),
            ("Breaker 1x15A",                  40,  38.00, 12, 0),
            ("Panel Eléctrico 8 Circuitos",     5, 485.00, 12, 0),
        ],
    },
    {
        "cliente": clientes[1],  # Residenciales Vista del Valle
        "tipo": "Materiales Generales",
        "estatus": "Enviada",
        "asesor": asesores[1],
        "validez_dias": 15,
        "condiciones_pago": "Contado",
        "tiempo_entrega": "2-3 días hábiles",
        "lugar_entrega": "Km 14.5 Carretera a El Salvador",
        "ot_referencia": "",
        "notas": "Cotización para remodelación de áreas comunes. Sujeto a disponibilidad de stock.",
        "items": [
            ("Pintura Látex Exterior 1gal",     20, 115.00, 12, 0),
            ("Pintura Látex Interior 1gal",     15,  98.00, 12, 0),
            ("Rodillo con Charola 9\"",          8,  48.00, 12, 0),
            ("Brocha 4\" Profesional",          10,  32.00, 12, 0),
            ("Sellador Acrílico Blanco 1gal",   10,  88.00, 12, 0),
            ("Foco LED 12W E27 Luz Día",        50,  38.00, 12, 0),
            ("Panel LED 12W Empotrable",        20,  95.00, 12, 0),
        ],
    },
    {
        "cliente": clientes[2],  # Municipalidad SJS
        "tipo": "Obra Pública",
        "estatus": "Aprobada",
        "asesor": asesores[2],
        "validez_dias": 30,
        "condiciones_pago": "Crédito 15 días",
        "tiempo_entrega": "1 semana",
        "lugar_entrega": "Municipalidad de San Juan Sacatepéquez",
        "ot_referencia": "OT-MUN-2024-047",
        "notas": "Suministro de materiales para mejora de infraestructura del mercado municipal. Requiere facturas especiales (NIT: 1792830-K).",
        "items": [
            ("Cemento Progreso 42.5kg",      100,  72.00, 12, 0),
            ("Cable THHN Cal.12 (rollo 100m)", 5, 480.00, 12, 0),
            ("Cable THHN Cal.10 (rollo 100m)", 3, 720.00, 12, 0),
            ("Breaker 2x30A",                 10,  95.00, 12, 0),
            ("Reflector LED 50W Exterior",    20, 195.00, 12, 0),
            ("Casco de Seguridad ANSI",       10,  95.00, 12, 0),
            ("Chaleco Reflectivo Naranja",    10,  65.00, 12, 0),
        ],
    },
    {
        "cliente": clientes[3],  # Hotel El Mirador
        "tipo": "Mantenimiento",
        "estatus": "Borrador",
        "asesor": asesores[0],
        "validez_dias": 10,
        "condiciones_pago": "Contado",
        "tiempo_entrega": "Inmediata",
        "lugar_entrega": "Avenida La Reforma 6-54, Zona 9",
        "ot_referencia": "",
        "notas": "Cotización para mantenimiento preventivo de instalaciones eléctricas y plomería de 120 habitaciones.",
        "items": [
            ("Tomacorriente Doble 15A",        80,  22.00, 12, 0),
            ("Interruptor Sencillo",           60,  18.00, 12, 0),
            ("Breaker 1x15A",                  20,  38.00, 12, 0),
            ("Foco LED 12W E27 Luz Día",      120,  38.00, 12, 0),
            ("Llave de Paso 1/2\"",            30,  38.00, 12, 0),
            ("Teflón Industrial 3/4\"",        50,   8.00, 12, 0),
            ("Pegamento PVC 250ml",            15,  45.00, 12, 0),
        ],
    },
    {
        "cliente": clientes[4],  # Pedro Juárez (particular)
        "tipo": "Remodelación Residencial",
        "estatus": "Aprobada",
        "asesor": asesores[1],
        "validez_dias": 7,
        "condiciones_pago": "Contado",
        "tiempo_entrega": "Inmediata",
        "lugar_entrega": "Colonia Las Brisas, Mixco",
        "ot_referencia": "",
        "notas": "Remodelación de baño y cocina. Cliente confirmó inicio para próxima semana.",
        "items": [
            ("Tubo PVC 1/2\" x 6m",            6,  32.00, 12, 0),
            ("Llave de Paso 1/2\"",             4,  38.00, 12, 0),
            ("Codo PVC 1/2\" x 90°",          20,   4.50, 12, 0),
            ("Teflón Industrial 3/4\"",         6,   8.00, 12, 0),
            ("Pegamento PVC 250ml",             2,  45.00, 12, 0),
            ("Pintura Látex Interior 1gal",     4,  98.00, 12, 0),
            ("Brocha 4\" Profesional",          2,  32.00, 12, 0),
        ],
    },
    {
        "cliente": clientes[5],  # Agropecuaria Los Pinos
        "tipo": "Instalación Industrial",
        "estatus": "Enviada",
        "asesor": asesores[2],
        "validez_dias": 20,
        "condiciones_pago": "Crédito 30 días",
        "tiempo_entrega": "1-2 semanas",
        "lugar_entrega": "Km 42 Carretera a Escuintla",
        "ot_referencia": "",
        "notas": "Instalación eléctrica para bodega de almacenamiento. Requiere cable de alta capacidad.",
        "items": [
            ("Cable THHN Cal.10 (rollo 100m)", 5, 720.00, 12, 0),
            ("Breaker 2x30A",                  8,  95.00, 12, 0),
            ("Panel Eléctrico 8 Circuitos",    3, 485.00, 12, 0),
            ("Reflector LED 50W Exterior",    10, 195.00, 12, 0),
            ("Tomacorriente Doble 15A",        20,  22.00, 12, 0),
            ("Casco de Seguridad ANSI",        5,  95.00, 12, 0),
            ("Guantes de Cuero Reforzado",     8,  55.00, 12, 0),
        ],
    },
    {
        "cliente": clientes[6],  # Clínica Santa Lucía
        "tipo": "Mantenimiento",
        "estatus": "Rechazada",
        "asesor": asesores[0],
        "validez_dias": 15,
        "condiciones_pago": "Crédito 15 días",
        "tiempo_entrega": "3-5 días hábiles",
        "lugar_entrega": "4a Calle 12-34, Zona 3, Xela",
        "ot_referencia": "",
        "notas": "Presupuesto no aprobado. Cliente solicitó nueva cotización con precios más competitivos.",
        "items": [
            ("Foco LED 12W E27 Luz Día",       40,  38.00, 12, 0),
            ("Panel LED 12W Empotrable",        15,  95.00, 12, 0),
            ("Tomacorriente Doble 15A",         30,  22.00, 12, 0),
            ("Interruptor Sencillo",            25,  18.00, 12, 0),
        ],
    },
    {
        "cliente": clientes[7],  # Supermercados La Economía
        "tipo": "Mantenimiento Preventivo",
        "estatus": "Aprobada",
        "asesor": asesores[1],
        "validez_dias": 30,
        "condiciones_pago": "Crédito 30 días",
        "tiempo_entrega": "Inmediata (stock disponible)",
        "lugar_entrega": "Calzada Roosevelt 34-12, Zona 7",
        "ot_referencia": "SUPE-MANT-2024-Q4",
        "notas": "Contrato de mantenimiento Q4-2024. Incluye 4 visitas mensuales. Materiales facturados por separado.",
        "items": [
            ("Breaker 1x15A",                  15,  38.00, 12, 0),
            ("Breaker 1x20A",                  10,  42.00, 12, 0),
            ("Foco LED 12W E27 Luz Día",       60,  38.00, 12, 0),
            ("Tomacorriente Doble 15A",         25,  22.00, 12, 0),
            ("Llave de Paso 1/2\"",            10,  38.00, 12, 0),
            ("Teflón Industrial 3/4\"",        20,   8.00, 12, 0),
        ],
    },
    {
        "cliente": clientes[8],  # Contratista Julio Sánchez
        "tipo": "Herramientas y Materiales",
        "estatus": "Enviada",
        "asesor": asesores[2],
        "validez_dias": 7,
        "condiciones_pago": "Contado",
        "tiempo_entrega": "Inmediata",
        "lugar_entrega": "Villa Nueva, Retiro en tienda",
        "ot_referencia": "",
        "notas": "Cliente contratista recurrente. Aplica precio especial en herramientas eléctricas.",
        "items": [
            ("Taladro Percutor 1/2\" 650W",    2, 895.00, 12, 0),
            ("Amoladora Angular 4.5\" 700W",   2, 720.00, 12, 0),
            ("Cinta Métrica 5m",               5,  45.00, 12, 0),
            ("Guantes de Cuero Reforzado",      4,  55.00, 12, 0),
            ("Lentes de Seguridad",             4,  32.00, 12, 0),
        ],
    },
    {
        "cliente": clientes[9],  # Colegio Sagrado Corazón
        "tipo": "Remodelación",
        "estatus": "Borrador",
        "asesor": asesores[0],
        "validez_dias": 20,
        "condiciones_pago": "Crédito 15 días",
        "tiempo_entrega": "1 semana",
        "lugar_entrega": "12 Avenida 8-30, Zona 2",
        "ot_referencia": "",
        "notas": "Renovación de instalaciones eléctricas y de iluminación. Proyecto a ejecutar en diciembre (vacaciones).",
        "items": [
            ("Cable THHN Cal.12 (rollo 100m)",  3, 480.00, 12, 0),
            ("Panel Eléctrico 8 Circuitos",     2, 485.00, 12, 0),
            ("Panel LED 12W Empotrable",        30,  95.00, 12, 0),
            ("Interruptor Sencillo",            40,  18.00, 12, 0),
            ("Tomacorriente Doble 15A",         40,  22.00, 12, 0),
            ("Breaker 1x15A",                   20,  38.00, 12, 0),
        ],
    },
]

cotizaciones_creadas = []
for cd in cotizaciones_data:
    cot = Cotizacion.objects.create(
        cliente=cd["cliente"],
        tipo=cd["tipo"],
        estatus=cd["estatus"],
        asesor=cd["asesor"],
        validez_dias=cd["validez_dias"],
        condiciones_pago=cd["condiciones_pago"],
        tiempo_entrega=cd["tiempo_entrega"],
        lugar_entrega=cd["lugar_entrega"],
        ot_referencia=cd.get("ot_referencia", ""),
        notas=cd["notas"],
    )
    for (nombre_parcial, cantidad, precio, iva, isr) in cd["items"]:
        producto_obj = prod(nombre_parcial)
        CotizacionItem.objects.create(
            cotizacion=cot,
            nombre_producto=producto_obj.nombre,
            descripcion=producto_obj.uso,
            unidad_medida=producto_obj.unidad_medida if hasattr(producto_obj, "unidad_medida") else "unidad",
            precio_unitario=Decimal(str(precio)),
            porcentaje_iva=Decimal(str(iva)),
            porcentaje_isr=Decimal(str(isr)),
            cantidad=cantidad,
        )
    cotizaciones_creadas.append(cot)

print(f"  ✓ {len(cotizaciones_creadas)} cotizaciones")

print("── Órdenes de Trabajo ───────────────────────────────────")
ots_data = [
    {
        "cliente": clientes[0],
        "tipo_cliente": "Empresa Privada",
        "tipo_trabajo": "Instalación Eléctrica",
        "tecnico_asignado": "Héctor Samayoa",
        "descripcion": "Instalación de tablero eléctrico de 8 circuitos y cableado completo para 12 apartamentos del edificio Torre Norte. Incluye instalación de luminarias LED en áreas comunes.",
        "estatus": "En proceso",
        "fecha_inicio": hoy - timedelta(days=5),
        "cotizacion": cotizaciones_creadas[0],
    },
    {
        "cliente": clientes[1],
        "tipo_cliente": "Constructora",
        "tipo_trabajo": "Instalación de Plomería",
        "tecnico_asignado": "Luis Fernando Orantes",
        "descripcion": "Instalación de red hidráulica para 8 casas del proyecto Residencial Vista del Valle. Incluye toma de agua, bajadas y conexiones a sanitarios.",
        "estatus": "En proceso",
        "fecha_inicio": hoy - timedelta(days=3),
        "cotizacion": cotizaciones_creadas[1],
    },
    {
        "cliente": clientes[2],
        "tipo_cliente": "Gobierno / Institución",
        "tipo_trabajo": "Instalación Eléctrica",
        "tecnico_asignado": "Héctor Samayoa",
        "descripcion": "Mejora del sistema eléctrico del Mercado Municipal de San Juan Sacatepéquez. Instalación de tableros y reflectores LED para exteriores e interiores.",
        "estatus": "Pendiente",
        "fecha_inicio": hoy + timedelta(days=3),
        "cotizacion": cotizaciones_creadas[2],
    },
    {
        "cliente": clientes[3],
        "tipo_cliente": "Empresa Privada",
        "tipo_trabajo": "Mantenimiento Preventivo",
        "tecnico_asignado": "Luis Fernando Orantes",
        "descripcion": "Mantenimiento preventivo trimestral de instalaciones hidrosanitarias en 120 habitaciones. Revisión de llaves, desagües y registros.",
        "estatus": "En espera",
        "fecha_inicio": hoy + timedelta(days=7),
        "cotizacion": None,
    },
    {
        "cliente": clientes[4],
        "tipo_cliente": "Persona Individual",
        "tipo_trabajo": "Instalación de Plomería",
        "tecnico_asignado": "Luis Fernando Orantes",
        "descripcion": "Remodelación completa de baño y cocina. Cambio de tubería, instalación de nuevas llaves de paso y accesorios sanitarios.",
        "estatus": "Finalizada",
        "fecha_inicio": hoy - timedelta(days=10),
        "fecha_finalizado": hoy - timedelta(days=2),
        "cotizacion": cotizaciones_creadas[4],
    },
    {
        "cliente": clientes[7],
        "tipo_cliente": "Empresa Privada",
        "tipo_trabajo": "Mantenimiento Preventivo",
        "tecnico_asignado": "Héctor Samayoa",
        "descripcion": "Mantenimiento eléctrico preventivo mensual — Supermercados La Economía, sucursal Zona 7. Revisión de tableros, reposición de breakers y luminarias.",
        "estatus": "Finalizada",
        "fecha_inicio": hoy - timedelta(days=15),
        "fecha_finalizado": hoy - timedelta(days=14),
        "cotizacion": cotizaciones_creadas[7],
    },
    {
        "cliente": clientes[8],
        "tipo_cliente": "Contratista",
        "tipo_trabajo": "Consultoría Técnica",
        "tecnico_asignado": "Carlos Menéndez",
        "descripcion": "Asesoría técnica para proyecto de ampliación en Villa Nueva. Revisión de planos eléctricos y presupuesto de materiales.",
        "estatus": "Finalizada",
        "fecha_inicio": hoy - timedelta(days=8),
        "fecha_finalizado": hoy - timedelta(days=7),
        "cotizacion": cotizaciones_creadas[8],
    },
    {
        "cliente": clientes[5],
        "tipo_cliente": "Empresa Privada",
        "tipo_trabajo": "Instalación Eléctrica",
        "tecnico_asignado": "Héctor Samayoa",
        "descripcion": "Instalación eléctrica completa para nueva bodega de almacenamiento de 500m². Incluye iluminación industrial, tomacorrientes de 220V y tablero principal.",
        "estatus": "Pendiente",
        "fecha_inicio": hoy + timedelta(days=10),
        "cotizacion": cotizaciones_creadas[5],
    },
    {
        "cliente": clientes[9],
        "tipo_cliente": "Empresa Privada",
        "tipo_trabajo": "Instalación Eléctrica",
        "tecnico_asignado": "Héctor Samayoa",
        "descripcion": "Renovación del sistema de iluminación y eléctrico de 25 aulas y áreas administrativas. Trabajo a realizar durante período de vacaciones en diciembre.",
        "estatus": "Pendiente",
        "fecha_inicio": hoy + timedelta(days=45),
        "cotizacion": cotizaciones_creadas[9],
    },
    {
        "cliente": clientes[0],
        "tipo_cliente": "Empresa Privada",
        "tipo_trabajo": "Pintura y Acabados",
        "tecnico_asignado": "Luis Fernando Orantes",
        "descripcion": "Pintura de fachadas y áreas comunes del Edificio Torre Norte. 3 manos de sellador + 2 manos pintura exterior. Aprox. 450m².",
        "estatus": "En espera",
        "fecha_inicio": hoy + timedelta(days=15),
        "cotizacion": None,
    },
]

ots_creadas = []
for od in ots_data:
    ot = OrdenTrabajo.objects.create(
        cliente=od["cliente"],
        tipo_cliente=od["tipo_cliente"],
        tipo_trabajo=od["tipo_trabajo"],
        tecnico_asignado=od["tecnico_asignado"],
        descripcion=od["descripcion"],
        estatus=od["estatus"],
        fecha_inicio=od.get("fecha_inicio"),
        fecha_finalizado=od.get("fecha_finalizado"),
        cotizacion=od.get("cotizacion"),
    )
    ots_creadas.append(ot)

print(f"  ✓ {len(ots_creadas)} órdenes de trabajo")

print("── Kardex / Movimientos de Inventario ───────────────────")
# Obtener bodeguero como responsable de recepciones
bodeguero = Personal.objects.filter(cargo__icontains="bodeg").first() or Personal.objects.first()
jefe_ventas = Personal.objects.filter(cargo__icontains="ventas").first() or Personal.objects.first()

# Resetear stock a 0 para reconstruirlo fielmente con movimientos
Producto.objects.all().update(stock_actual=0, costo_unitario=Decimal("0.00"))

# ── ENTRADAS: OCs con estatus Recibida ────────────────────
entradas = 0
for compra in compras_creadas:
    if compra.estatus == "Recibida":
        for item in compra.items.all():
            MovimientoInventario.objects.create(
                producto=item.producto,
                tipo="entrada",
                cantidad=item.cantidad,
                costo_unitario=item.costo_unitario,
                proveedor=compra.proveedor,
                orden_compra=compra.correlativo,
                observacion=f"Recepción {compra.correlativo} — {compra.proveedor.razon_social}",
                condicion="nuevo",
                responsable=bodeguero,
            )
            entradas += 1

# ── SALIDAS: OTs Finalizadas → despacho de materiales ─────
# OT ots_creadas[4] — Remodelación baño/cocina Pedro Juárez (plomería)
ot_juarez = ots_creadas[4]
salidas_juarez = [
    ("Tubo PVC 1/2\" x 6m",   6),
    ("Llave de Paso 1/2\"",    4),
    ("Codo PVC 1/2\" x 90°",  20),
    ("Teflón Industrial",       6),
    ("Pegamento PVC",           2),
]
for nombre_parcial, cant in salidas_juarez:
    p = next((x for x in productos if nombre_parcial.lower() in x.nombre.lower()), None)
    if p and p.stock_actual >= cant:
        MovimientoInventario.objects.create(
            producto=p,
            tipo="salida",
            cantidad=cant,
            referencia_ot=f"OT-{ot_juarez.id:04d}",
            observacion=f"Despacho para OT-{ot_juarez.id:04d} — {ot_juarez.cliente.razon_social}",
            motivo_salida="otro",
            responsable=bodeguero,
        )

# OT ots_creadas[5] — Mantenimiento eléctrico Super La Economía
ot_super = ots_creadas[5]
salidas_super = [
    ("Breaker 1x15A",           15),
    ("Breaker 1x20A",           10),
    ("Foco LED 12W E27",        60),
    ("Tomacorriente Doble",     25),
    ("Llave de Paso 1/2\"",    10),
]
for nombre_parcial, cant in salidas_super:
    p = next((x for x in productos if nombre_parcial.lower() in x.nombre.lower()), None)
    if p and p.stock_actual >= cant:
        MovimientoInventario.objects.create(
            producto=p,
            tipo="salida",
            cantidad=cant,
            referencia_ot=f"OT-{ot_super.id:04d}",
            observacion=f"Despacho para OT-{ot_super.id:04d} — {ot_super.cliente.razon_social}",
            motivo_salida="otro",
            responsable=bodeguero,
        )

# OT ots_creadas[6] — Asesoría Contratista Julio Sánchez (herramientas)
ot_julio = ots_creadas[6]
salidas_julio = [
    ("Cinta Métrica 5m",        5),
    ("Guantes de Cuero",        4),
    ("Lentes de Seguridad",     4),
]
for nombre_parcial, cant in salidas_julio:
    p = next((x for x in productos if nombre_parcial.lower() in x.nombre.lower()), None)
    if p and p.stock_actual >= cant:
        MovimientoInventario.objects.create(
            producto=p,
            tipo="salida",
            cantidad=cant,
            referencia_ot=f"OT-{ot_julio.id:04d}",
            observacion=f"Despacho para OT-{ot_julio.id:04d} — {ot_julio.cliente.razon_social}",
            motivo_salida="otro",
            responsable=bodeguero,
        )

# ── SALIDA extra: uso interno (consumibles) ────────────────
uso_interno = [
    ("Teflón Industrial",  3),
    ("Clavos de Acero 2\"", 5),
    ("Thinner Corriente",   4),
]
for nombre_parcial, cant in uso_interno:
    p = next((x for x in productos if nombre_parcial.lower() in x.nombre.lower()), None)
    if p and p.stock_actual >= cant:
        MovimientoInventario.objects.create(
            producto=p,
            tipo="salida",
            cantidad=cant,
            vale_salida=f"VS-{p.id:03d}",
            observacion="Consumo interno — uso en taller",
            motivo_salida="uso_interno",
            responsable=jefe_ventas,
        )

total_mov = MovimientoInventario.objects.count()
print(f"  ✓ {total_mov} movimientos de kardex  (entradas OC={entradas})")

print()
print("═══════════════════════════════════════════════════════")
print("  SEED COMPLETO — Ferretería La Fortaleza")
print(f"  Empresa:      1")
print(f"  Maestros:     TipoPago={TipoPago.objects.count()}  Personal={Personal.objects.count()}  TipoProducto={TipoProducto.objects.count()}")
print(f"  Marcas:       {Marca.objects.count()}  |  Proveedores: {Proveedor.objects.count()}")
print(f"  Clientes:     {Cliente.objects.count()}")
print(f"  Productos:    {Producto.objects.count()}")
print(f"  Compras (OC): {Compra.objects.count()}")
print(f"  Cotizaciones: {Cotizacion.objects.count()}")
print(f"  OTs:          {OrdenTrabajo.objects.count()}")
print("═══════════════════════════════════════════════════════")
