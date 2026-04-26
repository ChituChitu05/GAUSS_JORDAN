import * as Operaciones from './operaciones.js';
import * as GaussJordan from './gaussJordan.js';
import { resolverAXB } from './calculos.js';
import Auxiliares from './auxiliares.js';

describe('Test de Garantia de Algoritmo Gauss-Jordan', () => {

 // --- BLOQUE 1: INTEGRIDAD ARITMÉTICA Y NORMALIZACIÓN ---
    describe('Aritmética', () => {
        
        test('Validación de Normalización de Signos: El signo debe residir estrictamente en el numerador', () => {
            const [n, d] = Auxiliares.simplificar(5, -10);
            expect(n).toBe(-1);
            expect(d).toBe(2);
            expect(d).toBeGreaterThan(0);
        });

        test('Simplificacion de fracciones', () => {
            const [n, d] = Auxiliares.simplificar(-7, -7);
            expect(n).toBe(1);
            expect(d).toBe(1);
        });

        test('Precisión de Fracciones.', () => {
            const f1 = { num: 1, den: 3 };
            const f2 = { num: 1, den: 6 };
            
            const numSumado = (f1.num * f2.den) + (f2.num * f1.den); // 9
            const denComun = f1.den * f2.den;                      // 18
            
            const [n, d] = Auxiliares.simplificar(numSumado, denComun);
            expect(n).toBe(1);
            expect(d).toBe(2);
        });
    });

    //  ESTABILIDAD ALGORÍTMICA 
    describe('Operaciones entre filas de la Matriz.', () => {

        test('Procedimiento de Intercambio (Swap)', () => {
            const matriz = [[{ num: 1, den: 1 }], [{ num: 2, den: 1 }]];
            Operaciones.swapFilas(matriz, 0, 1);
            expect(matriz[0][0].num).toBe(2);
            expect(matriz[1][0].num).toBe(1);
        });

        test('Búsqueda de Pivote(busqueda y swap).', () => {
            const matriz = [
                [{ num: 0, den: 1 }, { num: 1, den: 1 }],
                [{ num: 9, den: 1 }, { num: 4, den: 1 }]
            ];
        
            const resultadoPivote = GaussJordan.buscarPivote(matriz, 0, 0);
            expect(resultadoPivote.encontrado).toBe(true);
            expect(resultadoPivote.huboSwap).toBe(true);
        });

        test('Identificación de sistemas sin solución única.', () => {
            const matriz = [
                [{ num: 1, den: 1 }, { num: 1, den: 1 }, { num: 10, den: 1 }],
                [{ num: 1, den: 1 }, { num: 1, den: 1 }, { num: 20, den: 1 }]
            ];
            const res = resolverAXB(matriz);
            // la última fila queda como [0, 0 | k]
            const ultimaFila = res[res.length - 1];
            expect(ultimaFila[0].num).toBe(0);
            expect(ultimaFila[ultimaFila.length - 1].num).not.toBe(0);
        });
    });

    // MANEJO DE EXCEPCIONES 
    describe('Manejo de datos basura.', () => {

        test('Neutralización de Entradas Inválidas.', () => {
            const casosBasura = ["null", "1/0", "error_string"];
            casosBasura.forEach(input => {
                const frac = Auxiliares.parsearFraccion(input);
                expect(frac.num).toBe(0);
                expect(frac.den).toBe(1);
                expect(isNaN(frac.num)).toBe(false);
            });
        });

        test('Manejo de Estabilidad de Escala.', () => {
            const escala = 1000000;
            const matriz = [
                [{ num: escala, den: 1 }, { num: 1, den: 1 }, { num: escala + 2, den: 1 }],
                [{ num: 1, den: 1 }, { num: 1, den: 1 }, { num: 3, den: 1 }]
            ];
            const res = resolverAXB(matriz);
            // Verifica precisión en la resolución final (x=1, y=2)
            expect(res[0][res[0].length - 1].num / res[0][res[0].length - 1].den).toBeCloseTo(1);
            expect(res[1][res[1].length - 1].num / res[1][res[1].length - 1].den).toBeCloseTo(2);
        });
    });
});