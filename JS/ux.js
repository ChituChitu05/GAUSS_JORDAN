import UI, { createSection } from "./ui.js";
import { parsearMatriz, fraccionToString, esFraccion, simplificar, tieneDecimales, formatearResultado } from "./auxiliares.js";
import Auxiliares from "./auxiliares.js";
import { resolverAXB, resolverInv, calcularDet } from "./calculos.js";

let currentOperation = "axb";
let currentMatrixState = null;
let keydownHandler = null;
let inputHandler = null;
let clickHandler = null;

export function inicializarMatriz(article, modo) {
    currentOperation = modo;
    limpiar(article);

    const mainSection = UI.createSection("mainSection", "MATRIZ");
    const wrapper = UI.createDiv("wrapperA");
    const label = UI.createLabel("A=");
    const divTable = UI.createDiv("tableMain");
    const table = UI.createTable("inputTable");

    let [filasIniciales, columnasIniciales] = [2, 2];

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

    // Crear tabla con spans vacíos inicialmente
    for (let i = 0; i < filasIniciales; i++) {
        const row = UI.createRow(`row${i}`);
        for (let j = 0; j < columnasIniciales; j++) {
            const cell = UI.createTd(`cell${i}${j}`);
            const span = crearSpanCelda("", i, j);
            cell.appendChild(span);
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

// ========== FUNCIONES AUXILIARES PARA CREAR ELEMENTOS ==========

function crearSpanCelda(value, row, col) {
    const span = document.createElement("span");
    span.className = "cell-span";
    span.setAttribute("data-row", row);
    span.setAttribute("data-col", col);
    span.tabIndex = 0;

    if (value && esFraccion(value)) {
        // Verificar si tiene decimales
        if (tieneDecimales(value)) {
            // NO simplificar si tiene decimales
            const [num, den] = value.split("/");
            span.setAttribute('data-value', value);
            span.innerHTML = `
                <span class="frac">
                    <span class="top">${num}</span>
                    <span class="bottom">${den}</span>
                </span>
            `;
        } else {
            // Simplificar solo si NO tiene decimales
            const fraccion = Auxiliares.parsearFraccion(value);
            const [numSimp, denSimp] = Auxiliares.simplificar(fraccion.num, fraccion.den);

            const valorSimplificado = denSimp === 1 ? `${numSimp}` : `${numSimp}/${denSimp}`;
            span.setAttribute('data-value', valorSimplificado);

            if (denSimp === 1) {
                span.textContent = numSimp;
            } else {
                span.innerHTML = `
                    <span class="frac">
                        <span class="top">${numSimp}</span>
                        <span class="bottom">${denSimp}</span>
                    </span>
                `;
            }
        }
    } else {
        span.setAttribute('data-value', value || "");
        span.textContent = value || "";
    }

    return span;
}

function crearInputCelda(value, row, col) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "cell-input";
    input.value = value || "";
    input.setAttribute("data-row", row);
    input.setAttribute("data-col", col);
    return input;
}

function spanToInput(span) {
    if (!span || !span.classList.contains('cell-span')) return null;

    const row = parseInt(span.getAttribute('data-row'));
    const col = parseInt(span.getAttribute('data-col'));
    const value = span.getAttribute('data-value') || '';

    const input = crearInputCelda(value, row, col);
    span.replaceWith(input);

    input.focus();
    const length = input.value.length;
    input.setSelectionRange(length, length);

    return input;
}
function inputToSpan(input) {
    if (!input || input.tagName !== 'INPUT' || !input.classList.contains('cell-input')) return null;

    const row = parseInt(input.getAttribute('data-row'));
    const col = parseInt(input.getAttribute('data-col'));
    const value = input.value.trim();

    // Simplificar solo si es fracción SIN decimales
    let finalValue = value;
    if (value && esFraccion(value) && !tieneDecimales(value)) {
        const fraccion = Auxiliares.parsearFraccion(value);
        const [numSimp, denSimp] = Auxiliares.simplificar(fraccion.num, fraccion.den);
        finalValue = denSimp === 1 ? `${numSimp}` : `${numSimp}/${denSimp}`;
    }

    const span = crearSpanCelda(finalValue, row, col);
    input.replaceWith(span);

    return span;
}
function focusCell(row, col, table) {
    if (row < 0 || col < 0 || row >= table.rows.length) return false;
    if (col >= table.rows[row].cells.length) return false;

    const cell = table.rows[row].cells[col];
    if (!cell) return false;

    const span = cell.querySelector('.cell-span');
    const input = cell.querySelector('.cell-input');

    if (span) {
        return !!spanToInput(span);
    } else if (input) {
        input.focus();
        input.select();
        return true;
    }

    return false;
}

// ========== CAMBIO DE MODO ==========

export function cambiarModo(article, nuevoModo) {
    const table = document.getElementById("inputTable");

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

// ========== FUNCIONES DE LIMPIEZA ==========

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

// ========== CONFIGURACIÓN DE EVENTOS ==========

function configurarEventos(article, table) {
    if (keydownHandler) {
        article.removeEventListener('keydown', keydownHandler);
    }
    if (inputHandler) {
        article.removeEventListener('input', inputHandler);
    }
    if (clickHandler) {
        article.removeEventListener('click', clickHandler);
    }

    keydownHandler = (e) => manejarKeydown(e, table);
    inputHandler = manejarInput;
    clickHandler = (e) => manejarClick(e, table);

    article.addEventListener('keydown', keydownHandler);
    article.addEventListener('input', inputHandler);
    article.addEventListener('click', clickHandler);

    // Convertir input a span cuando pierde el foco
    article.addEventListener('focusout', (e) => {
        const target = e.target;
        if (target.classList.contains('cell-input')) {
            setTimeout(() => {
                const activeElement = document.activeElement;
                if (!activeElement || !activeElement.closest('#inputTable')) {
                    inputToSpan(target);
                }
            }, 100);
        }
    });
}

// ========== MANEJADORES DE EVENTOS ==========

function manejarClick(e, table) {
    const target = e.target;

    // Convertir cualquier input existente a span (excepto el que se está clickeando)
    const allInputs = table.querySelectorAll('.cell-input');
    allInputs.forEach(input => {
        const inputCell = input.closest('td');
        const clickedCell = target.closest('td');

        if (inputCell !== clickedCell) {
            inputToSpan(input);
        }
    });

    // Si es un span de celda
    if (target.classList.contains('cell-span')) {
        e.preventDefault();
        e.stopPropagation();
        spanToInput(target);
        return;
    }

    // Si es una fracción dentro de un span
    if (target.closest('.frac') && target.closest('.cell-span')) {
        const span = target.closest('.cell-span');
        e.preventDefault();
        e.stopPropagation();
        spanToInput(span);
        return;
    }

    // Si es un td que contiene un span
    if (target.tagName === 'TD') {
        const span = target.querySelector('.cell-span');
        if (span) {
            e.preventDefault();
            spanToInput(span);
            return;
        }
    }
}

function manejarInput(e) {
    const input = e.target;
    if (input.tagName !== 'INPUT' || !input.classList.contains('cell-input')) return;

    let valor = input.value;
    if (valor === "") return;

    // 1. Auto-corregir .x → 0.x (punto al inicio)
    if (/^\.\d/.test(valor)) {
        input.value = '0' + valor;
        return;
    }

    // 2. Auto-corregir -.x → -0.x (menos punto al inicio)
    if (/^-\.\d/.test(valor)) {
        input.value = '-0' + valor.substring(1);
        return;
    }


    if (/\/(\.\d)/.test(valor)) {
        const partes = valor.split('/');
        if (partes[1] && partes[1].startsWith('.')) {
            input.value = partes[0] + '/0.' + partes[1].substring(1);
            return;
        }
    }
    
    // 4. Auto-corregir x/-. → x/-0. (barra, menos, punto)
    if (/\/(-\.\d)/.test(valor)) {
        const partes = valor.split('/');
        if (partes[1] && partes[1].startsWith('-.')) {
            input.value = partes[0] + '/-0' + partes[1].substring(2);
            return;
        }
    }

    // 5. Rechazar puntos seguidos de barra (./)
    if (valor.includes('./')) {
        input.value = valor.slice(0, -1);
        return;
    }



    const partes = valor.split('/');

    // 7. No permitir más de una barra
    if (partes.length > 2) {
        input.value = valor.slice(0, -1);
        return;
    }

    // 8. Validar decimales
    if (partes.length === 2) {
        const izquierda = partes[0];
        const derecha = partes[1];

        if ((izquierda.match(/\./g) || []).length > 1) {
            input.value = valor.slice(0, -1);
            return;
        }

        if ((derecha.match(/\./g) || []).length > 1) {
            input.value = valor.slice(0, -1);
            return;
        }
    } else {
        if ((valor.match(/\./g) || []).length > 1) {
            input.value = valor.slice(0, -1);
            return;
        }
    }

    // 9. Validar formato general
    const regex = /^-?\d*\.?\d*\/?\d*\.?\d*$/;
    if (!regex.test(valor)) {
        input.value = valor.slice(0, -1);
        return;
    }

    // 10. Validar signos negativos
    const negativos = (valor.match(/-/g) || []).length;
    if (negativos > 2 || (negativos === 2 && !/^-?\d*\.?\d*\/-?\d*\.?\d*$/.test(valor))) {
        input.value = valor.replace(/-/g, '');
        return;
    }
    if (negativos === 1 && valor.indexOf('-') !== 0 && !valor.includes('/-')) {
        input.value = valor.replace(/-/g, '');
        return;
    }
}

function manejarKeydown(e, table) {
    const target = e.target;

    // Si es un span de celda
    if (target.classList.contains('cell-span')) {
        manejarKeydownSpan(e, table, target);
        return;
    }

    // Si no es input de celda, ignorar
    if (target.tagName !== 'INPUT' || !target.classList.contains('cell-input')) return;

    // Atajo Ctrl+Enter para calcular
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const btn = document.getElementById("btnCalcular");
        if (btn) btn.click();
        return;
    }

    const input = target;
    const cell = input.closest('td');
    if (!cell) return;

    const row = cell.parentElement;
    const rowIndex = row.rowIndex;
    const colIndex = cell.cellIndex;
    const value = input.value.trim();

    // Tab: convertir a span y mover al siguiente
    if (e.key === 'Tab') {
        e.preventDefault();
        inputToSpan(input);
        if (colIndex < row.cells.length - 1) {
            focusCell(rowIndex, colIndex + 1, table);
        } else if (rowIndex < table.rows.length - 1) {
            focusCell(rowIndex + 1, 0, table);
        } else {
            const btn = document.getElementById("btnCalcular");
            if (btn) btn.focus();
        }
        return;
    }

    // Escape: convertir a span y salir
    if (e.key === 'Escape') {
        e.preventDefault();
        inputToSpan(input);
        input.blur();
        return;
    }

    // Navegación con flechas
    if (e.key === 'ArrowLeft') {
        if (input.selectionStart === 0 && input.selectionEnd === 0) {
            e.preventDefault();
            if (value) {
                inputToSpan(input);
            }
            if (colIndex > 0) {
                focusCell(rowIndex, colIndex - 1, table);
            }
        }
        return;
    }

    if (e.key === 'ArrowRight') {
        if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
            e.preventDefault();
            if (value) {
                inputToSpan(input);
            }
            if (colIndex < row.cells.length - 1) {
                focusCell(rowIndex, colIndex + 1, table);
            }
        }
        return;
    }

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (value) {
            inputToSpan(input);
        }
        if (rowIndex > 0) {
            focusCell(rowIndex - 1, colIndex, table);
        }
        return;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (value) {
            inputToSpan(input);
        }
        if (rowIndex < table.rows.length - 1) {
            focusCell(rowIndex + 1, colIndex, table);
        }
        return;
    }

    estructura(e, table, input, row, rowIndex, colIndex);
}

