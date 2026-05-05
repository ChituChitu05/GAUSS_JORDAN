import { spanToInput, inputToSpan } from "./celdas.js";

let currentTable = null;
let currentArticle = null;
let currentRow = 0;
let currentCol = 0;
let callbacks = {}; 

export function configurarEventosEV(article, table, cbs = {}) {
    desconfigurarEventosEV();
    currentTable = table;
    currentArticle = article;
    callbacks = cbs;

    currentArticle.addEventListener('keydown', manejarKeydown);
    currentArticle.addEventListener('click', manejarClick);
    window.addEventListener('keydown', prevenirScrollEspacio);
}

export function desconfigurarEventosEV() {
    if (currentArticle) {
        currentArticle.removeEventListener('keydown', manejarKeydown);
        currentArticle.removeEventListener('click', manejarClick);
    }
    window.removeEventListener('keydown', prevenirScrollEspacio);
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

    // Navegación con flechas
    if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        if (isInput) inputToSpan(target);
        manejarFlechas(e.key);
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
}

function manejarFlechas(key) {
    let nextRow = currentRow;
    let nextCol = currentCol;

    if (key === 'ArrowUp') nextRow--;
    if (key === 'ArrowDown') nextRow++;
    if (key === 'ArrowLeft') nextCol--;
    if (key === 'ArrowRight') nextCol++;

    enfocarCelda(nextRow, nextCol);
}

function enfocarCelda(r, c) {
    if (!currentTable) return;
    
    // Validar límites de filas (evitando la fila del botón)
    const numFilasVectores = currentTable.rows.length - 1;
    if (r < 0 || r >= numFilasVectores) return;

    const row = currentTable.rows[r];
    // +1 porque la celda 0 es la etiqueta "v1 ="
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
        // La columna real para nuestra lógica es el índice de celda menos la etiqueta
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