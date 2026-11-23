const express = require('express');
const path = require('path');
const { pool, inicializar } = require('./db');
const { validarLugar, crearSlug, LIMITES } = require('./validacion');

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
    res.render('index', {
      lugares,
      categorias: cats.map((c) => c.categoria),
      q,
      categoria,
      eliminado: req.query.eliminado,
    });
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
    res.render('lugar', {
      lugar,
      comentarios,
      error: req.query.error,
      ok: req.query.ok,
      editado: req.query.editado,
      creado: req.query.creado,
    });
  } catch (e) {
    next(e);
  }
});

// Muestra el formulario compartido de alta/edición
async function renderFormulario(res, { lugar, nuevo, errores = [], status = 200 }) {
  const { rows } = await pool.query('SELECT DISTINCT categoria FROM lugares ORDER BY categoria');
  res.status(status).render('formulario', {
    lugar,
    nuevo,
    errores,
    categorias: rows.map((c) => c.categoria),
    LIMITES,
  });
}

const lugarVacio = () => Object.fromEntries([...Object.keys(LIMITES), 'video_id'].map((k) => [k, '']));

// Formulario para agregar un lugar
app.get('/lugares/nuevo', async (req, res, next) => {
  try {
    await renderFormulario(res, { lugar: lugarVacio(), nuevo: true });
  } catch (e) {
    next(e);
  }
});

// Crear un lugar nuevo
app.post('/lugares', async (req, res, next) => {
  try {
    const { datos, errores } = validarLugar(req.body);
    if (errores.length) {
      return renderFormulario(res, { lugar: datos, nuevo: true, errores, status: 422 });
    }

    // Busca un slug libre: "nombre", "nombre-2", "nombre-3"...
    const base = crearSlug(datos.nombre);
    let creado = null;
    for (let n = 1; !creado; n++) {
      const slug = n === 1 ? base : `${base}-${n}`;
      const { rows } = await pool.query(
        `INSERT INTO lugares (slug, nombre, municipio, categoria, resumen, descripcion, imagen_url, imagen_fuente, video_id, mapa)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (slug) DO NOTHING
         RETURNING slug`,
        [slug, datos.nombre, datos.municipio, datos.categoria, datos.resumen, datos.descripcion,
          datos.imagen_url, datos.imagen_fuente, datos.video_id, datos.mapa]
      );
      creado = rows[0];
    }
    res.redirect(`/lugar/${encodeURIComponent(creado.slug)}?creado=1`);
  } catch (e) {
    next(e);
  }
});

// Formulario para editar un lugar
app.get('/lugar/:slug/editar', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM lugares WHERE slug = $1', [req.params.slug]);
    if (!rows.length) return res.status(404).render('404');
    await renderFormulario(res, { lugar: rows[0], nuevo: false });
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
      return renderFormulario(res, { lugar: { ...original, ...datos }, nuevo: false, errores, status: 422 });
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

// Eliminar un lugar (sus comentarios se borran en cascada)
app.post('/lugar/:slug/eliminar', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM lugares WHERE slug = $1', [req.params.slug]);
    if (!rowCount) return res.status(404).render('404');
    res.redirect('/?eliminado=1');
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
