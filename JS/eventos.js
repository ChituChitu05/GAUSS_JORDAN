import Auxiliares from "./auxiliares.js";
import { crearSpanCelda, spanToInput, inputToSpan } from "./celdas.js";
import { actualizarSeparadorGlobal, getCurrentOperation } from "./ux.js";

let keydownHandler = null;
let inputHandler = null;
let clickHandler = null;
let currentTable = null;
let currentRow = 0;
let currentCol = 0;

export function configurarEventos(article, table, operation) {
    currentTable = table;
    
    if (keydownHandler) article.removeEventListener('keydown', keydownHandler);
    if (inputHandler) article.removeEventListener('input', inputHandler);
    if (clickHandler) article.removeEventListener('click', clickHandler);

    keydownHandler = (e) => manejarKeydown(e);
    inputHandler = manejarInput;
    clickHandler = (e) => manejarClick(e);

    article.addEventListener('keydown', keydownHandler);
    article.addEventListener('input', inputHandler);
    article.addEventListener('click', clickHandler);
}

// ========== FUNCIONES DE NAVEGACIÓN ROBUSTAS ==========

function actualizarCoordenadasDesdeElemento(elemento) {
    if (!elemento) return false;
    const td = elemento.closest('td');
    if (!td) return false;
    const tr = td.closest('tr');
    if (!tr) return false;
    
    currentRow = tr.rowIndex;
    currentCol = td.cellIndex;
    return true;
}

function obtenerCelda(row, col) {
    if (!currentTable) return null;
    if (row < 0 || col < 0) return null;
    if (row >= currentTable.rows.length) return null;
    const targetRow = currentTable.rows[row];
    if (!targetRow || col >= targetRow.cells.length) return null;
    return targetRow.cells[col];
}

function obtenerElementoEditableEnCelda(cell) {
    if (!cell) return null;
    let input = cell.querySelector('.cell-input');
    if (input) return input;
    let span = cell.querySelector('.cell-span');
    if (span) return span;
    return null;
}

function enfocarCelda(row, col, mantenerValor = false) {
    if (!currentTable) return false;
    
    const cell = obtenerCelda(row, col);
    if (!cell) return false;
    
    const elemento = obtenerElementoEditableEnCelda(cell);
    if (!elemento) return false;
    
    // Guardar coordenadas actuales
    currentRow = row;
    currentCol = col;
    
    // Si es span, convertirlo a input
    if (elemento.classList.contains('cell-span')) {
        const input = spanToInput(elemento);
        if (input) {
            if (!mantenerValor) {
                input.focus();
                input.select();
            }
            return true;
        }
        return false;
    }
    
    // Si ya es input, solo enfocar
    if (elemento.classList.contains('cell-input')) {
        elemento.focus();
        if (!mantenerValor) {
            elemento.select();
        }
        return true;
    }
    
    return false;
}

function moverIzquierda() {
    if (currentCol > 0) {
        // Guardar el valor actual antes de mover
        const cell = obtenerCelda(currentRow, currentCol);
        if (cell) {
            const input = cell.querySelector('.cell-input');
            if (input && input.value.trim() !== "") {
                inputToSpan(input);
            }
        }
        enfocarCelda(currentRow, currentCol - 1);
    }
}

function moverDerecha() {
    const maxCol = currentTable.rows[currentRow]?.cells.length - 1 || 0;
    if (currentCol < maxCol) {
        const cell = obtenerCelda(currentRow, currentCol);
        if (cell) {
            const input = cell.querySelector('.cell-input');
            if (input && input.value.trim() !== "") {
                inputToSpan(input);
            }
        }
        enfocarCelda(currentRow, currentCol + 1);
    }
}

function moverArriba() {
    if (currentRow > 0) {
        const cell = obtenerCelda(currentRow, currentCol);
        if (cell) {
            const input = cell.querySelector('.cell-input');
            if (input && input.value.trim() !== "") {
                inputToSpan(input);
            }
        }
        const targetCol = Math.min(currentCol, currentTable.rows[currentRow - 1].cells.length - 1);
        enfocarCelda(currentRow - 1, targetCol);
    }
}

function moverAbajo() {
    if (currentRow < currentTable.rows.length - 1) {
        const cell = obtenerCelda(currentRow, currentCol);
        if (cell) {
            const input = cell.querySelector('.cell-input');
            if (input && input.value.trim() !== "") {
                inputToSpan(input);
            }
        }
        const targetCol = Math.min(currentCol, currentTable.rows[currentRow + 1].cells.length - 1);
        enfocarCelda(currentRow + 1, targetCol);
    }
}

