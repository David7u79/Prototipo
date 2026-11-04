# Investigación UX: app web y landing (2026-11-04)

Auditoría estática de `apps/web` y `apps/landing`, con lo que sirve producción y una comparación
con landings de apps fitness y con páginas de descarga de APK. Es sólo lectura: no se tocó código.

**Nota.** Durante la auditoría apareció en el árbol de trabajo un cambio ajeno sin commit: la
página `apps/landing/src/pages/avance.astro`, la entrada `/avance` en `data/site.ts` y
`apps/landing/scripts/`. No se ha revisado. Cuando entre, `/avance` heredará el mismo 301 roto
(§8).

**Método.** Lectura de código (referencias `archivo:línea` sobre `main` @ `ce2511d`), `curl` de
sólo lectura contra `https://garfit.da-bit.cloud` (landing), `https://garfit-app.da-bit.cloud`
(web) y `https://garfit-api.da-bit.cloud` (API), ratios de contraste WCAG 2.x calculados con la
fórmula de luminancia relativa (script Node) y búsqueda web. No se lanzó `next build`. Los tamaños
de bundle se midieron sobre los assets servidos en producción, que equivalen al build y cuestan
menos.

---

## 0. Resumen

| # | Hallazgo | Severidad |
| --- | --- | --- |
| 1 | En producción, todos los enlaces internos de la landing (`/descargar`, `/caracteristicas`, `/ia`, `/acerca`) devuelven `301` a `http://garfit.da-bit.cloud:8080/...`, que no responde (timeout). Sólo funciona la portada. | **Crítica** |
| 2 | La API responde `NO_RELEASE_PUBLISHED`, así que la landing muestra «Próximamente» y no se puede descargar el APK. | **Crítica** (producto) |
| 3 | Cada superficie tiene una marca distinta: el móvil usa Aurora oscuro (violeta/cian), la web y la landing usan verdes claros distintos (`#176b4d` y `#166534`) y el icono del APK sigue siendo el de la plantilla de Expo. | Alta |
| 4 | El copy de la landing está desfasado: marca como «En desarrollo» funciones que ya existen (entrenamientos, PRs, historial), omite WODs y Wear OS, y usa jerga técnica («se consulta desde la API»). | Alta |
| 5 | La landing no tiene `og:image`, `og:url`, canonical, `site` ni sitemap. La web pone el mismo `<title>` a todas las páginas. | Media |
| 6 | Ni la landing ni la web envían cabeceras de seguridad, y los assets con hash de la landing no tienen `Cache-Control`. | Media |
| 7 | Accesibilidad: la web tiene campos sin etiqueta y bordes de input con contraste 1.31:1. En el móvil, el texto blanco sobre el acento Aurora da 4.35:1 (no llega a AA) y sobre el extremo cian del degradado, 1.81:1. | Media |
| 8 | Los estados de carga y error sólo existen en `/app/movements`. No hay `not-found`, ni `error` ni `loading` globales. | Media |

---

## 1. Stack y estilos

| Superficie | Stack | Estilos | Tipografía | Tema |
| --- | --- | --- | --- | --- |
| Móvil | Expo / React Native | `StyleSheet` con tokens en `apps/mobile/src/constants/theme.ts` | Sistema (Roboto) | Aurora, sólo oscuro (`app.json` → `userInterfaceStyle: dark`) |
| Web | Next 16.3, React 19.2, Server Actions | Tailwind v4, `@theme` en `apps/web/src/app/globals.css:2-11` | `Arial, Helvetica` (`globals.css:10,15`) | Claro, verde `#176b4d` |
| Landing | Astro 7 estático + nginx 1.27 | Tailwind v4, `@theme` en `apps/landing/src/styles/global.css:3-11` | `"Inter", "Segoe UI"` (`global.css:10`), pero **Inter no se carga en ningún sitio** | Claro, verde `#166534` |

La web y la landing ya usan Tailwind v4 con `@theme`. Para compartir tokens basta un único fichero
CSS (ver §7).

## 2. Coherencia visual con Aurora

**La marca no se ve igual en ninguna de las tres superficies.**

- **Color.** El móvil usa `accent #7C5CFF`, `metric #22D3EE` y fondo `#0A0D18`
  (`theme.ts:5-22`). La web usa `brand #176b4d` (`globals.css:6`) y la landing,
  `accent #166534` (`landing/src/styles/global.css:8`): son dos verdes distintos entre sí y
  ninguno es Aurora. La web, además, mezcla `emerald-50` y `slate-*` sueltos fuera de los tokens
  (`app/app/layout.tsx:25`, `app/app/page.tsx:38`).
