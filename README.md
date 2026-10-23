# Compras de casa

Lista de compras compartida para el hogar. Se abre con un toque desde una etiqueta NFC (o con un enlace), sin registros.

**Stack:** Next.js 16 (App Router) · React · TypeScript · Tailwind v4 · shadcn/ui · Postgres (Supabase) · jsPDF.

## Cómo funciona el acceso

- Al crear un hogar se genera un **token secreto** de 192 bits. La URL del hogar es `https://TU-DOMINIO/h/<token>`.
- Solo se guarda el **hash SHA-256** del token. Quien tiene el enlace entra; sin él no hay forma de listar ni adivinar hogares.
- La base **no se expone** a internet vía API de Supabase: las tablas tienen RLS activado sin políticas y solo el servidor de Next.js se conecta (variable `DATABASE_URL`, nunca llega al navegador).
- Todas las consultas filtran por el hogar del token (probado: un hogar no puede tocar datos de otro).
- Sincronización: el cliente consulta al servidor cada 5 s y al volver a la pestaña; las acciones propias se ven al instante. No es "push" en tiempo real: un cambio ajeno tarda hasta ~5 s en aparecer.
- Límites conocidos: la creación de hogares tiene un límite por IP en memoria (best-effort en serverless); quien filtre el enlace puede editar la lista (por eso hay un aviso al compartir). Para rotar el acceso, crear un hogar nuevo.

## Desarrollo local (sin cuenta de Supabase)

```bash
npm install
npm run db:dev      # terminal 1: Postgres local en el puerto 54329 + migraciones
npm run dev         # terminal 2: http://localhost:3000   (usa .env.local)
npm run test:api    # terminal 3: 17 pruebas de integración contra el servidor
npm run test:unit   # sugerencias ("quizás te falta")
```

`.env.local` ya apunta a la base local: `DATABASE_URL=postgresql://postgres:postgres@localhost:54329/postgres`.

## Configurar Supabase y desplegar