// ========== MANEJADORES DE EVENTOS ==========

function manejarClick(e) {
    const target = e.target;
    const table = currentTable;
    if (!table) return;

    // Cerrar todos los inputs excepto el clickeado
    const allInputs = table.querySelectorAll('.cell-input');
    allInputs.forEach(input => {
        const inputCell = input.closest('td');
        const clickedCell = target.closest('td');
        if (inputCell !== clickedCell) {
            inputToSpan(input);
        }
    });

    // Actualizar coordenadas
    if (target.classList.contains('cell-span') || target.classList.contains('cell-input')) {
        actualizarCoordenadasDesdeElemento(target);
    } else if (target.closest('.frac')) {
        const span = target.closest('.cell-span');
        if (span) actualizarCoordenadasDesdeElemento(span);
    } else if (target.tagName === 'TD') {
        const span = target.querySelector('.cell-span');
        if (span) actualizarCoordenadasDesdeElemento(span);
    }

    // Convertir span a input si es necesario
    if (target.classList.contains('cell-span')) {
        e.preventDefault();
        e.stopPropagation();
        const input = spanToInput(target);
        if (input) {
            actualizarCoordenadasDesdeElemento(input);
        }
        return;
    }

    if (target.closest('.frac') && target.closest('.cell-span')) {
        const span = target.closest('.cell-span');
        e.preventDefault();
        e.stopPropagation();
        const input = spanToInput(span);
        if (input) {
            actualizarCoordenadasDesdeElemento(input);
        }
        return;
    }

    if (target.tagName === 'TD') {
        const span = target.querySelector('.cell-span');
        if (span) {
            e.preventDefault();
            const input = spanToInput(span);
            if (input) {
                actualizarCoordenadasDesdeElemento(input);
            }
        }
    }
}

function manejarInput(e) {
    const input = e.target;
    if (input.tagName !== 'INPUT' || !input.classList.contains('cell-input')) return;
    
    // Actualizar coordenadas cuando se escribe en un input
    actualizarCoordenadasDesdeElemento(input);

    let valor = input.value;
    if (valor === "") return;

    // Auto-correcciones de formato
    if (/^\.\d/.test(valor)) {
        input.value = '0' + valor;
        return;
    }
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
    if (/\/(-\.\d)/.test(valor)) {
        const partes = valor.split('/');
        if (partes[1] && partes[1].startsWith('-.')) {
            input.value = partes[0] + '/-0.' + partes[1].substring(2);
            return;
        }
    }

    if (valor.includes('./')) {
        input.value = valor.slice(0, -1);
        return;
    }

    const partes = valor.split('/');

    if (partes.length > 2) {
        input.value = valor.slice(0, -1);
        return;
    }

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

    const negativos = (valor.match(/-/g) || []).length;
    
    if (negativos > 2) {
        input.value = valor.slice(0, -1);
        return;
    }
    
    if (negativos === 2) {
        if (!/^-\d*\.?\d*\/-\d*\.?\d*$/.test(valor)) {
            input.value = valor.slice(0, -1);
            return;
        }
    }
    
    if (negativos === 1) {
        const esNegativoAlInicio = valor.indexOf('-') === 0;
        const esNegativoEnDenominador = /\/-/.test(valor);
        if (!esNegativoAlInicio && !esNegativoEnDenominador) {
            input.value = valor.slice(0, -1);
            return;
        }
    }

    const regex = /^-?\d*\.?\d*(\/-?\d*\.?\d*)?$/;
    if (!regex.test(valor)) {
        input.value = valor.slice(0, -1);
        return;
    }
}

