const test = require('node:test');
const assert = require('node:assert');
const { validarLugar, extraerVideoId } = require('../validacion');

const valido = {
  nombre: ' Tequila ',
  municipio: 'Tequila',
  categoria: 'Pueblo Mágico',
  resumen: 'Resumen',
  descripcion: 'Descripción',
  imagen_url: 'https://upload.wikimedia.org/a.jpg',
  imagen_fuente: 'https://commons.wikimedia.org/wiki/File:a.jpg',
  video_id: 'SGee2Q4onHA',
  mapa: 'Tequila, Jalisco',
};

test('acepta datos válidos y recorta espacios', () => {
  const { datos, errores } = validarLugar(valido);
  assert.deepStrictEqual(errores, []);
  assert.strictEqual(datos.nombre, 'Tequila');
});

test('marca campos obligatorios vacíos', () => {
  const { errores } = validarLugar({ ...valido, nombre: '   ', descripcion: '' });
  assert.ok(errores.includes('Falta nombre.'));
  assert.ok(errores.includes('Falta descripción.'));
});

test('rechaza URLs que no son http(s)', () => {
  const { errores } = validarLugar({ ...valido, imagen_url: 'javascript:alert(1)', imagen_fuente: 'nada' });
  assert.strictEqual(errores.length, 2);
});

test('recorta textos al límite', () => {
  const { datos } = validarLugar({ ...valido, nombre: 'x'.repeat(500) });
  assert.strictEqual(datos.nombre.length, 100);
});

test('extrae el ID de distintas URLs de YouTube', () => {
  for (const url of [
    'SGee2Q4onHA',
    'https://www.youtube.com/watch?v=SGee2Q4onHA',
    'https://www.youtube.com/watch?feature=share&v=SGee2Q4onHA',
    'https://youtu.be/SGee2Q4onHA',
    'https://www.youtube-nocookie.com/embed/SGee2Q4onHA',
    'https://www.youtube.com/shorts/SGee2Q4onHA',
  ]) {
    assert.strictEqual(extraerVideoId(url), 'SGee2Q4onHA', url);
  }
  assert.strictEqual(extraerVideoId('"><script>'), null);
  assert.ok(validarLugar({ ...valido, video_id: 'abc' }).errores.length);
});
