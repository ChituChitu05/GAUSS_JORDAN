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


export function productoPunto(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error("Los vectores deben tener la misma dimensión");
    }
    
    let resultado = { num: 0, den: 1 };
    
    for (let i = 0; i < vectorA.length; i++) {
        const producto = multiplicarFracciones(vectorA[i], vectorB[i]);
        resultado = sumarFraccionesObj(resultado, producto);
    }
    
    return resultado;
}

export function normaCuadrada(vector) {
    return productoPunto(vector, vector);
}

export function multiplicarVectorPorEscalar(vector, escalar) {
    return vector.map(v => multiplicarFracciones(v, escalar));
}

export function restarVectores(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error("Los vectores deben tener la misma dimensión");
    }
    
    return vectorA.map((v, i) => restarFracciones(v, vectorB[i]));
}

export function sumarVectores(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error("Los vectores deben tener la misma dimensión");
    }
    
    return vectorA.map((v, i) => sumarFraccionesObj(v, vectorB[i]));
}