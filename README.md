# Rutas Jalisco

Aplicación web dinámica con una guía de lugares turísticos de Jalisco.

- **Backend:** Node.js + Express, vistas con EJS.
- **Base de datos:** PostgreSQL en Neon (tablas `lugares` y `comentarios`). Las tablas y los datos iniciales se crean solos al arrancar.
- **Edición de lugares:** cada lugar tiene un formulario en `/lugar/:slug/editar`.
- **Interfaz responsiva:** CSS Grid y Flexbox con media queries, pensada para celular y escritorio.
- **Medios en la nube:** fotografías de Wikimedia Commons, videos de YouTube y mapas de Google Maps.
- **Despliegue:** Render (Web Service, plan Free).

## Ejecutar en local

```bash
npm install
echo "DATABASE_URL=postgresql://usuario:contraseña@host/neondb?sslmode=verify-full" > .env
node --env-file=.env server.js
```

## Render

- Build command: `npm install`
- Start command: `npm start`
- Variable de entorno: `DATABASE_URL` con la cadena de conexión de Neon.
