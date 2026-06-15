import { 
    multiplicarFracciones, 
    sumarFraccionesObj, 
    restarFracciones, 
    normalizarSigno, 
    fraccionToString,
    dividirFracciones
} from "./auxiliares.js";

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

export function sumarMatrices(A, B) {
    return A.map((fila, i) => 
        fila.map((valor, j) => 
            normalizarSigno(sumarFraccionesObj(valor, B[i][j]))
        )
    );
}

export function restarMatrices(A, B) {
    return A.map((fila, i) => 
        fila.map((valor, j) => 
            normalizarSigno(restarFracciones(valor, B[i][j]))
        )
    );
}

export function multiplicarMatrices(A, B) {
    const filasA = A.length;
    const columnasA = A[0].length;
    const columnasB = B[0].length;
    const resultado = [];

    for (let i = 0; i < filasA; i++) {
        const fila = [];
        for (let j = 0; j < columnasB; j++) {
            let suma = { num: 0, den: 1 };
            for (let k = 0; k < columnasA; k++) {
                suma = sumarFraccionesObj(suma, multiplicarFracciones(A[i][k], B[k][j]));
            }
            fila.push(normalizarSigno(suma));
        }
        resultado.push(fila);
    }

    return resultado;
}

export function multiplicarMatrizPorEscalar(A, escalar) {
    return A.map(fila => 
        fila.map(valor => 
            normalizarSigno(multiplicarFracciones(valor, escalar))
        )
    );
}

export function transponerMatriz(A) {
    if (!A.length || !A[0].length) return [];
    
    const filas = A.length;
    const columnas = A[0].length;
    const resultado = [];
    
    for (let j = 0; j < columnas; j++) {
        resultado[j] = [];
        for (let i = 0; i < filas; i++) {
            resultado[j][i] = A[i][j];
        }
    }
    
    return resultado;
}

export function trazaMatriz(A) {
    if (!A.length || !A[0].length) {
        throw new Error("La matriz no puede estar vacía");
    }
    
    if (A.length !== A[0].length) {
        throw new Error("La traza solo está definida para matrices cuadradas");
    }
    
    let suma = { num: 0, den: 1 };
    
    for (let i = 0; i < A.length; i++) {
        suma = sumarFraccionesObj(suma, A[i][i]);
    }
    
    return normalizarSigno(suma);
}

export function validarDimensionesMatrices(modo, A, B = null) {
    const dimA = {
        filas: A.length,
        columnas: A[0]?.length || 0
    };
    
    if (!B && modo !== "escalar") {
        throw new Error(`Se requiere una segunda matriz para la operación ${modo}`);
    }
    
    if (modo === "escalar") return true;
    
    const dimB = {
        filas: B.length,
        columnas: B[0]?.length || 0
    };
    
    if ((modo === "suma" || modo === "resta")) {
        if (dimA.filas !== dimB.filas || dimA.columnas !== dimB.columnas) {
            const operacion = modo === "suma" ? "sumar" : "restar";
            throw new Error(
                `Para ${operacion} matrices, la matriz A y la matriz B deben tener el mismo número de filas y columnas. ` +
                `Actualmente A es ${dimA.filas}×${dimA.columnas} y B es ${dimB.filas}×${dimB.columnas}.`
            );
        }
    }
    
    if (modo === "multiplicacion") {
        if (dimA.columnas !== dimB.filas) {
            throw new Error(
                `Para multiplicar matrices, el número de columnas de A debe ser igual al número de filas de B. ` +
                `Actualmente A tiene ${dimA.columnas} columna${dimA.columnas === 1 ? "" : "s"} y B tiene ${dimB.filas} fila${dimB.filas === 1 ? "" : "s"}.`
            );
        }
    }
    
    return true;
}

