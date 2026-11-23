// Conexión a PostgreSQL (Neon) y creación inicial de tablas
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // incluye sslmode=verify-full
});

const img = (path) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}`;

// Datos iniciales: fotos de Wikimedia Commons y videos de YouTube
const lugaresIniciales = [
  {
    slug: 'tequila',
    nombre: 'Tequila',
    municipio: 'Tequila',
    categoria: 'Pueblo Mágico',
    resumen: 'Cuna de la bebida más famosa de México, rodeada de campos de agave azul.',
    descripcion:
      'Tequila es un Pueblo Mágico ubicado a unos 60 km de Guadalajara. Su paisaje agavero y sus antiguas instalaciones industriales fueron declarados Patrimonio de la Humanidad por la UNESCO en 2006. En su centro destaca la Parroquia de Santiago Apóstol, construida en cantera durante el siglo XVIII.',
    imagen_url: img('7/74/Iglesia_de_Santiago_Apostol_en_Tequila%2C_Jalisco.jpg/960px-Iglesia_de_Santiago_Apostol_en_Tequila%2C_Jalisco.jpg'),
    imagen_fuente: 'https://commons.wikimedia.org/wiki/File:Iglesia_de_Santiago_Apostol_en_Tequila,_Jalisco.jpg',
    video_id: 'SGee2Q4onHA',
    mapa: 'Tequila, Jalisco',
  },
  {
    slug: 'chapala',
    nombre: 'Lago de Chapala',
    municipio: 'Chapala',
    categoria: 'Naturaleza',
    resumen: 'El lago natural más grande de México y su tradicional malecón.',
    descripcion:
      'El Lago de Chapala es el lago natural más grande del país, con una superficie aproximada de 1,100 km². Sus orillas albergan poblaciones como Chapala y Ajijic, conocidas por su clima templado todo el año, su malecón y su ambiente artístico.',
    imagen_url: img('8/84/Lago_de_Chapala_al_atardecer.jpg/960px-Lago_de_Chapala_al_atardecer.jpg'),
    imagen_fuente: 'https://commons.wikimedia.org/wiki/File:Lago_de_Chapala_al_atardecer.jpg',
    video_id: 'PLWghr0Yvfk',
    mapa: 'Malecón de Chapala, Jalisco',
  },
  {
    slug: 'mazamitla',
    nombre: 'Mazamitla',
    municipio: 'Mazamitla',
    categoria: 'Pueblo Mágico',
    resumen: 'La "Suiza de México": bosque, cabañas y clima de montaña.',
    descripcion:
      'Mazamitla se encuentra en la Sierra del Tigre, a más de 2,200 metros sobre el nivel del mar. Es famoso por sus bosques de pino, sus casas de techos de teja con madera y su parroquia de San Cristóbal, de estilo ecléctico. Es ideal para el ecoturismo y las actividades al aire libre.',
    imagen_url: img('d/d4/Parroquia_de_San_Crist%C3%B3bal%2C_Mazamitla_4.jpg/960px-Parroquia_de_San_Crist%C3%B3bal%2C_Mazamitla_4.jpg'),
    imagen_fuente: 'https://commons.wikimedia.org/wiki/File:Parroquia_de_San_Crist%C3%B3bal,_Mazamitla_4.jpg',
    video_id: '7BQTSESbym4',
    mapa: 'Mazamitla, Jalisco',
  },
  {
    slug: 'tapalpa',
    nombre: 'Tapalpa',
    municipio: 'Tapalpa',
    categoria: 'Pueblo Mágico',
    resumen: 'Primer Pueblo Mágico de Jalisco, con calles empedradas y balcones de madera.',
    descripcion:
      'Tapalpa fue el primer Pueblo Mágico de Jalisco (2002). Sus calles empedradas, casas blancas con detalles rojos y balcones de madera conservan un aire colonial. En sus alrededores se encuentran Las Piedrotas y la cascada El Salto del Nogal.',
    imagen_url: img('d/d7/Tapalpa_Street.JPG/960px-Tapalpa_Street.JPG'),
    imagen_fuente: 'https://commons.wikimedia.org/wiki/File:Tapalpa_Street.JPG',
    video_id: 'NCsaA1jzyTQ',
    mapa: 'Tapalpa, Jalisco',
  },
  {
    slug: 'hospicio-cabanas',
    nombre: 'Hospicio Cabañas',
    municipio: 'Guadalajara',
    categoria: 'Cultura',
    resumen: 'Patrimonio de la Humanidad con los murales de José Clemente Orozco.',
    descripcion:
      'El Hospicio Cabañas, hoy Museo Cabañas, fue fundado a inicios del siglo XIX como casa de asistencia. Su capilla mayor resguarda los murales de José Clemente Orozco, entre ellos "El hombre de fuego". Fue declarado Patrimonio de la Humanidad por la UNESCO en 1997.',
    imagen_url: img('8/80/Hospicio_Caba%C3%B1as%2C_Guadalajara%2C_Jalisco_-_05.jpg/960px-Hospicio_Caba%C3%B1as%2C_Guadalajara%2C_Jalisco_-_05.jpg'),
    imagen_fuente: 'https://commons.wikimedia.org/wiki/File:Hospicio_Caba%C3%B1as,_Guadalajara,_Jalisco_-_05.jpg',
    video_id: 'fVCiIrQ1iwc',
    mapa: 'Museo Cabañas, Guadalajara',
  },
];

async function inicializar() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lugares (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      municipio TEXT NOT NULL,
      categoria TEXT NOT NULL,
      resumen TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      imagen_url TEXT NOT NULL,
      imagen_fuente TEXT NOT NULL,
      video_id TEXT NOT NULL,
      mapa TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS comentarios (
      id SERIAL PRIMARY KEY,
      lugar_id INTEGER NOT NULL REFERENCES lugares(id) ON DELETE CASCADE,
      autor VARCHAR(60) NOT NULL,
      calificacion SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
      texto VARCHAR(500) NOT NULL,
      creado TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Solo se siembran los datos iniciales si la tabla está vacía,
  // para que los lugares eliminados no reaparezcan al reiniciar el servidor
  const { rows } = await pool.query('SELECT EXISTS (SELECT 1 FROM lugares) AS hay');
  if (rows[0].hay) return;

  for (const l of lugaresIniciales) {
    await pool.query(
      `INSERT INTO lugares (slug, nombre, municipio, categoria, resumen, descripcion, imagen_url, imagen_fuente, video_id, mapa)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (slug) DO NOTHING`,
      [l.slug, l.nombre, l.municipio, l.categoria, l.resumen, l.descripcion, l.imagen_url, l.imagen_fuente, l.video_id, l.mapa]
    );
  }
}

module.exports = { pool, inicializar };
