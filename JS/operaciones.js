import { multiplicarFracciones, sumarFraccionesObj, restarFracciones, normalizarSigno } from "./auxiliares.js";

export function swapFilas(m, fil_i, fil_j) {
    if (fil_i === fil_j) return false;
    [m[fil_i], m[fil_j]] = [m[fil_j], m[fil_i]];
    return true;
}

export function multiplicarFila(m, fil_i, k) {
    for (let col = 0; col < m[fil_i].length; ++col) {
        m[fil_i][col] = normalizarSigno(multiplicarFracciones(m[fil_i][col], k));
    }
}

export function sumarFilas(m, fil_i, fil_j, k) {
    for (let col = 0; col < m[fil_i].length; ++col) {
        const termino = multiplicarFracciones(m[fil_j][col], k);
        m[fil_i][col] = normalizarSigno(sumarFraccionesObj(m[fil_i][col], termino));
    }
}

export function restarFilas(m, fil_i, fil_j, k) {
    for (let col = 0; col < m[fil_i].length; ++col) {
        const termino = multiplicarFracciones(m[fil_j][col], k);
        m[fil_i][col] = normalizarSigno(restarFracciones(m[fil_i][col], termino));
    }
}