export function polinomioToString(polinomio) {
    if (!polinomio || polinomio.length === 0) return "0";
    
    while (polinomio.length > 1 && polinomio[polinomio.length - 1].num === 0) {
        polinomio.pop();
    }
    
    const terminos = [];
    for (let i = polinomio.length - 1; i >= 0; i--) {
        const coef = polinomio[i];
        if (coef.num === 0) continue;
        
        const esPositivo = coef.num > 0;
        const absCoef = { num: Math.abs(coef.num), den: coef.den };
        const coefStr = (absCoef.num === 1 && absCoef.den === 1) ? "" : fraccionToString(absCoef);
        
        let termino = "";
        
        if (i === 0) {
            termino = fraccionToString(coef);
        } else if (i === 1) {
            termino = coefStr === "" ? "λ" : `${coefStr}λ`;
        } else {
            termino = coefStr === "" ? `λ^${i}` : `${coefStr}λ^${i}`;
        }
        
        if (terminos.length === 0) {
            if (esPositivo) {
                terminos.push(termino);
            } else {
                terminos.push(`-${termino}`);
            }
        } else {
            if (esPositivo) {
                terminos.push(`+ ${termino}`);
            } else {
                terminos.push(`- ${termino}`);
            }
        }
    }
    
    if (terminos.length === 0) return "0";
    
    let resultado = terminos.join(" ");
    resultado = resultado.replace(/\+ -/g, "- ");
    resultado = resultado.replace(/-\s*-/g, "- ");
    
    // 🔥 Arreglar doble signo en constante negativa
    resultado = resultado.replace(/-\s*-(\d+)/g, "- $1");
    resultado = resultado.replace(/-\s*-(\d+\/\d+)/g, "- $1");
    
    return resultado;
}
export function crearPolinomio(polinomio) {
    return polinomio.map(c => ({ num: c.num, den: c.den }));
}

export function sumarPolinomios(p, q) {
    const maxLen = Math.max(p.length, q.length);
    const resultado = [];
    
    for (let i = 0; i < maxLen; i++) {
        const pCoef = i < p.length ? p[i] : { num: 0, den: 1 };
        const qCoef = i < q.length ? q[i] : { num: 0, den: 1 };
        resultado.push(normalizarSigno(sumarFraccionesObj(pCoef, qCoef)));
    }
    
    while (resultado.length > 1 && resultado[resultado.length - 1].num === 0) {
        resultado.pop();
    }
    
    return resultado;
}

export function restarPolinomios(p, q) {
    console.log("restarPolinomios:", polinomioToString(p), "-", polinomioToString(q));
    
    const maxLen = Math.max(p.length, q.length);
    const resultado = [];
    
    for (let i = 0; i < maxLen; i++) {
        const pCoef = i < p.length ? p[i] : { num: 0, den: 1 };
        const qCoef = i < q.length ? q[i] : { num: 0, den: 1 };
        resultado.push(normalizarSigno(restarFracciones(pCoef, qCoef)));
    }
    
    while (resultado.length > 1 && resultado[resultado.length - 1].num === 0) {
        resultado.pop();
    }
    
    console.log("  resultado:", polinomioToString(resultado));
    return resultado;
}

export function multiplicarPolinomios(p, q) {
    const gradoP = p.length - 1;
    const gradoQ = q.length - 1;
    const resultado = Array(gradoP + gradoQ + 1).fill({ num: 0, den: 1 });
    
    for (let i = 0; i <= gradoP; i++) {
        for (let j = 0; j <= gradoQ; j++) {
            resultado[i + j] = normalizarSigno(
                sumarFraccionesObj(resultado[i + j], multiplicarFracciones(p[i], q[j]))
            );
        }
    }
    
    while (resultado.length > 1 && resultado[resultado.length - 1].num === 0) {
        resultado.pop();
    }
    
    return resultado;
}

export function multiplicarPolinomioPorMonomio(p, k, g = 0) {
    const resultado = Array(g).fill({ num: 0, den: 1 });
    
    for (let i = 0; i < p.length; i++) {
        resultado.push(normalizarSigno(multiplicarFracciones(p[i], k)));
    }
    
    return resultado;
}

