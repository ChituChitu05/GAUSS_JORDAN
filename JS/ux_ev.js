import UI from "./ui.js";
import { crearSpanCelda } from "./celdas.js";
import { configurarEventosEV, desconfigurarEventosEV } from "./eventos_ev.js";

let currentOperation = "li";
let vectoresHorizontales = [["", ""], ["", ""]]; 
let tablaVectores = null;
let currentRow = 0;

export function inicializarEV(article, modo) {
    desconfigurarEventosEV();
    currentOperation = modo;
    limpiar(article);

    const mainSection = UI.createSection("mainSection", "INGRESO DE VECTORES");
    const wrapperVectores = UI.createDiv("wrapperVectores");
    
    tablaVectores = UI.createTable("inputTable");
    tablaVectores.style.borderSpacing = "6px";

    construirFilasVectores();

    wrapperVectores.appendChild(tablaVectores);
    mainSection.appendChild(wrapperVectores);
    article.appendChild(mainSection);

    // Configuración de callbacks para eventos_ev.js[cite: 4]
    configurarEventosEV(article, tablaVectores, {
        onSync: () => {
            guardarVectoresDesdeTabla();
        },
        onEnter: () => {
            guardarVectoresDesdeTabla();
            agregarNuevoVector();
        },
        onSpace: () => {
            guardarVectoresDesdeTabla();
            agregarComponenteATodos();
        }
    });
}

/**
 * Exportación requerida por main.js[cite: 6]
 */
export function cambiarOperacionEV(article, nuevoModo) {
    guardarVectoresDesdeTabla();
    currentOperation = nuevoModo;
    inicializarEV(article, nuevoModo);
}

/**
 * Exportación requerida por eventos_ev.js[cite: 4]
 */
export function setCurrentRow(row) {
    currentRow = row;
}

function construirFilasVectores() {
    if (!tablaVectores) return;
    tablaVectores.innerHTML = "";

    const numComponentes = vectoresHorizontales[0]?.length || 2;

    vectoresHorizontales.forEach((vector, i) => {
        const row = document.createElement("tr");
        
        // Etiqueta v_n[cite: 3]
        const labelCell = document.createElement("td");
        labelCell.innerHTML = `<span style="color:var(--text-secondary); font-weight:600;">v${i + 1} =</span>`;
        labelCell.style.pointerEvents = "none";
        row.appendChild(labelCell);

        for (let j = 0; j < numComponentes; j++) {
            const cell = document.createElement("td");
            const span = crearSpanCelda(vector[j] || "", i, j);
            cell.appendChild(span);
            row.appendChild(cell);
        }
        tablaVectores.appendChild(row);
    });
}

function agregarComponenteATodos() {
    vectoresHorizontales.forEach(v => v.push(""));
    construirFilasVectores();
    
    setTimeout(() => {
        const nuevaCol = vectoresHorizontales[0].length; 
        enfocarCelda(currentRow, nuevaCol);
    }, 10);
}

function agregarNuevoVector() {
    const numComp = vectoresHorizontales[0].length;
    vectoresHorizontales.push(Array(numComp).fill(""));
    construirFilasVectores();
    
    setTimeout(() => {
        const nuevaFila = vectoresHorizontales.length - 1;
        enfocarCelda(nuevaFila, 1); 
    }, 10);
}

function guardarVectoresDesdeTabla() {
    if (!tablaVectores) return;
    const nuevosVectores = [];
    Array.from(tablaVectores.rows).forEach(row => {
        const vector = [];
        for (let j = 1; j < row.cells.length; j++) {
            const el = row.cells[j].querySelector('.cell-input') || row.cells[j].querySelector('.cell-span');
            const val = el.tagName === 'INPUT' ? el.value : (el.getAttribute('data-value') || "");
            vector.push(val);
        }
        nuevosVectores.push(vector);
    });
    vectoresHorizontales = nuevosVectores;
}

function enfocarCelda(r, c) {
    const row = tablaVectores.rows[r];
    if (!row) return;
    const cell = row.cells[c];
    if (!cell) return;
    const span = cell.querySelector('.cell-span');
    if (span) span.click();
}

function limpiar(article) {
    while (article.firstChild) article.removeChild(article.firstChild);
}