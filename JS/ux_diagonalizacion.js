import UI from "./ui.js";
import Auxiliares from "./auxiliares.js";
import { diagonalizarMatrizCompleta, factorizarPolinomio } from "./calculos.js";
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
    label.textContent = "A[α↓] =";

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
        btnCalcular.title = "La matriz debe ser cuadrada (mismo número de filas que columnas)";
    } else if (hayErrores) {
        btnCalcular.disabled = true;
        btnCalcular.style.opacity = "0.5";
        btnCalcular.style.cursor = "not-allowed";
        btnCalcular.title = "Corrige los valores marcados en rojo antes de diagonalizar";
    } else {
        btnCalcular.disabled = false;
        btnCalcular.style.opacity = "1";
        btnCalcular.style.cursor = "pointer";
        btnCalcular.title = "Diagonalizar matriz";
    }
}

// ==================== RENDERIZADO DE RESULTADOS ====================

function crearMatrizHTML(matriz, className = "result-table") {
    if (!matriz || matriz.length === 0) return document.createTextNode("");
    
    const table = document.createElement("table");
    table.className = className;
    
    for (const fila of matriz) {
        const tr = document.createElement("tr");
        for (const valor of fila) {
            const td = document.createElement("td");
            const str = Auxiliares.fraccionToString(valor);
            if (str.includes("/")) {
                const [num, den] = str.split("/");
                td.innerHTML = `<span class="frac"><span class="top">${num}</span><span class="bottom">${den}</span></span>`;
            } else {
                td.textContent = str;
            }
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    
    return table;
}

function crearMatrizPolinomiosHTML(M, className = "result-table poly-table") {
    if (!M || M.length === 0) return document.createTextNode("");
    
    const table = document.createElement("table");
    table.className = className;
    
    for (const fila of M) {
        const tr = document.createElement("tr");
        for (const pol of fila) {
            const td = document.createElement("td");
            td.textContent = polinomioToString(pol);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    
    return table;
}

function crearPolinomioHTML(polinomio) {
    const container = document.createElement("div");
    container.className = "poly-display";
    container.textContent = polinomioToString(polinomio);
    return container;
}

function crearFactorHTML(factor) {
    const span = document.createElement("span");
    span.className = "factor-item";
    
    // Si es una constante (como -1)
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
        // factor.coeficientes ya viene en orden [a, b, c]
        span.textContent = `(${polinomioToString(factor.coeficientes)})`;
        return span;
    }
    
    if (factor.tipo === "irreducible") {
        span.textContent = `(${polinomioToString(factor.coeficientes)})`;
        return span;
    }
    
    span.textContent = "?";
    return span;
}
function mostrarResultados(article, resultados) {
    // Eliminar resultados anteriores
    console.log("factoresPolinomio:", resultados.factoresPolinomio);
    const prev = document.getElementById("diagResultSection");
    if (prev) prev.remove();
    
    const section = UI.createSection("diagResultSection", "RESULTADO: DIAGONALIZACIÓN");
    section.className = "diag-results-section";
    const content = document.createElement("div");
    content.className = "diag-results-content";
    
    // 1. Matriz A
    const matrizAContainer = document.createElement("div");
    matrizAContainer.className = "result-block";
    matrizAContainer.innerHTML = "<h3>Matriz A</h3>";
    matrizAContainer.appendChild(crearMatrizHTML(resultados.matrizOriginal));
    content.appendChild(matrizAContainer);
    
    // 2. λI - A
    const lambdaIContainer = document.createElement("div");
    lambdaIContainer.className = "result-block";
    lambdaIContainer.innerHTML = "<h3>λI - A</h3>";
    lambdaIContainer.appendChild(crearMatrizPolinomiosHTML(resultados.lambdaImenosA));
    content.appendChild(lambdaIContainer);
    
    // 3. Determinante (polinomio característico)
    const detContainer = document.createElement("div");
    detContainer.className = "result-block";
    detContainer.innerHTML = "<h3>det(λI - A) = 0</h3>";
    detContainer.appendChild(crearPolinomioHTML(resultados.polinomioCaracteristico));
    content.appendChild(detContainer);
    
    // 4. Polinomio característico factorizado
    const factoresContainer = document.createElement("div");
    factoresContainer.className = "result-block";
    factoresContainer.innerHTML = "<h3>Polinomio característico (factorizado)</h3>";
    const factoresDiv = document.createElement("div");
    factoresDiv.className = "factores-display";
    for (const factor of resultados.factoresPolinomio) {
        factoresDiv.appendChild(crearFactorHTML(factor));
    }
    factoresContainer.appendChild(factoresDiv);
    content.appendChild(factoresContainer);
    // 5. Valores propios
    const vpContainer = document.createElement("div");
    vpContainer.className = "result-block";
    vpContainer.innerHTML = "<h3>Valores propios</h3>";
    const vpList = document.createElement("div");
    vpList.className = "valores-propios-list";

    if (resultados.raices && resultados.raices.length > 0) {
        resultados.raices.forEach((raiz, idx) => {
            const vpItem = document.createElement("div");
            vpItem.className = "valor-propio-item";
            vpItem.innerHTML = `λ${idx + 1} = `;
            vpItem.appendChild(crearRaizHTML(raiz));
            vpList.appendChild(vpItem);
        });
    } else if (resultados.valoresPropios.length === 0) {
        vpList.textContent = "No se encontraron valores propios reales";
    } else {
        resultados.valoresPropios.forEach((vp, idx) => {
            const vpItem = document.createElement("div");
            vpItem.className = "valor-propio-item";
            let str;
            if (vp.tipo === "exacta") {
                str = Auxiliares.fraccionToString(vp.valor);
            } else if (vp.tipo === "raiz") {
                const expr = { tipo: "raiz", coeficiente: vp.coeficiente, radicando: vp.radicando };
                vpItem.appendChild(crearRaizHTML(expr));
                vpList.appendChild(vpItem);
                return;
            } else {
                str = "complejo";
            }
            vpItem.textContent = `λ${idx + 1} = ${str}`;
            vpList.appendChild(vpItem);
        });
    }
    vpContainer.appendChild(vpList);
    content.appendChild(vpContainer);
    // 6. Matriz diagonal D (si es diagonalizable)
    if (resultados.diagonalizacion.esDiagonalizable && resultados.matrizDiagonal) {
        const DContainer = document.createElement("div");
        DContainer.className = "result-block";
        DContainer.innerHTML = "<h3>Matriz diagonal D</h3>";
        DContainer.appendChild(crearMatrizHTML(resultados.matrizDiagonal));
        content.appendChild(DContainer);
    }
    
    // 7. Mensaje final
    const mensajeContainer = document.createElement("div");
    mensajeContainer.className = "result-block mensaje-final";
    const mensaje = document.createElement("div");
    mensaje.className = resultados.diagonalizacion.esDiagonalizable ? "mensaje-exito" : "mensaje-error";
    mensaje.textContent = resultados.diagonalizacion.razon;
    mensajeContainer.appendChild(mensaje);
    content.appendChild(mensajeContainer);
    
    section.appendChild(content);
    article.appendChild(section);
    
    // Scroll al resultado
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
    
    // Limpiar todas las celdas
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
        
        // Validar matriz cuadrada
        if (!esMatrizCuadrada(currentTable)) {
            const filas = currentTable.rows.length;
            const columnas = currentTable.rows[0]?.cells.length || 0;
            throw new Error(`La matriz debe ser cuadrada (mismo número de filas que columnas). Actualmente tiene ${filas} fila${filas !== 1 ? "s" : ""} y ${columnas} columna${columnas !== 1 ? "s" : ""}.`);
        }
        
        const matriz = leerMatriz(currentTable);
        const resultados = diagonalizarMatrizCompleta(matriz);
        mostrarResultados(document.getElementById("article"), resultados);
    } catch (error) {
        mostrarError(document.getElementById("article"), error.message);
    }
}

// ==================== EVENTOS ====================

function actualizarAnchoColumnas(table) {
    if (!table || !table.rows.length) return;
    const numCols = table.rows[0].cells.length;
    for (let j = 0; j < numCols; j++) {
        ajustarAnchoColumna(table, j);
    }
}

function configurarEventosDiag(section, table) {
    // Botón raíz cuadrada
    const btnRaiz = document.getElementById("btnRaizDiag");
    if (btnRaiz) {
        btnRaiz.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const { insertarRaiz } = await import("./celdas.js");
            insertarRaiz();
             actualizarMinimoDiag(table); 
        });
    }
    
    // Botón diagonalizar
    const btnDiagonalizar = document.getElementById("btnDiagonalizar");
    if (btnDiagonalizar) {
        const newBtn = btnDiagonalizar.cloneNode(true);
        btnDiagonalizar.parentNode.replaceChild(newBtn, btnDiagonalizar);
        newBtn.onclick = diagonalizar;
    }
    
    // Botón limpiar
    const btnLimpiar = document.getElementById("btnLimpiarDiag");
    if (btnLimpiar) {
        const newBtn = btnLimpiar.cloneNode(true);
        btnLimpiar.parentNode.replaceChild(newBtn, btnLimpiar);
        newBtn.onclick = limpiarMatriz;
    }
    
    // Observer para validación
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
    // Limpiar article
    while (article.firstChild) article.removeChild(article.firstChild);
    
    // Crear sección principal
    const mainSection = UI.createSection("mainSection", "DIAGONALIZACIÓN DE MATRICES");
    mainSection.classList.add("diag-section");
    
    // Crear matriz editable
    const { card, table } = crearMatrizEditable("diagInputTable", 2, 2);
    currentTable = table;
    
    // Botón de raíz cuadrada
    const btnRaiz = document.createElement("button");
    btnRaiz.type = "button";
    btnRaiz.id = "btnRaizDiag";
    btnRaiz.className = "btn-raiz";
    btnRaiz.textContent = "√";
    btnRaiz.title = "Insertar raíz cuadrada (selecciona una celda)";
    
    btnRaiz.addEventListener("mousedown", (e) => {
        e.preventDefault();
    });
    
    // Botón diagonalizar
    const btnDiagonalizar = UI.createButton("btnDiagonalizar", "Diagonalizar", "btnCalcular");
    btnDiagonalizar.type = "button";
    
    // Botón limpiar
    const btnLimpiar = UI.createButton("btnLimpiarDiag", "Borrar matriz", "btnCalcular btnLimpiarEV");
    btnLimpiar.type = "button";
    
    // Grupo de botones
    const buttonGroup = document.createElement("div");
    buttonGroup.className = "diag-actions";
    buttonGroup.append(btnRaiz, btnDiagonalizar, btnLimpiar);
    
    // Añadir todo a la sección
    mainSection.appendChild(card);
    mainSection.appendChild(buttonGroup);
    article.appendChild(mainSection);
    
    // Configurar eventos de celdas
    configurarEventos(article, table, currentMode);
    
    // Configurar eventos específicos de diagonalización
    configurarEventosDiag(mainSection, table);
    
    // Enfocar primera celda
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
function actualizarMinimoDiag(table) {
    const filas = table.rows.length;
    const cols  = table.rows[0]?.cells.length ?? 0;
    // El mínimo es la dimensión actual, nunca menos de 2
    const n = Math.max(2, Math.min(filas, cols));
    table.dataset.minRows = String(n);
    table.dataset.minCols = String(n);
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
        container.style.display = "inline-flex";
        container.style.alignItems = "center";
        container.style.gap = "2px";
        
        // Mostrar la parte real si existe
        if (raiz.parteReal) {
            const realStr = Auxiliares.fraccionToString(raiz.parteReal);
            const realSpan = document.createElement("span");
            realSpan.textContent = realStr;
            container.appendChild(realSpan);
        }
        
        // Mostrar el signo ±
        const signSpan = document.createElement("span");
        const coefVal = raiz.coeficiente.num / raiz.coeficiente.den;
        if (coefVal > 0) {
            signSpan.textContent = " + ";
        } else {
            signSpan.textContent = " - ";
        }
        container.appendChild(signSpan);
        
        // Mostrar la raíz (usando valor absoluto del coeficiente)
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
        rootSymbol.style.fontSize = "1.2em";
        container.appendChild(rootSymbol);
        
        const radicandoSpan = document.createElement("span");
        radicandoSpan.className = "root-radicando";
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
        span.className = "complex-number";
        if (raiz.parteReal) {
            const realStr = Auxiliares.fraccionToString(raiz.parteReal);
            span.innerHTML = `${realStr} ± i√?`;
        } else {
            span.innerHTML = `± i√?`;
        }
        return span;
    }
    
    return document.createTextNode("");
}