import { spanToInput, inputToSpan, crearSpanCelda } from "./celdas.js";

let currentTable = null;
let currentArticle = null;
let currentRow = 0;
let currentCol = 0;
let callbacks = {};
let isProcessingBackspace = false;

export function configurarEventosEV(article, table, cbs = {}) {
    desconfigurarEventosEV();
    currentTable = table;
    currentArticle = article;
    callbacks = cbs;

    currentArticle.addEventListener('keydown', manejarKeydown);
    currentArticle.addEventListener('click', manejarClick);
    currentArticle.addEventListener('input', manejarInput);
    currentArticle.addEventListener('focusout', manejarFocusout);
    window.addEventListener('keydown', prevenirScrollEspacio);
}

export function desconfigurarEventosEV() {
    if (currentArticle) {
        currentArticle.removeEventListener('keydown', manejarKeydown);
        currentArticle.removeEventListener('click', manejarClick);
        currentArticle.removeEventListener('input', manejarInput);
        currentArticle.removeEventListener('focusout', manejarFocusout);
    }
    window.removeEventListener('keydown', prevenirScrollEspacio);
    currentTable = null;
    currentArticle = null;
    callbacks = {};
    isProcessingBackspace = false;
}

function prevenirScrollEspacio(e) {
    if (e.key === ' ' && (document.activeElement.classList.contains('cell-input') || document.activeElement.classList.contains('cell-span'))) {
        e.preventDefault();
    }
}

function manejarKeydown(e) {
    const target = e.target;
    const isInput = target.classList.contains('cell-input');
    const isSpan = target.classList.contains('cell-span');
    if (!isInput && !isSpan) return;

    actualizarCoordenadasDesdeElemento(target);

    if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const movido = manejarFlechas(e.key);
        if (movido && isInput) inputToSpan(target);
        if (callbacks.onSync) callbacks.onSync();
        return;
    }

    if (e.key === ' ') {
        e.preventDefault();
        if (isInput) inputToSpan(target);
        if (callbacks.onSpace) callbacks.onSpace(currentRow, currentCol);
        return;
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        if (isInput) inputToSpan(target);
        if (callbacks.onEnter) callbacks.onEnter();
        return;
    }

    if (e.key === 'Tab') {
        e.preventDefault();
        if (isInput) inputToSpan(target);
        const maxCol = currentTable.rows[currentRow]?.cells.length - 1 || 1;
        if (currentCol < maxCol) {
            enfocarCelda(currentRow, currentCol + 1);
        } else if (currentRow < currentTable.rows.length - 2) {
            enfocarCelda(currentRow + 1, 1);
        }
        if (callbacks.onSync) callbacks.onSync();
        return;
    }

    if (e.key === 'Escape') {
        if (isInput) {
            inputToSpan(target);
            target.blur();
        }
        if (callbacks.onSync) callbacks.onSync();
        return;
    }

    if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        
        if (isInput) {
            estructuraBackspace(e, currentTable, target);
        } else if (isSpan) {
            target.setAttribute('data-value', '');
            target.innerHTML = '';
            target.textContent = '';
            if (currentCol > 0) {
                enfocarCelda(currentRow, currentCol - 1);
            } else if (currentRow > 0) {
                enfocarCelda(currentRow - 1, (currentTable.rows[currentRow - 1].cells.length - 2));
            }
            if (callbacks.onSync) callbacks.onSync();
        }
        return;
    }
}

