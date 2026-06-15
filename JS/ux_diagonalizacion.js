import UI from "./ui.js";
import Auxiliares from "./auxiliares.js";
import { diagonalizarMatrizCompleta } from "./calculos.js";
import { crearSpanCelda, inputToSpan, spanToInput } from "./celdas.js";
import { ajustarAnchoColumna, configurarEventos } from "./eventos_celdas.js";
import { polinomioToString } from "./operaciones.js";

let currentTable = null;
let currentObserver = null;
let currentMode = "diagonalizacion";

// ==================== CREACIÓN DE MATRIZ EDITABLE ====================

function crearTd(row, col) {
    const td = document.createElement("td");
    const span = crearSpanCelda("", row, col);
    td.appendChild(span);
    return td;
}

function crearMatrizEditable(id, filas = 2, columnas = 2) {
    const card = document.createElement("div");
    card.className = "diag-matrix-card";

    const label = document.createElement("div");
    label.className = "diag-matrix-label";
    label.textContent = "A =";

    const container = document.createElement("div");
    container.className = "diag-matrix-container";

    const table = document.createElement("table");
    table.id = id;
    table.className = "diag-input-table";
    table.dataset.minRows = "2"; 
    table.dataset.minCols = "2"; 

    for (let i = 0; i < filas; i++) {
        const tr = document.createElement("tr");
        for (let j = 0; j < columnas; j++) {
            tr.appendChild(crearTd(i, j));
        }
        table.appendChild(tr);
    }

    container.appendChild(table);
    card.append(label, container);
    return { card, table };
}

// ==================== VALIDACIÓN ====================

function esMatrizCuadrada(table) {
    if (!table || !table.rows.length) return false;
    const filas = table.rows.length;
    const columnas = table.rows[0]?.cells.length || 0;
    return filas === columnas;
}

function actualizarEstadoBotonCalcular(table, btnCalcular) {
    if (!btnCalcular) return;
    
    const esCuadrada = esMatrizCuadrada(table);
    const hayErrores = Auxiliares.tablaTieneErrores(table);
    
    if (!esCuadrada) {
        btnCalcular.disabled = true;
        btnCalcular.style.opacity = "0.5";
        btnCalcular.style.cursor = "not-allowed";
        btnCalcular.title = "La matriz debe ser cuadrada";
    } else if (hayErrores) {
        btnCalcular.disabled = true;
        btnCalcular.style.opacity = "0.5";
        btnCalcular.style.cursor = "not-allowed";
        btnCalcular.title = "Corrige los valores en rojo";
    } else {
        btnCalcular.disabled = false;
        btnCalcular.style.opacity = "1";
        btnCalcular.style.cursor = "pointer";
        btnCalcular.title = "Diagonalizar matriz";
    }
}

// ==================== RENDERIZADO DE RESULTADOS ====================