- **Logotipo.** La landing usa una «G» dentro de un cuadrado verde (`Layout.astro:36-38`) y un
  favicon con un glifo G sobre `#166534` (`public/favicon.svg`). La web pone «GarFit» en texto
  verde (`app/app/layout.tsx:44`). El icono de launcher y el adaptativo de Android
  (`apps/mobile/assets/images/icon.png`, `android-icon-foreground.png`) **siguen siendo el
  chevron azul de la plantilla de Expo**. Quien descarga el APK desde una landing verde acaba con
  un icono azul de Expo y una app violeta.
- **Tipografía.** Arial en la web, Inter declarada pero sin cargar en la landing (cae a Segoe UI o
  Roboto según el sistema) y Roboto en el móvil. La escala tampoco coincide: el móvil tiene
  `display 34/800` y `metric 36/800 tabular-nums` (`theme.ts:34-41`), mientras que la web muestra
  métricas a `text-2xl font-bold` sin `tabular-nums` (`app/app/page.tsx:51-63`).
- **Lenguaje de componentes.** El móvil tiene tarjetas sobre `surface`, `heroCard` con degradado,
  chips por tono (`ui.tsx:16-22`) y un botón primario con degradado. La web tiene tarjetas blancas
  con borde gris y enlaces subrayados como CTA. La landing tiene tarjetas blancas con `shadow-sm`.

## 3. Estados vacío, carga y error

**Web**

- `loading.tsx` y `error.tsx` sólo existen en `app/app/movements/`. Las demás rutas de `/app`
  (dashboard, workouts, records, wods, ai) no tienen `loading` ni `error` propios ni de grupo. Una
  caída de la API sin 401 lanza el error de `dashboardData()` (`app/app/page.tsx:20-23`) sin una
  frontera a medida, así que se ve el error por defecto de Next. Tampoco hay `not-found.tsx` ni
  `global-error.tsx`.
- `movements/loading.tsx:3` pone `aria-label` sobre un `<div>` sin rol, y los lectores de pantalla
  lo ignoran. Debería llevar `role="status"` y un texto oculto.
- `movements/error.tsx:4-11` dice qué falló pero no por qué, y no ofrece otra salida que
  «Reintentar».
- Los estados vacíos del dashboard están bien planteados («Aún no hay marcas. Explorar
  movimientos», `app/app/page.tsx:140-145`). Pero el CTA de un usuario nuevo es un enlace subrayado
  dentro de una tarjeta (`:107-109`), cuando debería ser un botón primario destacado («Registrar
  tu primer entrenamiento»).
- Los botones pendientes muestran texto («Procesando…», `auth-form.tsx:174`), lo cual está bien.

**Landing (`AndroidDownload.astro`)**

- Los estados de carga, sin release y error están cubiertos (`:27`, `:86-93`) y hay `<noscript>`
  (`:67-72`). Ahora mismo producción está en el estado **sin release**: el botón «Próximamente»
  está deshabilitado (`:43-45`) y no hay alternativa, ni «avísame», ni APK anterior, ni enlace a
  la web dentro de la tarjeta.
- `aria-live="polite"` está sobre toda la `<section>` (`:24`), así que cada cambio anuncia la
  tarjeta completa. Bastaría con ponerlo en `[data-status]`.

## 4. Responsive

- **Web.** La barra lateral pasa a ser una tira horizontal con `overflow-x-auto` por debajo de
  `md` (`app/app/layout.tsx:48`). Son 8 entradas, una de ellas muerta («Progreso ·
  Próximamente», `:16`), sin indicador de scroll y sin estado activo (no hay `aria-current` ni
  `usePathname`). Para el móvil web lo esperable es una barra inferior como la del APK o un menú.
  El formulario de WODs (`app/app/wods/page.tsx:21-30`) es un `flex` de input, select y botón sin
  `flex-wrap`, y se aprieta en 360 px. La tabla de marcas sí tiene `overflow-x-auto`
  (`records/[movementSlug]/page.tsx:105`). El botón de Google tiene un ancho fijo de 320 px
  (`auth-form.tsx:133`), que cabe justo en 360 px con `p-5`.
- **Landing.** Usa `shell` con `px-5` y rejillas `md:`/`lg:`, y escala bien. En móvil la
  navegación salta a dos líneas (`Layout.astro:42-44`, `flex-wrap`); con 5 entradas es
  aceptable. El viewport no incluye `initial-scale=1` (`Layout.astro:18`), algo menor.

