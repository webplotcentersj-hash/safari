import { describe, it, expect } from 'vitest';
import {
  isValidPilotNumber,
  parsePilotNumber,
  processUsedNumbers,
  isCategoriaNumerada,
  allValidNumbers,
  getCategoriaTextoFromNumeroConstraint,
  buildNumeroDuplicadoError,
  MIN_NUMERO,
  MAX_NUMERO,
  CATEGORIAS_NUMERADAS,
} from '../_utils/pilotNumbers';

describe('Números de pilotos (autos, motos, cuatriciclos)', () => {
  describe('isValidPilotNumber', () => {
    it('acepta todos los números del 1 al 250 sin errores', () => {
      const validos = allValidNumbers();
      expect(validos).toHaveLength(250);
      for (let i = 0; i < validos.length; i++) {
        expect(isValidPilotNumber(validos[i]), `Número ${validos[i]} debe ser válido`).toBe(true);
      }
    });

    it('rechaza 0', () => {
      expect(isValidPilotNumber(0)).toBe(false);
    });

    it('rechaza 251 y mayores', () => {
      expect(isValidPilotNumber(251)).toBe(false);
      expect(isValidPilotNumber(999)).toBe(false);
    });

    it('rechaza negativos', () => {
      expect(isValidPilotNumber(-1)).toBe(false);
      expect(isValidPilotNumber(-250)).toBe(false);
    });

    it('rechaza NaN, null, undefined y tipos no numéricos', () => {
      expect(isValidPilotNumber(NaN)).toBe(false);
      expect(isValidPilotNumber(null)).toBe(false);
      expect(isValidPilotNumber(undefined)).toBe(false);
      expect(isValidPilotNumber('1')).toBe(false);
      expect(isValidPilotNumber('01')).toBe(false);
      expect(isValidPilotNumber([])).toBe(false);
    });

    it('acepta 1 y 250 como límites', () => {
      expect(isValidPilotNumber(1)).toBe(true);
      expect(isValidPilotNumber(250)).toBe(true);
    });
  });

  describe('parsePilotNumber', () => {
    it('parsea correctamente todos los números 1-250 desde number', () => {
      for (let n = MIN_NUMERO; n <= MAX_NUMERO; n++) {
        expect(parsePilotNumber(n)).toBe(n);
      }
    });

    it('parsea correctamente strings numéricos 1-250', () => {
      expect(parsePilotNumber('1')).toBe(1);
      expect(parsePilotNumber('250')).toBe(250);
      expect(parsePilotNumber(' 42 ')).toBe(42);
    });

    it('devuelve undefined para valores fuera de rango o inválidos', () => {
      expect(parsePilotNumber(0)).toBeUndefined();
      expect(parsePilotNumber(251)).toBeUndefined();
      expect(parsePilotNumber(-1)).toBeUndefined();
      expect(parsePilotNumber(null)).toBeUndefined();
      expect(parsePilotNumber('')).toBeUndefined();
      expect(parsePilotNumber('abc')).toBeUndefined();
    });
  });

  describe('processUsedNumbers', () => {
    it('devuelve array vacío si no hay pilotos', () => {
      expect(processUsedNumbers([])).toEqual([]);
    });

    it('filtra y ordena números válidos (1-250)', () => {
      const pilots = [
        { numero: 5 },
        { numero: 1 },
        { numero: 250 },
        { numero: '100' },
        { numero: 3 },
      ];
      expect(processUsedNumbers(pilots)).toEqual([1, 3, 5, 100, 250]);
    });

    it('excluye números fuera de rango', () => {
      const pilots = [
        { numero: 0 },
        { numero: 1 },
        { numero: 251 },
        { numero: -1 },
        { numero: 2 },
      ];
      expect(processUsedNumbers(pilots)).toEqual([1, 2]);
    });

    it('elimina duplicados y ordena', () => {
      const pilots = [
        { numero: 10 },
        { numero: 5 },
        { numero: 10 },
        { numero: 5 },
        { numero: 1 },
      ];
      expect(processUsedNumbers(pilots)).toEqual([1, 5, 10]);
    });

    it('maneja strings y números mezclados', () => {
      const pilots = [
        { numero: '42' },
        { numero: 1 },
        { numero: 250 },
      ];
      expect(processUsedNumbers(pilots)).toEqual([1, 42, 250]);
    });
  });

  describe('Categorías (auto, moto, cuatri)', () => {
    it('isCategoriaNumerada acepta solo auto, moto, cuatri', () => {
      expect(isCategoriaNumerada('auto')).toBe(true);
      expect(isCategoriaNumerada('moto')).toBe(true);
      expect(isCategoriaNumerada('cuatri')).toBe(true);
    });

    it('rechaza otras cadenas como categoría numerada', () => {
      expect(isCategoriaNumerada('')).toBe(false);
      expect(isCategoriaNumerada('avion')).toBe(false);
      expect(isCategoriaNumerada('AUTO')).toBe(false);
    });

    it('CATEGORIAS_NUMERADAS tiene exactamente 3 valores', () => {
      expect(CATEGORIAS_NUMERADAS).toEqual(['auto', 'moto', 'cuatri']);
    });
  });

  describe('Constantes', () => {
    it('MIN_NUMERO es 1 y MAX_NUMERO es 250', () => {
      expect(MIN_NUMERO).toBe(1);
      expect(MAX_NUMERO).toBe(250);
    });
  });

  describe('getCategoriaTextoFromNumeroConstraint (mensaje de error por constraint BD)', () => {
    it('usa pilots_numero_auto_unique -> "auto" (no cuatriciclo)', () => {
      const msg = 'duplicate key value violates unique constraint "pilots_numero_auto_unique"';
      expect(getCategoriaTextoFromNumeroConstraint(msg, 'cuatri')).toBe('auto');
    });

    it('usa pilots_numero_moto_unique -> "moto" (no cuatriciclo)', () => {
      const msg = 'duplicate key value violates unique constraint "pilots_numero_moto_unique"';
      expect(getCategoriaTextoFromNumeroConstraint(msg, 'cuatri')).toBe('moto');
    });

    it('usa pilots_numero_cuatri_unique -> "cuatriciclo"', () => {
      const msg = 'duplicate key value violates unique constraint "pilots_numero_cuatri_unique"';
      expect(getCategoriaTextoFromNumeroConstraint(msg, 'auto')).toBe('cuatriciclo');
    });

    it('fallback a categoría del request si no hay constraint en el mensaje', () => {
      expect(getCategoriaTextoFromNumeroConstraint('otro error', 'auto')).toBe('auto');
      expect(getCategoriaTextoFromNumeroConstraint('otro error', 'moto')).toBe('moto');
      expect(getCategoriaTextoFromNumeroConstraint('otro error', 'cuatri')).toBe('cuatriciclo');
    });

    it('el constraint tiene prioridad sobre el request (evita mostrar categoría equivocada)', () => {
      const msgAuto = 'error pilots_numero_auto_unique detail';
      expect(getCategoriaTextoFromNumeroConstraint(msgAuto, 'cuatri')).toBe('auto');
      const msgMoto = 'error pilots_numero_moto_unique detail';
      expect(getCategoriaTextoFromNumeroConstraint(msgMoto, 'cuatri')).toBe('moto');
    });
  });

  describe('buildNumeroDuplicadoError', () => {
    it('incluye número formateado y categoría correcta', () => {
      expect(buildNumeroDuplicadoError(55, 'auto')).toContain('55');
      expect(buildNumeroDuplicadoError(55, 'auto')).toContain('piloto de auto');
      expect(buildNumeroDuplicadoError(55, 'auto')).not.toContain('cuatriciclo');
    });

    it('mensaje para moto no dice cuatriciclo', () => {
      const msg = buildNumeroDuplicadoError(55, 'moto');
      expect(msg).toContain('piloto de moto');
      expect(msg).not.toContain('cuatriciclo');
    });

    it('mensaje para cuatriciclo solo cuando categoría es cuatriciclo', () => {
      const msg = buildNumeroDuplicadoError(55, 'cuatriciclo');
      expect(msg).toContain('piloto de cuatriciclo');
    });

    it('formatea número con dos dígitos (01-250)', () => {
      expect(buildNumeroDuplicadoError(1, 'auto')).toContain('01');
      expect(buildNumeroDuplicadoError(9, 'moto')).toContain('09');
    });
  });
});