function manejarKeydown(e) {
    const table = currentTable;
    if (!table) return;
    
    const target = e.target;

    // Si es span, actualizar coordenadas y manejar
    if (target.classList.contains('cell-span')) {
        actualizarCoordenadasDesdeElemento(target);
        manejarKeydownSpan(e, table, target);
        return;
    }

    // Si es input, actualizar coordenadas y manejar
    if (target.tagName === 'INPUT' && target.classList.contains('cell-input')) {
        actualizarCoordenadasDesdeElemento(target);
        
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            const btn = document.getElementById("btnCalcular");
            if (btn) btn.click();
            return;
        }

        // Tab - permitir salir
        if (e.key === 'Tab') {
            e.preventDefault();
            const input = target;
            const cell = input.closest('td');
            const row = cell.parentElement;
            const rowIndex = row.rowIndex;
            const colIndex = cell.cellIndex;
            
            inputToSpan(input);
            
            if (colIndex < row.cells.length - 1) {
                enfocarCelda(rowIndex, colIndex + 1);
            } else if (rowIndex < table.rows.length - 1) {
                enfocarCelda(rowIndex + 1, 0);
            } else {
                const btn = document.getElementById("btnCalcular");
                if (btn) btn.focus();
            }
            return;
        }

        // Escape
        if (e.key === 'Escape') {
            e.preventDefault();
            inputToSpan(target);
            target.blur();
            return;
        }

        // Flechas
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            moverIzquierda();
            return;
        }
        
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            moverDerecha();
            return;
        }
        
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            moverArriba();
            return;
        }
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            moverAbajo();
            return;
        }

        estructura(e, table, target);
        return;
    }
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
                    actualizarCoordenadasDesdeElemento(input);
                    estructura({ key: 'Enter', preventDefault: () => {} }, table, input);
                }
            }, 10);
            break;

        case ' ':
            e.preventDefault();
            spanToInput(span);
            setTimeout(() => {
                const input = cell.querySelector('.cell-input');
                if (input) {
                    actualizarCoordenadasDesdeElemento(input);
                    estructura({ key: ' ', preventDefault: () => {} }, table, input);
                }
            }, 10);
            break;

        case 'Backspace':
            e.preventDefault();
            span.setAttribute('data-value', '');
            span.innerHTML = '';
            span.textContent = '';
            if (colIndex > 0) {
                enfocarCelda(rowIndex, colIndex - 1);
            } else if (rowIndex > 0) {
                const prevRow = table.rows[rowIndex - 1];
                enfocarCelda(rowIndex - 1, prevRow.cells.length - 1);
            }
            break;

        case 'ArrowLeft':
            e.preventDefault();
            moverIzquierda();
            break;
            
        case 'ArrowRight':
            e.preventDefault();
            moverDerecha();
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            moverArriba();
            break;
            
        case 'ArrowDown':
            e.preventDefault();
            moverAbajo();
            break;

        default:
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && e.key !== ' ') {
                e.preventDefault();
                const input = spanToInput(span);
                if (input) {
                    actualizarCoordenadasDesdeElemento(input);
                    input.value = e.key;
                    input.setSelectionRange(1, 1);
                }
            }
            break;
    }
}

// ========== ESTRUCTURA ==========

function estructura(e, table, input) {
    const minRows = parseInt(table.dataset.minRows) || 1;
    const minCols = parseInt(table.dataset.minCols) || 1;
    const currentOp = getCurrentOperation();
    
    const cell = input.closest('td');
    const row = cell.parentElement;
    const rowIndex = row.rowIndex;
    const colIndex = cell.cellIndex;

    if (e.key === 'Enter') {
        e.preventDefault();
        inputToSpan(input);
        Auxiliares.insertarFila(table, rowIndex + 1);
        if (currentOp === "axb") {
            requestAnimationFrame(() => actualizarSeparadorGlobal(table));
        }
        setTimeout(() => {
            enfocarCelda(rowIndex + 1, colIndex);
        }, 10);
        return;
    }

    if (e.key === ' ') {
        e.preventDefault();
        inputToSpan(input);
        Auxiliares.insertarColumna(table, colIndex + 1);
        if (currentOp === "axb") {
            actualizarSeparadorGlobal(table);
        }
        setTimeout(() => {
            enfocarCelda(rowIndex, colIndex + 1);
        }, 10);
        return;
    }

    if (e.key === 'Backspace') {
        if (input.value === "") {
            e.preventDefault();
            const emptySpan = crearSpanCelda("", rowIndex, colIndex);
            input.replaceWith(emptySpan);
            actualizarCoordenadasDesdeElemento(emptySpan);

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
                enfocarCelda(prevRowIndex, prevColIndex);
            }

            setTimeout(() => {
                if (table.rows.length > minRows && Auxiliares.filaVacia(table, rowIndex)) {
                    Auxiliares.eliminarFila(table, rowIndex);
                    if (currentOp === "axb") {
                        actualizarSeparadorGlobal(table);
                    }
                    return;
                }
                if (table.rows[0].cells.length > minCols && Auxiliares.columnaVacia(table, colIndex)) {
                    Auxiliares.eliminarColumna(table, colIndex);
                    if (currentOp === "axb") {
                        actualizarSeparadorGlobal(table);
                    }
                }
            }, 0);
        }
    }
}