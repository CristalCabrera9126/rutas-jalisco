const express = require('express');
const path = require('path');
const { pool, inicializar } = require('./db');
const { validarLugar, LIMITES } = require('./validacion');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));

// Inicio: lista de lugares con búsqueda y filtro por categoría
app.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const categoria = (req.query.categoria || '').trim();
    const params = [];
    const where = [];
    if (q) {
      params.push(`%${q}%`);
      where.push(`(l.nombre ILIKE $${params.length} OR l.municipio ILIKE $${params.length})`);
    }
    if (categoria) {
      params.push(categoria);
      where.push(`l.categoria = $${params.length}`);
    }
    const { rows: lugares } = await pool.query(
      `SELECT l.*, COUNT(c.id)::int AS total_comentarios,
              ROUND(AVG(c.calificacion), 1) AS promedio
         FROM lugares l LEFT JOIN comentarios c ON c.lugar_id = l.id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        GROUP BY l.id ORDER BY l.id`,
      params
    );
    const { rows: cats } = await pool.query('SELECT DISTINCT categoria FROM lugares ORDER BY categoria');
    res.render('index', { lugares, categorias: cats.map((c) => c.categoria), q, categoria });
  } catch (e) {
    next(e);
  }
});

// Detalle de un lugar
app.get('/lugar/:slug', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM lugares WHERE slug = $1', [req.params.slug]);
    if (!rows.length) return res.status(404).render('404');
    const lugar = rows[0];
    const { rows: comentarios } = await pool.query(
      'SELECT * FROM comentarios WHERE lugar_id = $1 ORDER BY creado DESC',
      [lugar.id]
    );
    res.render('lugar', { lugar, comentarios, error: req.query.error, ok: req.query.ok, editado: req.query.editado });
  } catch (e) {
    next(e);
  }
});

// Formulario para editar un lugar
app.get('/lugar/:slug/editar', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM lugares WHERE slug = $1', [req.params.slug]);
    if (!rows.length) return res.status(404).render('404');
    res.render('editar', { lugar: rows[0], errores: [], LIMITES });
  } catch (e) {
    next(e);
  }
});

// Guardar los cambios de un lugar
app.post('/lugar/:slug/editar', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM lugares WHERE slug = $1', [req.params.slug]);
    if (!rows.length) return res.status(404).render('404');
    const original = rows[0];
    const { datos, errores } = validarLugar(req.body);

    if (errores.length) {
      return res.status(422).render('editar', { lugar: { ...original, ...datos }, errores, LIMITES });
    }

    await pool.query(
      `UPDATE lugares
          SET nombre = $1, municipio = $2, categoria = $3, resumen = $4, descripcion = $5,
              imagen_url = $6, imagen_fuente = $7, video_id = $8, mapa = $9
        WHERE id = $10`,
      [datos.nombre, datos.municipio, datos.categoria, datos.resumen, datos.descripcion,
        datos.imagen_url, datos.imagen_fuente, datos.video_id, datos.mapa, original.id]
    );
    res.redirect(`/lugar/${encodeURIComponent(original.slug)}?editado=1`);
  } catch (e) {
    next(e);
  }
});

// Guardar un comentario en la base de datos
app.post('/lugar/:slug/comentarios', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id FROM lugares WHERE slug = $1', [req.params.slug]);
    if (!rows.length) return res.status(404).render('404');
    const autor = (req.body.autor || '').trim().slice(0, 60);
    const texto = (req.body.texto || '').trim().slice(0, 500);
    const calificacion = parseInt(req.body.calificacion, 10);
    const base = `/lugar/${encodeURIComponent(req.params.slug)}`;
    if (!autor || !texto || !(calificacion >= 1 && calificacion <= 5)) {
      return res.redirect(`${base}?error=1#comentarios`);
    }
    await pool.query(
      'INSERT INTO comentarios (lugar_id, autor, calificacion, texto) VALUES ($1, $2, $3, $4)',
      [rows[0].id, autor, calificacion, texto]
    );
    res.redirect(`${base}?ok=1#comentarios`);
  } catch (e) {
    next(e);
  }
});

app.use((req, res) => res.status(404).render('404'));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Ocurrió un error en el servidor.');
});

inicializar()
  .then(() => app.listen(PORT, () => console.log(`Rutas Jalisco en http://localhost:${PORT}`)))
  .catch((e) => {
    console.error('No se pudo conectar a la base de datos:', e.message);
    process.exit(1);
  });