1. Crear un proyecto en [supabase.com](https://supabase.com) (el plan gratuito alcanza).
2. **Esquema:** en *SQL Editor* pegar y ejecutar, en orden, [0001_init.sql](supabase/migrations/0001_init.sql) [0002_product_emoji.sql](supabase/migrations/0002_product_emoji.sql) y [0003_categories_presence.sql](supabase/migrations/0003_categories_presence.sql) y [0004_item_authors.sql](supabase/migrations/0004_item_authors.sql). (Alternativa: `DATABASE_URL=... npm run db:migrate`.)
3. **Conexión:** *Project Settings → Database → Connection string → Transaction pooler* (puerto 6543). Copiar la cadena y reemplazar la contraseña.
4. **Desplegar en Vercel** (o similar): importar el repositorio, agregar la variable de entorno `DATABASE_URL` con esa cadena y desplegar. Vercel ya sirve por **HTTPS**, requisito para NFC, compartir y portapapeles.
5. Abrir `https://TU-DOMINIO/`, tocar **Crear hogar**.

## Obtener la URL del hogar

Dentro de la app: botón **Compartir** (arriba a la derecha). Ahí está el enlace con botón de copiar, el **código QR** y el botón de enviar por el menú del celular.

## Grabar la URL en una etiqueta NFC

Necesitás una etiqueta **NTAG213/215/216** (económicas, compatibles con Android e iPhone) y un celular con NFC.

1. Copiá el enlace del hogar (Compartir → copiar).
2. Instalá **NFC Tools** (Android o iPhone, gratis).
3. *Escribir → Agregar un registro → URL/URI* → pegá el enlace → *Escribir* → acercá la etiqueta a la parte trasera del celular hasta la confirmación.
4. Pegala en la heladera. (Las etiquetas sobre superficies metálicas necesitan versión "anti-metal" o un separador.)
5. Opcional: *Otros → Proteger con contraseña / Solo lectura* para que nadie la sobrescriba.

## Probar el NFC

- **Android:** activar NFC en *Ajustes → Conexiones*, con la pantalla desbloqueada. Al acercar la etiqueta se abre el enlace en el navegador (en algunos modelos pregunta con qué app abrirlo).
- **iPhone (XS o posterior, iOS 14+):** funciona con la pantalla encendida; aparece una notificación «Abrir en Safari» al acercar la etiqueta. En iPhone XR/11 y posteriores no hace falta activar nada. En iPhone 7/8/X hay que usar el lector del *Centro de control* (agregar «Lector de etiquetas NFC»).
- Si no pasa nada: quitar fundas gruesas o con metal, mover el celular despacio sobre la zona de la antena y verificar que la etiqueta se grabó (releerla en NFC Tools).

Los comportamientos varían según marca y versión del sistema; por eso conviene probar con los celulares reales de la casa. Si algún celular no lee NFC, usa el enlace o el QR.

## Compartir sin NFC

- **Enlace:** Compartir → *Enviar enlace* (WhatsApp, etc.) o copiarlo.
- **QR:** que la otra persona escanee el código con la cámara.
- **Código:** en la pantalla de inicio, «Ya tengo un enlace» acepta el enlace completo o solo el código.
- Cada dispositivo recuerda su hogar y vuelve a abrirlo solo (solo se guarda el token en el navegador; los datos viven en la base).

## Instalar como app (PWA) y uso sin conexión

- **Android (Chrome):** menú ⋮ → *Instalar aplicación*. **iPhone (Safari):** compartir → *Agregar a pantalla de inicio*. Se abre a pantalla completa, directo en la lista del hogar.
- **Sin conexión:** la última lista queda guardada en el celular y abre sin internet. Lo que agregues o marques sin señal se ve al instante, queda en una cola en el dispositivo y se envía solo, en orden, al volver la conexión (aparece un aviso mientras tanto). Si dos personas cambian lo mismo sin conexión, se aplican en el orden en que lleguen al servidor.
- El service worker solo se registra en producción (`npm run build && npm start`).

## Categorías propias, emojis y «alguien está en el súper»

- **Categorías:** cada hogar arranca con 9 y las edita a gusto: *Catálogo → ⚙ Editar categorías* (crear, renombrar, elegir emoji, reordenar, borrar) o «+ Nueva» al crear un producto. El orden elegido es el de la lista, el modo súper y el PDF. «Otras» no se borra: al eliminar una categoría, sus productos pasan ahí.
- **Emoji propio:** el campo usa el teclado de emojis del celular (no hay grilla); vacío = automático según el nombre.
- **Presencia:** al abrir el modo súper se avisa al resto del hogar («Ana está en el súper ahora»); el aviso se renueva cada 20 s y vence a los 60 s. El nombre es opcional (Compartir → «Tu nombre en este celular»).
- **Quién hizo qué:** la primera vez que se entra desde un celular se pregunta el nombre (se puede omitir con «Ahora no» y cambiar en Compartir). Cada producto muestra la inicial de quien lo agregó y, una vez comprado, de quien lo compró. El nombre es solo una etiqueta: no hay cuentas, así que no impide que alguien escriba el de otra persona.
- **El celular recuerda el hogar:** al entrar una vez, se guarda en una cookie de 1 año y en el dispositivo (con su nombre); abrir la app o la página de inicio entra directo, sin escribir nada. Los hogares guardados se ven en `/?nuevo=1`. Si se borran los datos del navegador, vuelve a servir el enlace o el QR.

## Íconos y sugerencias

- Cada producto muestra su emoji: el que elegiste (catálogo → editar → *Ícono*, o al crearlo) o uno deducido del nombre; si no se reconoce, la inicial.
- «Quizás te falta»: con el historial calcula cada cuántos días comprás un producto y lo sugiere cuando pasó ~85 % de ese intervalo y no está en la lista (necesita 2+ compras en días distintos). Es un promedio simple, sin IA.

## Estructura

```
supabase/migrations/   esquema SQL (RLS activado, sin políticas)
src/server/            conexión SQL y lógica de datos (solo servidor)
src/app/api/           POST /api/households · GET/POST /api/h/[token]
src/lib/               dominio, validaciones (zod), PDF/WhatsApp, agrupado
src/hooks/             useHousehold (estado + sincronización) y useActions
src/components/        pantallas: lista, catálogo, historial, modo súper, compartir, exportar
scripts/               db:dev (Postgres local), migrate, test-api
```

## Funciones

Catálogo con favoritos y categorías · lista agrupada por categoría con cantidades y unidades (+/−) · sin duplicados (suma cantidad) · notas · comprados con «Vaciar» confirmado · deshacer al eliminar · frecuentes · historial y «Repetir compra» · modo supermercado (pantalla grande, mantiene la pantalla encendida si el navegador lo permite) · PDF por categorías con casillas y fecha · imprimir · compartir por WhatsApp (menú nativo con el PDF; si no existe, enlace `wa.me` con el texto).
