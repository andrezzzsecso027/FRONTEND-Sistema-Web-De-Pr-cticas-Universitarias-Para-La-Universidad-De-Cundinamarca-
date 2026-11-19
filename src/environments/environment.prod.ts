// Producción (ng build). La URL debe coincidir con el servicio de Render.
export const environment = {
 production: true,
  baseUrl: 'https://backend-sistema-web-de-pr-cticas.onrender.com/api',
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