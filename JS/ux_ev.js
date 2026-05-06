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
            agregarNuevoVector(currentRow);
            sincronizarMatrizDesdeVectores();
        },
        onSpace: (r, c) => {
            guardarVectoresDesdeTabla();
            agregarComponenteATodos(c);
            sincronizarMatrizDesdeVectores();
        },
        onBackspace: (rowIndex, colIndex, tipo) => {
            guardarVectoresDesdeTabla();
            
            const esPertenecer = currentOperation === "pertenecer";
            const totalVectores = vectoresHorizontales.length;
            const esVectorB = esPertenecer && (rowIndex === totalVectores - 1);
            
            // En modo pertenecer, no permitir eliminar el vector B
            if (esPertenecer && esVectorB) {
                // Solo limpiar el contenido de B, no eliminar la fila
                if (tipo === 'fila' || tipo === 'ambos') {
                    const numComp = vectoresHorizontales[0]?.length || 2;
                    vectoresHorizontales[rowIndex] = Array(numComp).fill("");
                    construirFilasVectores();
                    setTimeout(() => enfocarCelda(rowIndex, 0), 30);
                    return;
                }
            }
            
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
            verificarEliminarFilasColumnas();
            sincronizarMatrizDesdeVectores();
            
            // Reubicar el foco después de la reconstrucción del DOM
            setTimeout(() => {
                const maxFila = Math.max(0, vectoresHorizontales.length - 1);
                const maxCol = Math.max(0, (vectoresHorizontales[0]?.length || 2) - 1);
                
                let newRow = tipo === 'fila' || tipo === 'ambos' ? rowIndex - 1 : rowIndex;
                let newCol = tipo === 'columna' || tipo === 'ambos' ? colIndex - 1 : colIndex;
                
                newRow = Math.max(0, Math.min(newRow, maxFila));
                newCol = Math.max(0, Math.min(newCol, maxCol));
                
                enfocarCelda(newRow, newCol);
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
    
    // En modo pertenecer, el último vector es B y debe tener separador antes
    vectoresHorizontales.forEach((vector, i) => {
        const esUltimo = (i === numVectores - 1);
        const esVectorB = esPertenecer && esUltimo;
        
        // Agregar separador ANTES del vector B en modo pertenecer
        if (esPertenecer && esVectorB) {
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
    
    // Botón agregar vector
    const rowBtn = document.createElement("tr");
    const cellBtn = document.createElement("td");
    cellBtn.colSpan = numComponentes + 1;
    const btnAgregar = document.createElement("button");
    btnAgregar.textContent = "+ Agregar Vector";
    btnAgregar.className = "btn-agregar-vector";
    btnAgregar.onclick = () => {
        guardarVectoresDesdeTabla();
        agregarNuevoVector(currentRow);
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
    const esPertenecer = currentOperation === "pertenecer";
    
    if (esPertenecer) {
        // En modo pertenecer, no permitir agregar después del vector B
        const maxIndice = vectoresHorizontales.length - 1;
        const indiceInsercion = Math.min(indiceFila + 1, maxIndice);
        
        // Insertar el nuevo vector en la posición calculada
        vectoresHorizontales.splice(indiceInsercion, 0, Array(numComp).fill(""));
        construirFilasVectores();
        
        // Enfocar la primera celda del nuevo vector
        setTimeout(() => enfocarCelda(indiceInsercion, 0), 10);
    } else {
        // Modo normal: agregar justo debajo de la fila actual
        const indiceInsercion = indiceFila + 1;
        vectoresHorizontales.splice(indiceInsercion, 0, Array(numComp).fill(""));
        construirFilasVectores();
        
        // Enfocar la primera celda del nuevo vector
        setTimeout(() => enfocarCelda(indiceInsercion, 0), 10);
    }
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
    const esPertenecer = currentOperation === "pertenecer";
    
    // Borrar filas que solo tengan celdas vacías o espacios (excepto el vector B en modo pertenecer)
    vectoresHorizontales = vectoresHorizontales.filter((fila, index) => {
        const esVectorB = esPertenecer && (index === vectoresHorizontales.length - 1);
        if (esVectorB) return true; // Nunca eliminar el vector B
        
        return fila.some(celda => {
            const v = String(celda || "").trim();
            return v !== "" && v !== "0";
        });
    });
    
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
    
    construirFilasVectores();
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
        "li": "CLASIFICACIÓN LI / LD",
        "pertenecer": "PERTENENCIA AL ESPACIO GENERADO",
        "base": "BASE DEL ESPACIO VECTORIAL",
        "completar": "COMPLETACIÓN DE BASE"
    };
    return nombres[modo] || "RESULTADO";
}

function mostrarResultadoEV(resultado, operacion) {
    const prev = document.getElementById("resultadoEVSection");
    if (prev) prev.remove();

    const section = UI.createSection("resultadoEVSection", `RESULTADO: ${getNombreOperacion(operacion)}`);
    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.alignItems = "center";
    content.style.gap = "1.5rem";

    // Agregar el label V = antes de la matriz
    if (resultado.matrizReducida) {
        const wrapperMatriz = document.createElement("div");
        wrapperMatriz.className = "result-wrapper";
        wrapperMatriz.style.marginBottom = "1rem";

        const label = document.createElement("div");
        label.className = "result-label";
        label.textContent = "V =";
        label.style.fontSize = "2rem";
        label.style.fontWeight = "700";
        label.style.color = "var(--primary)";
        label.style.padding = "0.5rem 0.8rem";
        label.style.whiteSpace = "nowrap";

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
                    td.classList.add("separator-col");
                }
                tr.appendChild(td);
            });
            tabla.appendChild(tr);
        });

        matrixContainer.appendChild(tabla);
        wrapperMatriz.appendChild(label);
        wrapperMatriz.appendChild(matrixContainer);
        content.appendChild(wrapperMatriz);
    }

    // Mensaje de resultado con estilo más destacado
    const mensajeDiv = document.createElement("div");
    mensajeDiv.style.cssText = `
        text-align: center;
        padding: 1rem 2rem;
        border-radius: 12px;
        font-weight: 700;
        font-size: 1.2rem;
        letter-spacing: 0.5px;
        width: 100%;
    `;

    switch (operacion) {
        case "li":
            mensajeDiv.textContent = resultado.esLI ? "LINEALMENTE INDEPENDIENTE" : "LINEALMENTE DEPENDIENTE";
            mensajeDiv.style.backgroundColor = resultado.esLI ? "rgba(0, 200, 160, 0.15)" : "rgba(255, 59, 92, 0.15)";
            mensajeDiv.style.color = resultado.esLI ? "var(--success)" : "var(--error)";
            mensajeDiv.style.borderLeft = `4px solid ${resultado.esLI ? "var(--success)" : "var(--error)"}`;
            break;
        case "pertenecer":
            mensajeDiv.textContent = resultado.pertenece ? "EL VECTOR PERTENECE AL ESPACIO GENERADO" : "EL VECTOR NO PERTENECE AL ESPACIO GENERADO";
            mensajeDiv.style.backgroundColor = resultado.pertenece ? "rgba(0, 200, 160, 0.15)" : "rgba(255, 59, 92, 0.15)";
            mensajeDiv.style.color = resultado.pertenece ? "var(--success)" : "var(--error)";
            mensajeDiv.style.borderLeft = `4px solid ${resultado.pertenece ? "var(--success)" : "var(--error)"}`;
            break;
        case "base":
            mensajeDiv.textContent = resultado.columnasEliminadas?.length === 0
                ? "EL CONJUNTO YA ES UNA BASE"
                : `BASE ENCONTRADA: ${resultado.base.length} VECTORES`;
            mensajeDiv.style.backgroundColor = "rgba(0, 200, 160, 0.15)";
            mensajeDiv.style.color = "var(--success)";
            mensajeDiv.style.borderLeft = "4px solid var(--success)";
            break;
        case "completar":
            mensajeDiv.textContent = resultado.canonicosAgregados?.length === 0
                ? "LA BASE YA ESTÁ COMPLETA"
                : `BASE COMPLETADA CON ${resultado.canonicosAgregados.length} CANÓNICOS`;
            mensajeDiv.style.backgroundColor = "rgba(0, 200, 160, 0.15)";
            mensajeDiv.style.color = "var(--success)";
            mensajeDiv.style.borderLeft = "4px solid var(--success)";
            break;
    }
    content.appendChild(mensajeDiv);

    if (operacion === "base") {
        if (resultado.columnasEliminadas?.length > 0) {
            const p = document.createElement("p");
            p.textContent = `Vectores eliminados: ${resultado.columnasEliminadas.map(c => c + 1).join(", ")}`;
            p.style.cssText = `
                color: var(--text-secondary);
                margin: 0;
                padding: 0.5rem 1rem;
                background: rgba(255, 59, 92, 0.1);
                border-radius: 6px;
            `;
            content.appendChild(p);
        }

        if (resultado.base && resultado.base.length > 0) {
            const baseContainer = document.createElement("div");
            baseContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                align-items: center;
                margin-top: 0.5rem;
                padding: 1rem;
                background: var(--bg-surface);
                border-radius: 8px;
                border: 1px solid var(--border);
                width: 100%;
            `;

            const baseTitle = document.createElement("p");
            baseTitle.textContent = "VECTORES DE LA BASE";
            baseTitle.style.cssText = `
                color: var(--primary);
                font-weight: 700;
                margin: 0;
                font-size: 0.9rem;
                letter-spacing: 1px;
            `;
            baseContainer.appendChild(baseTitle);

            resultado.base.forEach((vector, idx) => {
                const vectorStr = vector.map(v => Auxiliares.fraccionToString(v)).join(", ");
                const p = document.createElement("p");
                p.textContent = `v${resultado.columnasPivote ? resultado.columnasPivote[idx] + 1 : idx + 1} = (${vectorStr})`;
                p.style.cssText = `
                    color: var(--text-primary);
                    margin: 0;
                    font-family: monospace;
                    font-size: 0.95rem;
                `;
                baseContainer.appendChild(p);
            });

            content.appendChild(baseContainer);
        }
    }

    if (operacion === "completar" && resultado.canonicosAgregados?.length > 0) {
        const p = document.createElement("p");
        p.textContent = `Canónicos agregados: ${resultado.canonicosAgregados.map(i => `e${i + 1}`).join(", ")}`;
        p.style.cssText = `
            color: var(--text-secondary);
            margin: 0;
            padding: 0.5rem 1rem;
            background: rgba(0, 200, 160, 0.1);
            border-radius: 6px;
            font-weight: 500;
        `;
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