import UI, { createSection } from "./ui.js";
import { parsearMatriz, fraccionToString } from "./auxiliares.js";
import Auxiliares from "./auxiliares.js";
import { resolverAXB, resolverInv, calcularDet } from "./calculos.js";

let currentOperation = "axb"; // Puede ser "axb", "inversa" o "determinante"
let currentMatrixState = null; // Guardar estado de la matriz
let keydownHandler = null;
let inputHandler = null;

export function inicializarMatriz(article, modo) {
    currentOperation = modo;
    limpiar(article);

    const mainSection = UI.createSection("mainSection", "MATRIZ");
    const wrapper = UI.createDiv("wrapperA");
    const label = UI.createLabel("A=");
    const divTable = UI.createDiv("tableMain");
    const table = UI.createTable("inputTable");

    // Determinar dimensiones iniciales según el modo
    let [filasIniciales, columnasIniciales] = [2, 2]; // Por defecto cuadrada para inversa y determinante

    if (modo === "axb") {
        [filasIniciales, columnasIniciales] = [2, 3];
        table.dataset.minRows = "2";
        table.dataset.minCols = "3";
    } else if (modo === "inversa") {
        [filasIniciales, columnasIniciales] = [2, 2];
        table.dataset.minRows = "1";
        table.dataset.minCols = "1";
    } else if (modo === "determinante") {
        [filasIniciales, columnasIniciales] = [2, 2];
        table.dataset.minRows = "1";
        table.dataset.minCols = "1";
    }

    for (let i = 0; i < filasIniciales; i++) {
        const row = UI.createRow(`row${i}`);
        for (let j = 0; j < columnasIniciales; j++) {
            const cell = UI.createTd(`cell${i}${j}`);
            const input = UI.createInput(`input${i}${j}`);
            cell.appendChild(input);
            row.appendChild(cell);
        }
        table.appendChild(row);
    }

    divTable.appendChild(table);
    wrapper.appendChild(label);
    wrapper.appendChild(divTable);

    let buttonText = "";
    if (modo === "axb") buttonText = "Calcular AX = B";
    else if (modo === "inversa") buttonText = "Calcular Inversa";
    else if (modo === "determinante") buttonText = "Calcular Determinante";

    const button = UI.createButton("btnCalcular", buttonText, "btnCalcular");

    mainSection.appendChild(wrapper);
    mainSection.appendChild(button);
    article.appendChild(mainSection);

    configurarEventos(article, table);

    if (modo === "axb") actualizarSeparador(table);

    if (modo === "axb") {
        document.getElementById("btnCalcular").onclick = calcularSistemasEcuaciones;
    } else if (modo === "inversa") {
        document.getElementById("btnCalcular").onclick = calcularInversa;
    } else if (modo === "determinante") {
        document.getElementById("btnCalcular").onclick = calcularDeterminante;
    }
}

export function cambiarModo(article, nuevoModo) {
    const table = document.getElementById("inputTable");

    // Guardar matriz actual antes de cambiar
    if (table) {
        try {
            currentMatrixState = parsearMatriz(table);
        } catch (error) {
            console.warn("No se pudo guardar el estado de la matriz:", error);
            currentMatrixState = null;
        }
    }

    if (!table) {
        inicializarMatriz(article, nuevoModo);
        return;
    }

    currentOperation = nuevoModo;

    const btn = document.getElementById("btnCalcular");

    if (nuevoModo === "axb") {
        btn.textContent = "Calcular AX = B";
        btn.onclick = calcularSistemasEcuaciones;
        table.dataset.minRows = "2";
        table.dataset.minCols = "3";
        actualizarSeparador(table);
    } else if (nuevoModo === "inversa") {
        btn.textContent = "Calcular Inversa";
        btn.onclick = calcularInversa;
        table.dataset.minRows = "1";
        table.dataset.minCols = "1";
        eliminarSeparador(table);
    } else if (nuevoModo === "determinante") {
        btn.textContent = "Calcular Determinante";
        btn.onclick = calcularDeterminante;
        table.dataset.minRows = "1";
        table.dataset.minCols = "1";
        eliminarSeparador(table);
    }
}

