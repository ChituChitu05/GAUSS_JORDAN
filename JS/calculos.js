import {
    esCero,multiplicarFracciones,dividirFracciones,restarFracciones,normalizarSigno,fraccionToString} from "./auxiliares.js";
import { swapFilas } from "./operaciones.js";
import gaussJordan from "./gaussJordan.js";

// Eliminación gaussiana para determinante
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
        if (!gaussJordan.buscarPivote(matriz, filaPivote, col)) continue;

        gaussJordan.hacerPivoteUno(matriz, filaPivote, matriz[filaPivote][col]);
        gaussJordan.hacerCerosArriba(matriz, filaPivote, col);
        gaussJordan.hacerCerosDebajo(matriz, filaPivote, col);

        filaPivote++;
    }
    return matriz;
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

    const copia = matriz.map(fila => fila.map(v => ({ num: v.num, den: v.den })));
    const { matriz: triangular, swaps } = aplicarGaussiana(copia);

    let det = { num: 1, den: 1 };
    for (let i = 0; i < n; i++) {
        det = multiplicarFracciones(det, triangular[i][i]);
    }

    if (swaps % 2 === 1) {
        det = multiplicarFracciones(det, { num: -1, den: 1 });
    }

    const historialFactores = swaps > 0 ? Array(swaps).fill(-1) : [];

    return {
        matrizFinal: triangular,
        historialFactores: historialFactores,
        determinante: normalizarSigno(det)
    };
}