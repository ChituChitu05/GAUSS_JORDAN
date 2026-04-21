import {
    esCero,
    multiplicarFracciones,
    dividirFracciones,
    restarFracciones,
    normalizarSigno
} from "./auxiliares.js";
import { swapFilas } from "./operaciones.js";

function aplicarGaussJordan(matriz) {
    const filas = matriz.length;
    const columnas = matriz[0].length;
    let filaPivote = 0;

    for (let col = 0; col < columnas && filaPivote < filas; col++) {
        // Buscar pivote
        if (esCero(matriz[filaPivote][col])) {
            let encontrado = false;
            for (let fila = filaPivote + 1; fila < filas; fila++) {
                if (!esCero(matriz[fila][col])) {
                    swapFilas(matriz, filaPivote, fila);
                    encontrado = true;
                    break;
                }
            }
            if (!encontrado) continue;
        }

        // Normalizar pivote a 1
        const pivote = matriz[filaPivote][col];
        if (!esCero(pivote)) {
            const inverso = dividirFracciones({ num: 1, den: 1 }, pivote);
            for (let k = 0; k < columnas; k++) {
                matriz[filaPivote][k] = multiplicarFracciones(matriz[filaPivote][k], inverso);
                matriz[filaPivote][k] = normalizarSigno(matriz[filaPivote][k]);
            }
        }

        // Hacer ceros en toda la columna
        for (let fila = 0; fila < filas; fila++) {
            if (fila !== filaPivote && !esCero(matriz[fila][col])) {
                const factor = matriz[fila][col];
                for (let k = 0; k < columnas; k++) {
                    const termino = multiplicarFracciones(matriz[filaPivote][k], factor);
                    matriz[fila][k] = restarFracciones(matriz[fila][k], termino);
                    matriz[fila][k] = normalizarSigno(matriz[fila][k]);
                }
            }
        }

        filaPivote++;
    }
    return matriz;
}

export function resolverAXB(matriz) {
    return aplicarGaussJordan(matriz);
}

export function resolverInv(matriz) {
    const n = matriz.length;

    if (!matriz.every(fila => fila.length === n)) {
        throw new Error("La matriz debe ser cuadrada");
    }

    // Crear matriz aumentada [A | I]
    const aumentada = matriz.map((fila, i) => [
        ...fila.map(v => ({ num: v.num, den: v.den })),
        ...Array.from({ length: n }, (_, j) => ({ num: i === j ? 1 : 0, den: 1 }))
    ]);

    aplicarGaussJordan(aumentada);

    // Verificar que la izquierda es identidad
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

    // Validar que sea cuadrada
    for (let i = 0; i < n; i++) {
        if (matriz[i].length !== n) {
            throw new Error("La matriz debe ser cuadrada");
        }
    }

    // Copiar matriz
    const m = matriz.map(fila => fila.map(valor => ({ num: valor.num, den: valor.den })));

    let swaps = 0;
    let det = { num: 1, den: 1 };

    // Eliminación gaussiana a triangular superior
    for (let i = 0; i < n; i++) {
        // Buscar pivote
        if (esCero(m[i][i])) {
            for (let j = i + 1; j < n; j++) {
                if (!esCero(m[j][i])) {
                    swapFilas(m, i, j);
                    swaps++;
                    break;
                }
            }
        }

        const pivote = m[i][i];

        // Si no hay pivote, determinante = 0
        if (esCero(pivote)) {
            return {
                determinante: { num: 0, den: 1 },
                matrizFinal: m,
                factores: { swaps, multiplicadores: [] }
            };
        }

        // Multiplicar determinante por el pivote
        det = multiplicarFracciones(det, pivote);

        // Eliminar debajo
        for (let j = i + 1; j < n; j++) {
            if (!esCero(m[j][i])) {
                const factor = dividirFracciones(m[j][i], pivote);

                for (let k = i; k < n; k++) {
                    const termino = multiplicarFracciones(m[i][k], factor);
                    m[j][k] = restarFracciones(m[j][k], termino);
                    m[j][k] = normalizarSigno(m[j][k]);
                }
            }
        }
    }

    // Ajustar signo por swaps
    if (swaps % 2 === 1) {
        det = multiplicarFracciones(det, { num: -1, den: 1 });
    }

    return {
        determinante: det,
        matrizFinal: m,
        factores: { swaps, multiplicadores: [] }
    };
}