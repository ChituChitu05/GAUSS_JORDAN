import {
    esCero,
    multiplicarFracciones,
    dividirFracciones,
    restarFracciones,
    normalizarSigno,
    fraccionToString
} from "./auxiliares.js";
import { swapFilas } from "./operaciones.js";
import gaussJordan from "./gaussJordan.js";

// Eliminación gaussiana para determinante (versión original, se mantiene por compatibilidad)
function aplicarGaussiana(matriz) {
    const n = matriz.length;
    let swaps = 0;
    let filaPivote = 0;

    for (let col = 0; col < n && filaPivote < n; col++) {
        // Buscar pivote en la columna actual desde filaPivote hasta abajo
        let pivoteFila = -1;
        for (let fila = filaPivote; fila < n; fila++) {
            if (!esCero(matriz[fila][col])) {
                pivoteFila = fila;
                break;
            }
        }
        
        // Si no hay pivote en esta columna, pasar a la siguiente columna
        if (pivoteFila === -1) continue;
        
        // Si el pivote no está en la fila actual, intercambiar
        if (pivoteFila !== filaPivote) {
            swapFilas(matriz, filaPivote, pivoteFila);
            swaps++;
        }
        
        // Hacer ceros debajo del pivote SIN normalizar
        const pivote = matriz[filaPivote][col];
        for (let fila = filaPivote + 1; fila < n; fila++) {
            if (!esCero(matriz[fila][col])) {
                const factor = dividirFracciones(matriz[fila][col], pivote);
                for (let k = col; k < n; k++) {
                    const termino = multiplicarFracciones(matriz[filaPivote][k], factor);
                    matriz[fila][k] = restarFracciones(matriz[fila][k], termino);
                    matriz[fila][k] = normalizarSigno(matriz[fila][k]);
                }
            }
        }
        
        filaPivote++; // Avanzar a la siguiente fila pivote
    }
    
    return { matriz, swaps };
}

// Gauss Jordan completo para AXB e Inversa
// esAXB indica si la última columna es el vector resultado (en caso de AXB) o parte de la matriz aumentada (en caso de inversa).
function aplicarGaussJordan(matriz, esAXB = false) {
    const filas = matriz.length;
    const columnas = esAXB ? matriz[0].length - 1 : matriz[0].length;
    let filaPivote = 0;

    for (let col = 0; col < columnas && filaPivote < filas; col++) {
        const { encontrado } = gaussJordan.buscarPivote(matriz, filaPivote, col);
        if (!encontrado) continue;

        gaussJordan.hacerPivoteUno(matriz, filaPivote, matriz[filaPivote][col]);
        gaussJordan.hacerCerosArriba(matriz, filaPivote, col);
        gaussJordan.hacerCerosDebajo(matriz, filaPivote, col);

        filaPivote++;
    }
    return matriz;
}

// Versión para determinante que devuelve los factors de normalización y swaps
function aplicarGaussJordanDeterminante(matriz) {
    const n = matriz.length;
    let swaps = 0;
    let factoresNormalizacion = [];
    let filaPivote = 0;

    // Copia profunda de la matriz
    const copia = matriz.map(fila => fila.map(v => ({ num: v.num, den: v.den })));

    for (let col = 0; col < n && filaPivote < n; col++) {
        // Buscar pivote en la columna actual desde filaPivote hasta abajo
        const { encontrado, huboSwap } = gaussJordan.buscarPivote(copia, filaPivote, col);
        
        if (!encontrado) {
            return {
                matrizFinal: copia,
                historialFactores: [...factoresNormalizacion, ...Array(swaps).fill(-1)],
                determinante: { num: 0, den: 1 }
            };
        }
        
        // Contar el swap si ocurrió
        if (huboSwap) {
            swaps++;
        }
        
        // Guardar el pivote y normalizar la fila
        const pivote = copia[filaPivote][col];
        
        // Normalizar solo si el pivote no es 1
        if (!(pivote.num === 1 && pivote.den === 1)) {
            // Guardar el factor (el pivote original)
            factoresNormalizacion.push({ num: pivote.num, den: pivote.den });
            gaussJordan.hacerPivoteUno(copia, filaPivote, pivote);
        }
        gaussJordan.hacerCerosDebajo(copia, filaPivote, col);
        gaussJordan.hacerCerosArriba(copia, filaPivote, col);
        
        filaPivote++;
    }
    
    // Construir historial de factores
    const historialFactores = [];
    
    // Factores de intercambio (-1 por cada swap)
    for (let i = 0; i < swaps; i++) {
        historialFactores.push(-1);
    }
    
    // Factores de normalización (los pivotes)
    for (const factor of factoresNormalizacion) {
        historialFactores.push(factor);
    }
    
    // Calcular determinante como producto de todos los factores
    let determinante = { num: 1, den: 1 };
    for (const factor of historialFactores) {
        if (typeof factor === 'number') {
            determinante = multiplicarFracciones(determinante, { num: factor, den: 1 });
        } else {
            determinante = multiplicarFracciones(determinante, factor);
        }
    }
    determinante = normalizarSigno(determinante);
    
    return {
        matrizFinal: copia,
        historialFactores: historialFactores,
        determinante: determinante
    };
}

export function resolverAXB(matriz) {
    const copia = matriz.map(fila => [...fila]);
    return aplicarGaussJordan(copia, true);
}

export function resolverInv(matriz) {
    const n = matriz.length;
    
    if (!matriz.every(fila => fila.length === n)) {
        throw new Error("La matriz debe ser cuadrada");
    }

    const aumentada = matriz.map((fila, i) => [
        ...fila.map(v => ({ num: v.num, den: v.den })),
        ...Array.from({ length: n }, (_, j) => ({ num: i === j ? 1 : 0, den: 1 }))
    ]);

    aplicarGaussJordan(aumentada, false);

    for (let i = 0; i < n; i++) {
        const { num, den } = aumentada[i][i];
        if (num === 0 || Math.abs(num) !== Math.abs(den)) {
            throw new Error("La matriz no es invertible");
        }
    }

    return aumentada.map(fila => fila.slice(n));
}

export function calcularDet(matriz) {
    const n = matriz.length;
    
    if (!matriz.every(fila => fila.length === n)) {
        throw new Error("La matriz debe ser cuadrada");
    }
    if (n === 1) {
        return {
            matrizFinal: matriz,
            historialFactores: [],
            determinante: normalizarSigno(matriz[0][0])
        };
    }
    
    const resultado = aplicarGaussJordanDeterminante(matriz);
    
    return resultado;
}