## 5. Accesibilidad

### 5.1 Semántica, etiquetas y foco

| Ubicación | Problema |
| --- | --- |
| `apps/web/src/app/app/wods/page.tsx:22-23` | El `input` de búsqueda y el `select` de tipo no tienen `<label>` ni `aria-label`; sólo un placeholder. |
| `apps/web/src/app/app/layout.tsx:10-19,24-30` | La navegación no marca la página actual con `aria-current`; el ítem «Progreso» es un `<span>` que parece una opción de menú. |
| `apps/landing/src/layouts/Layout.astro:52-55` | `currentPath === href` compara `/descargar` con `Astro.url.pathname`, que en el build `directory` vale `/descargar/`. En producción **sólo «Inicio» llega a marcarse como activa**. |
| `apps/web/src/components/auth-form.tsx:65-68` | Si hay varios errores se repite el mismo `id={errorId}` en cada `<p>` (ids duplicados). |
| `apps/web/src/app/globals.css:17-21` | `input` y `select` usan `outline-none` y un anillo `ring-brand/25`, lo cual es aceptable. Pero `textarea` no recibe estilos (`wod-builder.tsx:64`, `record-form.tsx:175`) y se ve con el aspecto del navegador. |
| `apps/web/src/app/layout.tsx` | No hay enlace «Saltar al contenido». En la landing tampoco. |
| `apps/landing/src/components/AndroidDownload.astro:34` | El `aria-label` del QR lee la URL completa del API. Basta con «Código QR para descargar GarFit para Android». |

El foco está bien resuelto en ambas: `:focus-visible` con outline en la landing
(`global.css:26-28`) y en la web (`globals.css:22-25`). Ambas declaran `lang="es"`.

### 5.2 Contraste (WCAG 2.x, calculado)

Umbrales: 4.5:1 para texto normal, 3:1 para texto grande y para componentes de interfaz (1.4.11).

| Par | Ratio | Resultado |
| --- | --- | --- |
| Landing `muted #526176` / blanco | 6.31 | AA |
| Landing `muted` / `surface #f6f8fb` | 5.93 | AA |
| Landing blanco / `accent #166534` (botón) | 7.13 | AAA |
| Landing `line #dce3ed` / blanco (borde de `button-secondary`) | 1.29 | Decorativo (el texto identifica el botón) |
| Web `muted #5c6a62` / `surface #f6f8f6` | 5.33 | AA |
| Web blanco / `brand #176b4d` | 6.47 | AA |
| Web `red-700` / `red-50` (alertas) | 5.91 | AA |
| Web `amber-700` / blanco | 5.02 | AA |
| **Web `line #dbe3dd` / blanco (borde de input)** | **1.31** | **No cumple 1.4.11.** El input sólo se distingue por el borde. |
| Aurora `text #EEF1FA` / `background` | 17.16 | AAA |
| Aurora `muted #8A93AD` / `surfaceRaised` | 5.21 | AA |
| **Aurora `subtle #5B6480` / `surface` (placeholder)** | **3.01** | No llega a AA para texto |
| **Aurora `accent #7C5CFF` / `background` (texto de acento)** | **4.46** | Roza AA, falla por 0.04 |
| Aurora `accent` / `surface` (`sectionAction`, `ui.tsx:327`) | 4.06 | No llega a AA |
| **Aurora blanco / `accent #7C5CFF` (texto de botón 16/700)** | **4.35** | No llega a AA (16 px bold no cuenta como texto grande) |
| **Aurora blanco / `#22D3EE` (extremo del degradado primario, `ui.tsx:291,304`)** | **1.81** | Falla |
| Aurora `#0A0D18` / `#22D3EE` | 10.72 | AAA, sirve para texto oscuro sobre cian |
| Aurora `metric` / `metricSoft`, `success` / `successSoft`, `danger` / `dangerSoft` | 7.90 / 7.59 / 5.92 | AA |
| Aurora `border #232A42` / `surface` | 1.24 | No cumple 1.4.11 si delimita campos |

**Ajustes propuestos a Aurora**, antes de llevarla a la web (verificados con el mismo script):

| Token nuevo | Valor | Ratio |
| --- | --- | --- |
| `accentText`, para texto o enlace violeta sobre oscuro | `#9B82FF` | 6.49 sobre `background`, 5.91 sobre `surface` |
| `accentFill`, fondo de botón con texto blanco | `#6D4AFF` | 5.15 |
| `subtle`, placeholder | `#7A83A0` | 4.69 sobre `surface` |
| `borderStrong`, borde de input | `#5B6480` (el `subtle` actual) | 3.01 sobre `surface` |

