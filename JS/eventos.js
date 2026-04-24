// eventos.js - Configuración y manejo de eventos
import Auxiliares from "./auxiliares.js";
import { crearSpanCelda, spanToInput, inputToSpan, focusCell } from "./celdas.js";

let keydownHandler = null;
let inputHandler = null;
let clickHandler = null;
let currentOperation = "axb";

/**
 * Configura todos los event listeners
 */
export function configurarEventos(article, table, operation) {
    currentOperation = operation;

    if (keydownHandler) article.removeEventListener('keydown', keydownHandler);
    if (inputHandler) article.removeEventListener('input', inputHandler);
    if (clickHandler) article.removeEventListener('click', clickHandler);

    keydownHandler = (e) => manejarKeydown(e, table);
    inputHandler = manejarInput;
    clickHandler = (e) => manejarClick(e, table);

    article.addEventListener('keydown', keydownHandler);
    article.addEventListener('input', inputHandler);
    article.addEventListener('click', clickHandler);

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

    const allInputs = table.querySelectorAll('.cell-input');
    allInputs.forEach(input => {
        const inputCell = input.closest('td');
        const clickedCell = target.closest('td');
        if (inputCell !== clickedCell) inputToSpan(input);
    });

    if (target.classList.contains('cell-span')) {
        e.preventDefault();
        e.stopPropagation();
        spanToInput(target);
        return;
    }

    if (target.closest('.frac') && target.closest('.cell-span')) {
        const span = target.closest('.cell-span');
        e.preventDefault();
        e.stopPropagation();
        spanToInput(span);
        return;
    }

    if (target.tagName === 'TD') {
        const span = target.querySelector('.cell-span');
        if (span) {
            e.preventDefault();
            spanToInput(span);
        }
    }
}

function manejarInput(e) {
    const input = e.target;
    if (input.tagName !== 'INPUT' || !input.classList.contains('cell-input')) return;

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
            input.value = partes[0] + '/0' + partes[1].substring(1);
            return;
        }
    }
    if (/\/(-\.\d)/.test(valor)) {
        const partes = valor.split('/');
        if (partes[1] && partes[1].startsWith('-.')) {
            input.value = partes[0] + '/-0' + partes[1].substring(2);
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

    const regex = /^-?\d*\.?\d*\/?\d*\.?\d*$/;
    if (!regex.test(valor)) {
        input.value = valor.slice(0, -1);
        return;
    }

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

    if (target.classList.contains('cell-span')) {
        manejarKeydownSpan(e, table, target);
        return;
    }

    if (target.tagName !== 'INPUT' || !target.classList.contains('cell-input')) return;

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

    // Tab
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

    // Escape
    if (e.key === 'Escape') {
        e.preventDefault();
        inputToSpan(input);
        input.blur();
        return;
    }

    // Flechas
    if (e.key === 'ArrowLeft') {
        if (input.selectionStart === 0 && input.selectionEnd === 0) {
            e.preventDefault();
            if (value) inputToSpan(input);
            if (colIndex > 0) focusCell(rowIndex, colIndex - 1, table);
        }
        return;
    }
    if (e.key === 'ArrowRight') {
        if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
            e.preventDefault();
            if (value) inputToSpan(input);
            if (colIndex < row.cells.length - 1) focusCell(rowIndex, colIndex + 1, table);
        }
        return;
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (value) inputToSpan(input);
        if (rowIndex > 0) focusCell(rowIndex - 1, colIndex, table);
        return;
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (value) inputToSpan(input);
        if (rowIndex < table.rows.length - 1) focusCell(rowIndex + 1, colIndex, table);
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
                if (input) estructura({ key: 'Enter', preventDefault: () => { } }, table, input, row, rowIndex, colIndex);
            }, 10);
            break;

        case ' ':
            e.preventDefault();
            spanToInput(span);
            setTimeout(() => {
                const input = cell.querySelector('.cell-input');
                if (input) estructura({ key: ' ', preventDefault: () => { } }, table, input, row, rowIndex, colIndex);
            }, 10);
            break;

        case 'Backspace':
            e.preventDefault();
            span.setAttribute('data-value', '');
            span.innerHTML = '';
            span.textContent = '';
            if (colIndex > 0) {
                focusCell(rowIndex, colIndex - 1, table);
            } else if (rowIndex > 0) {
                const prevRow = table.rows[rowIndex - 1];
                focusCell(rowIndex - 1, prevRow.cells.length - 1, table);
            }
            break;

        case 'ArrowLeft':
            e.preventDefault();
            if (colIndex > 0) focusCell(rowIndex, colIndex - 1, table);
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (colIndex < row.cells.length - 1) focusCell(rowIndex, colIndex + 1, table);
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (rowIndex > 0) focusCell(rowIndex - 1, colIndex, table);
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (rowIndex < table.rows.length - 1) focusCell(rowIndex + 1, colIndex, table);
            break;

        default:
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

// ========== ESTRUCTURA ==========

function estructura(e, table, input, row, rowIndex, colIndex) {
    const minRows = parseInt(table.dataset.minRows) || 1;
    const minCols = parseInt(table.dataset.minCols) || 1;

    if (e.key === 'Enter') {
        e.preventDefault();
        if (input) inputToSpan(input);
        Auxiliares.insertarFila(table, rowIndex + 1);
        if (currentOperation === "axb") {
            requestAnimationFrame(() => actualizarSeparador(table));
        }
        setTimeout(() => {
            const newCell = table.rows[rowIndex + 1]?.cells[colIndex];
            if (newCell) {
                const span = newCell.querySelector('.cell-span');
                if (span) span.click();
            }
        }, 10);
        return;
    }

    if (e.key === ' ') {
        e.preventDefault();
        if (input) inputToSpan(input);
        Auxiliares.insertarColumna(table, colIndex + 1);
        if (currentOperation === "axb") actualizarSeparador(table);
        setTimeout(() => {
            const newCell = table.rows[rowIndex]?.cells[colIndex + 1];
            if (newCell) {
                const span = newCell.querySelector('.cell-span');
                if (span) span.click();
            }
        }, 10);
        return;
    }

    if (e.key === 'Backspace') {
        if (input.value === "") {
            e.preventDefault();
            const emptySpan = crearSpanCelda("", rowIndex, colIndex);
            input.replaceWith(emptySpan);

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
                if (table.rows.length > minRows && Auxiliares.filaVacia(table, rowIndex)) {
                    Auxiliares.eliminarFila(table, rowIndex);
                    if (currentOperation === "axb") actualizarSeparador(table);
                    return;
                }
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
    for (let row of table.rows) {
        for (let cell of row.cells) {
            cell.style.borderRight = "";
            cell.classList.remove("separator");
        }
    }
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