function crearMatrizHTML(matriz) {
    if (!matriz || matriz.length === 0) return document.createTextNode("");
    
    const table = document.createElement("table");
    table.className = "result-table";
    table.style.display = "inline-table";
    table.style.margin = "0 10px";
    
    for (const fila of matriz) {
        const tr = document.createElement("tr");
        for (const valor of fila) {
            const td = document.createElement("td");
            td.style.padding = "4px 8px";
            td.style.textAlign = "center";
            
            // Verificar si es un valor especial con raíz
            if (valor && valor.tipo === "raiz") {
                td.appendChild(crearRaizHTML({
                    tipo: "raiz",
                    parteReal: valor.parteReal,
                    coeficiente: valor.coeficiente,
                    radicando: valor.radicando
                }));
            } else {
                const str = Auxiliares.fraccionToString(valor);
                if (str.includes("/")) {
                    const [num, den] = str.split("/");
                    td.innerHTML = `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
                } else {
                    td.textContent = str;
                }
            }
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    return table;
}
function crearMatrizPolinomiosHTML(M) {
    if (!M || M.length === 0) return document.createTextNode("");
    
    const table = document.createElement("table");
    table.className = "result-table";
    table.style.display = "inline-table";
    table.style.margin = "0 10px";
    
    for (const fila of M) {
        const tr = document.createElement("tr");
        for (const pol of fila) {
            const td = document.createElement("td");
            td.style.padding = "4px 8px";
            td.style.textAlign = "center";
            td.textContent = polinomioToString(pol);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    return table;
}

function crearFactorHTML(factor) {
    const span = document.createElement("span");
    span.className = "factor-item";
    
    if (factor.tipo === "constante") {
        const valor = factor.valor;
        if (valor.num === -1 && valor.den === 1) {
            span.textContent = "-";
        } else {
            span.textContent = Auxiliares.fraccionToString(valor);
        }
        return span;
    }
    
    if (factor.tipo === "lineal") {
        const a = factor.coeficientes[1];
        const b = factor.coeficientes[0];
        if (a.num === 1 && a.den === 1) {
            if (b.num === 0) {
                span.textContent = "λ";
            } else if (b.num < 0) {
                const positivo = { num: -b.num, den: b.den };
                span.textContent = `(λ + ${Auxiliares.fraccionToString(positivo)})`;
            } else {
                span.textContent = `(λ - ${Auxiliares.fraccionToString(b)})`;
            }
        } else {
            span.textContent = `(${polinomioToString(factor.coeficientes)})`;
        }
        return span;
    }
    
    if (factor.tipo === "cuadratico") {
        span.textContent = `(${polinomioToString(factor.coeficientes)})`;
        return span;
    }
    
    span.textContent = "?";
    return span;
}

function crearRaizHTML(raiz) {
    if (!raiz) return document.createTextNode("");
    
    if (raiz.tipo === "exacta") {
        const texto = Auxiliares.fraccionToString(raiz.valor);
        if (texto.includes("/")) {
            const [num, den] = texto.split("/");
            const span = document.createElement("span");
            span.className = "frac";
            span.innerHTML = `<span class="top">${num}</span><span class="bottom">${den}</span>`;
            return span;
        }
        return document.createTextNode(texto);
    }
    
    if (raiz.tipo === "raiz") {
        const container = document.createElement("span");
        container.style.display = "inline-flex";
        container.style.alignItems = "center";
        container.style.gap = "2px";
        
        if (raiz.parteReal) {
            const realSpan = document.createElement("span");
            realSpan.textContent = Auxiliares.fraccionToString(raiz.parteReal);
            container.appendChild(realSpan);
        }
        
        const signSpan = document.createElement("span");
        const coefVal = raiz.coeficiente.num / raiz.coeficiente.den;
        signSpan.textContent = coefVal > 0 ? " + " : " - ";
        container.appendChild(signSpan);
        
        const coefAbs = { num: Math.abs(raiz.coeficiente.num), den: raiz.coeficiente.den };
        const coefValAbs = coefAbs.num / coefAbs.den;
        
        if (coefValAbs !== 1) {
            const coefSpan = document.createElement("span");
            if (coefAbs.den === 1) {
                coefSpan.textContent = coefAbs.num.toString();
            } else {
                coefSpan.className = "frac";
                coefSpan.innerHTML = `<span class="top">${coefAbs.num}</span><span class="bottom">${coefAbs.den}</span>`;
            }
            container.appendChild(coefSpan);
        }
        
        const rootSymbol = document.createElement("span");
        rootSymbol.textContent = "√";
        rootSymbol.style.fontSize = "1.2em";
        container.appendChild(rootSymbol);
        
        const radicandoSpan = document.createElement("span");
        radicandoSpan.style.borderTop = "1px solid currentColor";
        radicandoSpan.style.paddingTop = "2px";
        radicandoSpan.style.marginLeft = "2px";
        
        const rad = raiz.radicando;
        if (rad.den === 1) {
            radicandoSpan.textContent = rad.num.toString();
        } else {
            const fracSpan = document.createElement("span");
            fracSpan.className = "frac";
            fracSpan.innerHTML = `<span class="top">${rad.num}</span><span class="bottom">${rad.den}</span>`;
            radicandoSpan.appendChild(fracSpan);
        }
        
        container.appendChild(radicandoSpan);
        return container;
    }
    
    if (raiz.tipo === "complejo") {
        const span = document.createElement("span");
        if (raiz.parteReal) {
            span.textContent = `${Auxiliares.fraccionToString(raiz.parteReal)} ± i√?`;
        } else {
            span.textContent = `± i√?`;
        }
        return span;
    }
    
    return document.createTextNode("");
}

function mostrarResultados(article, resultados) {
    const prev = document.getElementById("diagResultSection");
    if (prev) prev.remove();
    
    const section = UI.createSection("diagResultSection", "RESULTADO: DIAGONALIZACIÓN");
    section.className = "diag-results-section";
    const content = document.createElement("div");
    content.className = "diag-results-content";
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.gap = "1rem";
    content.style.alignItems = "flex-start";
    
    // 1. Matriz A
    const matrizALine = document.createElement("div");
    matrizALine.style.display = "flex";
    matrizALine.style.alignItems = "center";
    matrizALine.style.flexWrap = "wrap";
    matrizALine.style.gap = "10px";
    matrizALine.innerHTML = "<strong>A =</strong>";
    matrizALine.appendChild(crearMatrizHTML(resultados.matrizOriginal));
    content.appendChild(matrizALine);
    
    // 2. λI - A
    const lambdaILine = document.createElement("div");
    lambdaILine.style.display = "flex";
    lambdaILine.style.alignItems = "center";
    lambdaILine.style.flexWrap = "wrap";
    lambdaILine.style.gap = "10px";
    lambdaILine.innerHTML = "<strong>λI - A =</strong>";
    lambdaILine.appendChild(crearMatrizPolinomiosHTML(resultados.lambdaImenosA));
    content.appendChild(lambdaILine);
    
    // 3. Determinante como matriz
    const n = resultados.matrizOriginal.length;
    const identidad = Array(n).fill().map(() => Array(n).fill());
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                identidad[i][j] = `λ - ${Auxiliares.fraccionToString(resultados.matrizOriginal[i][j])}`;
            } else {
                identidad[i][j] = `-${Auxiliares.fraccionToString(resultados.matrizOriginal[i][j])}`;
            }
        }
    }
    
    const detLine = document.createElement("div");
    detLine.style.display = "flex";
    detLine.style.alignItems = "center";
    detLine.style.flexWrap = "wrap";
    detLine.style.gap = "10px";
    detLine.innerHTML = "<strong>det(λI - A) =</strong>";
    
    const detMatrix = document.createElement("span");
    detMatrix.style.display = "inline-block";
    detMatrix.style.verticalAlign = "middle";
    const detTable = document.createElement("table");
    detTable.className = "result-table";
    detTable.style.display = "inline-table";
    detTable.style.margin = "0";
    for (let i = 0; i < n; i++) {
        const tr = document.createElement("tr");
        for (let j = 0; j < n; j++) {
            const td = document.createElement("td");
            td.style.padding = "4px 8px";
            td.style.textAlign = "center";
            td.textContent = identidad[i][j];
            tr.appendChild(td);
        }
        detTable.appendChild(tr);
    }
    detMatrix.appendChild(detTable);
    detLine.appendChild(detMatrix);
    detLine.appendChild(document.createTextNode(" = 0"));
    content.appendChild(detLine);
    
    // 4. Polinomio característico
    const polLine = document.createElement("div");
    polLine.style.display = "flex";
    polLine.style.alignItems = "center";
    polLine.style.flexWrap = "wrap";
    polLine.style.gap = "10px";
    polLine.innerHTML = `${polinomioToString(resultados.polinomioCaracteristico)} = 0`;
    content.appendChild(polLine);
    
    // 5. Polinomio factorizado
    const factoresDiv = document.createElement("div");
    factoresDiv.style.display = "flex";
    factoresDiv.style.alignItems = "center";
    factoresDiv.style.flexWrap = "wrap";
    factoresDiv.style.gap = "5px";
    for (const factor of resultados.factoresPolinomio) {
        factoresDiv.appendChild(crearFactorHTML(factor));
    }
    factoresDiv.appendChild(document.createTextNode(" = 0"));
    content.appendChild(factoresDiv);
    
    // 6. Valores propios
    const vpLine = document.createElement("div");
    vpLine.style.display = "flex";
    vpLine.style.alignItems = "center";
    vpLine.style.flexWrap = "wrap";
    vpLine.style.gap = "10px";
    vpLine.innerHTML = "<strong>Valores propios =</strong> { ";
    
    if (resultados.raices && resultados.raices.length > 0) {
        resultados.raices.forEach((raiz, idx) => {
            vpLine.appendChild(crearRaizHTML(raiz));
            if (idx < resultados.raices.length - 1) {
                vpLine.appendChild(document.createTextNode(", "));
            }
        });
    } else {
        vpLine.appendChild(document.createTextNode("No hay valores propios reales"));
    }
    vpLine.appendChild(document.createTextNode(" }"));
    content.appendChild(vpLine);
    
    // 7. Matriz diagonal D 
    const DLine = document.createElement("div");
    DLine.style.display = "flex";
    DLine.style.alignItems = "center";
    DLine.style.flexWrap = "wrap";
    DLine.style.gap = "10px";
    DLine.innerHTML = "<strong>D =</strong>";
    
    if (resultados.diagonalizacion.esDiagonalizable && resultados.matrizDiagonal) {
        DLine.appendChild(crearMatrizHTML(resultados.matrizDiagonal));
    } else {
        const noDiagSpan = document.createElement("span");
        noDiagSpan.textContent = "No es diagonalizable en ℝ";
        noDiagSpan.style.fontStyle = "italic";
        noDiagSpan.style.color = "var(--text-muted)";
        DLine.appendChild(noDiagSpan);
    }
    content.appendChild(DLine);
    
    // 8. Mensaje final
    const mensajeLine = document.createElement("div");
    mensajeLine.style.fontWeight = "bold";
    mensajeLine.style.marginTop = "10px";
    mensajeLine.style.padding = "10px";
    mensajeLine.style.borderRadius = "8px";
    mensajeLine.style.backgroundColor = resultados.diagonalizacion.esDiagonalizable ? "rgba(0,200,0,0.1)" : "rgba(200,0,0,0.1)";
    mensajeLine.style.borderLeft = `4px solid ${resultados.diagonalizacion.esDiagonalizable ? "green" : "red"}`;
    mensajeLine.textContent = resultados.diagonalizacion.razon;
    content.appendChild(mensajeLine);
    
    section.appendChild(content);
    article.appendChild(section);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
}
function mostrarError(article, mensaje) {
    const prev = document.getElementById("diagResultSection");
    if (prev) prev.remove();
    
    const section = UI.createSection("diagResultSection", "ERROR");
    const error = document.createElement("div");
    error.className = "resultado-mensaje mensaje-error";
    error.textContent = `Error: ${mensaje}`;
    section.appendChild(error);
    article.appendChild(section);
}

// ==================== MANEJO DE MATRIZ ====================

function leerMatriz(table) {
    if (!table) throw new Error("Tabla no encontrada");
    
    const filas = [];
    for (let i = 0; i < table.rows.length; i++) {
        const fila = [];
        for (let j = 0; j < table.rows[i].cells.length; j++) {
            const cell = table.rows[i].cells[j];
            const input = cell.querySelector("input");
            const span = cell.querySelector(".cell-span");
            let valor = "";
            
            if (input) {
                valor = input.value.trim();
            } else if (span) {
                valor = span.getAttribute("data-value") || "";
            } else {
                valor = cell.textContent.trim();
            }
            
            const valorFinal = valor === "" ? "0" : valor;
            
            if (!Auxiliares.esValorNumericoValido(valorFinal, true)) {
                throw new Error(`Valor inválido en fila ${i + 1}, columna ${j + 1}: "${valor}"`);
            }
            
            fila.push(Auxiliares.normalizarSigno(Auxiliares.parsearFraccion(valorFinal)));
        }
        filas.push(fila);
    }
    return filas;
}

function limpiarResultados() {
    const prev = document.getElementById("diagResultSection");
    if (prev) prev.remove();
}

function limpiarMatriz() {
    if (!currentTable) return;
    
    const celdas = currentTable.querySelectorAll(".cell-span");
    celdas.forEach(span => {
        span.setAttribute("data-value", "");
        span.textContent = "";
        span.innerHTML = "";
        span.classList.remove("cell-error", "cell-error-pulse");
    });
    
    const inputs = currentTable.querySelectorAll(".cell-input");
    inputs.forEach(input => {
        input.value = "";
        input.classList.remove("cell-error", "cell-error-pulse");
    });
    
    limpiarResultados();
    
    const btnCalcular = document.getElementById("btnDiagonalizar");
    if (btnCalcular) {
        btnCalcular.disabled = false;
        btnCalcular.style.opacity = "1";
        btnCalcular.title = "";
    }
    
    setTimeout(() => {
        const firstSpan = currentTable.querySelector(".cell-span");
        if (firstSpan) {
            const input = spanToInput(firstSpan);
            if (input) {
                input.focus();
                input.select();
            }
        }
    }, 20);
}

function finalizarTodasLasEntradas() {
    if (!currentTable) return;
    currentTable.querySelectorAll(".cell-input").forEach(input => inputToSpan(input));
}

function diagonalizar() {
    if (!currentTable) return;
    
    try {
        finalizarTodasLasEntradas();
        
        if (!esMatrizCuadrada(currentTable)) {
            const filas = currentTable.rows.length;
            const columnas = currentTable.rows[0]?.cells.length || 0;
            throw new Error(`La matriz debe ser cuadrada. Actualmente tiene ${filas}×${columnas}.`);
        }
        
        const matriz = leerMatriz(currentTable);
        const resultados = diagonalizarMatrizCompleta(matriz);
        mostrarResultados(document.getElementById("article"), resultados);
    } catch (error) {
        mostrarError(document.getElementById("article"), error.message);
    }
}

// ==================== EVENTOS ====================

function configurarEventosDiag(section, table) {
    const btnRaiz = document.getElementById("btnRaizDiag");
    if (btnRaiz) {
        btnRaiz.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const { insertarRaiz } = await import("./celdas.js");
            insertarRaiz();
            const filas = table.rows.length;
            const cols = table.rows[0]?.cells.length ?? 0;
            const n = Math.max(2, Math.min(filas, cols));
            table.dataset.minRows = String(n);
            table.dataset.minCols = String(n);
        });
    }
    
    const btnDiagonalizar = document.getElementById("btnDiagonalizar");
    if (btnDiagonalizar) {
        const newBtn = btnDiagonalizar.cloneNode(true);
        btnDiagonalizar.parentNode.replaceChild(newBtn, btnDiagonalizar);
        newBtn.onclick = diagonalizar;
    }
    
    const btnLimpiar = document.getElementById("btnLimpiarDiag");
    if (btnLimpiar) {
        const newBtn = btnLimpiar.cloneNode(true);
        btnLimpiar.parentNode.replaceChild(newBtn, btnLimpiar);
        newBtn.onclick = limpiarMatriz;
    }
    
    if (currentObserver) currentObserver.disconnect();
    
    currentObserver = new MutationObserver(() => {
        const btnCalc = document.getElementById("btnDiagonalizar");
        actualizarEstadoBotonCalcular(table, btnCalc);
    });
    
    currentObserver.observe(table, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "data-value"]
    });
    
    const btnCalc = document.getElementById("btnDiagonalizar");
    actualizarEstadoBotonCalcular(table, btnCalc);
}

// ==================== INICIALIZACIÓN PRINCIPAL ====================

export function inicializarDiagonalizacion(article) {
    while (article.firstChild) article.removeChild(article.firstChild);
    
    const mainSection = UI.createSection("mainSection", "DIAGONALIZACIÓN DE MATRICES");
    mainSection.classList.add("diag-section");
    
    const { card, table } = crearMatrizEditable("diagInputTable", 2, 2);
    currentTable = table;
    
    const btnRaiz = document.createElement("button");
    btnRaiz.type = "button";
    btnRaiz.id = "btnRaizDiag";
    btnRaiz.className = "btn-raiz";
    btnRaiz.textContent = "√";
    btnRaiz.title = "Insertar raíz cuadrada";
    
    btnRaiz.addEventListener("mousedown", (e) => {
        e.preventDefault();
    });
    
    const btnDiagonalizar = UI.createButton("btnDiagonalizar", "Diagonalizar", "btnCalcular");
    btnDiagonalizar.type = "button";
    
    const btnLimpiar = UI.createButton("btnLimpiarDiag", "Borrar matriz", "btnCalcular btnLimpiarEV");
    btnLimpiar.type = "button";
    
    const buttonGroup = document.createElement("div");
    buttonGroup.className = "diag-actions";
    buttonGroup.append(btnRaiz, btnDiagonalizar, btnLimpiar);
    
    mainSection.appendChild(card);
    mainSection.appendChild(buttonGroup);
    article.appendChild(mainSection);
    
    configurarEventos(article, table, currentMode);
    configurarEventosDiag(mainSection, table);
    
    setTimeout(() => {
        const firstSpan = table.querySelector(".cell-span");
        if (firstSpan) {
            const input = spanToInput(firstSpan);
            if (input) {
                input.focus();
                input.select();
            }
        }
    }, 100);
}