function eliminarSeparador(table) {
    if (!table) return;
    for (let row of table.rows) {
        for (let cell of row.cells) {
            cell.style.borderRight = "";
            cell.classList.remove("separator");
        }
    }
}

function limpiar(article) {
    while (article.firstChild) article.removeChild(article.firstChild);
}

function limpiarResultados() {
    const prev = document.getElementById("resultSection");
    if (prev) prev.remove();
}

function mostrarError(container, mensaje) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.style.cssText = "padding: 10px; background-color: #f8d7da; color: #721c24; border-radius: 5px; margin-top: 20px;";
    errorDiv.innerHTML = `<strong>Error:</strong> ${mensaje}`;
    container.appendChild(errorDiv);
}

function configurarEventos(article, table) {
    // Remover event listeners anteriores
    if (keydownHandler) {
        article.removeEventListener('keydown', keydownHandler);
    }
    if (inputHandler) {
        article.removeEventListener('input', inputHandler);
    }

    // Crear nuevos handlers
    keydownHandler = (e) => manejarKeydown(e, table);
    inputHandler = manejarInput;

    // Agregar event listeners
    article.addEventListener('keydown', keydownHandler);
    article.addEventListener('input', inputHandler);
}

function manejarInput(e) {
    const input = e.target;
    if (input.tagName !== 'INPUT') return;
    const valor = input.value;
    if (valor === "") return;

    // Validación más estricta: números enteros, fracciones simples o negativos
    const regex = /^-?\d*\/?\d*$/;
    if (!regex.test(valor)) {
        input.value = valor.slice(0, -1);
        return;
    }

    // Prevenir múltiples signos negativos
    const negativos = (valor.match(/-/g) || []).length;
    if (negativos > 1 || (negativos === 1 && valor.indexOf('-') !== 0)) {
        input.value = valor.replace(/-/g, '');
        return;
    }

    // Prevenir múltiples barras
    if ((valor.match(/\//g) || []).length > 1) {
        input.value = valor.slice(0, -1);
    }
}

function manejarKeydown(e, table) {
    const input = e.target;
    if (input.tagName !== 'INPUT') return;

    // Atajo Ctrl+Enter para calcular
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const btn = document.getElementById("btnCalcular");
        if (btn) btn.click();
        return;
    }

    const cell = input.closest('td');
    if (!cell) return;

    const row = cell.parentElement;
    const rowIndex = row.rowIndex;
    const colIndex = cell.cellIndex;

    // Navegación con flechas
    let targetInput = null;

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (colIndex > 0) {
            targetInput = row.cells[colIndex - 1]?.querySelector("input");
        }
    }

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (colIndex < row.cells.length - 1) {
            targetInput = row.cells[colIndex + 1]?.querySelector("input");
        }
    }

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (rowIndex > 0) {
            targetInput = table.rows[rowIndex - 1]?.cells[colIndex]?.querySelector("input");
        }
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (rowIndex < table.rows.length - 1) {
            targetInput = table.rows[rowIndex + 1]?.cells[colIndex]?.querySelector("input");
        }
    }

    if (targetInput) {
        targetInput.focus();
        targetInput.select();
        return;
    }

    estructura(e, table, input, row, rowIndex, colIndex);
}