function manejarKeydownSpan(e, table, span) {
    const cell = span.closest('td');
    if (!cell) return;

    const row = cell.parentElement;
    const rowIndex = row.rowIndex;
    const colIndex = cell.cellIndex;

    switch (e.key) {
        case 'Enter':
            e.preventDefault();
            spanToInput(span);
            setTimeout(() => {
                const input = cell.querySelector('.cell-input');
                if (input) {
                    estructura({ key: 'Enter', preventDefault: () => { } }, table, input, row, rowIndex, colIndex);
                }
            }, 10);
            break;

        case ' ':
            e.preventDefault();
            spanToInput(span);
            setTimeout(() => {
                const input = cell.querySelector('.cell-input');
                if (input) {
                    estructura({ key: ' ', preventDefault: () => { } }, table, input, row, rowIndex, colIndex);
                }
            }, 10);
            break;

        case 'Backspace':
            e.preventDefault();
            // Limpiar el span
            span.setAttribute('data-value', '');
            span.innerHTML = '';
            span.textContent = '';
            // Mover a celda anterior
            if (colIndex > 0) {
                focusCell(rowIndex, colIndex - 1, table);
            } else if (rowIndex > 0) {
                const prevRow = table.rows[rowIndex - 1];
                focusCell(rowIndex - 1, prevRow.cells.length - 1, table);
            }
            break;

        case 'ArrowLeft':
            e.preventDefault();
            if (colIndex > 0) {
                focusCell(rowIndex, colIndex - 1, table);
            }
            break;

        case 'ArrowRight':
            e.preventDefault();
            if (colIndex < row.cells.length - 1) {
                focusCell(rowIndex, colIndex + 1, table);
            }
            break;

        case 'ArrowUp':
            e.preventDefault();
            if (rowIndex > 0) {
                focusCell(rowIndex - 1, colIndex, table);
            }
            break;

        case 'ArrowDown':
            e.preventDefault();
            if (rowIndex < table.rows.length - 1) {
                focusCell(rowIndex + 1, colIndex, table);
            }
            break;

        default:
            // Cualquier tecla imprimible: convertir a input
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                const input = spanToInput(span);
                if (input) {
                    input.value = e.key;
                    input.setSelectionRange(1, 1);
                }
            }
            break;
    }
}

