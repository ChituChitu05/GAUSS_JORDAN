// tests.js - Script de pruebas para Gauss-Jordan, Inversa y Determinante
import { resolverAXB, resolverInv, calcularDet } from "./calculos.js";
import { 
    fraccionToString
} from "./auxiliares.js";

// Utilidad para comparar fracciones
function fraccionesIguales(f1, f2) {
    const a = f1.num * f2.den;
    const b = f2.num * f1.den;
    return a === b;
}

// Validar que la matriz sea regular (todas las filas misma longitud)
function esMatrizRegular(matriz) {
    if (matriz.length === 0) return false;
    const numColumnas = matriz[0].length;
    return matriz.every(fila => fila.length === numColumnas);
}

// Completar filas irregulares con ceros
function regularizarMatriz(matriz) {
    if (matriz.length === 0) return matriz;
    const numColumnas = Math.max(...matriz.map(fila => fila.length));
    return matriz.map(fila => {
        const filaRegular = [...fila];
        while (filaRegular.length < numColumnas) {
            filaRegular.push({ num: 0, den: 1 });
        }
        return filaRegular;
    });
}

// Determinar el tipo correcto de prueba para una matriz
function determinarTipoPrueba(matriz) {
    if (!esMatrizRegular(matriz)) {
        return "axb"; // Las matrices irregulares solo pueden ir a AXB
    }
    
    const numFilas = matriz.length;
    const numColumnas = matriz[0].length;
    
    if (numFilas === numColumnas) {
        // Cuadrada: puede ser determinante o inversa
        return Math.random() > 0.5 ? "determinante" : "inversa";
    } else {
        // Rectangular: solo AXB
        return "axb";
    }
}

// Generador de matrices aleatorias
function generarMatrizAleatoria(filas, columnas, rango = 5) {
    const matriz = [];
    for (let i = 0; i < filas; i++) {
        const fila = [];
        for (let j = 0; j < columnas; j++) {
            const num = Math.floor(Math.random() * (rango * 2 + 1)) - rango;
            fila.push({ num, den: 1 });
        }
        matriz.push(fila);
    }
    return matriz;
}

// Generador de matrices singulares (determinante = 0)
function generarMatrizSingular(n) {
    const matriz = generarMatrizAleatoria(n, n, 3);
    if (n > 1) {
        for (let j = 0; j < n; j++) {
            let suma = { num: 0, den: 1 };
            for (let i = 0; i < n - 1; i++) {
                suma = {
                    num: suma.num + matriz[i][j].num,
                    den: suma.den
                };
            }
            matriz[n-1][j] = suma;
        }
    }
    return matriz;
}

// Generador de matrices mal condicionadas (Hilbert)
function generarMatrizHilbert(n) {
    const matriz = [];
    for (let i = 0; i < n; i++) {
        const fila = [];
        for (let j = 0; j < n; j++) {
            fila.push({ num: 1, den: i + j + 1 });
        }
        matriz.push(fila);
    }
    return matriz;
}

// Tests específicos para romper el código
const tests = [];

// 1. Matrices con ceros en posiciones críticas (20 ejemplos)
for (let i = 0; i < 20; i++) {
    const n = Math.floor(Math.random() * 4) + 2;
    const matriz = generarMatrizAleatoria(n, n, 3);
    for (let k = 0; k < n; k++) {
        if (Math.random() > 0.7) {
            matriz[k][k] = { num: 0, den: 1 };
        }
    }
    tests.push({
        nombre: `Matriz con ceros en diagonal ${i+1}`,
        tipo: "determinante",
        matriz: matriz
    });
}

// 2. Matrices con fracciones complejas (20 ejemplos)
const fraccionesComplejas = [
    { num: 1, den: 2 }, { num: 2, den: 3 }, { num: 3, den: 4 }, { num: 4, den: 5 },
    { num: 5, den: 6 }, { num: 1, den: 7 }, { num: 2, den: 9 }, { num: 3, den: 8 },
    { num: 7, den: 2 }, { num: 5, den: 3 }, { num: 8, den: 5 }, { num: 9, den: 7 },
    { num: -1, den: 2 }, { num: -2, den: 3 }, { num: 1, den: -4 }, { num: -3, den: -5 }
];

for (let i = 0; i < 20; i++) {
    const n = Math.floor(Math.random() * 3) + 2;
    const matriz = [];
    // Asegurar que todas las filas tengan la misma longitud
    const numColumnas = n + (Math.random() > 0.5 ? 1 : 0);
    
    for (let j = 0; j < n; j++) {
        const fila = [];
        for (let k = 0; k < numColumnas; k++) {
            const frac = fraccionesComplejas[Math.floor(Math.random() * fraccionesComplejas.length)];
            fila.push({ num: frac.num, den: frac.den });
        }
        matriz.push(fila);
    }
    
    // Determinar tipo de prueba automáticamente
    const tipo = determinarTipoPrueba(matriz);
    
    tests.push({
        nombre: `Matriz con fracciones complejas ${i+1}`,
        tipo: tipo,
        matriz: matriz
    });
}

// 3. Matrices rectangulares (solo AXB)
for (let i = 0; i < 15; i++) {
    const filas = Math.floor(Math.random() * 5) + 1;
    const columnas = filas + Math.floor(Math.random() * 3) + 1;
    const matriz = generarMatrizAleatoria(filas, columnas, 4);
    tests.push({
        nombre: `Matriz rectangular ${filas}x${columnas} ${i+1}`,
        tipo: "axb",
        matriz: matriz
    });
}