function estructura(e, table, input, row, rowIndex, colIndex) {
    const minRows = parseInt(table.dataset.minRows) || 1;
    const minCols = parseInt(table.dataset.minCols) || 1;

    // INSERTAR FILA
    if (e.key === 'Enter') {
        e.preventDefault();
        Auxiliares.insertarFila(table, rowIndex + 1);
        if (currentOperation === "axb") {
            requestAnimationFrame(() => actualizarSeparador(table));
        }

        // Mover foco a la nueva fila
        setTimeout(() => {
            const newRow = table.rows[rowIndex + 1];
            const firstInput = newRow?.cells[colIndex]?.querySelector("input");
            if (firstInput) {
                firstInput.focus();
                firstInput.select();
            }
        }, 10);
        return;
    }

    // INSERTAR COLUMNA
    if (e.key === ' ') {
        e.preventDefault();
        Auxiliares.insertarColumna(table, colIndex + 1);
        if (currentOperation === "axb") {
            actualizarSeparador(table);
        }

        // Mover foco a la nueva columna
        setTimeout(() => {
            const newInput = row.cells[colIndex + 1]?.querySelector("input");
            if (newInput) {
                newInput.focus();
                newInput.select();
            }
        }, 10);
        return;
    }

    // BACKSPACE
    if (e.key === 'Backspace') {
        if (input.value === "") {
            e.preventDefault();

            let prevInput = null;
            if (colIndex > 0) {
                prevInput = row.cells[colIndex - 1]?.querySelector("input");
            } else if (rowIndex > 0) {
                const prevRow = table.rows[rowIndex - 1];
                prevInput = prevRow?.cells[prevRow.cells.length - 1]?.querySelector("input");
            }

            if (prevInput) {
                prevInput.focus();
                prevInput.select();
            }

            setTimeout(() => {
                // Eliminar fila vacía
                if (table.rows.length > minRows && Auxiliares.filaVacia(table, rowIndex)) {
                    Auxiliares.eliminarFila(table, rowIndex);
                    if (currentOperation === "axb") actualizarSeparador(table);
                    return;
                }

                // Eliminar columna vacía
                if (table.rows[0].cells.length > minCols && Auxiliares.columnaVacia(table, colIndex)) {
                    Auxiliares.eliminarColumna(table, colIndex);
                    if (currentOperation === "axb") actualizarSeparador(table);
                }
            }, 0);
        }
    }
}

function actualizarSeparador(table) {
    if (!table || !table.rows.length) return;

    eliminarSeparador(table);
    const sep = table.rows[0].cells.length - 2;

    if (sep >= 0) {
        requestAnimationFrame(() => {
            for (let row of table.rows) {
                const cell = row.cells[sep];
                if (cell) {
                    cell.style.borderRight = "2px solid var(--primary)";
                    cell.classList.add("separator");
                }
            }
        });
    }
}
function crearFraccionHTML(valor) {
    const str = fraccionToString(valor);

    if (!str.includes("/")) return str;

    const [num, den] = str.split("/");

    return `
        <span class="frac">
            <span class="top">${num}</span>
            <span class="bottom">${den}</span>
        </span>
    `;
}
// RESULTADOS 
function calcularSistemasEcuaciones() {
    limpiarResultados();

    const result = UI.createSection("resultSection", "RESULTADO AX = B");
    const article = document.getElementById("article");
    const table = document.getElementById("inputTable");

    try {
        const inputs = table.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.value.trim() === '') {
                input.value = '0';
            }
        });

        const matriz = parsearMatriz(table);
        const resultado = resolverAXB(matriz);

        const wrapper = document.createElement("div");
        wrapper.className = "result-wrapper";

        const label = document.createElement("div");
        label.className = "result-label";
        label.textContent = "A =";

        const matrixContainer = document.createElement("div");
        matrixContainer.className = "result-matrix-container";

        const resultadoTable = UI.createTable("resultadoTable");
        resultadoTable.className = "result-table";

        const tieneVectorColumna = resultado[0] && resultado[0].length > 1;

        resultado.forEach((fila) => {
            const row = UI.createRow();
            fila.forEach((valor, colIndex) => {
                const cell = UI.createTd();
                cell.innerHTML = crearFraccionHTML(valor);
                if (tieneVectorColumna && colIndex === fila.length - 2) {
                    cell.classList.add("separator-col");
                }
                row.appendChild(cell);
            });
            resultadoTable.appendChild(row);
        });

        if (tieneVectorColumna) {
            resultadoTable.classList.add("separator-mode");
        }

        matrixContainer.appendChild(resultadoTable);
        wrapper.appendChild(label);
        wrapper.appendChild(matrixContainer);
        result.appendChild(wrapper);
        article.appendChild(result);
    } catch (error) {
        mostrarError(result, error.message);
        article.appendChild(result);
    }
}