El degradado violeta→cian queda como decoración (halo, borde, hero) y no como fondo de texto
blanco.

## 6. SEO, meta y OG de la landing

`Layout.astro:17-24` tiene `description`, `og:title`, `og:description` y `og:type`. Lo que falta:

- `og:image` (verificado: `/og.png` → 404). Sin ella, compartir el enlace en WhatsApp o Telegram,
  que es por donde se reparte un APK, no muestra tarjeta.
- `og:url`, `<link rel="canonical">`, `og:locale=es_MX`, `twitter:card`, `theme-color`,
  `apple-touch-icon` y manifest.
- `site` en `astro.config.mjs` (no existe, y la documentación de Astro lo recomienda para canonical
  y sitemap) e `@astrojs/sitemap` (`/sitemap-index.xml` → 404). `robots.txt` lo genera Cloudflare
  (contenido gestionado), no el repo.
- JSON-LD `SoftwareApplication` (operatingSystem Android, applicationCategory HealthApplication,
  `offers.price 0`).
- Títulos: el de la portada, «GarFit | Entrena · Registra · Evoluciona», no contiene ninguna
  palabra que alguien busque. Propuesta: «GarFit: registra WODs y marcas personales gratis | Web
  y Android».
- En la web, `metadata` sólo existe en `app/layout.tsx:5-8`: todas las pestañas se llaman
  «GarFit». Faltan `title.template` y `robots: { index: false }` para `/app/*`.

## 7. Rendimiento

Medido en producción (sin caché, `Accept-Encoding: gzip, br`):

| Recurso | Tamaño |
| --- | --- |
| Landing: HTML de portada | 14.9 KB sin comprimir |
| Landing: CSS | 4.2 KB gzip |
| Landing: JS de `AndroidDownload` | 1.9 KB gzip |
| **Landing: total** | **≈ 21 KB**, excelente |
| Web: `/login`, 9 chunks JS | ≈ 180 KB gzip (el mayor, 71 KB) |
| Web: CSS | 4.2 KB gzip |

- La landing es casi ideal por peso. El único coste evitable es la petición a la API en cliente
  antes de mostrar el botón de descarga. Se podría renderizar el botón con
  `/releases/android/latest/download` desde el HTML y dejar que el fetch rellene sólo versión,
  tamaño y hash (mejora progresiva).
- **Caché de la landing.** Los assets `/_astro/*.css|js` llevan hash pero se sirven sin
  `Cache-Control` (sólo `etag`), y nginx no lo configura (`apps/landing/nginx.conf:26-28`). La
  web sí envía `public, max-age=31536000, immutable` en `/_next/static`.
- Web: 180 KB gzip en el login es razonable para Next 16 con App Router. El script de Google
  Identity sólo se carga si hay `googleClientId` (`auth-form.tsx:178-184`), y en producción OAuth
  está desactivado. No hace falta tocar nada.
- Fuentes: si se adopta Inter, usar `next/font` en la web y `@fontsource-variable/inter` con un
  único subset `latin` en la landing (≈ 30-50 KB woff2). Ninguna llamada a Google Fonts en
  runtime.

## 8. Producción: lo que se sirve realmente

