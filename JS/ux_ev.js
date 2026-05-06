import UI from "./ui.js";
import { crearSpanCelda } from "./celdas.js";
import { configurarEventosEV, desconfigurarEventosEV } from "./eventos_ev.js";
import Auxiliares from "./auxiliares.js";
import { clasificarLIoLD, perteneceAS, hallarBase, completarBase } from "./calculos.js";

let currentOperation = "li";
let vectoresHorizontales = [["", ""], ["", ""]];
let tablaVectores = null;
let currentRow = 0;
let currentCol = 0;

export function cambiarOperacionEV(article, modo) {
    guardarVectoresDesdeTabla();
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

    const btnText = getBotonTexto(modo);
    const btnCalcular = UI.createButton("btnCalcularEV", btnText, "btnCalcular");
    btnCalcular.onclick = () => {
        guardarVectoresDesdeTabla();
        sincronizarMatrizDesdeVectores();

        const esPertenecer = currentOperation === "pertenecer";
        const matriz = Auxiliares.parsearVectoresAMatriz(vectoresHorizontales, !esPertenecer);

        let resultado;

        switch (currentOperation) {
            case "li":
                resultado = clasificarLIoLD(matriz);
                break;
            case "pertenecer":
                resultado = calcularPertenencia(matriz);
                break;
            case "base":
                resultado = hallarBase(matriz);
                break;
            case "completar":
                resultado = completarBase(matriz);
                break;
        }

        mostrarResultadoEV(resultado, currentOperation);
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
        onBackspace: (rowIndex, colIndex, tipo) => {
            guardarVectoresDesdeTabla(); //

            // ELIMINACIÓN ACTIVA SEGÚN EL TIPO ENVIADO POR EL EVENTO
            if (tipo === 'fila' || tipo === 'ambos') {
                if (vectoresHorizontales.length > 2) {
                    vectoresHorizontales.splice(rowIndex, 1);
                }
            }

            if (tipo === 'columna' || tipo === 'ambos') {
                if (vectoresHorizontales[0]?.length > 2) {
                    vectoresHorizontales.forEach(v => v.splice(colIndex, 1));
                }
            }

            // Sincronizar y reconstruir la interfaz
            verificarEliminarFilasColumnas(); //
            sincronizarMatrizDesdeVectores(); //[cite: 5]

            // Reubicar el foco después de la reconstrucción del DOM
            setTimeout(() => {
                const maxFila = Math.max(0, vectoresHorizontales.length - 1);
                const maxCol = Math.max(0, (vectoresHorizontales[0]?.length || 2) - 1);

                let newRow = tipo === 'fila' || tipo === 'ambos' ? rowIndex - 1 : rowIndex;
                let newCol = tipo === 'columna' || tipo === 'ambos' ? colIndex - 1 : colIndex;

                newRow = Math.max(0, Math.min(newRow, maxFila));
                newCol = Math.max(0, Math.min(newCol, maxCol));

                enfocarCelda(newRow, newCol); //[cite: 5]
            }, 30);
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
    const numVectores = vectoresHorizontales.length;
    const esPertenecer = currentOperation === "pertenecer";

    vectoresHorizontales.forEach((vector, i) => {
        const esUltimo = (i === numVectores - 1);
        const esVectorB = esPertenecer && esUltimo;

        if (esVectorB) {
            const rowSep = document.createElement("tr");
            const cellSep = document.createElement("td");
            cellSep.colSpan = numComponentes + 1;
            cellSep.style.borderTop = "2px solid var(--primary)";
            cellSep.style.padding = "0";
            rowSep.appendChild(cellSep);
            tablaVectores.appendChild(rowSep);
        }

        const row = document.createElement("tr");
        const labelCell = document.createElement("td");
        const label = esVectorB ? "B =" : `v${i + 1} =`;
        labelCell.innerHTML = `<span style="color:var(--primary); font-weight:600;">${label}</span>`;
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
    const esPertenecer = currentOperation === "pertenecer";
    const columnasTotales = esPertenecer ? numVectores : numVectores + 1;

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
                cell.textContent = "0";
            }

            row.appendChild(cell);
        }

        table.appendChild(row);
    }

    actualizarSeparadorMatriz(table);
}

function actualizarSeparadorMatriz(table) {
    if (!table || !table.rows.length) return;

    const esPertenecer = currentOperation === "pertenecer";
    const numVectores = vectoresHorizontales.length;
    const sep = esPertenecer ? numVectores - 2 : numVectores - 1;

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

    filas.forEach((fila) => {
        const celdas = fila.querySelectorAll(".cell-span, .cell-input");
        if (celdas.length === 0) return;
        if (fila.querySelector(".btn-agregar-vector")) return;

        const vector = Array.from(celdas).map(el =>
            el.tagName === "INPUT" ? el.value : (el.getAttribute("data-value") || "")
        );
        nuevosDatos.push(vector);
    });

    if (nuevosDatos.length > 0) {
        vectoresHorizontales = nuevosDatos;
    }
}
function verificarEliminarFilasColumnas() {
    // Borrar filas que solo tengan celdas vacías o espacios
    vectoresHorizontales = vectoresHorizontales.filter(fila => 
        fila.some(celda => {
            const v = String(celda || "").trim();
            return v !== "" && v !== "0"; 
        })
    );

    // Seguridad: Mínimo 2 vectores (filas) siempre
    while (vectoresHorizontales.length < 2) {
        const c = vectoresHorizontales[0]?.length || 2;
        vectoresHorizontales.push(new Array(c).fill(""));
    }

    // Borrar columnas vacías
    if (vectoresHorizontales.length > 0) {
        const totalCols = vectoresHorizontales[0].length;
        let colsAKeep = [];

        for (let j = 0; j < totalCols; j++) {
            let tieneData = vectoresHorizontales.some(f => {
                const v = String(f[j] || "").trim();
                return v !== "" && v !== "0";
            });
            if (tieneData || totalCols <= 2) colsAKeep.push(j);
        }

        vectoresHorizontales = vectoresHorizontales.map(f => 
            colsAKeep.map(idx => f[idx])
        );
    }

    construirFilasVectores(); // Redibujar el HTML
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

function mostrarResultadoEV(resultado, operacion) {
    const prev = document.getElementById("resultadoEVSection");
    if (prev) prev.remove();

    const section = UI.createSection("resultadoEVSection", `RESULTADO: ${getNombreOperacion(operacion)}`);
    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.alignItems = "center";
    content.style.gap = "1rem";

    const mensaje = document.createElement("h3");
    mensaje.style.textAlign = "center";

    switch (operacion) {
        case "li":
            mensaje.textContent = resultado.esLI ? "🔵 Linealmente Independiente" : "🔴 Linealmente Dependiente";
            mensaje.style.color = resultado.esLI ? "var(--success)" : "var(--error)";
            break;
        case "pertenecer":
            mensaje.textContent = resultado.pertenece ? "✅ El vector SÍ pertenece a S" : "❌ El vector NO pertenece a S";
            mensaje.style.color = resultado.pertenece ? "var(--success)" : "var(--error)";
            break;
        case "base":
            mensaje.textContent = resultado.columnasEliminadas?.length === 0
                ? "✅ El conjunto ya era una base"
                : `✅ Base encontrada: ${resultado.base.length} vectores`;
            mensaje.style.color = "var(--success)";
            break;
        case "completar":
            mensaje.textContent = resultado.canonicosAgregados?.length === 0
                ? "✅ La base ya estaba completa"
                : `✅ Base completada con ${resultado.canonicosAgregados.length} canónicos`;
            mensaje.style.color = "var(--success)";
            break;
    }
    content.appendChild(mensaje);

    if (resultado.matrizReducida) {
        const matrixContainer = document.createElement("div");
        matrixContainer.className = "result-matrix-container";
        const tabla = document.createElement("table");
        tabla.className = "result-table";

        const numCols = resultado.matrizReducida[0]?.length || 0;

        resultado.matrizReducida.forEach((fila) => {
            const tr = document.createElement("tr");
            fila.forEach((valor, j) => {
                const td = document.createElement("td");
                const str = Auxiliares.fraccionToString(valor);
                if (str.includes("/")) {
                    const [num, den] = str.split("/");
                    td.innerHTML = `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
                } else {
                    td.textContent = str;
                }
                if (j === numCols - 2 && numCols > 2) {
                    td.style.borderRight = "2px solid var(--primary)";
                }
                tr.appendChild(td);
            });
            tabla.appendChild(tr);
        });

        matrixContainer.appendChild(tabla);
        content.appendChild(matrixContainer);
    }

    if (operacion === "base") {
        if (resultado.columnasEliminadas?.length > 0) {
            const p = document.createElement("p");
            p.textContent = `🗑️ Vectores eliminados: ${resultado.columnasEliminadas.map(c => c + 1).join(", ")}`;
            p.style.color = "var(--text-secondary)";
            content.appendChild(p);
        }

        if (resultado.base && resultado.base.length > 0) {
            const baseContainer = document.createElement("div");
            baseContainer.style.display = "flex";
            baseContainer.style.flexDirection = "column";
            baseContainer.style.gap = "0.3rem";
            baseContainer.style.alignItems = "center";

            const baseTitle = document.createElement("p");
            baseTitle.textContent = "📐 Vectores de la base:";
            baseTitle.style.color = "var(--text-secondary)";
            baseTitle.style.fontWeight = "600";
            baseContainer.appendChild(baseTitle);

            resultado.base.forEach((vector, idx) => {
                const vectorStr = vector.map(v => Auxiliares.fraccionToString(v)).join(", ");
                const p = document.createElement("p");
                p.textContent = `v${resultado.columnasPivote ? resultado.columnasPivote[idx] + 1 : idx + 1} = (${vectorStr})`;
                p.style.color = "var(--text-primary)";
                p.style.margin = "0";
                baseContainer.appendChild(p);
            });

            content.appendChild(baseContainer);
        }
    }

    if (operacion === "completar" && resultado.canonicosAgregados?.length > 0) {
        const p = document.createElement("p");
        p.textContent = `📐 Canónicos agregados: ${resultado.canonicosAgregados.map(i => `e${i + 1}`).join(", ")}`;
        p.style.color = "var(--text-secondary)";
        content.appendChild(p);
    }

    section.appendChild(content);
    document.getElementById("article").appendChild(section);
}

function calcularPertenencia(matriz) {
    const numVectores = vectoresHorizontales.length;
    const matrizGeneradores = matriz.map(fila => fila.slice(0, numVectores - 1));
    const vectorB = matriz.map(fila => fila[numVectores - 1]);
    return perteneceAS(matrizGeneradores, vectorB);
}

function limpiar(article) {
    while (article.firstChild) article.removeChild(article.firstChild);
}