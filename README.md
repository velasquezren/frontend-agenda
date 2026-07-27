# Agenda — frontend

Interfaz de la agenda de sesiones médicas de Clínica Montalvo. Angular 22
(standalone + signals), Tailwind 4, FullCalendar 7. Es una PWA instalable.

Backend: [backend-agenda](https://github.com/velasquezren/backend-agenda).

## Correr en local

```bash
npm install && npm start
```

Necesita el API en `127.0.0.1:8001`. `proxy.conf.json` manda `/agenda-api` ahí,
así que la ruta es la misma en desarrollo y en producción.

## Pruebas

```bash
npx ng test --watch=false
```

22 tests: primitivas de UI, utilidades de horario y el diálogo de cita contra un
`HttpTestingController`. `src/test-setup.ts` stubea `<dialog>` porque jsdom
todavía no trae `showModal()`.

## Qué se puede hacer

- Calendario semanal o diario (9:00–19:00), arrastrar y redimensionar citas.
- Pestaña **Todos**: superpone las agendas de todos los médicos, en solo lectura
  (para agendar hay que elegir uno). Aparece solo si la lic tiene más de un médico.
- Alta con paciente buscado o creado al vuelo, atajos de duración (30/45/60/90) y
  recurrencia con previsualización de cuántas citas se van a crear.
- Edición: cambiar paciente, horario, notas y **estado** (programada / cumplida /
  no asistió), y cancelar con confirmación.
- Interruptor para ver también las canceladas (tachadas y en gris).

Si el servidor responde **409** al mover una cita, el arrastre se revierte y sale
un aviso con el nombre de quien ocupa el hueco.

## Design system — `src/app/ui/`

Nada de kit externo: los componentes son locales y el criterio es sobrio —
neutros de `slate`, esquinas `rounded-md`, sin sombras de color ni degradados, y
como única animación un fundido de 120 ms al abrir un modal (que además se apaga
con `prefers-reduced-motion`).

El color lo ponen dos cosas y nada más: **el color de cada médico**, que viene de
la base de datos, y el verde de la clínica `--color-marca-*` (`#006156`) definido
en `@theme` dentro de `src/styles.css`. El resto del chrome es gris a propósito.

| Pieza | Qué es |
|---|---|
| `button.ts` | directiva `appBtn` — 5 variantes × 4 tamaños, sirve en `<button>` y `<a>` |
| `input.ts` | directiva `appInput` para input/select/textarea, con estado `invalido` |
| `field.ts` | etiqueta + control + ayuda/error, con `for` y `role="alert"` ya atados |
| `dialog.ts` | modal sobre el `<dialog>` nativo: trampa de foco, Esc y `aria-modal` gratis |
| `tabs.ts` | pestañas con el patrón ARIA completo (flechas / Inicio / Fin) |
| `logo.ts` | isotipo de la clínica; pinta con `currentColor` |
| `badge.ts`, `spinner.ts`, `toaster.ts`, `confirm-host.ts` | lo demás |

Las confirmaciones se piden desde cualquier sitio con `ConfirmService.pedir(...)`,
que devuelve una promesa; el `<app-confirm-host />` del shell dibuja el modal.
Nada de `window.confirm`.

### Dos trampas que ya nos mordieron

**`<dialog>` y Tailwind.** El preflight pone `margin: 0` a todos los elementos, y
con eso se carga el `margin: auto` con el que el navegador centra los modales —
salen arriba a la izquierda. Por eso `app-dialog` lleva `m-auto`, y hay un test
que lo vigila.

**Los toasts no se ven sobre un modal.** El `<dialog>` nativo vive en el *top
layer*, por encima de cualquier `z-index`. Los errores que ocurren con un modal
abierto se pintan dentro del formulario, no como toast.

### Calendario

El tema `classic` de FullCalendar es 100 % variables CSS, así que se repinta
sobreescribiendo las `--fc-classic-*` en `styles.css`, nunca sus clases (van
hasheadas y cambian entre versiones). La barra de navegación (`‹ › Hoy` + título)
es nuestra: `headerToolbar: false` y `datesSet` para el título.

**Ojo:** `slotMinTime`/`slotMaxTime` son el encuadre, no un filtro. Una cita fuera
de 9:00–19:00 existe y bloquea el hueco, pero no se dibuja.

## PWA

- `public/manifest.webmanifest` — `start_url` y `scope` relativos, así que funciona
  igual servida en `/` que en `/agenda/`.
- Iconos y `theme-color` (`#006156`) compartidos con el CRM.
- Service worker de Angular, activo **solo en producción** (`isDevMode()`).
  `ngsw-config.json` cachea el shell (HTML/JS/CSS/iconos) y **nada más**: las
  llamadas a `/agenda-api` nunca se cachean, la agenda tiene que verse en vivo.

## Producción

Se compila a estático y lo sirve el mismo Apache que el API, bajo `/agenda`:

```bash
npx ng build --base-href /agenda/
```

Copiar `dist/agenda-frontend/browser/` a la ruta que sirva Apache. El fragmento de
configuración (reverse proxy de `/agenda-api` y fallback de rutas de Angular) está
en el repo del backend, en `deploy/apache-agenda.conf`.

## Decisiones que se desviaron del plan original

- **Zard UI descartado:** su único paquete npm (`@ngzard/ui`) está marcado como
  *deprecated* y sin sucesor. Los componentes se escribieron directo en Tailwind,
  que es lo que Zard hace de todos modos: copiar el código al proyecto.
- **FullCalendar v7** (no v6): es la única línea con soporte para Angular 22. La
  API cambió de nombre en los callbacks (`EventDropArg` → `EventDropInfo`) y los
  plugins viven dentro del paquete `fullcalendar` (`fullcalendar/timegrid`).
