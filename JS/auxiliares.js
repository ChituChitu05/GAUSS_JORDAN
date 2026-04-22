// MCD 
function mcd(a, b) {
    a = a < 0 ? -a : a;
    b = b < 0 ? -b : b;
    return b === 0 ? a : mcd(b, a % b);
}

// Simplificar fracción
export function simplificar(num, den) {
    const divisor = mcd(num, den);
    let numSimp = num / divisor;
    let denSimp = den / divisor;

    if (denSimp < 0) {
        numSimp = -numSimp;
        denSimp = -denSimp;
    }
    
    return [numSimp, denSimp];
}

// Convertir string "a/b", "a/", "/b", "a" a {num, den}
export function parsearFraccion(valor) {
    if (valor === "" || valor === null || valor === undefined) {
        return { num: 0, den: 1 };
    }
    
    const str = String(valor).trim();
    
    // Si no tiene "/", es entero
    if (!str.includes("/")) {
        const num = Number(str);
        if (isNaN(num)) return { num: 0, den: 1 };
        return { num, den: 1 };
    }
    
    let [numStr, denStr] = str.split("/");
    
    // Caso "6/" -> denominador 1
    if (denStr === "" || denStr === undefined) {
        const num = Number(numStr);
        if (isNaN(num)) return { num: 0, den: 1 };
        return { num, den: 1 };
    }
    
    // Caso "/5" -> numerador 1
    if (numStr === "") {
        const den = Number(denStr);
        if (den === 0) throw new Error("Denominador cero");
        if (isNaN(den)) return { num: 0, den: 1 };
        return { num: 1, den };
    }
    
    const num = Number(numStr);
    const den = Number(denStr);
    
    if (isNaN(num) || isNaN(den)) return { num: 0, den: 1 };
    if (den === 0) throw new Error("Denominador cero");
    
    return { num, den };
}

// Multiplicar dos fracciones
export function multiplicarFracciones(frac1, frac2) {
    const num = frac1.num * frac2.num;
    const den = frac1.den * frac2.den;
    const [numSimp, denSimp] = simplificar(num, den);
    return { num: numSimp, den: denSimp };
}

// Sumar dos fracciones
export function sumarFraccionesObj(frac1, frac2) {
    const num = frac1.num * frac2.den + frac2.num * frac1.den;
    const den = frac1.den * frac2.den;
    const [numSimp, denSimp] = simplificar(num, den);
    return { num: numSimp, den: denSimp };
}

// Restar fracciones (para hacer ceros)
export function restarFracciones(frac1, frac2) {
    const num = frac1.num * frac2.den - frac2.num * frac1.den;
    const den = frac1.den * frac2.den;
    const [numSimp, denSimp] = simplificar(num, den);
    return { num: numSimp, den: denSimp };
}

// Dividir fracciones (para normalizar pivote)
export function dividirFracciones(frac1, frac2) {
    if (frac2.num === 0) throw new Error("División por cero");
    const num = frac1.num * frac2.den;
    const den = frac1.den * frac2.num;
    const [numSimp, denSimp] = simplificar(num, den);
    return { num: numSimp, den: denSimp };
}

// Fracción a string para mostrar
export function fraccionToString(frac) {
    if (frac.den === 1) return `${frac.num}`;
    if (frac.num === 0) return "0";
    return `${frac.num}/${frac.den}`;
}

// Comparar con cero
export function esCero(frac) {
    return frac.num === 0;
}

// Parsear matriz desde DOM a array de números 2D
export function parsearMatriz(table) {
    return Array.from(table.rows).map(row =>
        Array.from(row.cells).map(cell => {
            const input = cell.querySelector("input");
            const valor = input ? input.value : cell.textContent.trim();
            
            try {
                const frac = parsearFraccion(valor);
                // Simplificar
                const [num, den] = simplificar(frac.num, frac.den);
                return { num, den };
            } catch (e) {
                alert(`Error: ${e.message} en celda con valor "${valor}"`);
                throw e;
            }
        })
    );
}

//Agregar fila
export function agregarFila(table) {
    if (table.rows.length === 0) return;

    const newRow = table.insertRow(-1);
    const numCols = table.rows[0].cells.length;

    let firstInput = null;

    for (let i = 0; i < numCols; i++) {
        const newCell = newRow.insertCell(i);
        const input = document.createElement("input");
        input.type = "text";

        if (i === 0) firstInput = input;

        newCell.appendChild(input);
    }

    firstInput.focus();
}

//Agregar columna
export function agregarColumna(table) {
    const numRows = table.rows.length;

    let firstInput = null;

    for (let i = 0; i < numRows; i++) {
        const newCell = table.rows[i].insertCell(-1);
        const input = document.createElement("input");
        input.type = "text";

        if (i === 0) firstInput = input;

        newCell.appendChild(input);
    }

    firstInput.focus();
}
//Eliminar fila
export function eliminarFila(table, rowIndex) {
    if (table.rows[rowIndex]) {
        table.deleteRow(rowIndex);
    }
}

//Eliminar columna
export function eliminarColumna(table, colIndex) {
    for (let i = 0; i < table.rows.length; i++) {
        if (table.rows[i].cells[colIndex]) {
            table.rows[i].deleteCell(colIndex);
        }
    }
}

export function filaVacia(table, rowIndex) {
    return Array.from(table.rows[rowIndex].cells).every(cell => {
        const input = cell.querySelector("input");
        return !input || input.value.trim() === "";
    });
}

export function columnaVacia(table, colIndex) {
    return Array.from(table.rows).every(row => {
        const cell = row.cells[colIndex];
        const input = cell.querySelector("input");
        return !input || input.value.trim() === "";
    });
}

//Insertar fila en posición
export function insertarFila(table, rowIndex) {
    const numCols = table.rows[0].cells.length;
    const newRow = table.insertRow(rowIndex);

    let firstInput = null;

    for (let i = 0; i < numCols; i++) {
        const cell = newRow.insertCell(i);
        const input = document.createElement("input");
        input.type = "text";

        if (i === 0) firstInput = input;

        cell.appendChild(input);
    }

    firstInput.focus();
}

//Insertar columna en posición
export function insertarColumna(table, colIndex) {
    let firstInput = null;

    for (let i = 0; i < table.rows.length; i++) {
        const cell = table.rows[i].insertCell(colIndex);
        const input = document.createElement("input");
        input.type = "text";

        if (i === 0) firstInput = input;

        cell.appendChild(input);
    }

    firstInput.focus();
}

export function normalizarSigno(frac) {
    if (frac.den < 0) {
        return { num: -frac.num, den: -frac.den };
    }
    return { num: frac.num, den: frac.den };
}

const auxiliares = {
    parsearFraccion,
    multiplicarFracciones,
    sumarFraccionesObj,
    restarFracciones,
    dividirFracciones,
    fraccionToString,
    esCero,
    parsearMatriz,
    agregarFila,
    agregarColumna,
    eliminarFila,
    eliminarColumna,
    filaVacia,
    columnaVacia,
    insertarFila,
    insertarColumna,
    normalizarSigno
};

export default auxiliares;