// ========== ESTRUCTURA (ENTER, ESPACIO, BACKSPACE) ==========

function estructura(e, table, input, row, rowIndex, colIndex) {
    const minRows = parseInt(table.dataset.minRows) || 1;
    const minCols = parseInt(table.dataset.minCols) || 1;

    // INSERTAR FILA
    if (e.key === 'Enter') {
        e.preventDefault();
        if (input) inputToSpan(input);

        Auxiliares.insertarFila(table, rowIndex + 1);
        if (currentOperation === "axb") {
            requestAnimationFrame(() => actualizarSeparador(table));
        }

        // Enfocar la nueva celda
        setTimeout(() => {
            const newCell = table.rows[rowIndex + 1]?.cells[colIndex];
            if (newCell) {
                const span = newCell.querySelector('.cell-span');
                if (span) span.click();
            }
        }, 10);
        return;
    }

    // INSERTAR COLUMNA
    if (e.key === ' ') {
        e.preventDefault();
        if (input) inputToSpan(input);

        Auxiliares.insertarColumna(table, colIndex + 1);
        if (currentOperation === "axb") {
            actualizarSeparador(table);
        }

        // Enfocar la nueva celda
        setTimeout(() => {
            const newCell = table.rows[rowIndex]?.cells[colIndex + 1];
            if (newCell) {
                const span = newCell.querySelector('.cell-span');
                if (span) span.click();
            }
        }, 10);
        return;
    }

    // BACKSPACE
    if (e.key === 'Backspace') {
        if (input.value === "") {
            e.preventDefault();

            // Convertir a span vacío
            const emptySpan = crearSpanCelda("", rowIndex, colIndex);
            input.replaceWith(emptySpan);

            // Mover a celda anterior
            let prevRowIndex = rowIndex;
            let prevColIndex = colIndex - 1;

            if (colIndex > 0) {
                prevColIndex = colIndex - 1;
                prevRowIndex = rowIndex;
            } else if (rowIndex > 0) {
                prevRowIndex = rowIndex - 1;
                prevColIndex = table.rows[rowIndex - 1].cells.length - 1;
            }

            if (prevColIndex >= 0 && prevRowIndex >= 0) {
                focusCell(prevRowIndex, prevColIndex, table);
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

// ========== ACTUALIZAR SEPARADOR ==========

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

// ========== CREAR FRACCIÓN HTML PARA RESULTADOS ==========

function crearFraccionHTML(valor, tieneDecimal = false) {
    if (tieneDecimal) {
        return valor; // Ya viene formateado como decimal
    }
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

// ========== RESULTADOS ==========

// Reemplazar calcularSistemasEcuaciones con esta versión:
function calcularSistemasEcuaciones() {
    limpiarResultados();

    const result = UI.createSection("resultSection", "RESULTADO AX = B");
    const article = document.getElementById("article");
    const table = document.getElementById("inputTable");

    try {
        // Convertir todos los inputs a spans antes de calcular
        const allInputs = table.querySelectorAll('.cell-input');
        allInputs.forEach(input => inputToSpan(input));

        // Corregir valores vacíos o parciales
        const spans = table.querySelectorAll('.cell-span');
        spans.forEach(span => {
            let v = span.getAttribute('data-value') || '';
            if (v === '') {
                span.setAttribute('data-value', '0');
                span.textContent = '0';
                return;
            }
            if (/^\/\d+\.?\d*$/.test(v)) {
                v = `1${v}`;
                span.setAttribute('data-value', v);
            }
            // Simplificar solo si NO tiene decimales
            if (esFraccion(v)) {
                if (tieneDecimales(v)) {
                    const [num, den] = v.split("/");
                    span.setAttribute('data-value', v);
                    span.innerHTML = `
                        <span class="frac">
                            <span class="top">${num}</span>
                            <span class="bottom">${den}</span>
                        </span>
                    `;
                } else {
                    const fraccion = Auxiliares.parsearFraccion(v);
                    const [numSimp, denSimp] = Auxiliares.simplificar(fraccion.num, fraccion.den);
                    const valorSimplificado = denSimp === 1 ? `${numSimp}` : `${numSimp}/${denSimp}`;
                    span.setAttribute('data-value', valorSimplificado);
                    if (denSimp === 1) {
                        span.textContent = numSimp;
                    } else {
                        span.innerHTML = `
                            <span class="frac">
                                <span class="top">${numSimp}</span>
                                <span class="bottom">${denSimp}</span>
                            </span>
                        `;
                    }
                }
            }
        });

        const matriz = parsearMatriz(table);
        const resultado = resolverAXB(matriz);

        // Detectar si la matriz original tenía decimales
        const tieneDecimalesEnEntrada = matriz.some(fila => 
            fila.some(celda => celda._tieneDecimal)
        );

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
                const valorFormateado = formatearResultado(valor, tieneDecimalesEnEntrada);
                if (tieneDecimalesEnEntrada) {
                    cell.textContent = valorFormateado;
                } else {
                    cell.innerHTML = crearFraccionHTML(valor, false);
                }
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
        const allInputs = table.querySelectorAll('.cell-input');
        allInputs.forEach(input => inputToSpan(input));

        const spans = table.querySelectorAll('.cell-span');
        spans.forEach(span => {
            let v = span.getAttribute('data-value') || '';
            if (v === '') {
                span.setAttribute('data-value', '0');
                span.textContent = '0';
                return;
            }
            if (/^\/\d+\.?\d*$/.test(v)) {
                v = `1${v}`;
                span.setAttribute('data-value', v);
            }
            if (esFraccion(v)) {
                if (tieneDecimales(v)) {
                    const [num, den] = v.split("/");
                    span.setAttribute('data-value', v);
                    span.innerHTML = `
                        <span class="frac">
                            <span class="top">${num}</span>
                            <span class="bottom">${den}</span>
                        </span>
                    `;
                } else {
                    const fraccion = Auxiliares.parsearFraccion(v);
                    const [numSimp, denSimp] = Auxiliares.simplificar(fraccion.num, fraccion.den);
                    const valorSimplificado = denSimp === 1 ? `${numSimp}` : `${numSimp}/${denSimp}`;
                    span.setAttribute('data-value', valorSimplificado);
                    if (denSimp === 1) {
                        span.textContent = numSimp;
                    } else {
                        span.innerHTML = `
                            <span class="frac">
                                <span class="top">${numSimp}</span>
                                <span class="bottom">${denSimp}</span>
                            </span>
                        `;
                    }
                }
            }
        });

        const matriz = parsearMatriz(table);
        const n = matriz.length;
        const esCuadrada = matriz.every(fila => fila.length === n);

        if (!esCuadrada) {
            throw new Error("La matriz debe ser cuadrada para calcular su inversa");
        }

        const resultado = resolverInv(matriz);

        const tieneDecimalesEnEntrada = matriz.some(fila => 
            fila.some(celda => celda._tieneDecimal)
        );

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
                const valorFormateado = formatearResultado(valor, tieneDecimalesEnEntrada);
                if (tieneDecimalesEnEntrada) {
                    cell.textContent = valorFormateado;
                } else {
                    cell.innerHTML = crearFraccionHTML(valor, false);
                }
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
        const allInputs = table.querySelectorAll('.cell-input');
        allInputs.forEach(input => inputToSpan(input));

        const spans = table.querySelectorAll('.cell-span');
        spans.forEach(span => {
            let v = span.getAttribute('data-value') || '';
            if (v === '') {
                span.setAttribute('data-value', '0');
                span.textContent = '0';
                return;
            }
            if (/^\/\d+\.?\d*$/.test(v)) {
                v = `1${v}`;
                span.setAttribute('data-value', v);
            }
            if (esFraccion(v)) {
                if (tieneDecimales(v)) {
                    const [num, den] = v.split("/");
                    span.setAttribute('data-value', v);
                    span.innerHTML = `
                        <span class="frac">
                            <span class="top">${num}</span>
                            <span class="bottom">${den}</span>
                        </span>
                    `;
                } else {
                    const fraccion = Auxiliares.parsearFraccion(v);
                    const [numSimp, denSimp] = Auxiliares.simplificar(fraccion.num, fraccion.den);
                    const valorSimplificado = denSimp === 1 ? `${numSimp}` : `${numSimp}/${denSimp}`;
                    span.setAttribute('data-value', valorSimplificado);
                    if (denSimp === 1) {
                        span.textContent = numSimp;
                    } else {
                        span.innerHTML = `
                            <span class="frac">
                                <span class="top">${numSimp}</span>
                                <span class="bottom">${denSimp}</span>
                            </span>
                        `;
                    }
                }
            }
        });

        const matriz = parsearMatriz(table);
        const resultado = calcularDet(matriz);

        const tieneDecimalesEnEntrada = matriz.some(fila => 
            fila.some(celda => celda._tieneDecimal)
        );

        const factoresStr = resultado.historialFactores
            .map(f => f === -1 ? "(-1)" : `(${fraccionToString(f, tieneDecimalesEnEntrada)})`)
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
                if (tieneDecimalesEnEntrada) {
                    cell.textContent = formatearResultado(valor, true);
                } else {
                    cell.innerHTML = crearFraccionHTML(valor, false);
                }
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
        value.innerHTML = tieneDecimalesEnEntrada 
            ? formatearResultado(resultado.determinante, true)
            : crearFraccionHTML(resultado.determinante, false);

        content.append(step1, equal, value);
        container.appendChild(content);

        wrapper.append(label, container);
        result.appendChild(wrapper);
        article.appendChild(result);
    } catch (error) {
        mostrarError(result, error.message);
        article.appendChild(result);
    }
}