| Comprobación | Resultado |
| --- | --- |
| `GET https://garfit.da-bit.cloud/` | 200, `last-modified: Tue, 03 Nov 2026` |
| `GET /descargar` (y `/caracteristicas`, `/ia`, `/acerca`) | **301 → `http://garfit.da-bit.cloud:8080/descargar/`**. El destino hace timeout. |
| `GET /descargar/` (con barra final) | 200, lo que confirma que el contenido existe |
| `GET https://garfit-api.da-bit.cloud/releases/latest/android` | 404 `NO_RELEASE_PUBLISHED` |
| `GET .../releases/android/latest/download` | 404 `NO_RELEASE_PUBLISHED` |
| `GET https://garfit-app.da-bit.cloud/login` | 200, `Cache-Control: private, no-store`, `x-powered-by: Next.js` |
| Cabeceras de seguridad (landing y web) | **No hay** HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` ni `frame-ancestors`. |

**Causa del 301 roto.** Astro genera `descargar/index.html` (`build.format: 'directory'` por
defecto). nginx, con `try_files $uri $uri/` (`nginx.conf:27`), redirige `/descargar` a
`/descargar/` construyendo una URL absoluta con el puerto interno 8080 y el esquema `http`, porque
nginx no sabe que está detrás de Traefik y Cloudflare. El arreglo documentado es
`absolute_redirect off;` en el bloque `server`. También conviene que los enlaces de
`data/site.ts` terminen en `/`, o usar `build.format: 'file'`.

**Release.** La bitácora de producción (2026-10-27) registra un recorrido con el APK contra la API
pública, pero hoy no hay release publicada. No se investigó la causa (fuera de alcance). Hasta que
se publique, el CTA principal de la landing no lleva a ninguna parte.

Ambos hallazgos deberían constar en `docs/operations/bitacora-produccion.md` (no se edita aquí por
alcance).

## 9. Copy de la landing

**Propuesta de valor.** «Entrena. Registra. Evoluciona.» (`index.astro:31`) es un lema y no dice
qué hace la app ni para quién. «Seguimiento inteligente del rendimiento deportivo»
(`index.astro:30`) es genérico. Hevy («Log Workouts / Get Stronger / Stay Motivated» + «free
workout tracker for iOS and Android») y Strong («Think less. Lift more.» + «Free Forever») dicen
en una línea el qué y el precio. El hueco diferencial de GarFit frente a ellas es **CrossFit**:
WODs (AMRAP, EMOM, For Time), marcas personales y análisis con evidencia, gratis y sin anuncios.
Ahora mismo eso no aparece en la portada.

**Desfase y autosabotaje**

- `index.astro:17-18`: «Un asistente con IA, en desarrollo, ayudará…».
- `index.astro:12-13`: «estadísticas conforme estén disponibles».
- `index.astro:79-82`: «Android cuando haya una versión publicada… se consulta desde la API de
  GarFit». Es jerga interna.
- `caracteristicas.astro:5-14`: marca como «En desarrollo» el registro de entrenamientos, las PRs
  y el historial, que ya existen en la web (dashboard con estadísticas y comparación de periodos)
  y en el móvil. Faltan los WODs, la app Wear OS (`apps/wear`) y la IA.
- Nota de honestidad: en producción `AI_PROVIDER=fake` (bitácora). El copy de IA no debe prometer
  análisis reales mientras siga así. Propuesta: «Análisis con IA (beta)».

**Tono institucional.** El pie (`Layout.astro:75-78`) y `acerca.astro:35` presentan GarFit como
prototipo académico de la UATx. Es un descargo legítimo, pero en la superficie pública resta
confianza para una app de uso abierto. Propuesta: una línea neutra en el pie («Proyecto
independiente; no afiliado a ninguna institución») y el contexto de tesis sólo en `/acerca`.

**Sin pruebas visuales.** No hay ni una captura de la app. La tarjeta del hero
(`index.astro:41-50`) son cuatro palabras en recuadros grises. Hevy y Strong abren con mockups del
teléfono y del reloj. Ya hay capturas en `docs/evidence/` y en la spec
`apps/web/e2e/presentation-captures.spec.ts`, que se pueden reutilizar.

**CTA de descarga**

- En la portada, el CTA primario es la web y Android va en secundario (`index.astro:37-38`).
  Para una app cuyo producto estrella es el móvil, habría que invertirlo según el dispositivo:
  en Android, «Descargar APK» como primario; en escritorio, el QR y «Abrir en el navegador».
- Mostrar versión, tamaño y versión mínima de Android junto al botón, no debajo después de un
  fetch.

**Confianza del APK (`AndroidDownload.astro:48-63`)**

- El SHA-256 está bien, pero sólo aparece si la release carga, y no explica *cómo* calcularlo.
  Añadir los comandos: `certutil -hashfile garfit.apk SHA256` (Windows),
  `sha256sum garfit.apk` (Linux) o `shasum -a 256` (macOS).
- Signal, el referente del sector, publica además la **huella SHA-256 del certificado de firma** y
  el comando `apksigner verify --print-certs`. La huella del certificado es estable entre
  versiones y demuestra el origen, no sólo la integridad del fichero. `docs/operations/android-signing.md`
  no la recoge. Hay que obtenerla una vez con `keytool -list -v` sobre el keystore de release (o
  con `apksigner verify --print-certs` sobre el APK) y publicarla como texto estático.
- Los pasos de instalación (`:59-63`) son genéricos. Habría que decir qué ve el usuario: el aviso
  de Chrome («Este tipo de archivo puede dañar tu dispositivo»), *Ajustes → Instalar apps
  desconocidas → Chrome → Permitir*, el posible análisis o aviso de Play Protect y qué hacer.
- Faltan las **actualizaciones**: el APK no se actualiza solo, se actualiza instalando encima
  (misma firma, los datos se conservan). Y hay que avisar de que desinstalar antes no es
  necesario.
- Faltan los permisos que pide la app y un enlace de privacidad, que es lo que mira quien instala
  fuera de Play.

## 10. Benchmark

| Referencia | Patrón aprovechable |
| --- | --- |
| [Hevy](https://www.hevyapp.com/) | Hero con qué, plataformas y «free» en una frase; prueba social (4.9★, 17 M de usuarios); mockups de teléfono y reloj; secciones por beneficio (registrar, medir progreso, comunidad, reloj, escritorio); CTA repetido al final. |
| [Strong](https://www.strong.app/) | Titular de 4 palabras con beneficio («Think less. Lift more.»); «Free Forever» junto al CTA; capturas multiplataforma; lista de funciones concretas (supersets, CSV, RPE). |
| [Signal, APK directo](https://signal.org/android/apk/) | Recomienda la tienda y presenta el APK como opción avanzada; publica la huella del certificado de firma y el comando `apksigner verify`. |
| [Landingi, fitness](https://landingi.com/landing-page/fitness-examples/), [Unbounce](https://unbounce.com/?p=134325), [Muffin Group](https://muffingroup.com/blog/fitness-landing-page) | Hero con titular, subtítulo y un único CTA; testimonios o métricas de usuarios como prueba social. |
| [Android Developers Blog, instalación de apps desconocidas](https://android-developers.googleblog.com/2017/08/making-it-safer-to-get-apps-on-android-o.html?hl=en) | Desde Android 8 el permiso se concede por app de origen (Chrome, Archivos); los pasos deben nombrar esa app. |
| [nginx detrás de proxy, puerto en redirect](https://medium.com/localhost-run/fixing-nginx-links-that-have-the-wrong-hostname-or-port-a35e378a91a7), [TrafeX/docker-php-nginx#82](https://github.com/TrafeX/docker-php-nginx/pull/82) | `absolute_redirect off;` elimina esquema y puerto de las redirecciones de barra final. |
| [Astro: configuration reference](https://docs.astro.build/en/reference/configuration-reference/) | `build.format: 'directory'` añade la barra final; recomienda emparejarlo con `trailingSlash: 'always'` y definir `site` para canonical y sitemap. |

GarFit no puede usar todavía prueba social (sin usuarios ni valoraciones de tienda). El sustituto
honesto es la transparencia: es gratis, sin anuncios, cuenta qué datos guarda y publica su firma
verificable.

---

## 11. Propuestas priorizadas

### 11.1 Quick wins (< 1 h cada una)

| # | Archivo:línea | Problema | Propuesta | Impacto |
| --- | --- | --- | --- | --- |
| Q1 | `apps/landing/nginx.conf:20-28` | Las subpáginas redirigen a `http://…:8080/` y caen. | Añadir `absolute_redirect off;` en `server`, y opcionalmente las rutas de `data/site.ts:2-6` con `/` final. | **Crítico**: hoy la página de descarga es inaccesible desde la navegación. |
| Q2 | Operación (API) | No hay release publicada: CTA «Próximamente». | Publicar el APK actual (`docs/operations/release.md`). | **Crítico**: sin esto, la landing no cumple su función. |
| Q3 | `apps/landing/nginx.conf:26` | Ni caché ni cabeceras de seguridad. | `location /_astro/ { add_header Cache-Control "public, max-age=31536000, immutable"; }` más `add_header` de `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy` y `Strict-Transport-Security`. | Medio: repetición más rápida y mejor puntuación en auditorías. |
| Q4 | `apps/web/next.config.ts:3` | `x-powered-by` y ninguna cabecera de seguridad. | `poweredByHeader: false` y `headers()` con las mismas cabeceras de Q3. | Medio |
| Q5 | `apps/landing/src/layouts/Layout.astro:52-55` | El estado activo nunca coincide fuera de la portada. | Normalizar: `currentPath.replace(/\/$/, '') === href.replace(/\/$/, '')`, o href con `/` final. | Bajo, pero es un bug real |
| Q6 | `apps/landing/src/layouts/Layout.astro:17-24`, `astro.config.mjs` | Sin `og:image`, canonical ni `site`. | `site: 'https://garfit.da-bit.cloud'`, `og:image` de 1200×630 en `public/`, `og:url`, canonical, `twitter:card`, `theme-color #0A0D18`. | Medio-alto: tarjeta visible al compartir por mensajería |
| Q7 | `apps/web/src/app/app/wods/page.tsx:22-23` | Campos sin etiqueta. | `aria-label="Buscar WOD"` y `aria-label="Tipo de WOD"`, o `<label class="sr-only">`. | A11y |
| Q8 | `apps/web/src/app/globals.css:17-21` | Borde de input de 1.31:1; `textarea` sin estilo. | Añadir `textarea` al selector y usar un borde de al menos 3:1 (p. ej. `#8a968f`). | A11y (1.4.11) |
| Q9 | `apps/web/src/app/app/layout.tsx:16` | Ítem muerto «Progreso · Próximamente». | Quitarlo hasta que exista. | Bajo |
| Q10 | `apps/landing/src/pages/caracteristicas.astro:5-14`, `index.astro:12-18,79-82` | El copy dice «en desarrollo» de lo que ya existe y usa jerga. | Actualizar los estados; añadir WODs, Wear OS e IA (beta); sustituir «se consulta desde la API» por «Descarga directa del APK, sin Play Store». | Alto en conversión, coste mínimo |
| Q11 | `apps/web/src/app/layout.tsx:5-8` | Mismo título en todas las páginas; `/app` indexable. | `title: { template: '%s · GarFit', default: 'GarFit' }`, `metadata.title` por página y `robots: { index: false }` en `app/app/layout.tsx`. | Bajo-medio |
| Q12 | `apps/landing/src/components/AndroidDownload.astro:24,34` | `aria-live` en toda la tarjeta; QR con URL larga. | Mover `aria-live` a `[data-status]` y acortar el `aria-label`. | A11y menor |

