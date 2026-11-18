export const environment = {
 production: false,
  baseUrl: 'http://localhost:8081/api',
  endpoints: {
    estudiantes: '/registro/estudiantes',
    empresas: '/registro/empresas',
    login: '/auth/login',
    auth: '/auth',
    verificacion: '/estudiantes/auth',
    adminEmpresas: '/admin',
    ofertas: '/ofertas',
    postulaciones: '/postulaciones',
    practicas: '/practicas',
    archivos:  '/archivos'
  }
};