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

    // Validar límites
    const numFilasVectores = currentTable.rows.length - 1; // -1 por fila del botón
    const numCols = (currentTable.rows[0]?.cells.length - 1) || 0; // -1 por label

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
    
    inputToSpan(input);
    
    if (callbacks.onSync) callbacks.onSync();
}