export function matrizPolinomiosDesdeMatrizNumerica(A) {
    const n = A.length;
    const M = [];
    
    for (let i = 0; i < n; i++) {
        M[i] = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                const constante = { num: -A[i][j].num, den: A[i][j].den };
                if (constante.num === 0) {
                    M[i][j] = [{ num: 1, den: 1 }]; // solo λ
                } else {
                    M[i][j] = [constante, { num: 1, den: 1 }];
                }
            } else {
                const val = { num: -A[i][j].num, den: A[i][j].den };
                M[i][j] = [val.num === 0 ? { num: 0, den: 1 } : val];
            }
        }
    }
    return M;
}

export function determinantePolinomioMatriz(M) {
    const n = M.length;
    
    if (n === 1) {
        return crearPolinomio(M[0][0]);
    }
    
    if (n === 2) {
        const a = M[0][0], b = M[0][1], c = M[1][0], d = M[1][1];
        const ad = multiplicarPolinomios(a, d);
        const bc = multiplicarPolinomios(b, c);
        return restarPolinomios(ad, bc);
    }
    
    // Para n >= 3: expansión por cofactores de la primera fila
    let det = [{ num: 0, den: 1 }];
    
    for (let col = 0; col < n; col++) {
        const subMatriz = [];
        for (let i = 1; i < n; i++) {
            const fila = [];
            for (let j = 0; j < n; j++) {
                if (j !== col) fila.push(M[i][j]);
            }
            subMatriz.push(fila);
        }
        
        const cofactor = determinantePolinomioMatriz(subMatriz);
        let termino = multiplicarPolinomios(M[0][col], cofactor);
        
        if (col % 2 !== 0) {
            termino = multiplicarPolinomios(termino, [{ num: -1, den: 1 }]);
        }
        
        det = sumarPolinomios(det, termino);
    }
    
    return det;
}

export function obtenerPolinomioCaracteristico(A) {
    const lambdaImenosA = matrizPolinomiosDesdeMatrizNumerica(A);
    const polinomio = determinantePolinomioMatriz(lambdaImenosA);
    
    return { 
        polinomio, 
        matrizLambdaI: lambdaImenosA 
    };
}

export function obtenerPolinomioCaracteristicoConDebug(A) {
    const n = A.length;
    console.log("Matriz A:", A.map(row => row.map(v => fraccionToString(v))));
    
    const lambdaImenosA = matrizPolinomiosDesdeMatrizNumerica(A);
    console.log("λI - A:");
    for (let i = 0; i < n; i++) {
        console.log(lambdaImenosA[i].map(p => polinomioToString(p)));
    }
    
    const polinomio = determinantePolinomioMatriz(lambdaImenosA);
    console.log("Polinomio característico:", polinomioToString(polinomio));
    
    return { 
        polinomio, 
        matrizLambdaI: lambdaImenosA 
    };
}
export function dividirPolinomios(p, q) {
    if (q.length === 0 || (q.length === 1 && q[0].num === 0)) {
        throw new Error("División por polinomio cero");
    }
    const gradoQ = q.length - 1;
    const coefPrincipal = q[gradoQ];
    const esMonico = coefPrincipal.num === 1 && coefPrincipal.den === 1;
    
    let divisor = q;
    let factorNormalizacion = { num: 1, den: 1 };
    
    if (!esMonico) {
        factorNormalizacion = { num: 1, den: 1 };
        divisor = q.map(c => dividirFracciones(c, coefPrincipal));
    }
    
    let residuo = [...p];
    const cociente = Array(Math.max(0, p.length - gradoQ)).fill({ num: 0, den: 1 });
    
    for (let i = p.length - 1; i >= gradoQ; i--) {
        if (residuo[i].num === 0) continue;
        
        const coef = dividirFracciones(residuo[i], divisor[gradoQ]);
        cociente[i - gradoQ] = coef;
        
        for (let j = 0; j <= gradoQ; j++) {
            residuo[i - gradoQ + j] = normalizarSigno(
                restarFracciones(residuo[i - gradoQ + j], multiplicarFracciones(divisor[j], coef))
            );
        }
    }
    
    while (residuo.length > 1 && residuo[residuo.length - 1].num === 0) {
        residuo.pop();
    }
    
    return { cociente, residuo };
}