function calcularInversa() {
    limpiarResultados();

    const result = UI.createSection("resultSection", "RESULTADO INVERSA");
    const article = document.getElementById("article");
    const table = document.getElementById("inputTable");

    try {
        const inputs = table.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.value.trim() === '') {
                input.value = '0';
            }
        });

        const matriz = parsearMatriz(table);
        const n = matriz.length;
        const esCuadrada = matriz.every(fila => fila.length === n);

        if (!esCuadrada) {
            throw new Error("La matriz debe ser cuadrada para calcular su inversa");
        }

        const resultado = resolverInv(matriz);

        const wrapper = document.createElement("div");
        wrapper.className = "result-wrapper";

        const label = document.createElement("div");
        label.className = "result-label";
        label.textContent = "A⁻¹ =";

        const matrixContainer = document.createElement("div");
        matrixContainer.className = "result-matrix-container";

        const resultadoTable = UI.createTable("resultadoTable");
        resultadoTable.className = "result-table";

        resultado.forEach(fila => {
            const row = UI.createRow();
            fila.forEach(valor => {
                const cell = UI.createTd();
                cell.innerHTML = crearFraccionHTML(valor);
                row.appendChild(cell);
            });
            resultadoTable.appendChild(row);
        });

        matrixContainer.appendChild(resultadoTable);
        wrapper.appendChild(label);
        wrapper.appendChild(matrixContainer);
        result.appendChild(wrapper);
        article.appendChild(result);

    } catch (error) {
        mostrarError(result, error.message);
        article.appendChild(result);
    }
}

function calcularDeterminante() {
    limpiarResultados();

    const result = UI.createSection("resultSection", "RESULTADO DETERMINANTE");
    const article = document.getElementById("article");
    const table = document.getElementById("inputTable");

    try {
        const inputs = table.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.value.trim() === '') input.value = '0';
        });

        const matriz = parsearMatriz(table);
        const resultado = calcularDet(matriz);

        const factoresStr = resultado.historialFactores
            .map(f => f === -1 ? "(-1)" : `(${fraccionToString(f)})`)
            .join("");

        const wrapper = document.createElement("div");
        wrapper.className = "result-wrapper";

        const label = document.createElement("div");
        label.className = "result-label";
        label.innerHTML = "det(A) =";

  
        const container = document.createElement("div");
        container.className = "det-container";

        const content = document.createElement("div");
        content.className = "det-content";


        const step1 = document.createElement("div");
        step1.className = "det-step";

        const factores = document.createElement("span");
        factores.className = "det-factores";
        factores.innerHTML = factoresStr;

        const mult = document.createElement("span");
        mult.className = "det-mult";
        mult.textContent = " ";

        const matrixWrapper = document.createElement("div");
        matrixWrapper.className = "det-matrix-wrapper";

        const tableMatrix = UI.createTable();
        tableMatrix.className = "result-table det-matrix";

        resultado.matrizFinal.forEach((fila, i) => {
            const row = UI.createRow();
            fila.forEach((valor, j) => {
                const cell = UI.createTd();
                cell.innerHTML = crearFraccionHTML(valor);
                if (i === j) cell.classList.add("diagonal-cell");
                row.appendChild(cell);
            });
            tableMatrix.appendChild(row);
        });

        matrixWrapper.appendChild(tableMatrix);
        step1.append(factores, mult, matrixWrapper);
        const equal = document.createElement("span");
        equal.className = "det-equal";
        equal.textContent = "=";

        const value = document.createElement("span");
        value.className = "det-result-value";
        value.innerHTML = crearFraccionHTML(resultado.determinante);

        content.append(step1, equal, value);
        container.appendChild(content);

        wrapper.append(label, container);
        result.appendChild(wrapper);
        article.appendChild(result);
        console.log("Resultado del determinante:", resultado);
    } catch (error) {
        mostrarError(result, error.message);
        article.appendChild(result);
    }
}