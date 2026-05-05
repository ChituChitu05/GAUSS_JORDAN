import {esCero, multiplicarFracciones,dividirFracciones,restarFracciones,normalizarSigno,fraccionToString} from "./auxiliares.js";
import { swapFilas } from "./operaciones.js";
import gaussJordan from "./gaussJordan.js";


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

function aplicarGaussJordanDeterminante(matriz) {
    const n = matriz.length;
    let swaps = 0;
    let factoresNormalizacion = [];
    let filaPivote = 0;

    // Crear una copia de la matriz para no modificar la original
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
    
    // Factores de normalización (pivotes originales)
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

//funciones específicas para cada tipo de cálculo (LI/LD, pertenencia, base, completar base, AXB, inversa, determinante)
// Los vectores van como columna.

function clonarMatriz(matriz) {
    return matriz.map(fila => fila.map(v => ({ num: v.num, den: v.den })));
}

function columnaDeMatriz(matriz, col) {
    return matriz.map(fila => ({ num: fila[col].num, den: fila[col].den }));
}

function crearCanonico(dimension, indice) {
    return Array.from({ length: dimension }, (_, i) => ({ num: i === indice ? 1 : 0, den: 1 }));
}

function juntarColumnas(columnas) {
    if (columnas.length === 0) return [];

    const filas = columnas[0].length;

    return Array.from({ length: filas }, (_, i) =>
        columnas.map(col => ({ num: col[i].num, den: col[i].den }))
    );
}

function filaCeroHastaColumna(fila, columnasCoeficientes) {
    for (let col = 0; col < columnasCoeficientes; col++) {
        if (!esCero(fila[col])) return false;
    }

    return true;
}

function obtenerColumnasNoPivote(totalColumnas, columnasPivote) {
    const pivotes = new Set(columnasPivote);
    const columnasNoPivote = [];

    for (let col = 0; col < totalColumnas; col++) {
        if (!pivotes.has(col)) columnasNoPivote.push(col);
    }

    return columnasNoPivote;
}

// Gauss-Jordan guardando las columnas donde si huay pivote.
export function aplicarGaussJordanConPivotes(matriz, columnasAProcesar = matriz[0]?.length || 0) {
    const copia = clonarMatriz(matriz);
    const filas = copia.length;
    let filaPivote = 0;
    const columnasPivote = [];

    for (let col = 0; col < columnasAProcesar && filaPivote < filas; col++) {
        const { encontrado } = gaussJordan.buscarPivote(copia, filaPivote, col);

        if (!encontrado) continue;

        columnasPivote.push(col);

        gaussJordan.hacerPivoteUno(copia, filaPivote, copia[filaPivote][col]);
        gaussJordan.hacerCerosArriba(copia, filaPivote, col);
        gaussJordan.hacerCerosDebajo(copia, filaPivote, col);

        filaPivote++;
    }

    return {
        matrizReducida: copia,
        columnasPivote,
        rango: columnasPivote.length
    };
}

// Li o Ld.
export function clasificarLIoLD(matrizVectores) {
    if (!matrizVectores.length || !matrizVectores[0].length) {
        throw new Error("Debes mandar una matriz con vectores como columnas");
    }

    const totalVectores = matrizVectores[0].length;

    const { matrizReducida, columnasPivote, rango } =
        aplicarGaussJordanConPivotes(matrizVectores, totalVectores);

    const columnasSinPivote = obtenerColumnasNoPivote(totalVectores, columnasPivote);
    const esLI = rango === totalVectores;

    return {
        tipo: esLI ? "LI" : "LD",
        esLI,
        esLD: !esLI,
        matrizReducida,
        rango,
        columnasPivote,
        columnasSinPivote,
        columnasPivoteHumanas: columnasPivote.map(c => c + 1),
        columnasSinPivoteHumanas: columnasSinPivote.map(c => c + 1),
        mensaje: esLI
            ? "El conjunto es LI: todas las columnas tienen pivote."
            : "El conjunto es LD: al menos una columna no tiene pivote."
    };
}

//vector pertenece al espacio generado por S.
export function perteneceAS(matrizGeneradores, vectorB) {
    if (!matrizGeneradores.length || !matrizGeneradores[0].length) {
        throw new Error("Debes mandar los generadores como columnas de una matriz");
    }

    if (matrizGeneradores.length !== vectorB.length) {
        throw new Error("El vector debe tener la misma dimensión que los generadores");
    }

    const columnasA = matrizGeneradores[0].length;

    const aumentada = matrizGeneradores.map((fila, i) => [
        ...fila.map(v => ({ num: v.num, den: v.den })),
        { num: vectorB[i].num, den: vectorB[i].den }
    ]);

    const { matrizReducida, columnasPivote, rango } =
        aplicarGaussJordanConPivotes(aumentada, columnasA);

    const esInconsistente = matrizReducida.some(fila =>
        filaCeroHastaColumna(fila, columnasA) && !esCero(fila[columnasA])
    );

    return {
        pertenece: !esInconsistente,
        matrizReducida,
        columnasPivote,
        rango,
        mensaje: !esInconsistente
            ? "Sí pertenece a S: AX = B tiene solución."
            : "No pertenece a S: AX = B es inconsistente."
    };
}

// Quita las columnas que no tienen pivote y regresa una base.
export function hallarBase(matrizVectores) {
    if (!matrizVectores.length || !matrizVectores[0].length) {
        throw new Error("Debes mandar una matriz con vectores como columnas");
    }

    const totalVectores = matrizVectores[0].length;

    const { matrizReducida, columnasPivote, rango } =
        aplicarGaussJordanConPivotes(matrizVectores, totalVectores);

    const columnasQuitadas = obtenerColumnasNoPivote(totalVectores, columnasPivote);
    const base = columnasPivote.map(col => columnaDeMatriz(matrizVectores, col));

    return {
        base,
        matrizReducida,
        rango,
        columnasPivote,
        columnasQuitadas,
        columnasPivoteHumanas: columnasPivote.map(c => c + 1),
        columnasQuitadasHumanas: columnasQuitadas.map(c => c + 1),
        mensaje: columnasQuitadas.length === 0
            ? "No se quitó ninguna columna."
            : `Se quitaron las columnas ${columnasQuitadas.map(c => c + 1).join(", ")}.`
    };
}

//Completa una base agregando vectores.
export function completarBase(matrizVectores) {
    if (!matrizVectores.length) {
        throw new Error("Debes mandar al menos una fila para conocer la dimensión");
    }

    const dimension = matrizVectores.length;
    const totalOriginales = matrizVectores[0]?.length || 0;

    // limpiamos los vectores que ya sobran
    const baseActual = totalOriginales > 0 ? hallarBase(matrizVectores).base : [];
    const canonicos = Array.from({ length: dimension }, (_, i) => crearCanonico(dimension, i));

    // Probamos la base actual 
    const matrizPrueba = juntarColumnas([...baseActual, ...canonicos]);

    const { matrizReducida, columnasPivote, rango } =
        aplicarGaussJordanConPivotes(matrizPrueba, matrizPrueba[0].length);

    const columnasQuitadas = obtenerColumnasNoPivote(matrizPrueba[0].length, columnasPivote);

    const indicesCanonicosAgregados = columnasPivote
        .filter(col => col >= baseActual.length)
        .map(col => col - baseActual.length);

    const vectoresAgregados = indicesCanonicosAgregados.map(i => canonicos[i]);
    const baseCompleta = [...baseActual, ...vectoresAgregados];

    return {
        baseCompleta,
        baseActual,
        vectoresAgregados,
        indicesCanonicosAgregados,
        canonicosAgregadosHumanos: indicesCanonicosAgregados.map(i => `e${i + 1}`),
        matrizReducida,
        rango,
        columnasPivote,
        columnasQuitadas,
        columnasPivoteHumanas: columnasPivote.map(c => c + 1),
        columnasQuitadasHumanas: columnasQuitadas.map(c => c + 1),
        mensaje: vectoresAgregados.length === 0
            ? "La base ya estaba completa."
            : `Se agregaron los canónicos ${indicesCanonicosAgregados.map(i => `e${i + 1}`).join(", ")}.`
    };
}
//aqui terminan las funciones generales para clasificación, pertenencia, base y completar base. Ahora vienen las específicas para cada tipo de cálculo (AXB, inversa, determinante).
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