### 11.2 Medianas (medio día a 2 días)

| # | Archivo:línea | Problema | Propuesta | Impacto |
| --- | --- | --- | --- | --- |
| M1 | `apps/web/src/app/app/` (nuevos `loading.tsx`, `error.tsx`, `not-found.tsx` a nivel de `app/app/`, y `app/global-error.tsx`) | Sólo `/movements` tiene estados. | Esqueleto genérico con `role="status"`, un error con mensaje humano más «Reintentar» y «Volver al inicio», y un 404 con marca. | Alto en la percepción de calidad |
| M2 | `apps/landing/src/components/AndroidDownload.astro:48-63`, `pages/descargar.astro` | Confianza del APK incompleta. | Publicar la huella del certificado de firma (estática, en `site.ts`), los comandos de hash por SO, pasos de Android 8+ nombrando a Chrome y «Instalar apps desconocidas», un apartado de **Actualizar** (instalar encima conserva datos), versión mínima de Android, permisos y enlace de privacidad. Si no hay release, mostrar «Usa la web mientras tanto» con el botón dentro de la tarjeta. | Alto: elimina el principal motivo de abandono en la descarga directa |
| M3 | `apps/landing/src/pages/index.astro:27-52` | Hero sin producto ni diferenciación. | Titular con el qué y para quién («Tus WODs y marcas personales, en un solo lugar»), subtítulo «Gratis, sin anuncios. Android, web y Wear OS», 2-3 capturas reales del móvil Aurora en marco de teléfono y CTA según dispositivo (Android → APK; escritorio → QR más web). | Alto |
| M4 | `apps/web/src/app/app/layout.tsx:41-57` | Navegación móvil web débil, sin estado activo. | Pasar el nav a un componente cliente con `usePathname` y `aria-current`. Por debajo de `md`, barra inferior de 4-5 destinos como en el APK y el resto en «Más». | Medio |
| M5 | `apps/web/src/app/app/page.tsx:48-65,189-208` | Métricas sin jerarquía («Actual: / Anterior: / Diferencia:» en texto plano). | Componente `Stat` (número grande con `tabular-nums`, unidad y delta como chip de color, como el `metric` del móvil). Primer CTA destacado para usuario sin datos. | Medio |
| M6 | `apps/mobile/assets/images/icon.png`, `android-icon-*.png`, `apps/landing/public/favicon.svg` | El icono del APK es el de la plantilla de Expo. | Diseñar un único isotipo Aurora (G o chevron con el degradado `#7C5CFF→#22D3EE` sobre `#0A0D18`) y exportarlo a icon, adaptativo, monocromo, splash, favicon y og:image. Es tarea de diseño, no de código. | Alto en marca: es lo que el usuario ve todos los días |

