import { crearSpanCelda, spanToInput, inputToSpan } from "./celdas.js";
import { setCurrentRow } from './ux_ev.js';

// Variables de estado del módulo[cite: 4]
let currentTable = null;
let currentRow = 0;
let currentCol = 0;
let callbacks = {}; 

/**
 * Configura los eventos unificando la lógica con la de matrices[cite: 2, 4].
 */
export function configurarEventosEV(article, table, cbs = {}) {
    desconfigurarEventosEV();

    currentTable = table;
    callbacks = {
        onSync: cbs.onSync || (() => {}),
        onEnter: cbs.onEnter || (() => {}),
        onSpace: cbs.onSpace || (() => {})
    }; 
    
    article.addEventListener('keydown', manejarKeydown);
    article.addEventListener('input', manejarInput);
    article.addEventListener('click', manejarClick);
}

/**
 * Limpia los eventos para evitar ejecuciones múltiples[cite: 4].
 */
export function desconfigurarEventosEV() {
    document.removeEventListener('keydown', manejarKeydown);
    document.removeEventListener('input', manejarInput);
    document.removeEventListener('click', manejarClick);
    
    currentTable = null;
    callbacks = {}; 
}

/**
 * Manejador de teclado con bloqueo estricto en bordes.
 */
function manejarKeydown(e) {
    if (!currentTable) return;
    const target = e.target;
    
    const isInput = target.classList.contains('cell-input');
    const isSpan = target.classList.contains('cell-span');
    if (!isInput && !isSpan) return;

    actualizarCoordenadasDesdeElemento(target);

    // Acción: ESPACIO (Nueva Componente)[cite: 3]
    if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (isInput) inputToSpan(target); 
        if (typeof callbacks.onSpace === 'function') callbacks.onSpace();
        return;
    }

    // Acción: ENTER (Nuevo Vector)[cite: 3]
    if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (isInput) inputToSpan(target);
        if (typeof callbacks.onEnter === 'function') callbacks.onEnter();
        return;
    }

    // NAVEGACIÓN CON FLECHAS (Restricción de bordes)[cite: 2]
    if (e.key.startsWith('Arrow')) {
        const maxCol = currentTable.rows[currentRow].cells.length - 1;
        const maxRow = currentTable.rows.length - 1;

        // Definimos si el movimiento es válido antes de ejecutar nada[cite: 2]
        const puedeMoverIzquierda = (e.key === 'ArrowLeft' && currentCol > 1);
        const puedeMoverDerecha   = (e.key === 'ArrowRight' && currentCol < maxCol);
        const puedeMoverArriba    = (e.key === 'ArrowUp' && currentRow > 0);
        const puedeMoverAbajo     = (e.key === 'ArrowDown' && currentRow < maxRow);

        if (puedeMoverIzquierda || puedeMoverDerecha || puedeMoverArriba || puedeMoverAbajo) {
            e.preventDefault(); 
            if (isInput) inputToSpan(target); // Sincroniza solo si cambia de celda[cite: 2]

            if (e.key === 'ArrowLeft')  moverIzquierda();
            if (e.key === 'ArrowRight') moverDerecha();
            if (e.key === 'ArrowUp')    moverArriba();
            if (e.key === 'ArrowDown')  moverAbajo();
        } else {
            // Si está en el borde y la dirección es inválida, no hace nada[cite: 2]
            return; 
        }
    }
}

function manejarInput(e) {
    const input = e.target;
    if (!input.classList.contains('cell-input')) return;
    
    if (!/^-?\d*\.?\d*(\/-?\d*\.?\d*)?$/.test(input.value)) {
        input.value = input.value.slice(0, -1);
    }
    
    input.style.width = (input.value.length + 1) + "ch";
    if (typeof callbacks.onSync === 'function') callbacks.onSync();
}

function manejarClick(e) {
    const span = e.target.closest('.cell-span');
    if (span) spanToInput(span);
}

function actualizarCoordenadasDesdeElemento(elemento) {
    const td = elemento.closest('td');
    const tr = td?.closest('tr');
    if (tr && td) {
        currentRow = tr.rowIndex;
        currentCol = td.cellIndex;
        setCurrentRow(currentRow); // Sincronización con ux_ev.js[cite: 3, 4]
    }
}

// --- Funciones de Movimiento ---

function moverIzquierda() {
    enfocarCelda(currentRow, currentCol - 1);
}

function moverDerecha() {
    enfocarCelda(currentRow, currentCol + 1);
}

function moverArriba() {
    enfocarCelda(currentRow - 1, currentCol);
}

function moverAbajo() {
    enfocarCelda(currentRow + 1, currentCol);
}

function enfocarCelda(r, c) {
    const cell = currentTable.rows[r]?.cells[c];
    if (!cell) return;
    
    const span = cell.querySelector('.cell-span');
    if (span) spanToInput(span).focus();
}