import { esCero, multiplicarFracciones, dividirFracciones, restarFracciones, normalizarSigno, fraccionToString, sumarFraccionesObj, esVectorCero, obtenerColumna, vectorToString } from "./auxiliares.js";
import { productoPunto, normaCuadrada, multiplicarVectorPorEscalar, restarVectores, sumarVectores, multiplicarMatrices } from "./operaciones.js";
import gaussJordan from "./gaussJordan.js";
import { 
    obtenerPolinomioCaracteristico,
    matrizPolinomiosDesdeMatrizNumerica,
    polinomioToString,
    sumarPolinomios,
    restarPolinomios,
    multiplicarPolinomios,
    dividirPolinomios
} from "./operaciones.js";

function aplicarGaussJordan(matriz, modo = "axb", columnasCoeficientes = null) {
    const filas = matriz.length;
    if (filas === 0) return matriz;
    
    if (columnasCoeficientes === null) {
        if (modo === "axb") {
            columnasCoeficientes = matriz[0].length - 1;
        } else {
            columnasCoeficientes = matriz[0].length / 2;
        }
    }
    
    const maxCols = Math.min(columnasCoeficientes, matriz[0]?.length || 0);
    let filaPivote = 0;

    for (let col = 0; col < maxCols && filaPivote < filas; col++) {
        const { encontrado } = gaussJordan.buscarPivote(matriz, filaPivote, col);
        if (!encontrado) continue;

        gaussJordan.hacerPivoteUno(matriz, filaPivote, matriz[filaPivote][col]);
        gaussJordan.hacerCerosArriba(matriz, filaPivote, col);
        gaussJordan.hacerCerosDebajo(matriz, filaPivote, col);

        filaPivote++;
    }
    return matriz;
}

function multiplicarMatricesDimensionesDistintas(A, B) {
    const m = A.length;
    const p = A[0]?.length || 0;
    const n = B[0]?.length || 0;
    
    if (p !== B.length) {
        throw new Error(`Dimensiones incompatibles: A es ${m}x${p}, B es ${B.length}x${n}`);
    }
    
    const resultado = [];
    for (let i = 0; i < m; i++) {
        const fila = [];
        for (let j = 0; j < n; j++) {
            let suma = { num: 0, den: 1 };
            for (let k = 0; k < p; k++) {
                suma = sumarFraccionesObj(suma, multiplicarFracciones(A[i][k], B[k][j]));
            }
            fila.push(normalizarSigno(suma));
        }
        resultado.push(fila);
    }
    return resultado;
}

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

export function clasificarLIoLD(matrizVectores) {
    if (!matrizVectores.length || !matrizVectores[0].length) {
        throw new Error("Debes mandar una matriz con vectores como columnas");
    }
    const totalVectores = matrizVectores[0].length - 1;
    const { matrizReducida, columnasPivote, rango } = aplicarGaussJordanConPivotes(matrizVectores, totalVectores);
    const esLI = rango === totalVectores;
    return { esLI, rango, totalVectores, columnasPivote, matrizReducida };
}

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
    const { matrizReducida, columnasPivote, rango } = aplicarGaussJordanConPivotes(aumentada, columnasA);
    const inconsistente = matrizReducida.some(fila =>
        filaCeroHastaColumna(fila, columnasA) && !esCero(fila[columnasA])
    );
    return { pertenece: !inconsistente, rango, columnasPivote, matrizReducida };
}

export function hallarBase(matrizVectores) {
    if (!matrizVectores.length || !matrizVectores[0].length) {
        throw new Error("Debes mandar una matriz con vectores como columnas");
    }
    const totalVectores = matrizVectores[0].length - 1;
    const { matrizReducida, columnasPivote, rango } = aplicarGaussJordanConPivotes(matrizVectores, totalVectores);
    const base = columnasPivote.map(col => columnaDeMatriz(matrizVectores, col));
    return {
        base,
        rango,
        columnasPivote,
        columnasEliminadas: obtenerColumnasNoPivote(totalVectores, columnasPivote),
        matrizReducida
    };
}