### 11.3 Rediseño: Aurora en las tres superficies

**Objetivo.** Que landing, web y APK se reconozcan como el mismo producto.

1. **Landing en Aurora oscuro**, con hero sobre `gradients.hero`, capturas del móvil y el
   degradado como halo o borde, no detrás de texto blanco. Es la superficie de captación y debe
   anticipar lo que el usuario verá al abrir el APK.
2. **Web en Aurora oscuro.** Hoy Aurora es sólo oscuro (`theme.ts:4`) y la web es una herramienta
   de datos como el móvil. Usar un único tema evita mantener dos paletas. Si más adelante se pide
   tema claro, se añade como segundo bloque de tokens.
3. **Corregir contraste antes de exportar** (§5.2): `accentText #9B82FF`, `accentFill #6D4AFF`,
   `subtle #7A83A0`, `borderStrong #5B6480`. El móvil se beneficia de lo mismo: botón primario y
   `sectionAction` (`ui.tsx:291,304,327`).
4. **Tipografía común.** Inter (variable) en web y landing. En el móvil, opcional (`expo-font`);
   Roboto y la escala de `theme.ts:34-41` ya están cerca.

### 11.4 Compartir tokens entre móvil y web, sin sobreingeniería

La web y la landing usan Tailwind v4 con `@theme`, y el móvil usa objetos TS. No hace falta Style
Dictionary ni un generador. Basta un paquete con dos ficheros y un test que los mantenga iguales:

