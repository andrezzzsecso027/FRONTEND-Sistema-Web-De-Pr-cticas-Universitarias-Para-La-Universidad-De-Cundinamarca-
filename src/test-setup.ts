/**
 * Configuración común de los tests (Vitest + jsdom), cargada desde angular.json → test.options.setupFiles.
 *
 * En Node 22+ existe un `localStorage` global experimental que, sin `--localstorage-file`, queda
 * inutilizable y tapa al de jsdom. Antes de cada test se instala uno en memoria y vacío, así
 * ningún test hereda la sesión de otro (aunque un spec lo haya reemplazado con vi.stubGlobal).
 */
const almacen = new Map<string, string>();

const localStorageEnMemoria: Storage = {
  get length() { return almacen.size; },
  clear: () => almacen.clear(),
  getItem: (clave: string) => almacen.get(clave) ?? null,
  key: (indice: number) => Array.from(almacen.keys())[indice] ?? null,
  removeItem: (clave: string) => { almacen.delete(clave); },
  setItem: (clave: string, valor: string) => { almacen.set(clave, String(valor)); }
};

beforeEach(() => {
  vi.unstubAllGlobals();
  almacen.clear();
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageEnMemoria, configurable: true, writable: true });
});
