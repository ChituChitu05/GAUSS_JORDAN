import UI from "./ui.js";
import { crearSpanCelda } from "./celdas.js";
import { configurarEventosEV, desconfigurarEventosEV } from "./eventos_ev.js";

let currentOperation = "li";
let vectoresHorizontales = [["", ""], ["", ""]]; 
let tablaVectores = null;
let currentRow = 0;
let currentCol = 0; 

// Esta es la función que faltaba exportar
export function cambiarOperacionEV(article, modo) {
    currentOperation = modo;
    inicializarEV(article, modo);
}

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

    configurarEventosEV(article, tablaVectores, {
        onSync: () => { guardarVectoresDesdeTabla(); },
        onEnter: () => {
            guardarVectoresDesdeTabla();
            agregarNuevoVector(currentRow + 1);
        },
        onSpace: (r, c) => {
            guardarVectoresDesdeTabla();
            agregarComponenteATodos(c);
        },
        onFocusUpdate: (r, c) => { 
            currentRow = r; 
            currentCol = c; 
        }
    });
}

function construirFilasVectores() {
    if (!tablaVectores) return;
    tablaVectores.innerHTML = "";
    const numComponentes = vectoresHorizontales[0]?.length || 2;

    vectoresHorizontales.forEach((vector, i) => {
        const row = document.createElement("tr");
        const labelCell = document.createElement("td");
        labelCell.innerHTML = `<span style="color:var(--primary); font-weight:600;">v${i + 1} =</span>`;
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

    const rowBtn = document.createElement("tr");
    const cellBtn = document.createElement("td");
    cellBtn.colSpan = numComponentes + 1;
    const btnAgregar = document.createElement("button");
    btnAgregar.textContent = "+ Agregar Vector";
    btnAgregar.className = "btn-agregar-vector";
    btnAgregar.onclick = () => {
        guardarVectoresDesdeTabla();
        agregarNuevoVector(vectoresHorizontales.length);
    };
    cellBtn.appendChild(btnAgregar);
    rowBtn.appendChild(cellBtn);
    tablaVectores.appendChild(rowBtn);
}

function agregarComponenteATodos(indiceCol) {
    const r = currentRow;
    const c = indiceCol;
    vectoresHorizontales.forEach(v => v.splice(c + 1, 0, ""));
    construirFilasVectores();
    setTimeout(() => enfocarCelda(r, c + 1), 10);
}

function agregarNuevoVector(indiceFila) {
    const numComp = vectoresHorizontales[0]?.length || 2;
    vectoresHorizontales.splice(indiceFila, 0, Array(numComp).fill(""));
    construirFilasVectores();
    setTimeout(() => enfocarCelda(indiceFila, 0), 10);
}

function enfocarCelda(r, c) {
    if (!tablaVectores) return;
    const row = tablaVectores.rows[r];
    if (!row) return;
    const cell = row.cells[c + 1];
    if (!cell) return;
    const span = cell.querySelector('.cell-span');
    if (span) span.click();
}

function guardarVectoresDesdeTabla() {
    const filas = tablaVectores.querySelectorAll("tr");
    const nuevosDatos = [];
    filas.forEach((fila, i) => {
        if (i === vectoresHorizontales.length) return;
        const celdas = fila.querySelectorAll(".cell-span, .cell-input");
        if (celdas.length > 0) {
            const vector = Array.from(celdas).map(el => 
                el.tagName === "INPUT" ? el.value : (el.getAttribute("data-value") || "")
            );
            nuevosDatos.push(vector);
        }
    });
    vectoresHorizontales = nuevosDatos;
}

function limpiar(article) {
    while (article.firstChild) article.removeChild(article.firstChild);
}