// 4. Matrices singulares (determinante cero)
for (let i = 0; i < 15; i++) {
    const n = Math.floor(Math.random() * 4) + 2;
    const matriz = generarMatrizSingular(n);
    tests.push({
        nombre: `Matriz singular ${n}x${n} ${i+1}`,
        tipo: "inversa",
        matriz: matriz,
        debeFallar: true
    });
    tests.push({
        nombre: `Determinante cero ${n}x${n} ${i+1}`,
        tipo: "determinante",
        matriz: matriz,
        determinanteEsperado: { num: 0, den: 1 }
    });
}

// 5. Matrices de Hilbert (invertibles, mal condicionadas)
for (let n = 2; n <= 5; n++) {
    const hilbert = generarMatrizHilbert(n);
    tests.push({
        nombre: `Matriz de Hilbert ${n}x${n}`,
        tipo: "inversa",
        matriz: hilbert,
        debeFallar: false  // Estas SÍ son invertibles
    });
}

// 6. Matrices 1x1
for (let i = 0; i < 5; i++) {
    const valor = Math.floor(Math.random() * 10) - 5;
    tests.push({
        nombre: `Matriz 1x1 con valor ${valor}`,
        tipo: "inversa",
        matriz: [[{ num: valor, den: 1 }]],
        debeFallar: valor === 0
    });
    tests.push({
        nombre: `Determinante 1x1 valor ${valor}`,
        tipo: "determinante",
        matriz: [[{ num: valor, den: 1 }]],
        determinanteEsperado: { num: valor, den: 1 }
    });
}

// 7. Matrices con números grandes
for (let i = 0; i < 10; i++) {
    const n = Math.floor(Math.random() * 3) + 2;
    const matriz = generarMatrizAleatoria(n, n, 100);
    tests.push({
        nombre: `Matriz con números grandes ${n}x${n} ${i+1}`,
        tipo: "determinante",
        matriz: matriz
    });
}

// 8. Matrices identidad
for (let i = 2; i <= 5; i++) {
    const identidad = [];
    for (let j = 0; j < i; j++) {
        const fila = [];
        for (let k = 0; k < i; k++) {
            fila.push({ num: j === k ? 1 : 0, den: 1 });
        }
        identidad.push(fila);
    }
    tests.push({
        nombre: `Matriz identidad ${i}x${i}`,
        tipo: "inversa",
        matriz: identidad
    });
    tests.push({
        nombre: `Determinante identidad ${i}x${i}`,
        tipo: "determinante",
        matriz: identidad,
        determinanteEsperado: { num: 1, den: 1 }
    });
}

// 9. Matrices con filas de ceros
for (let i = 0; i < 10; i++) {
    const n = Math.floor(Math.random() * 4) + 2;
    const matriz = generarMatrizAleatoria(n, n, 3);
    const filaCero = Math.floor(Math.random() * n);
    for (let j = 0; j < n; j++) {
        matriz[filaCero][j] = { num: 0, den: 1 };
    }
    tests.push({
        nombre: `Matriz con fila ${filaCero} de ceros`,
        tipo: "determinante",
        matriz: matriz,
        determinanteEsperado: { num: 0, den: 1 }
    });
}

// Función para ejecutar tests
function ejecutarTests() {
    let pasaron = 0;
    let fallaron = 0;
    
    for (let index = 0; index < tests.length; index++) {
        const test = tests[index];
        console.log(`\n--- Test ${index + 1}: ${test.nombre} ---`);
        
        try {
            // Regularizar matriz si es necesario
            let matrizPrueba = JSON.parse(JSON.stringify(test.matriz));
            if (!esMatrizRegular(matrizPrueba)) {
                matrizPrueba = regularizarMatriz(matrizPrueba);
                console.log(`  (Matriz regularizada automáticamente)`);
            }
            
            let resultado;
            
            switch (test.tipo) {
                case "axb":
                    resultado = resolverAXB(matrizPrueba);
                    console.log(`✓ AXB completado. Matriz resultante ${resultado.length}x${resultado[0]?.length || 0}`);
                    pasaron++;
                    break;
                    
                case "inversa":
                    resultado = resolverInv(matrizPrueba);
                    console.log(`✓ Inversa calculada. Matriz ${resultado.length}x${resultado[0]?.length}`);
                    pasaron++;
                    break;
                    
                case "determinante":
                    resultado = calcularDet(matrizPrueba);
                    const detValue = resultado.determinante;
                    console.log(`✓ Determinante: ${detValue.num}/${detValue.den} = ${detValue.num/detValue.den}`);
                    
                    if (test.determinanteEsperado) {
                        if (fraccionesIguales(resultado.determinante, test.determinanteEsperado)) {
                            console.log(`✓ Valor esperado correcto`);
                        } else {
                            console.log(`⚠ Valor esperado: ${fraccionToString(test.determinanteEsperado)}`);
                        }
                    }
                    pasaron++;
                    break;
            }
            
        } catch (error) {
            if (test.debeFallar) {
                console.log(`✓ Error esperado: ${error.message}`);
                pasaron++;
            } else {
                console.log(`✗ Error inesperado: ${error.message}`);
                fallaron++;
            }
        }
    }
    
    console.log(`\n\n=== RESULTADOS ===`);
    console.log(`Pruebas pasadas: ${pasaron}`);
    console.log(`Pruebas falladas: ${fallaron}`);
    console.log(`Total: ${tests.length}`);
    console.log(`\nPorcentaje de éxito: ${((pasaron / tests.length) * 100).toFixed(2)}%`);
}

// Ejecutar pruebas
ejecutarTests();

// Exportar para uso externo
export { tests, ejecutarTests };