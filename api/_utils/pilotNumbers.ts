/**
 * Utilidad para números de competencia de pilotos (autos, motos, cuatriciclos).
 * Rango válido: 1 a 250. Cada categoría tiene su propia numeración independiente.
 */

export const MIN_NUMERO = 1;
export const MAX_NUMERO = 250;

export const CATEGORIAS_NUMERADAS = ['auto', 'moto', 'cuatri'] as const;
export type CategoriaNumerada = (typeof CATEGORIAS_NUMERADAS)[number];

/** Indica si un valor es una categoría con numeración propia */
export function isCategoriaNumerada(c: string): c is CategoriaNumerada {
  return CATEGORIAS_NUMERADAS.includes(c as CategoriaNumerada);
}

/** Indica si un número está en el rango válido (1-250) */
export function isValidPilotNumber(n: unknown): n is number {
  if (typeof n !== 'number' || Number.isNaN(n)) return false;
  const int = Math.floor(n);
  return int >= MIN_NUMERO && int <= MAX_NUMERO;
}

/** Parsea número desde body/query (string o number) */
export function parsePilotNumber(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'number' && !Number.isNaN(raw)) {
    const n = Math.floor(raw);
    return n >= MIN_NUMERO && n <= MAX_NUMERO ? n : undefined;
  }
  const parsed = parseInt(String(raw), 10);
  return !Number.isNaN(parsed) && parsed >= MIN_NUMERO && parsed <= MAX_NUMERO ? parsed : undefined;
}

/**
 * Procesa lista de pilotos (con campo numero) y devuelve números válidos únicos, ordenados.
 * Usado por used-numbers para auto, moto y cuatri por separado.
 */
export function processUsedNumbers(pilots: Array<{ numero: unknown }>): number[] {
  const used = (pilots || [])
    .map((p) => {
      const n = typeof p.numero === 'string' ? parseInt(p.numero, 10) : Number(p.numero);
      return typeof n === 'number' && !Number.isNaN(n) ? n : null;
    })
    .filter((n): n is number => n !== null && isValidPilotNumber(n));
  return [...new Set(used)].sort((a, b) => a - b);
}

/** Todos los números válidos (1..250) para tests */
export function allValidNumbers(): number[] {
  const out: number[] = [];
  for (let i = MIN_NUMERO; i <= MAX_NUMERO; i++) out.push(i);
  return out;
}

/**
 * Devuelve el texto de categoría para el mensaje de error de número duplicado (23505).
 * Usa el nombre del constraint en el mensaje de la BD, no la categoría del request.
 */
export function getCategoriaTextoFromNumeroConstraint(
  errorMessage: string,
  fallbackCategoria: string
): string {
  const msg = errorMessage || '';
  if (msg.includes('pilots_numero_auto_unique')) return 'auto';
  if (msg.includes('pilots_numero_moto_unique')) return 'moto';
  if (msg.includes('pilots_numero_cuatri_unique')) return 'cuatriciclo';
  return fallbackCategoria === 'auto' ? 'auto' : fallbackCategoria === 'moto' ? 'moto' : 'cuatriciclo';
}

/** Arma el mensaje de error cuando el número ya está asignado en una categoría */
export function buildNumeroDuplicadoError(numero: number | undefined, categoriaTexto: string): string {
  const numStr = numero != null && numero >= 1 && numero <= 250
    ? numero.toString().padStart(2, '0')
    : '';
  return `El número ${numStr} ya está asignado a otro piloto de ${categoriaTexto}. Por favor, selecciona otro número disponible.`;
}