function estructuraBackspace(e, table, input) {
    if (input.value !== "") return;
    
    isProcessingBackspace = true;
    
    try {
        const cell = input.closest('td');
        if (!cell) return;
        
        const row = cell.parentElement;
        if (!row) return;
        
        const rowIndex = row.rowIndex;
        const colIndex = cell.cellIndex;
        
        const celdasReales = Array.from(table.querySelectorAll('tr'))
            .filter(tr => tr.querySelectorAll('.cell-span, .cell-input').length > 0);
        const numFilasReales = celdasReales.length;
        const numColsReales = table.rows[0]?.cells.length - 1 || 1;
        const minRows = 2;
        const minCols = 2;
        
        let filaVacia = true;
        for (let c = 1; c < row.cells.length; c++) {
            const celda = row.cells[c];
            if (!celda) continue;
            
            const span = celda.querySelector('.cell-span');
            const inp = celda.querySelector('.cell-input');
            const valor = inp ? inp.value.trim() : (span ? (span.getAttribute('data-value') || '') : '');
            
            if (valor !== '' && valor !== '0') {
                filaVacia = false;
                break;
            }
        }
        
        let columnaVacia = true;
        for (let r = 0; r < table.rows.length; r++) {
            const celda = table.rows[r].cells[colIndex];
            if (!celda) continue;
            
            const span = celda.querySelector('.cell-span');
            const inp = celda.querySelector('.cell-input');
            const valor = inp ? inp.value.trim() : (span ? (span.getAttribute('data-value') || '') : '');
            
            if (valor !== '' && valor !== '0') {
                columnaVacia = false;
                break;
            }
        }
        
        const emptySpan = crearSpanCelda("", rowIndex, colIndex);
        
        if (input.parentNode) {
            input.parentNode.replaceChild(emptySpan, input);
        } else {
            return;
        }
        
        const reenfocar = (nuevaFila, nuevaCol) => {
            setTimeout(() => {
                if (callbacks.onSync) callbacks.onSync();
                if (nuevaFila >= 0 && nuevaCol >= 0) {
                    enfocarCelda(nuevaFila, nuevaCol);
                }
                isProcessingBackspace = false;
            }, 30);
        };
        
        if (filaVacia && numFilasReales > minRows) {
            try {
                row.remove();
                const nuevaFila = Math.max(0, rowIndex - 1);
                const nuevaCol = Math.min(colIndex - 1, (table.rows[nuevaFila]?.cells.length - 2) || 0);
                reenfocar(nuevaFila, nuevaCol);
            } catch (err) {
                console.warn('Error al eliminar fila:', err);
                isProcessingBackspace = false;
            }
            return;
        }
        
        if (columnaVacia && numColsReales > minCols) {
            try {
                for (let r = 0; r < table.rows.length; r++) {
                    if (table.rows[r].cells[colIndex]) {
                        table.rows[r].deleteCell(colIndex);
                    }
                }
                const nuevaCol = Math.max(0, colIndex - 2);
                reenfocar(Math.min(rowIndex, table.rows.length - 1), nuevaCol);
            } catch (err) {
                console.warn('Error al eliminar columna:', err);
                isProcessingBackspace = false;
            }
            return;
        }
        
        let prevRow = rowIndex;
        let prevCol = colIndex - 2;
        
        if (prevCol < 0) {
            if (rowIndex > 0) {
                prevRow = rowIndex - 1;
                prevCol = (table.rows[prevRow]?.cells.length - 2) || 0;
            } else {
                prevCol = 0;
            }
        }
        
        if (prevRow >= 0 && prevCol >= 0) {
            setTimeout(() => {
                enfocarCelda(prevRow, prevCol);
                isProcessingBackspace = false;
            }, 10);
        } else {
            isProcessingBackspace = false;
        }
        
        if (callbacks.onSync) callbacks.onSync();
        
    } catch (error) {
        console.warn('Error en estructuraBackspace:', error);
        isProcessingBackspace = false;
    }
}

function manejarFlechas(key) {
    let nextRow = currentRow;
    let nextCol = currentCol;

    if (key === 'ArrowUp') nextRow--;
    if (key === 'ArrowDown') nextRow++;
    if (key === 'ArrowLeft') nextCol--;
    if (key === 'ArrowRight') nextCol++;

    const numFilasVectores = currentTable.rows.length - 1;
    const numCols = (currentTable.rows[0]?.cells.length - 1) || 0;

    if (nextRow < 0 || nextRow >= numFilasVectores) return false;
    if (nextCol < 0 || nextCol >= numCols) return false;

    enfocarCelda(nextRow, nextCol);
    return true;
}

function enfocarCelda(r, c) {
    if (!currentTable) return;
    const row = currentTable.rows[r];
    if (!row) return;
    const cell = row.cells[c + 1];
    if (!cell) return;
    const span = cell.querySelector('.cell-span');
    if (span) span.click();
}

function actualizarCoordenadasDesdeElemento(elemento) {
    const td = elemento.closest('td');
    const tr = td?.closest('tr');
    if (tr && td) {
        currentRow = tr.rowIndex;
        currentCol = td.cellIndex - 1;
        if (callbacks.onFocusUpdate) callbacks.onFocusUpdate(currentRow, currentCol);
    }
}

function manejarClick(e) {
    const target = e.target;
    if (target.classList.contains('cell-span')) {
        actualizarCoordenadasDesdeElemento(target);
        spanToInput(target);
    }
}

function manejarInput(e) {
    const input = e.target;
    if (!input.classList.contains('cell-input')) return;

    let valor = input.value;
    if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(valor)) {
        valor = valor.replace(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '');
        input.value = valor;
    }
    if (/[^0-9\-\/\.]/.test(valor)) {
        valor = valor.replace(/[^0-9\-\/\.]/g, '');
        input.value = valor;
    }

    input.style.width = (input.value.length + 1) + "ch";

    if (callbacks.onSync) callbacks.onSync();
}

function manejarFocusout(e) {
    const input = e.target;
    if (!input.classList.contains('cell-input')) return;
    
    if (isProcessingBackspace) return;
    
    inputToSpan(input);

    if (callbacks.onSync) callbacks.onSync();
}