export function completarBase(matrizVectores) {
    if (!matrizVectores.length) {
        throw new Error("Debes mandar al menos una fila para conocer la dimensión");
    }
    const dimension = matrizVectores.length;
    const totalOriginales = matrizVectores[0]?.length - 1 || 0;
    const baseActual = totalOriginales > 0 ? hallarBase(matrizVectores).base : [];
    const canonicos = Array.from({ length: dimension }, (_, i) => crearCanonico(dimension, i));
    const matrizPrueba = juntarColumnas([...baseActual, ...canonicos]);
    const { columnasPivote, rango } = aplicarGaussJordanConPivotes(matrizPrueba, matrizPrueba[0].length);
    const canonicosAgregados = columnasPivote
        .filter(col => col >= baseActual.length)
        .map(col => col - baseActual.length);
    const baseCompleta = [...baseActual];
    const canonicosUsados = [];
    for (let i = 0; i < canonicosAgregados.length; i++) {
        const idx = canonicosAgregados[i];
        baseCompleta.push(canonicos[idx]);
        canonicosUsados.push(idx);
    }
    return {
        baseCompleta: baseCompleta,
        baseOriginal: baseActual,
        rango,
        canonicosAgregados: canonicosUsados,
        dimension
    };
}

export function resolverAXB(matriz) {
    const copia = matriz.map(fila => [...fila]);
    return aplicarGaussJordan(copia, "axb");
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
    aplicarGaussJordan(aumentada, "inversa");
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

function aplicarGaussJordanDeterminante(matriz) {
    const n = matriz.length;
    let swaps = 0;
    let factoresNormalizacion = [];
    let filaPivote = 0;
    const copia = matriz.map(fila => fila.map(v => ({ num: v.num, den: v.den })));

    for (let col = 0; col < n && filaPivote < n; col++) {
        const { encontrado, huboSwap } = gaussJordan.buscarPivote(copia, filaPivote, col);
        if (!encontrado) {
            return {
                matrizFinal: copia,
                historialFactores: [...factoresNormalizacion, ...Array(swaps).fill(-1)],
                determinante: { num: 0, den: 1 }
            };
        }
        if (huboSwap) swaps++;
        const pivote = copia[filaPivote][col];
        if (!(pivote.num === 1 && pivote.den === 1)) {
            factoresNormalizacion.push({ num: pivote.num, den: pivote.den });
            gaussJordan.hacerPivoteUno(copia, filaPivote, pivote);
        }
        gaussJordan.hacerCerosDebajo(copia, filaPivote, col);
        gaussJordan.hacerCerosArriba(copia, filaPivote, col);
        filaPivote++;
    }

    const historialFactores = [];
    for (let i = 0; i < swaps; i++) historialFactores.push(-1);
    for (const factor of factoresNormalizacion) historialFactores.push(factor);

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

export function ortogonalizar(matriz) {
    if (!matriz.length || !matriz[0].length) {
        throw new Error("Debes mandar una matriz con vectores como columnas");
    }
    const n = matriz.length;
    const m = matriz[0].length;
    const vectoresOriginales = [];
    for (let j = 0; j < m; j++) {
        vectoresOriginales.push(obtenerColumna(matriz, j));
    }
    const matrizVectores = [];
    for (let i = 0; i < n; i++) {
        const fila = [];
        for (let j = 0; j < m; j++) {
            fila.push(vectoresOriginales[j][i]);
        }
        matrizVectores.push(fila);
    }
    const { base } = hallarBase(matrizVectores);
    if (base.length === 1) {
        throw new Error("Todos los vectores son linealmente dependientes");
    }
    const vectoresOrtogonales = [];
    for (let i = 0; i < base.length; i++) {
        let vectorActual = base[i].map(v => ({ num: v.num, den: v.den }));
        for (let j = 0; j < vectoresOrtogonales.length; j++) {
            const vectorBase = vectoresOrtogonales[j];
            const productoPuntoVI_UJ = productoPunto(vectorActual, vectorBase);
            const normaCuadradaUJ = normaCuadrada(vectorBase);
            if (!esCero(normaCuadradaUJ)) {
                const factor = dividirFracciones(productoPuntoVI_UJ, normaCuadradaUJ);
                const resta = multiplicarVectorPorEscalar(vectorBase, factor);
                vectorActual = restarVectores(vectorActual, resta);
            }
        }
        vectoresOrtogonales.push(vectorActual);
    }
    return vectoresOrtogonales;
}

export function matrizCambioBase(baseOrigen, baseDestino) {
    if (!baseOrigen || !baseOrigen.length || !baseDestino || !baseDestino.length) {
        throw new Error("Ambas bases deben ser matrices no vacías");
    }
    const n = baseOrigen.length;
    if (baseOrigen[0]?.length !== n || baseDestino[0]?.length !== n) {
        throw new Error("Ambas bases deben ser matrices cuadradas de la misma dimensión");
    }
    const aumentada = [];
    for (let i = 0; i < n; i++) {
        const fila = [];
        for (let j = 0; j < n; j++) {
            fila.push({ num: baseDestino[i][j].num, den: baseDestino[i][j].den });
        }
        for (let j = 0; j < n; j++) {
            fila.push({ num: baseOrigen[i][j].num, den: baseOrigen[i][j].den });
        }
        aumentada.push(fila);
    }
    aplicarGaussJordan(aumentada, "cambioBase");
    for (let i = 0; i < n; i++) {
        const pivote = aumentada[i][i];
        if (pivote.num === 0 || pivote.num !== pivote.den) {
            throw new Error("La base de destino no es invertible");
        }
    }
    const matrizCambio = [];
    for (let i = 0; i < n; i++) {
        const fila = [];
        for (let j = 0; j < n; j++) {
            fila.push(aumentada[i][n + j]);
        }
        matrizCambio.push(fila);
    }
    return matrizCambio;
}

export function matrizTransformacion(matrizTBaseCanonica, baseSalida, baseLlegada) {
    if (!matrizTBaseCanonica || !matrizTBaseCanonica.length) {
        throw new Error("La matriz de transformación no puede estar vacía");
    }
    const m = matrizTBaseCanonica.length;
    const n = matrizTBaseCanonica[0]?.length || 0;
    if (m === 0 || n === 0) {
        throw new Error("La matriz de transformación debe tener dimensiones válidas");
    }
    if (!baseSalida || baseSalida.length !== n) {
        throw new Error(`La base de salida debe tener ${n} vectores`);
    }
    if (baseSalida[0]?.length !== n) {
        throw new Error(`Cada vector de la base de salida debe tener dimensión ${n}`);
    }
    if (!baseLlegada || baseLlegada.length !== m) {
        throw new Error(`La base de llegada debe tener ${m} vectores`);
    }
    if (baseLlegada[0]?.length !== m) {
        throw new Error(`Cada vector de la base de llegada debe tener dimensión ${m}`);
    }
    const PB = [];
    for (let i = 0; i < n; i++) {
        const fila = [];
        for (let j = 0; j < n; j++) {
            fila.push({ num: baseSalida[i][j].num, den: baseSalida[i][j].den });
        }
        PB.push(fila);
    }
    const PC = [];
    for (let i = 0; i < m; i++) {
        const fila = [];
        for (let j = 0; j < m; j++) {
            fila.push({ num: baseLlegada[i][j].num, den: baseLlegada[i][j].den });
        }
        PC.push(fila);
    }
    const identidadC = Array.from({ length: m }, (_, i) =>
        Array.from({ length: m }, (_, j) => ({ num: i === j ? 1 : 0, den: 1 }))
    );
    const aumentadaPC = [];
    for (let i = 0; i < m; i++) {
        const fila = [];
        for (let j = 0; j < m; j++) {
            fila.push({ num: PC[i][j].num, den: PC[i][j].den });
        }
        for (let j = 0; j < m; j++) {
            fila.push({ num: identidadC[i][j].num, den: identidadC[i][j].den });
        }
        aumentadaPC.push(fila);
    }
    aplicarGaussJordan(aumentadaPC, "transformacion");
    const PCInversa = [];
    for (let i = 0; i < m; i++) {
        const fila = [];
        for (let j = 0; j < m; j++) {
            fila.push(aumentadaPC[i][m + j]);
        }
        PCInversa.push(fila);
    }
    const A = multiplicarMatricesDimensionesDistintas(matrizTBaseCanonica, PB);
    const matrizTB = multiplicarMatricesDimensionesDistintas(PCInversa, A);
    return matrizTB;
}

export function resolverGrado1(a, b) {
    if (a.num === 0) {
        throw new Error("Coeficiente principal cero");
    }
    const raiz = dividirFracciones({ num: -b.num, den: b.den }, a);
    return { tipo: "exacta", valor: raiz };
}

export function resolverGrado2(a, b, c) {
    console.log("\n=== resolverGrado2 ===");
    console.log("a:", fraccionToString(a), "b:", fraccionToString(b), "c:", fraccionToString(c));
    
    if (a.num === 0) {
        console.log("a es 0, delegando a resolverGrado1");
        return [resolverGrado1(b, c)];
    }
    
    // Calcular discriminante Δ = b² - 4ac
    const b2 = multiplicarFracciones(b, b);
    const cuatroAc = multiplicarFracciones({ num: 4, den: 1 }, multiplicarFracciones(a, c));
    const discriminante = restarFracciones(b2, cuatroAc);
    
    const dosA = multiplicarFracciones({ num: 2, den: 1 }, a);
    const bNeg = { num: -b.num, den: b.den };
    const discVal = discriminante.num / discriminante.den;
    
    console.log("b²:", fraccionToString(b2));
    console.log("4ac:", fraccionToString(cuatroAc));
    console.log("discriminante:", fraccionToString(discriminante));
    console.log("discVal:", discVal);
    
    if (discVal < 0) {
        console.log("Discriminante negativo → raíces complejas");
        const real = dividirFracciones(bNeg, dosA);
        return [{ tipo: "complejo", valor: null, parteReal: real }];
    }
    
    // Simplificar la raíz del discriminante
    const raizDisc = simplificarRaizExacta(discriminante);
    console.log("raizDisc:", raizDisc);
    
    if (raizDisc.tipo === "exacta") {
        console.log("Raíz exacta");
        const λ1 = normalizarSigno(dividirFracciones(restarFracciones(bNeg, raizDisc.valorFraccion), dosA));
        const λ2 = normalizarSigno(dividirFracciones(sumarFraccionesObj(bNeg, raizDisc.valorFraccion), dosA));
        console.log("λ1:", fraccionToString(λ1));
        console.log("λ2:", fraccionToString(λ2));
        return [
            { tipo: "exacta", valor: λ1 },
            { tipo: "exacta", valor: λ2 }
        ];
    }
    
    console.log("Raíz no exacta");
    // Raíces con raíz cuadrada no exacta
    const parteRacional = dividirFracciones(bNeg, dosA);
    const coeficienteRaiz = dividirFracciones({ num: 1, den: 1 }, dosA);
    const coefFinal = multiplicarFracciones(raizDisc.coeficiente, coeficienteRaiz);
    const radicando = raizDisc.radicando;
    
    console.log("parteRacional:", fraccionToString(parteRacional));
    console.log("coeficienteRaiz:", fraccionToString(coeficienteRaiz));
    console.log("coefFinal:", fraccionToString(coefFinal));
    console.log("radicando:", fraccionToString(radicando));
    
    const raiz1 = {
        tipo: "raiz",
        parteReal: parteRacional,
        coeficiente: coefFinal,
        radicando: radicando,
        expresion: `${fraccionToString(parteRacional)} ± ${fraccionToString(coefFinal)}√${fraccionToString(radicando)}`
    };
    
    const raiz2 = {
        tipo: "raiz",
        parteReal: parteRacional,
        coeficiente: { num: -coefFinal.num, den: coefFinal.den },
        radicando: radicando
    };
    
    console.log("raiz1:", raiz1.expresion);
    console.log("raiz2:", `${fraccionToString(parteRacional)} ± ${fraccionToString(raiz2.coeficiente)}√${fraccionToString(radicando)}`);
    
    return [raiz1, raiz2];
}
export function simplificarRaiz(frac) {
    const valor = frac.num / frac.den;
    if (valor < 0) {
        const pos = { num: -frac.num, den: frac.den };
        const simpl = simplificarRaiz(pos);
        return {
            tipo: "complejo",
            coeficiente: simpl.coeficiente,
            radicando: simpl.radicando
        };
    }
    
    let radicando = valor;
    let coeficiente = 1;
    
    for (let i = Math.floor(Math.sqrt(radicando)); i >= 2; i--) {
        if (radicando % (i * i) === 0) {
            coeficiente *= i;
            radicando /= (i * i);
            i = Math.floor(Math.sqrt(radicando)) + 1;
        }
    }
    
    const tipo = radicando === 1 ? "exacta" : "raiz";
    
    return {
        tipo: tipo,
        coeficiente: { num: coeficiente, den: 1 },
        radicando: { num: radicando, den: 1 },
        valorFraccion: { num: Math.round(Math.sqrt(valor) * 1000000), den: 1000000 }
    };
}

export function simplificarRaizExacta(frac) {
    const valor = frac.num / frac.den;
    if (valor < 0) {
        return { tipo: "complejo" };
    }
    
    const raiz = Math.sqrt(valor);
    const esExacta = Math.abs(raiz - Math.round(raiz)) < 1e-10;
    
    if (esExacta) {
        const raizEntera = Math.round(raiz);
        return {
            tipo: "exacta",
            valor: raiz,
            valorFraccion: { num: raizEntera, den: 1 }
        };
    }
    
    return simplificarRaiz(frac);
}

export function factorizarPolinomio(polinomio) {
    // Si el coeficiente principal es negativo, factorizar -1 primero
    let pol = [...polinomio];
    let factorGlobal = null;
    
    const grado = pol.length - 1;
    if (grado >= 0 && pol[grado].num < 0) {
        factorGlobal = { num: -1, den: 1 };
        pol = pol.map(c => multiplicarFracciones(c, factorGlobal));
    }
    
    const factores = [];
    
    if (grado === 1) {
        const a = pol[1];
        const b = pol[0];
        const raiz = resolverGrado1(a, b);
        factores.push({
            tipo: "lineal",
            coeficientes: [b, a],
            raiz: raiz
        });
        if (factorGlobal) {
            factores.unshift({ tipo: "constante", valor: factorGlobal });
        }
        return factores;
    }
    
    if (grado === 2) {
        const a = pol[2];
        const b = pol[1];
        const c = pol[0];
        const raices = resolverGrado2(a, b, c);
        
        if (raices.length === 2 && raices[0].tipo === "exacta" && raices[1].tipo === "exacta") {
            const r1 = raices[0].valor;
            const r2 = raices[1].valor;
            factores.push({
                tipo: "lineal",
                coeficientes: [{ num: -r1.num, den: r1.den }, { num: 1, den: 1 }],
                raiz: raices[0]
            });
            factores.push({
                tipo: "lineal",
                coeficientes: [{ num: -r2.num, den: r2.den }, { num: 1, den: 1 }],
                raiz: raices[1]
            });
        } else {
            // Guardar en orden [a, b, c] para polinomioToString
            factores.push({
                tipo: "cuadratico",
                coeficientes: [a, b, c],
                raices: raices
            });
        }
        if (factorGlobal) {
            factores.unshift({ tipo: "constante", valor: factorGlobal });
        }
        return factores;
    }
    
    // Para grados mayores, buscar raíces racionales
    const raicesRacionales = buscarRaicesRacionales(pol);
    
    if (raicesRacionales.length > 0) {
        let polActual = [...pol];
        for (const r of raicesRacionales) {
            const factor = [{ num: -r.num, den: r.den }, { num: 1, den: 1 }];
            factores.push({
                tipo: "lineal",
                coeficientes: factor,
                raiz: { tipo: "exacta", valor: r }
            });
            const { cociente } = dividirPolinomios(polActual, factor);
            polActual = cociente;
        }
        
        if (polActual.length > 2 || (polActual.length === 2 && (polActual[0].num !== 0 || polActual[1].num !== 1))) {
            const restantes = factorizarPolinomio(polActual);
            factores.push(...restantes);
        } else if (polActual.length === 2 && polActual[1].num === 1 && polActual[0].num !== 0) {
            const raiz = resolverGrado1(polActual[1], polActual[0]);
            factores.push({
                tipo: "lineal",
                coeficientes: [polActual[0], polActual[1]],
                raiz: raiz
            });
        }
    } else {
        factores.push({
            tipo: "irreducible",
            coeficientes: pol,
            grado: grado
        });
    }
    
    if (factorGlobal) {
        factores.unshift({ tipo: "constante", valor: factorGlobal });
    }
    
    return factores;
}
function buscarRaicesRacionales(polinomio) {
    if (polinomio.length <= 2) return [];
    
    const grado = polinomio.length - 1;
    const an = polinomio[grado];
    const a0 = polinomio[0];
    
    if (an.num === 0 || a0.num === 0) return [];
    
    const divisoresAn = obtenerDivisores(Math.abs(an.num));
    const divisoresA0 = obtenerDivisores(Math.abs(a0.num));
    const raices = [];
    
    for (const p of divisoresA0) {
        for (const q of divisoresAn) {
            const r = { num: p, den: q };
            const rNeg = { num: -p, den: q };
            
            if (esRaizPolinomio(polinomio, r)) {
                raices.push(r);
            }
            if (esRaizPolinomio(polinomio, rNeg)) {
                raices.push(rNeg);
            }
        }
    }
    
    return [...new Set(raices.map(r => `${r.num}/${r.den}`))].map(key => {
        const [num, den] = key.split("/").map(Number);
        return { num, den: den || 1 };
    });
}

function obtenerDivisores(n) {
    const divisores = [];
    for (let i = 1; i <= Math.abs(n); i++) {
        if (n % i === 0) divisores.push(i);
    }
    return divisores;
}

function esRaizPolinomio(polinomio, r) {
    let resultado = { num: 0, den: 1 };
    let potencia = { num: 1, den: 1 };
    
    for (let i = 0; i < polinomio.length; i++) {
        const termino = multiplicarFracciones(polinomio[i], potencia);
        resultado = sumarFraccionesObj(resultado, termino);
        potencia = multiplicarFracciones(potencia, r);
    }
    
    console.log(`Evaluando r = ${r.num}/${r.den}, resultado = ${resultado.num}/${resultado.den}`);
    return resultado.num === 0;
}

function calcularRango(matriz) {
    const copia = matriz.map(fila => fila.map(v => ({ num: v.num, den: v.den })));
    const n = copia.length;
    let rango = 0;
    
    for (let col = 0; col < n && rango < n; col++) {
        let filaPivote = -1;
        for (let i = rango; i < n; i++) {
            if (!esCero(copia[i][col])) {
                filaPivote = i;
                break;
            }
        }
        
        if (filaPivote === -1) continue;
        
        if (filaPivote !== rango) {
            [copia[rango], copia[filaPivote]] = [copia[filaPivote], copia[rango]];
        }
        
        const pivote = copia[rango][col];
        for (let i = rango + 1; i < n; i++) {
            if (!esCero(copia[i][col])) {
                const factor = dividirFracciones(copia[i][col], pivote);
                for (let j = col; j < n; j++) {
                    copia[i][j] = restarFracciones(copia[i][j], multiplicarFracciones(copia[rango][j], factor));
                }
            }
        }
        rango++;
    }
    
    return rango;
}

export function encontrarMultiplicidadGeometrica(A, λ) {
    const n = A.length;
    const A_menos_λI = A.map((fila, i) => 
        fila.map((valor, j) => {
            if (i === j) {
                return normalizarSigno(restarFracciones(valor, λ));
            }
            return { num: valor.num, den: valor.den };
        })
    );
    
    const rango = calcularRango(A_menos_λI);
    return n - rango;
}

export function verificarDiagonalizacion(A, valoresPropios) {
    const n = A.length;
    
    // Si no hay valores propios reales
    if (valoresPropios.length === 0) {
        return { 
            esDiagonalizable: false, 
            razon: "La matriz no tiene valores propios reales. No es diagonalizable en ℝ." 
        };
    }
    
    // Si hay valores propios complejos (no reales)
    for (const vp of valoresPropios) {
        if (vp.tipo === "complejo") {
            return { 
                esDiagonalizable: false, 
                razon: "La matriz tiene valores propios complejos (no reales). No es diagonalizable en ℝ." 
            };
        }
    }
    
    // Contar multiplicidades algebraicas (frecuencia de cada valor propio)
    const mapa = new Map();
    for (const vp of valoresPropios) {
        if (vp.tipo !== "exacta") {
            // Si hay una raíz no exacta (como 5 ± √41), son dos valores distintos
            // No necesitamos verificar multiplicidad geométrica porque ya sabemos que son distintos
            continue;
        }
        const key = `${vp.valor.num}/${vp.valor.den}`;
        mapa.set(key, (mapa.get(key) || 0) + 1);
    }
    
    // Verificar multiplicidad geométrica para cada valor propio (solo si es exacto)
    for (const [key, multAlgebraica] of mapa.entries()) {
        const [num, den] = key.split("/").map(Number);
        const λ = { num, den: den || 1 };
        const multGeometrica = encontrarMultiplicidadGeometrica(A, λ);
        
        if (multGeometrica !== multAlgebraica) {
            return {
                esDiagonalizable: false,
                razon: `Para λ = ${fraccionToString(λ)}, multiplicidad algebraica = ${multAlgebraica} pero geométrica = ${multGeometrica}`
            };
        }
    }
    
    // Si llegamos aquí, la matriz es diagonalizable
    // (los valores propios con raíz no exacta ya son distintos entre sí)
    return { 
        esDiagonalizable: true, 
        razon: "La matriz es diagonalizable en ℝ" 
    };
}
export function construirMatrizDiagonalCompleta(raices, n) {
    const D = Array(n).fill().map(() => Array(n).fill({ num: 0, den: 1 }));
    
    // Para cada valor propio en la diagonal (en orden)
    for (let i = 0; i < Math.min(n, raices.length); i++) {
        const raiz = raices[i];
        
        if (raiz.tipo === "exacta") {
            D[i][i] = normalizarSigno(raiz.valor);
        } else if (raiz.tipo === "raiz") {
            // Guardar el valor propio como objeto especial para mostrar con raíz
            // En lugar de guardar una fracción, guardamos la representación de raíz
            D[i][i] = {
                tipo: "raiz",
                parteReal: raiz.parteReal,
                coeficiente: raiz.coeficiente,
                radicando: raiz.radicando,
                // También guardamos como fracción aproximada para cálculos
                num: raiz.parteReal?.num || 0,
                den: raiz.parteReal?.den || 1
            };
        }
    }
    
    return D;
}

export function diagonalizarMatrizCompleta(A) {
    const n = A.length;
    
    if (n === 0) throw new Error("Matriz vacía");
    if (!A.every(fila => fila.length === n)) {
        throw new Error("La matriz debe ser cuadrada");
    }
    
    const { polinomio: polCaracteristico, matrizLambdaI: lambdaImenosA } = obtenerPolinomioCaracteristico(A);
    
    const factoresPol = factorizarPolinomio(polCaracteristico);
    
    // Extraer todas las raíces (incluyendo las no exactas)
    const raices = [];
    const valoresPropios = [];
    
    for (const factor of factoresPol) {
        if (factor.tipo === "lineal" && factor.raiz) {
            raices.push(factor.raiz);
            if (factor.raiz.tipo === "exacta") {
                valoresPropios.push(factor.raiz);
            }
        } else if (factor.tipo === "cuadratico" && factor.raices) {
            for (const raiz of factor.raices) {
                raices.push(raiz);
                if (raiz.tipo === "exacta") {
                    valoresPropios.push(raiz);
                }
            }
        }
    }
    
    // DEBUG
    console.log("=== DEBUG diagonalizarMatrizCompleta ===");
    console.log("valoresPropios:", valoresPropios.map(v => {
        if (v.tipo === "exacta") return fraccionToString(v.valor);
        if (v.tipo === "raiz") return `${fraccionToString(v.parteReal)} ± ${fraccionToString(v.coeficiente)}√${fraccionToString(v.radicando)}`;
        return v.tipo;
    }));
    console.log("raices:", raices.map(r => {
        if (r.tipo === "exacta") return fraccionToString(r.valor);
        if (r.tipo === "raiz") return `${fraccionToString(r.parteReal)} ± ${fraccionToString(r.coeficiente)}√${fraccionToString(r.radicando)}`;
        return r.tipo;
    }));
    console.log("n:", n, "valoresPropios.length:", valoresPropios.length);
    
    const diagonalizacion = verificarDiagonalizacion(A, valoresPropios);
    console.log("diagonalizacion:", diagonalizacion);
    
    let D = null;
    if (diagonalizacion.esDiagonalizable) {
        // Construir D con TODOS los valores propios (incluyendo los no exactos)
        D = construirMatrizDiagonalCompleta(raices, n);
    }
    
    return {
        matrizOriginal: A,
        lambdaImenosA: lambdaImenosA,
        polinomioCaracteristico: polCaracteristico,
        factoresPolinomio: factoresPol,
        raices: raices,
        valoresPropios: valoresPropios,
        diagonalizacion: diagonalizacion,
        matrizDiagonal: D
    };
}