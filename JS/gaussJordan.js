import { swapFilas, multiplicarFila, sumarFilas, restarFilas } from './operaciones.js';
import { esCero, dividirFracciones, normalizarSigno, multiplicarFracciones, restarFracciones} from './auxiliares.js';

export function buscarPivote(matriz, filaActual, columnaActual) {
    if (!esCero(matriz[filaActual][columnaActual])) {
        return { encontrado: true, huboSwap: false };
    }

    for (let fila = filaActual + 1; fila < matriz.length; ++fila) {
        if (!esCero(matriz[fila][columnaActual])) {
            swapFilas(matriz, filaActual, fila);
            return { encontrado: true, huboSwap: true };
        }
    }
    return { encontrado: false, huboSwap: false };
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
    
    return valorPivote;
}

export function hacerCerosDebajo(matriz, filaPivote, columnaPivote) {
    for (let fila = filaPivote + 1; fila < matriz.length; ++fila) {
        const factor = matriz[fila][columnaPivote];
        if (!esCero(factor)) {
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

export function hacerCerosDebajoSinNormalizar(matriz, filaPivote, columnaPivote) {
    if (esCero(matriz[filaPivote][columnaPivote])) {
        return;
    }
    
    for (let fila = filaPivote + 1; fila < matriz.length; ++fila) {
        if (!esCero(matriz[fila][columnaPivote])) {
            const factor = dividirFracciones(matriz[fila][columnaPivote], matriz[filaPivote][columnaPivote]);
            
            for (let k = columnaPivote; k < matriz[0].length; k++) {
                const termino = multiplicarFracciones(matriz[filaPivote][k], factor);
                matriz[fila][k] = restarFracciones(matriz[fila][k], termino);
                matriz[fila][k] = normalizarSigno(matriz[fila][k]);
            }
        }
    }
}

export function hacerCerosArribaSinNormalizar(matriz, filaPivote, columnaPivote) {
    if (esCero(matriz[filaPivote][columnaPivote])) {
        return;
    }
    
    for (let fila = 0; fila < filaPivote; ++fila) {
        if (!esCero(matriz[fila][columnaPivote])) {
            const factor = dividirFracciones(matriz[fila][columnaPivote], matriz[filaPivote][columnaPivote]);
            
            for (let k = columnaPivote; k < matriz[0].length; k++) {
                const termino = multiplicarFracciones(matriz[filaPivote][k], factor);
                matriz[fila][k] = restarFracciones(matriz[fila][k], termino);
                matriz[fila][k] = normalizarSigno(matriz[fila][k]);
            }
        }
    }
}

const gaussJordan = {
    buscarPivote,
    hacerPivoteUno,
    hacerCerosDebajo,
    hacerCerosArriba,
    hacerCerosDebajoSinNormalizar,
    hacerCerosArribaSinNormalizar
};

export default gaussJordan;