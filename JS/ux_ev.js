import UI from "./ui.js";
import { crearSpanCelda } from "./celdas.js";
import { configurarEventosEV, desconfigurarEventosEV } from "./eventos_ev.js";

let currentOperation = "li";
let vectoresHorizontales = [["", ""], ["", ""]];
let tablaVectores = null;
let currentRow = 0;
let currentCol = 0;

export function cambiarOperacionEV(article, modo) {
    currentOperation = modo;
    inicializarEV(article, modo);
}

export function inicializarEV(article, modo) {
    desconfigurarEventosEV();
    currentOperation = modo;
    limpiar(article);

    // Sección 1: Ingreso de vectores
    const mainSection = UI.createSection("mainSection", "INGRESO DE VECTORES");
    const wrapperVectores = UI.createDiv("wrapperVectores");

    tablaVectores = UI.createTable("inputTable");
    tablaVectores.style.borderSpacing = "6px";

    construirFilasVectores();

    wrapperVectores.appendChild(tablaVectores);
    mainSection.appendChild(wrapperVectores);
    article.appendChild(mainSection);

    // Sección 2: Matriz (vectores como columnas)
    const resultSection = UI.createSection("resultSection", "MATRIZ (VECTORES COMO COLUMNAS)");
    const wrapperMatriz = document.createElement("div");
    wrapperMatriz.className = "result-wrapper";

    const label = document.createElement("div");
    label.className = "result-label";
    label.textContent = "V =";

    const matrixContainer = document.createElement("div");
    matrixContainer.className = "result-matrix-container";

    const matrizTable = UI.createTable("matrizEVTable");
    matrizTable.className = "result-table";

    construirMatrizColumnas(matrizTable);

    matrixContainer.appendChild(matrizTable);
    wrapperMatriz.appendChild(label);
    wrapperMatriz.appendChild(matrixContainer);
    resultSection.appendChild(wrapperMatriz);

    // Botón calcular
    const btnText = getBotonTexto(modo);
    const btnCalcular = UI.createButton("btnCalcularEV", btnText, "btnCalcular");
    btnCalcular.onclick = () => {
        guardarVectoresDesdeTabla();
        sincronizarMatrizDesdeVectores();
        const nombreOp = getNombreOperacion(modo);
        mostrarResultadoPlaceholder(nombreOp);
    };
    resultSection.appendChild(btnCalcular);

    article.appendChild(resultSection);

    configurarEventosEV(article, tablaVectores, {
        onSync: () => {
            guardarVectoresDesdeTabla();
            sincronizarMatrizDesdeVectores();
        },
        onEnter: () => {
            guardarVectoresDesdeTabla();
            agregarNuevoVector(vectoresHorizontales.length);
            sincronizarMatrizDesdeVectores();
        },
        onSpace: (r, c) => {
            guardarVectoresDesdeTabla();
            agregarComponenteATodos(c);
            sincronizarMatrizDesdeVectores();
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

    // Botón "Agregar Vector"
    const rowBtn = document.createElement("tr");
    const cellBtn = document.createElement("td");
    cellBtn.colSpan = numComponentes + 1;
    const btnAgregar = document.createElement("button");
    btnAgregar.textContent = "+ Agregar Vector";
    btnAgregar.className = "btn-agregar-vector";
    btnAgregar.onclick = () => {
        guardarVectoresDesdeTabla();
        agregarNuevoVector(vectoresHorizontales.length);
        sincronizarMatrizDesdeVectores();
    };
    cellBtn.appendChild(btnAgregar);
    rowBtn.appendChild(cellBtn);
    tablaVectores.appendChild(rowBtn);
}

function construirMatrizColumnas(table) {
    if (!table) return;
    table.innerHTML = "";

    const numVectores = vectoresHorizontales.length;
    const numComponentes = vectoresHorizontales[0]?.length || 2;
    const columnasTotales = numVectores + 1;

    for (let i = 0; i < numComponentes; i++) {
        const row = document.createElement("tr");

        for (let j = 0; j < columnasTotales; j++) {
            const cell = document.createElement("td");

            if (j < numVectores) {
                const valor = vectoresHorizontales[j][i] || "";
                if (valor && valor.includes('/')) {
                    const [num, den] = valor.split('/');
                    cell.innerHTML = `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
                } else {
                    cell.textContent = valor === "" ? "0" : valor;
                }
            } else {
                cell.textContent = currentOperation === "pertenecer" ? "?" : "0";
            }

            row.appendChild(cell);
        }

        table.appendChild(row);
    }

    actualizarSeparadorMatriz(table);
}

function actualizarSeparadorMatriz(table) {
    if (!table || !table.rows.length) return;

    const numVectores = vectoresHorizontales.length;
    const sep = numVectores - 1;

    for (let row of table.rows) {
        for (let cell of row.cells) {
            cell.style.borderRight = "";
            cell.classList.remove("separator-col");
        }
    }

    if (sep >= 0) {
        for (let row of table.rows) {
            const cell = row.cells[sep];
            if (cell) {
                cell.style.borderRight = "2px solid var(--primary)";
                cell.classList.add("separator-col");
            }
        }
    }
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

function sincronizarMatrizDesdeVectores() {
    const matrizTable = document.getElementById("matrizEVTable");
    if (matrizTable) construirMatrizColumnas(matrizTable);
}

function getBotonTexto(modo) {
    const textos = {
        "li": "Calcular si es LI o LD",
        "pertenecer": "Verificar pertenencia a S",
        "base": "Hallar base",
        "completar": "Completar base"
    };
    return textos[modo] || "Calcular";
}

function getNombreOperacion(modo) {
    const nombres = {
        "li": "ES LI O LD",
        "pertenecer": "PERTENECE A S",
        "base": "HALLAR BASE",
        "completar": "COMPLETAR BASE"
    };
    return nombres[modo] || "OPERACIÓN";
}

function mostrarResultadoPlaceholder(nombreOp) {
    const prev = document.getElementById("resultadoEVSection");
    if (prev) prev.remove();

    const section = UI.createSection("resultadoEVSection", `RESULTADO: ${nombreOp}`);
    const h1 = document.createElement("h1");
    h1.style.textAlign = "center";
    h1.style.color = "var(--text-primary)";
    h1.style.padding = "1rem";
    h1.textContent = `Resultado de ${nombreOp}`;

    section.appendChild(h1);

    const article = document.getElementById("article");
    article.appendChild(section);
}

function limpiar(article) {
    while (article.firstChild) article.removeChild(article.firstChild);
}