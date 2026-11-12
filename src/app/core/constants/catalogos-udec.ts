export const TIPOS_EMPRESA_CATALOGO = [
  { valor: 'SAS', etiqueta: 'S.A.S. (Sociedad por Acciones Simplificada)' },
  { valor: 'LTDA', etiqueta: 'Sociedad Limitada (Ltda.)' },
  { valor: 'SA', etiqueta: 'Sociedad Anónima (S.A.)' },
  { valor: 'ESAL', etiqueta: 'Fundación / ONG (Sin Ánimo de Lucro)' },
  { valor: 'PUBLICA', etiqueta: 'Entidad del Estado / Pública' }
];

export const SEDES_CATALOGO = [
  { valor: 'fusagasuga', etiqueta: 'Fusagasugá' },
  { valor: 'chia', etiqueta: 'Chía' },
  { valor: 'soacha', etiqueta: 'Soacha' },
  { valor: 'zipaquira', etiqueta: 'Zipaquirá' },
  { valor: 'girardot', etiqueta: 'Girardot' },
  { valor: 'ubate', etiqueta: 'Ubaté' }
];

export const PROGRAMAS_POR_SEDE: { [key: string]: string[] } = {
  fusagasuga: [
    'Ingeniería de Sistemas', 'Ingeniería Electrónica', 'Administración de Empresas',
    'Ingeniería Agronómica', 'Zootecnia', 'Contaduría Pública',
    'Licenciatura en Ciencias Sociales', 'Licenciatura en Educación Física'
  ],
  chia: ['Ingeniería de Sistemas', 'Contaduría Pública', 'Ingeniería Industrial', 'Ingeniería Mecatrónica'],
  soacha: [
    'Administración de Empresas', 'Contaduría Pública', 'Profesional en Ciencias del Deporte',
    'Ingeniería Industrial', 'Ingeniería de Software', 'Ingeniería Topográfica y Geomática'
  ],
  zipaquira: ['Música'],
  girardot: ['Enfermería', 'Administración de Empresas', 'Ingeniería Ambiental', 'Ingeniería de Software'],
  ubate: [
    'Administración de Empresas', 'Contaduría Pública',
    'Ingeniería de Sistemas y Computación', 'Medicina Veterinaria y Zootecnia'
  ]
};

export const MODALIDADES_CATALOGO = ['Presencial', 'Remoto', 'Híbrido'];