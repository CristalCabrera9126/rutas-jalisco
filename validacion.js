// Validación de los datos de un lugar enviados desde el formulario de edición

const LIMITES = {
  nombre: 100,
  municipio: 80,
  categoria: 50,
  resumen: 200,
  descripcion: 3000,
  imagen_url: 500,
  imagen_fuente: 500,
  mapa: 150,
};

const texto = (v, max) => String(v ?? '').trim().slice(0, max);

function esUrlHttp(valor) {
  try {
    const u = new URL(valor);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

// Acepta el ID de 11 caracteres o una URL de YouTube (watch, youtu.be, embed, shorts)
function extraerVideoId(valor) {
  const v = String(valor ?? '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  const m = v.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/**
 * Normaliza y valida los campos editables de un lugar.
 * @returns {{ datos: object, errores: string[] }}
 */
function validarLugar(body = {}) {
  const datos = {};
  for (const [campo, max] of Object.entries(LIMITES)) datos[campo] = texto(body[campo], max);
  const errores = [];

  const obligatorios = { nombre: 'nombre', municipio: 'municipio', categoria: 'categoría', resumen: 'resumen', descripcion: 'descripción', mapa: 'ubicación del mapa' };
  for (const [campo, etiqueta] of Object.entries(obligatorios)) {
    if (!datos[campo]) errores.push(`Falta ${etiqueta}.`);
  }
  if (!esUrlHttp(datos.imagen_url)) errores.push('La URL de la imagen debe empezar con http:// o https://.');
  if (!esUrlHttp(datos.imagen_fuente)) errores.push('La URL de la fuente de la imagen debe empezar con http:// o https://.');

  const videoId = extraerVideoId(body.video_id);
  if (videoId) datos.video_id = videoId;
  else {
    datos.video_id = texto(body.video_id, 200);
    errores.push('El video debe ser un ID o un enlace válido de YouTube.');
  }

  return { datos, errores };
}

module.exports = { validarLugar, extraerVideoId, LIMITES };
