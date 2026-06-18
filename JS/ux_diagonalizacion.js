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
    const wrapper = document.createElement("div");
    wrapper.id = "wrapperA";
    wrapper.style.justifyContent = "center";
    wrapper.style.margin = "0 auto";

    const label = document.createElement("label");
    label.textContent = "A [γ↓] =";

    const divTable = document.createElement("div");
    divTable.id = "tableMain";

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

    divTable.appendChild(table);
    wrapper.append(label, divTable);
    return { card: wrapper, table };
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
    
    const container = document.createElement("div");
    container.className = "result-matrix-container";
    
    const table = document.createElement("table");
    table.className = "result-table";
    
    for (const fila of matriz) {
        const tr = document.createElement("tr");
        for (const valor of fila) {
            const td = document.createElement("td");
            
            if (valor && valor.tipo === "raiz") {
                const expr = {
                    tipo: "raiz",
                    coeficiente: valor.coeficiente,
                    radicando: valor.radicando,
                    parteReal: valor.parteReal
                };
                td.appendChild(Auxiliares.crearRaizHTML(expr));
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
    container.appendChild(table);
    return container;
}

function crearMatrizPolinomiosHTML(M) {
    if (!M || M.length === 0) return document.createTextNode("");
    
    const container = document.createElement("div");
    container.className = "result-matrix-container";
    
    const table = document.createElement("table");
    table.className = "result-table";
    
    for (let i = 0; i < M.length; i++) {
        const tr = document.createElement("tr");
        for (let j = 0; j < M[i].length; j++) {
            const pol = M[i][j];
            const esDiagonal = i === j;
            const td = document.createElement("td");
            
            if (pol.length === 2 && pol[1].num === -1 && pol[1].den === 1) {
                const a = pol[0];
                if (a.num === 0) {
                    td.textContent = "-λ";
                } else {
                    const constante = Auxiliares.fraccionToString(a);
                    td.textContent = `${constante} - λ`;
                }
            } 
            else if (pol.length === 2 && pol[1].num === 1 && pol[1].den === 1) {
                const a = pol[0];
                const negA = { num: -a.num, den: a.den };
                if (negA.num === 0) {
                    td.textContent = "λ";
                } else {
                    td.textContent = `${Auxiliares.fraccionToString(negA)} + λ`;
                }
            } 
            else if (pol.length === 1) {
                const val = pol[0];
                // En la diagonal, {num:-1,den:1} significa -λ (el coeficiente λ fue negado)
                if (esDiagonal && val.num === -1 && val.den === 1) {
                    td.textContent = "-λ";
                } else {
                    td.textContent = val.num === 0 ? "0" : Auxiliares.fraccionToString(val);
                }
            } 
            else {
                td.innerHTML = polinomioToHTML(polinomioToString(pol));
            }
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    container.appendChild(table);
    return container;
}
// Convierte exponentes en <sup> y los envuelve con nowrap para que λ² no se parta
function polinomioToHTML(str) {
    return str
        .replace(/λ\^(\d+)/g, "<span style='white-space:nowrap'>λ<sup>$1</sup></span>")
        .replace(/λ(\d+)/g,   "<span style='white-space:nowrap'>λ<sup>$1</sup></span>");
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
                span.innerHTML = "λ";
            } else if (b.num < 0) {
                const positivo = { num: -b.num, den: b.den };
                span.innerHTML = polinomioToHTML(`(λ + ${Auxiliares.fraccionToString(positivo)})`);
            } else {
                span.innerHTML = polinomioToHTML(`(λ - ${Auxiliares.fraccionToString(b)})`);
            }
        } else {
            span.innerHTML = `(${polinomioToHTML(polinomioToString(factor.coeficientes))})`;
        }
        return span;
    }
    
    if (factor.tipo === "cuadratico") {
        span.innerHTML = `(${polinomioToHTML(polinomioToString(factor.coeficientes))})`;
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
        container.className = "root-expression";
        
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
        rootSymbol.className = "root-symbol";
        rootSymbol.textContent = "√";
        container.appendChild(rootSymbol);
        
        const radicandoSpan = document.createElement("span");
        radicandoSpan.className = "root-radicando";
        
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
    const content = document.createElement("div");
    content.className = "diag-results-content";
    
    const n = resultados.matrizOriginal.length;
    
    // ===== 1. MATRIZ ORIGINAL A =====
    const matrizALine = document.createElement("div");
    matrizALine.className = "result-wrapper";
    const matrizALabel = document.createElement("div");
    matrizALabel.className = "result-label";
    matrizALabel.textContent = "A =";
    matrizALine.appendChild(matrizALabel);
    matrizALine.appendChild(crearMatrizHTML(resultados.matrizOriginal));
    content.appendChild(matrizALine);
    
    // ===== 2. MATRIZ A - λI =====
    const A_menos_lambdaI_Line = document.createElement("div");
    A_menos_lambdaI_Line.className = "result-wrapper";
    const A_menos_lambdaI_Label = document.createElement("div");
    A_menos_lambdaI_Label.className = "result-label";
    A_menos_lambdaI_Label.textContent = "A - λI =";
    A_menos_lambdaI_Line.appendChild(A_menos_lambdaI_Label);
    
    const A_menos_lambdaI = resultados.lambdaImenosA.map(fila =>
        fila.map(pol => pol.map(coef => ({ num: -coef.num, den: coef.den })))
    );
    A_menos_lambdaI_Line.appendChild(crearMatrizPolinomiosHTML(A_menos_lambdaI));
    content.appendChild(A_menos_lambdaI_Line);
    
    // ===== 3. DETERMINANTE det(A - λI) =====
    const detLine = document.createElement("div");
    detLine.className = "result-wrapper";
    const detLabel = document.createElement("div");
    detLabel.className = "result-label";
    detLabel.textContent = "det(A - λI) =";
    detLine.appendChild(detLabel);
    
    const detMatrix = document.createElement("div");
    detMatrix.className = "result-matrix-container det-primary";
    const detTable = document.createElement("table");
    detTable.className = "result-table";
    
    for (let i = 0; i < n; i++) {
        const tr = document.createElement("tr");
        for (let j = 0; j < n; j++) {
            const td = document.createElement("td");
            if (i === j) {
                const val = resultados.matrizOriginal[i][j];
                const esZero = val.num === 0;
                td.innerHTML = esZero ? "-λ" : `${Auxiliares.fraccionToString(val)} - λ`;
            } else {
                td.textContent = Auxiliares.fraccionToString(resultados.matrizOriginal[i][j]);
            }
            tr.appendChild(td);
        }
        detTable.appendChild(tr);
    }
    detMatrix.appendChild(detTable);
    detLine.appendChild(detMatrix);
    detLine.appendChild(document.createTextNode(" = 0"));
    content.appendChild(detLine);
    
    // ===== 4. POLINOMIO CARACTERÍSTICO =====
    const polLine = document.createElement("div");
    polLine.style.display = "flex";
    polLine.style.alignItems = "center";
    polLine.style.flexWrap = "wrap";
    polLine.style.gap = "10px";
    polLine.innerHTML = `<strong>Polinomio característico:</strong>&nbsp;${polinomioToHTML(polinomioToString(resultados.polinomioCaracteristico))} = 0`;
    content.appendChild(polLine);
    
    // ===== 5. FACTORIZACIÓN =====
    const factoresDiv = document.createElement("div");
    factoresDiv.style.display = "flex";
    factoresDiv.style.alignItems = "center";
    factoresDiv.style.flexWrap = "wrap";
    factoresDiv.style.gap = "8px";
    factoresDiv.innerHTML = "<strong>Factorización:</strong> ";
    for (const factor of resultados.factoresPolinomio) {
        factoresDiv.appendChild(crearFactorHTML(factor));
    }
    factoresDiv.appendChild(document.createTextNode(" = 0"));
    content.appendChild(factoresDiv);
    
    // ===== 6. VALORES PROPIOS =====
    const vpContainer = document.createElement("div");
    vpContainer.style.display = "flex";
    vpContainer.style.flexDirection = "column";
    vpContainer.style.alignItems = "center";
    vpContainer.style.gap = "6px";
    vpContainer.style.margin = "0 auto";

    const vpTitle = document.createElement("strong");
    vpTitle.textContent = "Valores propios:";
    vpContainer.appendChild(vpTitle);

    if (resultados.raices && resultados.raices.length > 0) {
        resultados.raices.forEach((raiz, idx) => {
            const vpLine = document.createElement("div");
            vpLine.style.display = "flex";
            vpLine.style.alignItems = "center";
            vpLine.style.gap = "6px";

            const lbl = document.createElement("span");
            lbl.innerHTML = `λ<sub>${idx + 1}</sub> =`;
            lbl.style.fontWeight = "bold";
            lbl.style.color = "var(--primary)";
            lbl.style.whiteSpace = "nowrap";

            vpLine.appendChild(lbl);
            vpLine.appendChild(crearRaizHTML(raiz));
            vpContainer.appendChild(vpLine);
        });
    } else {
        const noReal = document.createElement("span");
        noReal.textContent = "No hay valores propios reales";
        vpContainer.appendChild(noReal);
    }
    content.appendChild(vpContainer);
    
    // ===== 7. MATRIZ DIAGONAL D =====
    const DLine = document.createElement("div");
    DLine.className = "result-wrapper";
    const DLabel = document.createElement("div");
    DLabel.className = "result-label";
    DLabel.textContent = "D =";
    DLine.appendChild(DLabel);
    
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
    
    // ===== 8. MATRIZ DE VECTORES PROPIOS P =====
    if (resultados.matrizVectoresPropios && resultados.diagonalizacion.esDiagonalizable) {
        const PLine = document.createElement("div");
        PLine.className = "result-wrapper";
        const PLabel = document.createElement("div");
        PLabel.className = "result-label";
        PLabel.textContent = "P =";
        PLine.appendChild(PLabel);
        PLine.appendChild(crearMatrizHTML(resultados.matrizVectoresPropios));
        content.appendChild(PLine);
        
        const vectoresTitle = document.createElement("div");
        vectoresTitle.style.fontWeight = "600";
        vectoresTitle.style.marginTop = "0.5rem";
        vectoresTitle.style.marginBottom = "0.5rem";
        vectoresTitle.innerHTML = "<strong>Vectores propios:</strong>";
        content.appendChild(vectoresTitle);
        
        const vectoresList = document.createElement("div");
        vectoresList.style.display = "flex";
        vectoresList.style.flexDirection = "column";
        vectoresList.style.gap = "0.5rem";
        vectoresList.style.marginBottom = "0.5rem";
        
        const Pmatriz = resultados.matrizVectoresPropios;
        const numVectores = Pmatriz[0]?.length || 0;
        
        for (let j = 0; j < numVectores; j++) {
            const vector = Pmatriz.map(fila => fila[j]);
            
            const vectorDiv = document.createElement("div");
            vectorDiv.style.display = "flex";
            vectorDiv.style.alignItems = "center";
            vectorDiv.style.flexWrap = "wrap";
            vectorDiv.style.gap = "8px";
            
            const vLabel = document.createElement("span");
            vLabel.style.fontWeight = "bold";
            vLabel.style.color = "var(--primary)";
            vLabel.textContent = `v${j + 1} =`;
            vectorDiv.appendChild(vLabel);
            
            const leftParen = document.createElement("span");
            leftParen.textContent = "(";
            vectorDiv.appendChild(leftParen);
            
            vector.forEach((comp, idx) => {
                const compSpan = document.createElement("span");
                const str = Auxiliares.fraccionToString(comp);
                if (str.includes("/")) {
                    const [num, den] = str.split("/");
                    compSpan.innerHTML = `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
                } else {
                    compSpan.textContent = str;
                }
                vectorDiv.appendChild(compSpan);
                
                if (idx < vector.length - 1) {
                    const comma = document.createElement("span");
                    comma.textContent = ", ";
                    vectorDiv.appendChild(comma);
                }
            });
            
            const rightParen = document.createElement("span");
            rightParen.textContent = ")";
            vectorDiv.appendChild(rightParen);
            
            vectoresList.appendChild(vectorDiv);
        }
        
        content.appendChild(vectoresList);
    }
    
    // ===== 9. MENSAJE FINAL =====
    const mensajeLine = document.createElement("div");
    mensajeLine.style.fontWeight = "bold";
    mensajeLine.style.marginTop = "10px";
    mensajeLine.style.padding = "12px";
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
                valor = span.getAttribute("data-value") || span.textContent || "";
            } else {
                valor = cell.textContent.trim();
            }
            
            if (valor === "") {
                fila.push({ num: 0, den: 1 });
                continue;
            }
            
            // 🔥 DETECTAR RAÍCES
            if (valor.includes('√')) {
                try {
                    const expr = Auxiliares.evaluarExpresionCompleta(valor);
                    
                    if (expr && expr.tipo === "raiz") {
                        // Asegurarse de que el coeficiente existe
                        const coef = expr.coeficiente || { num: 1, den: 1 };
                        const rad = expr.radicando || { num: 1, den: 1 };
                        
                        fila.push({
                            num: coef.num,
                            den: coef.den,
                            raiz: { num: rad.num, den: rad.den },
                            tipo: "raiz"
                        });
                    } 
                    else if (expr && expr.tipo === "numero") {
                        const val = expr.valor || { num: 0, den: 1 };
                        const [num, den] = Auxiliares.simplificar(val.num, val.den);
                        fila.push({ num, den });
                    }
                    else {
                        // Si no se pudo parsear, tratar como 0
                        console.warn(`No se pudo parsear: "${valor}", usando 0`);
                        fila.push({ num: 0, den: 1 });
                    }
                } catch (e) {
                    console.warn(`Error parseando "${valor}":`, e);
                    fila.push({ num: 0, den: 1 });
                }
            } 
            else {
                // Valor normal (número o fracción)
                if (!Auxiliares.esValorNumericoValido(valor, true)) {
                    throw new Error(`Valor inválido en fila ${i + 1}, columna ${j + 1}: "${valor}"`);
                }
                const f = Auxiliares.parsearFraccion(valor);
                const [num, den] = Auxiliares.simplificar(f.num, f.den);
                fila.push({ num, den });
            }
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
        // Sustituir celdas vacías de la matriz editable por 0
        currentTable.querySelectorAll("td").forEach(td => {
            const span = td.querySelector(".cell-span");
            const input = td.querySelector(".cell-input");
            if (input && input.value.trim() === "") {
                input.value = "0";
            } else if (span && (span.getAttribute("data-value") || "").trim() === "") {
                span.setAttribute("data-value", "0");
                span.textContent = "0";
            }
        });

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
    
    const { card, table } = crearMatrizEditable("diagInputTable", 2, 2);
    currentTable = table;
    
    const btnDiagonalizar = UI.createButton("btnDiagonalizar", "Diagonalizar", "btnCalcular");
    btnDiagonalizar.type = "button";
    
    const btnLimpiar = UI.createButton("btnLimpiarDiag", "Borrar matriz", "btnCalcular btnLimpiarEV");
    btnLimpiar.type = "button";
    
    const buttonGroup = document.createElement("div");
    buttonGroup.className = "matrix-actions";
    buttonGroup.append(btnDiagonalizar, btnLimpiar);
    
    mainSection.appendChild(card);
    mainSection.appendChild(buttonGroup);
    article.appendChild(mainSection);
    
    configurarEventos(article, table, currentMode);
    // Forzar dimensiones mínimas 2x2 después de configurarEventos
    // (configurarEventos puede sobreescribir los dataset según el modo)
    table.dataset.minRows = "2";
    table.dataset.minCols = "2";
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