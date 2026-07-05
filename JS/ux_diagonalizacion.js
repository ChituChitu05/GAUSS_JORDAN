import UI from "./ui.js?v=38";
import Auxiliares from "./auxiliares.js?v=38";
import { diagonalizarMatrizCompleta } from "./calculos.js?v=38";
import { crearSpanCelda, inputToSpan, spanToInput } from "./celdas.js?v=38";
import { ajustarAnchoColumna, configurarEventos } from "./eventos_celdas.js?v=38";
import { polinomioToString } from "./operaciones.js?v=38";

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
    label.textContent = "A =";

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
    
    // ===== CARD 1: PLANTEAMIENTO Y MATRICES DEL SISTEMA =====
    const card1 = document.createElement("div");
    card1.className = "result-block";
    card1.innerHTML = `<h3>Paso 1: Planteamiento y matrices del sistema</h3>`;
    
    const stepMatricesGrid = document.createElement("div");
    stepMatricesGrid.className = "step-matrices-grid";
    
    // Matriz Original A
    const itemA = document.createElement("div");
    itemA.className = "step-matrix-item";
    const labelA = document.createElement("div");
    labelA.className = "step-matrix-label";
    labelA.textContent = "A =";
    itemA.appendChild(labelA);
    itemA.appendChild(crearMatrizHTML(resultados.matrizOriginal));
    stepMatricesGrid.appendChild(itemA);
    
    // Matriz A - λI
    const itemAMenosI = document.createElement("div");
    itemAMenosI.className = "step-matrix-item";
    const labelAMenosI = document.createElement("div");
    labelAMenosI.className = "step-matrix-label";
    labelAMenosI.textContent = "A - λI =";
    itemAMenosI.appendChild(labelAMenosI);
    
    const A_menos_lambdaI = resultados.lambdaImenosA.map(fila =>
        fila.map(pol => pol.map(coef => ({ num: -coef.num, den: coef.den })))
    );
    itemAMenosI.appendChild(crearMatrizPolinomiosHTML(A_menos_lambdaI));
    stepMatricesGrid.appendChild(itemAMenosI);
    
    card1.appendChild(stepMatricesGrid);
    content.appendChild(card1);
    
    // ===== CARD 2: ECUACIÓN CARACTERÍSTICA Y FACTORIZACIÓN =====
    const card2 = document.createElement("div");
    card2.className = "result-block";
    card2.innerHTML = `<h3>Paso 2: Ecuación característica y factorización</h3>`;
    
    const equationFlow = document.createElement("div");
    equationFlow.className = "equation-flow";
    
    // Fila determinante
    const rowDet = document.createElement("div");
    rowDet.className = "eq-row";
    rowDet.innerHTML = `<span class="eq-row-label-det" style="font-weight: 600; color: var(--text-secondary);">Determinante det(A - λI) = 0:</span>`;
    const detContent = document.createElement("div");
    detContent.className = "eq-content";
    
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
    detContent.appendChild(detMatrix);
    
    const eqSymbol = document.createElement("span");
    eqSymbol.className = "eq-symbol";
    eqSymbol.textContent = " = 0";
    detContent.appendChild(eqSymbol);
    
    rowDet.appendChild(detContent);
    equationFlow.appendChild(rowDet);
    
    // Divider
    const div1 = document.createElement("div");
    div1.className = "eq-divider";
    equationFlow.appendChild(div1);
    
    // Fila polinomio
    const rowPol = document.createElement("div");
    rowPol.className = "eq-row";
    rowPol.innerHTML = `<span class="eq-label" style="font-weight: 600; color: var(--text-secondary);">Polinomio característico:</span>
        <div class="eq-content poly-display" style="font-weight: 600;">
            p(λ) = ${polinomioToHTML(polinomioToString(resultados.polinomioCaracteristico))} = 0
        </div>`;
    equationFlow.appendChild(rowPol);
    
    // Divider
    const div2 = document.createElement("div");
    div2.className = "eq-divider";
    equationFlow.appendChild(div2);
    
    // Fila factorización
    const rowFact = document.createElement("div");
    rowFact.className = "eq-row";
    const factLabel = document.createElement("span");
    factLabel.className = "eq-label";
    factLabel.style.fontWeight = "600";
    factLabel.style.color = "var(--text-secondary)";
    factLabel.textContent = "Factorización:";
    rowFact.appendChild(factLabel);
    
    const factContent = document.createElement("div");
    factContent.className = "eq-content factores-display";
    for (const factor of resultados.factoresPolinomio) {
        factContent.appendChild(crearFactorHTML(factor));
    }
    factContent.appendChild(document.createTextNode(" = 0"));
    rowFact.appendChild(factContent);
    equationFlow.appendChild(rowFact);
    
    card2.appendChild(equationFlow);
    content.appendChild(card2);
    
    // ===== CARD 3: VALORES Y VECTORES CARACTERÍSTICOS =====
    const card3 = document.createElement("div");
    card3.className = "result-block";
    card3.innerHTML = `<h3>Paso 3: Valores y vectores característicos</h3>`;
    
    const eigenPairsContainer = document.createElement("div");
    eigenPairsContainer.className = "eigen-pairs-container";
    
    const Pmatriz = resultados.matrizVectoresPropios;
    const esDiag = resultados.diagonalizacion.esDiagonalizable && Pmatriz;
    
    const grupos = [];
    if (esDiag) {
        let vectorColIdx = 0;
        for (let idx = 0; idx < resultados.raices.length; idx++) {
            const raiz = resultados.raices[idx];
            if (raiz.tipo === "exacta") {
                const vector = Pmatriz.map(fila => fila[vectorColIdx]);
                vectorColIdx++;
                
                const raizStr = Auxiliares.fraccionToString(raiz.valor);
                let grupo = grupos.find(g => g.raiz.tipo === "exacta" && Auxiliares.fraccionToString(g.raiz.valor) === raizStr);
                
                if (grupo) {
                    grupo.vectores.push(vector);
                } else {
                    grupos.push({ raiz, vectores: [vector] });
                }
            } else {
                grupos.push({ raiz, vectores: [] });
            }
        }
    } else {
        for (const raiz of resultados.raices) {
            grupos.push({ raiz, vectores: [] });
        }
    }
    
    if (grupos.length > 0) {
        grupos.forEach((grupo, gIdx) => {
            const pairCard = document.createElement("div");
            pairCard.className = "eigen-pair-card";
            
            const badge = document.createElement("div");
            badge.className = "eigen-value-badge";
            
            const labelSpan = document.createElement("span");
            labelSpan.innerHTML = `λ<sub>${gIdx + 1}</sub> = `;
            badge.appendChild(labelSpan);
            badge.appendChild(crearRaizHTML(grupo.raiz));
            
            pairCard.appendChild(badge);
            
            const vectorsList = document.createElement("div");
            vectorsList.className = "eigen-vectors-list";
            
            if (grupo.vectores.length > 0) {
                grupo.vectores.forEach((vector, vIdx) => {
                    const vecItem = document.createElement("div");
                    vecItem.className = "eigen-vector-item";
                    
                    const vLabel = document.createElement("span");
                    vLabel.style.fontWeight = "bold";
                    vLabel.style.color = "var(--primary)";
                    vLabel.textContent = `v${vIdx + 1} = (`;
                    vecItem.appendChild(vLabel);
                    
                    vector.forEach((comp, cIdx) => {
                        const compSpan = document.createElement("span");
                        const str = Auxiliares.fraccionToString(comp);
                        if (str.includes("/")) {
                            const [num, den] = str.split("/");
                            compSpan.innerHTML = `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
                        } else {
                            compSpan.textContent = str;
                        }
                        vecItem.appendChild(compSpan);
                        
                        if (cIdx < vector.length - 1) {
                            const comma = document.createElement("span");
                            comma.textContent = ", ";
                            vecItem.appendChild(comma);
                        }
                    });
                    
                    const rParen = document.createElement("span");
                    rParen.textContent = ")";
                    vecItem.appendChild(rParen);
                    
                    vectorsList.appendChild(vecItem);
                });
            } else {
                const noVecs = document.createElement("span");
                noVecs.style.fontStyle = "italic";
                noVecs.style.color = "var(--text-secondary)";
                if (grupo.raiz.tipo === "complejo") {
                    noVecs.textContent = "Sin vectores característicos reales asociados";
                } else if (!esDiag) {
                    noVecs.textContent = "No diagonalizable (no se calculan vectores asociados)";
                } else {
                    noVecs.textContent = "No se pudieron calcular vectores característicos";
                }
                vectorsList.appendChild(noVecs);
            }
            
            pairCard.appendChild(vectorsList);
            eigenPairsContainer.appendChild(pairCard);
        });
    } else {
        const noReal = document.createElement("div");
        noReal.style.fontStyle = "italic";
        noReal.style.color = "var(--text-secondary)";
        noReal.style.textAlign = "center";
        noReal.style.width = "100%";
        noReal.textContent = "No hay valores característicos reales";
        eigenPairsContainer.appendChild(noReal);
    }
    
    card3.appendChild(eigenPairsContainer);
    content.appendChild(card3);
    
    // ===== CARD 4: MATRIZ DIAGONAL D Y MATRIZ DE PASO P =====
    if (resultados.diagonalizacion.esDiagonalizable) {
        const card4 = document.createElement("div");
        card4.className = "result-block";
        card4.innerHTML = `<h3>Paso 4: Diagonalización (A = PDP⁻¹)</h3>
            <h4 class="diag-eq-title">A = P · D · P<sup>-1</sup></h4>`;
            
        const diagEqFlow = document.createElement("div");
        diagEqFlow.className = "diag-equation-flow";
        
        // Matriz P
        if (resultados.matrizVectoresPropios) {
            const itemP = document.createElement("div");
            itemP.className = "matrix-eq-item";
            const labelP = document.createElement("div");
            labelP.className = "matrix-eq-label";
            labelP.textContent = "P =";
            itemP.appendChild(labelP);
            itemP.appendChild(crearMatrizHTML(resultados.matrizVectoresPropios));
            diagEqFlow.appendChild(itemP);
        }
        
        // Matriz D
        if (resultados.matrizDiagonal) {
            const itemD = document.createElement("div");
            itemD.className = "matrix-eq-item";
            const labelD = document.createElement("div");
            labelD.className = "matrix-eq-label";
            labelD.textContent = "D =";
            itemD.appendChild(labelD);
            itemD.appendChild(crearMatrizHTML(resultados.matrizDiagonal));
            diagEqFlow.appendChild(itemD);
        }
        
        card4.appendChild(diagEqFlow);
        content.appendChild(card4);
    }
    
    // ===== ALERTA FINAL DE DIAGNÓSTICO =====
    const alertBox = document.createElement("div");
    alertBox.className = `diag-alert ${resultados.diagonalizacion.esDiagonalizable ? "diag-alert-success" : "diag-alert-error"}`;
    
    const iconSpan = document.createElement("div");
    iconSpan.className = "diag-alert-icon";
    if (resultados.diagonalizacion.esDiagonalizable) {
        iconSpan.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else {
        iconSpan.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    }
    
    const bodySpan = document.createElement("div");
    bodySpan.className = "diag-alert-body";
    bodySpan.textContent = resultados.diagonalizacion.razon;
    
    alertBox.append(iconSpan, bodySpan);
    content.appendChild(alertBox);
    
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
