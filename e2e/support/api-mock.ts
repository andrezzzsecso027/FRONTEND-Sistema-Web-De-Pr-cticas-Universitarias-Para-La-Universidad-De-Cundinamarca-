import { Page, Request } from '@playwright/test';

/** Misma base que environment.ts: todas las llamadas a NUESTRA API pasan por aquí. */
export const API = 'http://localhost:8081/api';

export type Rol = 'estudiante' | 'empresa' | 'administrador';

export interface Respuesta {
  status?: number;
  json?: unknown;
  /** Texto plano (el backend responde así en varios endpoints: verificar empresa, errores 409...). */
  text?: string;
}

type Manejador = Respuesta | ((req: Request, url: URL) => Respuesta);

interface Ruta {
  method: string;
  path: RegExp;
  manejador: Manejador;
}

export interface LlamadaApi {
  method: string;
  path: string;
  body: any;
  authorization?: string;
}

/**
 * Backend simulado para las pruebas E2E: intercepta http://localhost:8081/api/** con page.route
 * y responde según las rutas registradas. Así las pruebas son deterministas y no dependen de la
 * base de datos ni de Brevo/Gemini. Las rutas sin manejador responden 200 con [] (GET) o vacío.
 * Registra cada llamada para poder verificar método, cuerpo y cabecera Authorization.
 */
export class ApiSimulada {
  readonly llamadas: LlamadaApi[] = [];
  private readonly rutas: Ruta[] = [];

  on(method: string, path: RegExp, manejador: Manejador): this {
    // Las rutas registradas después tienen prioridad (permite sobrescribir las de por defecto).
    this.rutas.unshift({ method: method.toUpperCase(), path, manejador });
    return this;
  }

  get(path: RegExp, m: Manejador): this { return this.on('GET', path, m); }
  post(path: RegExp, m: Manejador): this { return this.on('POST', path, m); }
  put(path: RegExp, m: Manejador): this { return this.on('PUT', path, m); }
  patch(path: RegExp, m: Manejador): this { return this.on('PATCH', path, m); }

  /** Llamadas hechas a un endpoint (para afirmar sobre el cuerpo enviado). */
  llamadasA(method: string, path: RegExp): LlamadaApi[] {
    return this.llamadas.filter(l => l.method === method.toUpperCase() && path.test(l.path));
  }

  async instalar(page: Page): Promise<this> {
    await page.route(`${API}/**`, async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^\/api/, '') + url.search;
      let body: any = req.postData();
      try { body = body ? JSON.parse(body) : null; } catch { /* multipart o texto */ }
      this.llamadas.push({ method: req.method(), path, body, authorization: req.headers()['authorization'] });

      const ruta = this.rutas.find(r => r.method === req.method() && r.path.test(path));
      const resp: Respuesta = ruta
        ? (typeof ruta.manejador === 'function' ? ruta.manejador(req, url) : ruta.manejador)
        : (req.method() === 'GET' ? { json: [] } : { text: '' });

      const headers = { 'Access-Control-Allow-Origin': '*' };
      if (resp.json !== undefined) {
        await route.fulfill({ status: resp.status ?? 200, headers, contentType: 'application/json', body: JSON.stringify(resp.json) });
      } else {
        await route.fulfill({ status: resp.status ?? 200, headers, contentType: 'text/plain', body: resp.text ?? '' });
      }
    });
    return this;
  }
}

/** JWT sin firma válida pero con "exp": el frontend solo lee el payload (la firma la valida el backend). */
export function jwtFalso(email: string, rol: Rol, expiraEnSegundos = 3600): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const ahora = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: email, role: rol, iat: ahora, exp: ahora + expiraEnSegundos })}.firma-e2e`;
}

export const USUARIOS: Record<Rol, { idUser: number; email: string; userRol: Rol }> = {
  administrador: { idUser: 1, email: 'coordinacion@ucundinamarca.edu.co', userRol: 'administrador' },
  empresa: { idUser: 2, email: 'talento@techandes.co', userRol: 'empresa' },
  estudiante: { idUser: 3, email: 'lgomez@ucundinamarca.edu.co', userRol: 'estudiante' }
};

/** Respuesta de POST /auth/login para un rol. */
export function respuestaLogin(rol: Rol) {
  const u = USUARIOS[rol];
  return { ...u, token: jwtFalso(u.email, rol) };
}

/**
 * Deja la sesión abierta antes de que cargue Angular (como si el usuario ya hubiera iniciado sesión).
 * Solo se siembra en la primera carga de la pestaña, para que un "cerrar sesión" posterior no se revierta.
 */
export async function sembrarSesion(page: Page, rol: Rol, opciones: { expiraEnSegundos?: number } = {}): Promise<void> {
  const u = USUARIOS[rol];
  const token = jwtFalso(u.email, rol, opciones.expiraEnSegundos ?? 3600);
  await page.addInitScript(({ usuario, token }) => {
    if (sessionStorage.getItem('e2e_sembrado')) return;
    sessionStorage.setItem('e2e_sembrado', '1');
    localStorage.setItem('token', token);
    localStorage.setItem('usuario_sesion', JSON.stringify({ ...usuario, token }));
  }, { usuario: u, token });
}

// ---------------------------------------------------------------------------
// Datos de ejemplo
// ---------------------------------------------------------------------------

export const NIT_EMPRESA = '900123456-7';
export const DOC_ESTUDIANTE = '1070612345';

export const EMPRESA_APROBADA = {
  idUser: 2,
  nit: NIT_EMPRESA,
  companyName: 'TechAndes SAS',
  companyType: 'SAS',
  city: 'Fusagasugá',
  verificationStatus: 'APROBADA',
  rutPdfUrl: 'https://res.cloudinary.com/udecprac/raw/upload/nit-techandes.pdf'
};

export const ESTUDIANTE_ACTUAL = {
  idUser: 3,
  document: DOC_ESTUDIANTE,
  name: 'Laura',
  lastName: 'Gómez',
  academicProgram: 'Ingeniería de Sistemas',
  headquarters: 'Fusagasugá'
};

export const PERFIL_COMPLETO = {
  documentStudent: DOC_ESTUDIANTE,
  aboutMe: 'Estudiante de octavo semestre interesada en desarrollo web.',
  skills: 'Angular, TypeScript, Java, Spring Boot',
  englishLevel: 'B2',
  linkLifesheet: 'https://drive.example.com/cv-laura.pdf'
};

export const OFERTAS = [
  {
    idOffer: 101,
    practiceName: 'Desarrollador Frontend Angular',
    nitCompanyAssociated: NIT_EMPRESA,
    practiceDescription: 'Apoyo en el desarrollo de interfaces con Angular y diseño de componentes.',
    profession: 'Ingeniería de Sistemas',
    salary: 1300000,
    modality: 'Remoto',
    location: 'Bogotá',
    availableSpots: 2,
    closingDate: '2026-12-15',
    offerStatus: true
  },
  {
    idOffer: 102,
    practiceName: 'Auxiliar contable',
    nitCompanyAssociated: '800765432-1',
    practiceDescription: 'Conciliaciones bancarias y apoyo en cierre contable.',
    profession: 'Contaduría Pública',
    salary: 0,
    modality: 'Presencial',
    location: 'Fusagasugá',
    availableSpots: 1,
    closingDate: '2026-12-01',
    offerStatus: true
  }
];
