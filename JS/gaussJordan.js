import { swapFilas, multiplicarFila, sumarFilas, restarFilas } from './operaciones.js';
import { esCero, dividirFracciones, normalizarSigno } from './auxiliares.js';

export function buscarPivote(matriz, filaActual, columnaActual) {
    if (!esCero(matriz[filaActual][columnaActual])) {
        return true;
    }

    for (let fila = filaActual + 1; fila < matriz.length; ++fila) {
        if (!esCero(matriz[fila][columnaActual])) {
            swapFilas(matriz, filaActual, fila);
            return true;
        }
    }
    return false;
}

export function hacerPivoteUno(matriz, filaActual, valorPivote) {
    if (esCero(valorPivote)) {
        throw new Error("No se puede escalar una fila con pivote cero");
    }
    const inversoPivote = dividirFracciones({ num: 1, den: 1 }, valorPivote);
    multiplicarFila(matriz, filaActual, inversoPivote);
    
    const pivote = matriz[filaActual][filaActual];
    if (pivote.num !== pivote.den && pivote.num !== -pivote.den) {
        const [num, den] = [pivote.num, pivote.den];
        if (num === den) {
            matriz[filaActual][filaActual] = { num: 1, den: 1 };
        }
    }
}

export function hacerCerosDebajo(matriz, filaPivote, columnaPivote) {
    for (let fila = filaPivote + 1; fila < matriz.length; ++fila) {
        const factor = matriz[fila][columnaPivote];
        if (!esCero(factor)) {
            // fila = fila - factor * filaPivote
            restarFilas(matriz, fila, filaPivote, factor);
        }
    }
}

export function hacerCerosArriba(matriz, filaPivote, columnaPivote) {
    for (let fila = 0; fila < filaPivote; ++fila) {
        const factor = matriz[fila][columnaPivote];
        if (!esCero(factor)) {
            restarFilas(matriz, fila, filaPivote, factor);
        }
    }
}

const gaussJordan = {
    buscarPivote,
    hacerPivoteUno,
    hacerCerosDebajo,
    hacerCerosArriba
};

export default gaussJordan;