```
packages/design-tokens/
  package.json        # "exports": { ".": "./tokens.ts", "./theme.css": "./theme.css" }
  tokens.ts           # colors, gradients, radius, space, type  (fuente de verdad)
  theme.css           # @theme { --color-background: #0A0D18; --color-accent: #7C5CFF; … }
  tokens.test.ts      # parsea theme.css y compara cada --color-* con tokens.ts
```

- **Móvil.** `apps/mobile/src/constants/theme.ts` reexporta `colors`, `gradients`, `radius` y
  `space` desde `@garfit/design-tokens` y conserva lo propio de React Native (`navigationTheme`,
  `headerOptions`, `type` con `TextStyle`). Metro resuelve paquetes de workspace; habría que
  comprobar si hace falta `watchFolders` (consultar la documentación de Expo v57 antes de tocar
  nada, según `apps/mobile/AGENTS.md`).
- **Web y landing.** `@import "@garfit/design-tokens/theme.css";` sustituye los bloques `@theme`
  de `apps/web/src/app/globals.css:2-11` y `apps/landing/src/styles/global.css:3-11`. Las clases
  pasan a ser `bg-background`, `text-accent`, etc., con los mismos nombres que en el móvil.
  Habría que renombrar `brand` → `accent`, `ink` → `text` y `panel` → `surface`. Es un cambio
  mecánico, de 3 o más ficheros, que corresponde a un brief para Codex.
- **Coste.** Unas 60 líneas más un test. Se descarta una dependencia de build para generar el CSS:
  con un único consumidor por formato, duplicar 16 colores bajo un test de igualdad es más simple
  que generarlos.

### Orden recomendado

Q1 → Q2 → Q10 → Q6 → Q3/Q4 → M2 → M6 → M3 → paquete de tokens → rediseño Aurora de web y
landing → M1, M4 y M5 sobre el sistema nuevo.

---

## Fuentes

- Hevy, landing: https://www.hevyapp.com/
- Strong, landing: https://www.strong.app/
- Signal, descarga directa del APK: https://signal.org/android/apk/
- Landingi, ejemplos de landings fitness: https://landingi.com/landing-page/fitness-examples/
- Unbounce, ejemplos fitness: https://unbounce.com/?p=134325
- Muffin Group, landings fitness: https://muffingroup.com/blog/fitness-landing-page
- Android Developers Blog, «Making it safer to get apps on Android O»:
  https://android-developers.googleblog.com/2017/08/making-it-safer-to-get-apps-on-android-o.html?hl=en
- localhost.run, nginx con puerto o host erróneo en redirecciones:
  https://medium.com/localhost-run/fixing-nginx-links-that-have-the-wrong-hostname-or-port-a35e378a91a7
- TrafeX/docker-php-nginx PR #82 (`absolute_redirect off`):
  https://github.com/TrafeX/docker-php-nginx/pull/82
- Astro, referencia de configuración (`trailingSlash`, `build.format`, `site`):
  https://docs.astro.build/en/reference/configuration-reference/
