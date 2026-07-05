import UI from "./ui.js?v=38";
import Auxiliares from "./auxiliares.js?v=38";
import { crearSpanCelda, inputToSpan, spanToInput } from "./celdas.js?v=38";
import { ajustarAnchoColumna } from "./eventos_celdas.js?v=38";
import { matrizCambioBase, matrizTransformacion } from "./calculos.js?v=38";
import { multiplicarMatrices } from "./operaciones.js?v=38";

const MATRICES = {
    B1: { id: "tfB1", label: "B₁", rows: 2, cols: 2, locked: false, isIdentity: false },
    B2: { id: "tfB2", label: "B₂", rows: 2, cols: 2, locked: false, isIdentity: false },
    B3: { id: "tfB3", label: "B₃", rows: 2, cols: 2, locked: false, isIdentity: false },
    B4: { id: "tfB4", label: "B₄", rows: 2, cols: 2, locked: false, isIdentity: false },
};

let activeV = null;
let activeW = null;
let _article = null;

// IDs de las tablas editables
const TABLE_IDS = ["tfB1", "tfB2", "tfB3", "tfB4"];

// Obtener tabla permitida que contiene el elemento
function _tfGetTable(el) {
    const table = el.closest("table");
    if (!table) return null;
    if (!TABLE_IDS.includes(table.id)) return null;
    return table;
}

// ¿El elemento pertenece a alguna celda TF?
function _tfEsCeldaTF(el) {
    if (!el) return false;
    return !!(el.closest("table") && TABLE_IDS.includes(el.closest("table").id));
}

// Mover foco a celda (r, c) de una tabla
function _tfMoveTo(table, r, c) {
    if (r < 0 || r >= table.rows.length) return;
    const row = table.rows[r];
    if (!row || c < 0 || c >= row.cells.length) return;
    const cell = row.cells[c];
    setTimeout(() => {
        const span = cell.querySelector(".cell-span");
        const input = cell.querySelector(".cell-input");
        if (span) { const inp = spanToInput(span); if (inp) { inp.focus(); inp.select(); } }
        else if (input) { input.focus(); input.select(); }
    }, 0);
}

// Ajustar todas las columnas de una tabla
function _tfAjustarTabla(table) {
    if (!table) return;
    for (let j = 0; j < (table.rows[0]?.cells.length ?? 0); j++)
        ajustarAnchoColumna(table, j);
}

// Verificar si una tabla tiene errores
function _tfTablaTieneErrores(table) {
    if (!table) return false;
    const celdas = table.querySelectorAll('.cell-span, .cell-input');
    for (const celda of celdas) {
        if (celda.classList && celda.classList.contains('cell-error')) {
            return true;
        }
        const valor = celda.classList?.contains('cell-input')
            ? celda.value
            : (celda.getAttribute?.('data-value') || celda.textContent || "");
        if (valor && valor !== "" && !Auxiliares.esValorNumericoValido(valor, true)) {
            return true;
        }
    }
    return false;
}

// Revisar y eliminar filas/columnas vacías, luego reposicionar foco
function _tfRevisarBorrado(table, r, c) {
    const minRows = parseInt(table.dataset.minRows) || 1;
    const minCols = parseInt(table.dataset.minCols) || 1;
    let tr = r, tc = c;
    let filaEliminada = false;

    if (table.rows.length > minRows && Auxiliares.filaVacia(table, r)) {
        Auxiliares.eliminarFila(table, r);
        filaEliminada = true;
        tr = Math.max(0, r - 1);
        tc = Math.min(c, (table.rows[tr]?.cells.length ?? 1) - 1);
    }

    if ((table.rows[0]?.cells.length ?? 0) > minCols && Auxiliares.columnaVacia(table, c)) {
        Auxiliares.eliminarColumna(table, c);
        tc = Math.max(0, c - 1);
    }

    if (!filaEliminada && tr === r && tc === c) {
        if (c > 0) { tc = c - 1; }
        else if (r > 0) { tr = r - 1; tc = (table.rows[tr]?.cells.length ?? 1) - 1; }
    }

    _tfMoveTo(table, tr, tc);
    actualizarMatricesDerivadas();
}

// Handler: mousedown (clic en celda)
function _tfMousedown(e) {
    const target = e.target;
    if (target.classList.contains("cell-input")) return;

    let span = null, td = null;
    if (target.classList.contains("cell-span")) { span = target; td = target.closest("td"); }
    else if (target.closest(".cell-span")) { span = target.closest(".cell-span"); td = span.closest("td"); }
    else if (target.tagName === "TD") { td = target; span = td.querySelector(".cell-span"); }
    else if (target.closest("td")) { td = target.closest("td"); span = td?.querySelector(".cell-span"); }

    if (!td || !span) return;
    const tableEl = _tfGetTable(td);
    if (!tableEl) return;

    const tableKey = Object.keys(MATRICES).find(k => MATRICES[k].id === tableEl.id);

    e.preventDefault();
    const inp = spanToInput(span);
    if (inp) { inp.focus(); inp.select(); }
}

// Handler: focusout
function _tfFocusout(e) {
    const input = e.target;
    if (!input.classList.contains("cell-input")) return;
    if (!input.isConnected) return;
    if (!_tfGetTable(input)) return;

    const next = e.relatedTarget;
    if (_tfEsCeldaTF(next)) return;

    const c = input.closest("td")?.cellIndex ?? 0;
    const table = _tfGetTable(input);
    inputToSpan(input);
    if (table) ajustarAnchoColumna(table, c);
    actualizarMatricesDerivadas();
}

// Handler: input (filtrar caracteres)
function _tfInput(e) {
    const input = e.target;
    if (!input.classList.contains("cell-input")) return;
    if (!_tfGetTable(input)) return;

    let v = input.value;
    v = v.replace(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "");
    v = v.replace(/[^0-9\-\/\.]/g, "");
    const slashes = (v.match(/\//g) || []).length;
    if (slashes > 1) {
        const f = v.indexOf("/");
        v = v.slice(0, f + 1) + v.slice(f + 1).replace(/\//g, "");
    }
    if (/^\.\d/.test(v)) v = "0" + v;
    if (/^-\.\d/.test(v)) v = "-0" + v.slice(1);
    if (input.value !== v) input.value = v;
    input.style.width = (v.length + 1) + "ch";

    // Marcar error si el valor no es válido
    const esValido = v === "" || v === "-" || Auxiliares.esValorNumericoValido(v, true);
    input.classList.toggle('cell-error', !esValido);
    actualizarMatricesDerivadas();
}

// Handler: keydown
function _tfKeydown(e) {
    const target = e.target;
    const isInput = target.classList.contains("cell-input");
    const isSpan = target.classList.contains("cell-span");
    if (!isInput && !isSpan) return;

    const table = _tfGetTable(target);
    if (!table) return;

    const tableKey = Object.keys(MATRICES).find(k => MATRICES[k].id === table.id);

    const td = target.closest("td");
    const row = td?.parentElement;
    if (!td || !row) return;
    const r = row.rowIndex;
    const c = td.cellIndex;

    if (e.key === "ArrowRight") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        const maxC = (table.rows[r]?.cells.length ?? 1) - 1;
        if (c < maxC) _tfMoveTo(table, r, c + 1);
        else _tfMoveTo(table, r, c);
        return;
    }
    if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        if (c > 0) _tfMoveTo(table, r, c - 1);
        else _tfMoveTo(table, r, 0);
        return;
    }
    if (e.key === "ArrowUp") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        if (r > 0) _tfMoveTo(table, r - 1, Math.min(c, (table.rows[r - 1]?.cells.length ?? 1) - 1));
        else _tfMoveTo(table, 0, c);
        return;
    }
    if (e.key === "ArrowDown") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        if (r < table.rows.length - 1) _tfMoveTo(table, r + 1, Math.min(c, (table.rows[r + 1]?.cells.length ?? 1) - 1));
        else _tfMoveTo(table, r, c);
        return;
    }

    if (e.key === "Tab") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        const maxC = (table.rows[r]?.cells.length ?? 1) - 1;
        if (c < maxC) _tfMoveTo(table, r, c + 1);
        else if (r < table.rows.length - 1) _tfMoveTo(table, r + 1, 0);
        else _tfMoveTo(table, r, c);
        return;
    }

    if (e.key === "Escape") {
        if (isInput) { inputToSpan(target); target.blur(); }
        return;
    }

    if (e.key === " ") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        Auxiliares.insertarColumna(table, c + 1);
        _tfAjustarTabla(table);
        actualizarMatricesDerivadas();
        setTimeout(() => _tfMoveTo(table, r, c + 1), 10);
        return;
    }

    if (e.key === "Enter") {
        e.preventDefault();
        if (isInput) { inputToSpan(target); ajustarAnchoColumna(table, c); }
        Auxiliares.insertarFila(table, r + 1);
        _tfAjustarTabla(table);
        actualizarMatricesDerivadas();
        setTimeout(() => _tfMoveTo(table, r + 1, c), 10);
        return;
    }

    if (e.key === "Backspace" || e.key === "Delete") {
        if (isInput) {
            if (target.value !== "") return;
            e.preventDefault();
            _tfRevisarBorrado(table, r, c);
        } else if (isSpan) {
            e.preventDefault();
            const val = (target.getAttribute("data-value") ?? target.textContent ?? "").trim();
            if (val === "") {
                _tfRevisarBorrado(table, r, c);
            } else {
                target.setAttribute("data-value", "");
                target.textContent = "";
                target.innerHTML = "";
            }
        }
        return;
    }

    if (isSpan && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(e.key)) return;
        e.preventDefault();
        const inp = spanToInput(target);
        if (inp) { inp.value = e.key; inp.setSelectionRange(1, 1); }
        return;
    }
}

// Registrar / desregistrar eventos
let _tfHandlers = {};

function _tfConfigurar(article) {
    _tfDesconfigurar();
    _tfHandlers.mousedown = _tfMousedown;
    _tfHandlers.keydown = _tfKeydown;
    _tfHandlers.input = (e) => { _tfInput(e); actualizarMatricesDerivadas(); };
    _tfHandlers.focusout = _tfFocusout;
    _tfHandlers.windowKey = (e) => {
        if (e.key === " " && (
            document.activeElement?.classList.contains("cell-input") ||
            document.activeElement?.classList.contains("cell-span")
        )) e.preventDefault();
    };
    article.addEventListener("mousedown", _tfHandlers.mousedown);
    article.addEventListener("keydown", _tfHandlers.keydown);
    article.addEventListener("input", _tfHandlers.input);
    article.addEventListener("focusout", _tfHandlers.focusout);
    window.addEventListener("keydown", _tfHandlers.windowKey);
}

function _tfDesconfigurar() {
    if (_article) {
        _article.removeEventListener("mousedown", _tfHandlers.mousedown);
        _article.removeEventListener("keydown", _tfHandlers.keydown);
        _article.removeEventListener("input", _tfHandlers.input);
        _article.removeEventListener("focusout", _tfHandlers.focusout);
    }
    if (_tfHandlers.windowKey) window.removeEventListener("keydown", _tfHandlers.windowKey);
    _tfHandlers = {};
}

// Tablas
function crearTablaEditable(key, rows, cols) {
    const cfg = MATRICES[key];
    const table = UI.createTable(cfg.id);
    table.dataset.minRows = "1";
    table.dataset.minCols = "1";
    table.classList.add("tf-input-table");

    for (let i = 0; i < rows; i++) {
        const tr = UI.createRow();
        for (let j = 0; j < cols; j++) {
            const td = UI.createTd(`${cfg.id}_cell${i}${j}`);
            td.appendChild(crearSpanCelda("", i, j));
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    return table;
}

function crearTablaResultado(matriz, id) {
    const table = UI.createTable(id);
    table.classList.add("tf-matrix-table", "tf-result-table");
    table.style.borderSpacing = "18px 12px";
    matriz.forEach(fila => {
        const tr = UI.createRow();
        fila.forEach(v => {
            const td = UI.createTd();
            td.style.cssText = "padding:12px 18px;text-align:center;font-size:1.3rem;";
            const val = Auxiliares.fraccionToString(v);
            if (val.includes("/")) {
                const [n, d] = val.split("/");
                td.innerHTML = `<span class="frac"><span class="top">${n}</span><span class="bottom">${d}</span></span>`;
            } else {
                td.textContent = val;
            }
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
    return table;
}

// Leer matriz y verificar si todas las celdas tienen valor y son válidas
function leerMatrizCompleta(tableId) {
    const table = document.getElementById(tableId);
    if (!table || !table.rows.length) return { matriz: null, completa: false, tieneErrores: false };

    try {
        let todasCompletas = true;
        let tieneErrores = false;
        const raw = Array.from(table.rows).map(row =>
            Array.from(row.cells).map(cell => {
                const input = cell.querySelector(".cell-input");
                const span = cell.querySelector(".cell-span");
                let valor = "";

                if (input) {
                    valor = input.value.trim();
                } else if (span) {
                    valor = span.getAttribute("data-value") || "";
                }

                // Verificar si la celda tiene error visual
                if ((input && input.classList.contains('cell-error')) ||
                    (span && span.classList.contains('cell-error'))) {
                    tieneErrores = true;
                }

                // Una celda está vacía si su string está vacío
                if (valor === "") {
                    todasCompletas = false;
                    return { num: 0, den: 1 };
                }

                // Validar que sea un número válido
                if (!Auxiliares.esValorNumericoValido(valor, true)) {
                    tieneErrores = true;
                    todasCompletas = false;
                    return { num: 0, den: 1 };
                }

                const f = Auxiliares.parsearFraccion(valor);
                const [num, den] = Auxiliares.simplificar(f.num, f.den);
                return { num, den };
            })
        );

        return { matriz: raw, completa: todasCompletas, tieneErrores: tieneErrores };
    } catch {
        return { matriz: null, completa: false, tieneErrores: true };
    }
}

function limpiarMatriz(m) {
    return m.map(fila => fila.map(({ num, den }) => ({ num, den })));
}

function esMatrizCuadrada(m) {
    return m && m.length > 0 && m.every(fila => fila.length === m.length);
}

function mismasDimensiones(a, b) {
    return a && b && a.length === b.length && a[0].length === b[0].length;
}

function ponerIdentidad(tableId) {
    console.log("ponerIdentidad called for tableId:", tableId);
    const table = document.getElementById(tableId);
    if (!table) {
        console.error("ponerIdentidad error: Table not found in DOM for ID:", tableId);
        return;
    }
    const n = table.rows.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < table.rows[i].cells.length; j++) {
            const cell = table.rows[i].cells[j];
            const val = i === j ? "1" : "0";
            const span = cell.querySelector(".cell-span");
            const input = cell.querySelector(".cell-input");
            if (input) {
                input.value = val;
                inputToSpan(input);
            }
            if (span) {
                span.setAttribute("data-value", val);
                span.textContent = val;
            }
        }
    }
}

function limpiarTablaTransformaciones(tableId) {
    console.log("limpiarTablaTransformaciones called for tableId:", tableId);
    const table = document.getElementById(tableId);
    if (!table) return;
    for (let i = 0; i < table.rows.length; i++) {
        for (let j = 0; j < table.rows[i].cells.length; j++) {
            const cell = table.rows[i].cells[j];
            const span = cell.querySelector(".cell-span");
            const input = cell.querySelector(".cell-input");
            if (input) { input.value = ""; inputToSpan(input); }
            if (span) { span.setAttribute("data-value", ""); span.textContent = ""; }
        }
    }
    _tfAjustarTabla(table);
}

function fraccionTFIgualA(valor, esperado) {
    const texto = Auxiliares.normalizarValorTexto(valor);
    if (!Auxiliares.esValorNumericoValido(texto, false)) return false;
    const fraccion = Auxiliares.normalizarSigno(Auxiliares.parsearFraccion(texto));
    const [num, den] = Auxiliares.simplificar(fraccion.num, fraccion.den);
    return num === esperado && den === 1;
}

function esCeroVisualTF(valor) {
    const texto = String(valor || "").trim();
    if (texto === "") return true;
    return fraccionTFIgualA(texto, 0);
}

function esUnoVisualTF(valor) {
    const texto = String(valor || "").trim();
    return fraccionTFIgualA(texto, 1);
}

function esMatrizIdentidadTF(tableId) {
    const table = document.getElementById(tableId);
    if (!table || !table.rows.length) {
        console.log("esMatrizIdentidadTF returns false (table not found or empty) for:", tableId);
        return false;
    }

    const filas = table.rows.length;
    const columnas = table.rows[0]?.cells.length || 0;
    if (filas === 0 || columnas === 0 || filas !== columnas) {
        console.log("esMatrizIdentidadTF returns false (not square, size:", filas, "x", columnas, ") for:", tableId);
        return false;
    }

    for (let i = 0; i < filas; i++) {
        for (let j = 0; j < columnas; j++) {
            const cell = table.rows[i].cells[j];
            const input = cell.querySelector(".cell-input");
            const span = cell.querySelector(".cell-span");
            const valor = (input?.value ?? span?.getAttribute("data-value") ?? span?.textContent ?? "").trim();

            if (i === j) {
                if (!esUnoVisualTF(valor)) {
                    console.log(`esMatrizIdentidadTF [${tableId}] diagonal cell (${i},${j}) is not 1. value:`, valor);
                    return false;
                }
            } else {
                if (!esCeroVisualTF(valor)) {
                    console.log(`esMatrizIdentidadTF [${tableId}] non-diagonal cell (${i},${j}) is not 0. value:`, valor);
                    return false;
                }
            }
        }
    }
    console.log(`esMatrizIdentidadTF [${tableId}] is indeed identity.`);
    return true;
}

function desactivarCanonicaBasesPair(key) {
    console.log("desactivarCanonicaBasesPair called for key:", key);
    const cfg = MATRICES[key];
    cfg.isIdentity = false;
    cfg.locked = false;

    const checkbox = document.getElementById(`tfCanonica_${key}`);
    if (checkbox) {
        checkbox.checked = false;
        checkbox.setAttribute("aria-checked", "false");
    }
    _actualizarVisualToggle(key, false);

    limpiarTablaTransformaciones(cfg.id);

    const grupo = (key === "B1" || key === "B2") ? "V" : "W";
    if (grupo === "V" && activeV === key) activeV = null;
    if (grupo === "W" && activeW === key) activeW = null;
}

function sincronizarSwitchCanonicaTF(key) {
    const cfg = MATRICES[key];
    const tableId = cfg.id;
    const isIdentityNow = esMatrizIdentidadTF(tableId);

    console.log(`sincronizarSwitchCanonicaTF [${key}]: isIdentityNow =`, isIdentityNow);
    cfg.isIdentity = isIdentityNow;

    const checkbox = document.getElementById(`tfCanonica_${key}`);
    if (checkbox) {
        checkbox.checked = isIdentityNow;
        checkbox.setAttribute("aria-checked", String(isIdentityNow));
    }
    _actualizarVisualToggle(key, isIdentityNow);

    const grupo = (key === "B1" || key === "B2") ? "V" : "W";
    if (isIdentityNow) {
        if (grupo === "V") {
            if (activeV !== key) {
                const pairingKey = key === "B1" ? "B2" : "B1";
                desactivarCanonicaBasesPair(pairingKey);
                activeV = key;
            }
        } else {
            if (activeW !== key) {
                const pairingKey = key === "B3" ? "B4" : "B3";
                desactivarCanonicaBasesPair(pairingKey);
                activeW = key;
            }
        }
    } else {
        if (grupo === "V" && activeV === key) {
            activeV = null;
        } else if (grupo === "W" && activeW === key) {
            activeW = null;
        }
    }
}

function _actualizarVisualToggle(key, isOn) {
    const wrapper = document.querySelector(`#block_${key} .canonical-switch-wrapper`);
    if (!wrapper) return;
    wrapper.classList.toggle("is-active", isOn);
}

function toggleIdentidad(key) {
    console.log("toggleIdentidad called for key:", key);
    const grupo = (key === "B1" || key === "B2") ? "V" : "W";
    const activeRef = grupo === "V" ? activeV : activeW;

    const input = document.getElementById(`tfCanonica_${key}`);
    const isNowChecked = input?.checked ?? false;
    console.log(`toggleIdentidad [${key}]: isNowChecked =`, isNowChecked, "activeRef =", activeRef);

    if (isNowChecked) {
        const pairingKey = (grupo === "V")
            ? (key === "B1" ? "B2" : "B1")
            : (key === "B3" ? "B4" : "B3");

        if (activeRef !== null && activeRef === pairingKey) {
            desactivarCanonicaBasesPair(pairingKey);
        }

        MATRICES[key].isIdentity = true;
        ponerIdentidad(MATRICES[key].id);
        _actualizarVisualToggle(key, true);
        if (grupo === "V") activeV = key; else activeW = key;
    } else {
        MATRICES[key].isIdentity = false;
        _actualizarVisualToggle(key, false);
        limpiarTablaTransformaciones(MATRICES[key].id);
        if (grupo === "V") activeV = null; else activeW = null;
    }

    actualizarMatricesDerivadas();
}

function actualizarMatricesDerivadas() {
    Object.keys(MATRICES).forEach(sincronizarSwitchCanonicaTF);
    // Leer cada matriz y verificar si está completa y sin errores
    const b1Data = leerMatrizCompleta(MATRICES.B1.id);
    const b2Data = leerMatrizCompleta(MATRICES.B2.id);
    const b3Data = leerMatrizCompleta(MATRICES.B3.id);
    const b4Data = leerMatrizCompleta(MATRICES.B4.id);

    // Verificar si hay errores en alguna tabla
    const hayErrores = b1Data.tieneErrores || b2Data.tieneErrores || b3Data.tieneErrores || b4Data.tieneErrores;
    const todasCompletas = b1Data.completa && b2Data.completa && b3Data.completa && b4Data.completa;

    if (hayErrores || !todasCompletas) {
        // Mostrar placeholder en todas las zonas de resultado
        renderizarResultados(null, null, null, null, true);
        return;
    }

    const B1 = b1Data.matriz ? limpiarMatriz(b1Data.matriz) : null;
    const B2 = b2Data.matriz ? limpiarMatriz(b2Data.matriz) : null;
    const B3 = b3Data.matriz ? limpiarMatriz(b3Data.matriz) : null;
    const B4 = b4Data.matriz ? limpiarMatriz(b4Data.matriz) : null;

    // P = matriz cambio de B1 → B2 (solo si B1 y B2 están COMPLETAS y tienen mismas dimensiones)
    let P = null;
    if (todasCompletas && B1 && B2 && esMatrizCuadrada(B1) && mismasDimensiones(B1, B2)) {
        try { P = matrizCambioBase(B1, B2); } catch { P = null; }
    }

    // Q = matriz cambio de B3 → B4 (solo si B3 y B4 están COMPLETAS y tienen mismas dimensiones)
    let Q = null;
    if (todasCompletas && B3 && B4 && esMatrizCuadrada(B3) && mismasDimensiones(B3, B4)) {
        try { Q = matrizCambioBase(B3, B4); } catch { Q = null; }
    }

    // A = matriz transformación de B2 → B3 (solo si B2 y B3 están COMPLETAS y mismas dimensiones)
    let A = null;
    if (todasCompletas && B2 && B3 && esMatrizCuadrada(B2) && esMatrizCuadrada(B3) && B2.length === B3.length) {
        try {
            const n = B2.length;
            const identidad = Array.from({ length: n }, (_, i) =>
                Array.from({ length: n }, (_, j) => ({ num: i === j ? 1 : 0, den: 1 }))
            );
            A = matrizTransformacion(identidad, B2, B3);
        } catch { A = null; }
    }

    // C = Q·A·P (solo si P, A y Q existen)
    let C = null;
    if (P && A && Q) {
        try {
            const AP = multiplicarMatrices(A, P);
            C = multiplicarMatrices(Q, AP);
        } catch { C = null; }
    }

    renderizarResultados(P, Q, A, C, false);
}

function renderizarResultados(P, Q, A, C, hayErrores = false) {
    renderMatrizDerivada("zone_P", "P", "B₁→B₂", P, hayErrores);
    renderMatrizDerivada("zone_Q", "Q", "B₃→B₄", Q, hayErrores);
    renderMatrizDerivada("zone_A", "A", "B₂→B₃", A, hayErrores);
    renderMatrizDerivada("zone_C", "C = Q·A·P", "", C, hayErrores);
}

function renderMatrizDerivada(zoneId, nombre, subindice, matriz, hayErrores = false) {
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    zone.innerHTML = "";
    const row = document.createElement("div");
    row.className = "tf-derived-row";
    const lbl = document.createElement("div");
    lbl.className = "tf-derived-label";
    lbl.innerHTML = subindice ? `${nombre}<sub>${subindice}</sub> =` : `${nombre} =`;
    row.appendChild(lbl);

    if (hayErrores || !matriz) {
        const placeholder = document.createElement("div");
        placeholder.className = "tf-derived-placeholder";
        placeholder.textContent = "Esperando bases compatibles…";
        placeholder.style.color = "var(--text-muted)";
        placeholder.style.fontStyle = "italic";
        placeholder.style.padding = "1rem";
        row.appendChild(placeholder);
    } else {
        const matrixContainer = document.createElement("div");
        matrixContainer.className = "result-matrix-container";
        matrixContainer.appendChild(crearTablaResultado(matriz, `result_${zoneId}`));
        row.appendChild(matrixContainer);
    }
    zone.appendChild(row);
}

function crearBloqueMatrizEditable(key, simbolo) {
    const cfg = MATRICES[key];

    const wrapper = document.createElement("div");
    wrapper.className = "tf-matrix-block";
    wrapper.id = `block_${key}`;
    wrapper.style.cssText = `
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.75rem 1rem 1rem 1rem;
        border: 2px solid var(--primary);
        border-radius: 16px;
        background: var(--bg-surface, #1a1a2e);
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        min-width: fit-content;
    `.replace(/\s+/g, ' ').trim();

    const topRow = document.createElement("div");
    topRow.style.cssText = "display:flex;justify-content:flex-end;align-items:center;gap:0.6rem;";

    const switchLabel = document.createElement("div");
    switchLabel.className = "canonical-switch-wrapper tf-canonical-switch";
    switchLabel.setAttribute("title", `Usar base canónica para ${cfg.label}`);
    switchLabel.style.cursor = "pointer";

    const symbolSpan = document.createElement("span");
    symbolSpan.className = "canonical-switch-symbol";
    symbolSpan.textContent = "𝔼";
    symbolSpan.setAttribute("aria-hidden", "true");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = `tfCanonica_${key}`;
    input.className = "canonical-switch-input";
    input.setAttribute("aria-label", `Usar base canónica para ${cfg.label}`);

    switchLabel.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        input.checked = !input.checked;
        console.log(`Switch clicked for key ${key}. New Checked state:`, input.checked);
        toggleIdentidad(key);
    });

    const visual = document.createElement("span");
    visual.className = "canonical-switch-visual";
    visual.setAttribute("aria-hidden", "true");

    const knob = document.createElement("span");
    knob.className = "canonical-switch-knob";
    visual.appendChild(knob);

    switchLabel.append(symbolSpan, input, visual);
    topRow.appendChild(switchLabel);
    wrapper.appendChild(topRow);

    const mainRow = document.createElement("div");
    mainRow.style.cssText = "display:flex;align-items:center;gap:0.75rem;";

    const label = document.createElement("div");
    label.className = "tf-matrix-label";
    label.innerHTML = `<strong>${cfg.label}</strong> <span style="font-size:0.75em;color:var(--text-muted,#888)">[${simbolo}]</span> =`;
    label.style.cssText = "white-space:nowrap;font-size:1.1rem;color:var(--primary,#e05);";

    const matrixContainer = document.createElement("div");
    matrixContainer.className = "tf-matrix-container";
    matrixContainer.style.cssText = "position:relative;display:inline-flex;align-items:center;justify-content:center;padding:0.5rem 1rem;";

    const table = crearTablaEditable(key, cfg.rows, cfg.cols);
    matrixContainer.appendChild(table);

    mainRow.appendChild(label);
    mainRow.appendChild(matrixContainer);
    wrapper.appendChild(mainRow);

    return wrapper;
}

export function inicializarTransformaciones(article) {
    _article = article;
    while (article.firstChild) article.removeChild(article.firstChild);

    const section = UI.createSection("mainSection", "TRANSFORMACIONES LINEALES");
    section.className = "tf-section";
    section.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2rem;padding:2rem;width:100%;box-sizing:border-box;";

    const formula = document.createElement("p");
    formula.className = "tf-formula";
    formula.innerHTML = "T: ℝ<sup>n</sup> → ℝ<sup>m</sup>";
    section.appendChild(formula);

    const threeColumns = document.createElement("div");
    threeColumns.style.cssText = "display:flex;align-items:stretch;justify-content:center;gap:2rem;flex-wrap:nowrap;overflow-x:auto;width:100%;";

    const col1 = document.createElement("div");
    col1.style.cssText = "display:flex;flex-direction:column;align-items:center;";
    const espacioV = document.createElement("div");
    espacioV.className = "tf-espacio";
    const lblV = document.createElement("div");
    lblV.className = "tf-espacio-label";
    lblV.textContent = "Espacio Vectorial V";
    const pArrow = document.createElement("div");
    pArrow.className = "tf-arrow-vertical";
    pArrow.innerHTML = `<span class="arrow-symbol">↑</span><span class="arrow-label">P<sub>B₁→B₂</sub></span>`;
    espacioV.appendChild(lblV);
    espacioV.appendChild(crearBloqueMatrizEditable("B2", "β↓"));
    espacioV.appendChild(pArrow);
    espacioV.appendChild(crearBloqueMatrizEditable("B1", "α↓"));
    col1.appendChild(espacioV);

    const col2 = document.createElement("div");
    col2.className = "tf-center-column";
    const arrowToA = document.createElement("div");
    arrowToA.className = "tf-long-arrow-horizontal";
    arrowToA.textContent = "→";
    const zoneA = document.createElement("div");
    zoneA.id = "zone_A";
    zoneA.style.display = "flex";
    zoneA.style.justifyContent = "center";
    const spacer = document.createElement("div");
    spacer.style.height = "2rem";
    const arrowToC = document.createElement("div");
    arrowToC.className = "tf-long-arrow-horizontal";
    arrowToC.textContent = "→";
    const zoneC = document.createElement("div");
    zoneC.id = "zone_C";
    zoneC.style.cssText = "display:flex;justify-content:center;";
    col2.appendChild(arrowToA);
    col2.appendChild(zoneA);
    col2.appendChild(spacer);
    col2.appendChild(arrowToC);
    col2.appendChild(zoneC);

    const col3 = document.createElement("div");
    col3.style.cssText = "display:flex;flex-direction:column;align-items:center;";
    const espacioW = document.createElement("div");
    espacioW.className = "tf-espacio";
    const lblW = document.createElement("div");
    lblW.className = "tf-espacio-label";
    lblW.textContent = "Espacio Vectorial W";
    const qArrow = document.createElement("div");
    qArrow.className = "tf-arrow-vertical";
    qArrow.innerHTML = `<span class="arrow-label">Q<sub>B₃→B₄</sub></span><span class="arrow-symbol">↓</span>`;
    espacioW.appendChild(lblW);
    espacioW.appendChild(crearBloqueMatrizEditable("B3", "γ↓"));
    espacioW.appendChild(qArrow);
    espacioW.appendChild(crearBloqueMatrizEditable("B4", "δ↓"));
    col3.appendChild(espacioW);

    threeColumns.appendChild(col1);
    threeColumns.appendChild(col2);
    threeColumns.appendChild(col3);
    section.appendChild(threeColumns);

    const bottomRow = document.createElement("div");
    bottomRow.style.cssText = "display:flex;align-items:center;justify-content:center;gap:4rem;flex-wrap:wrap;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);";
    const zoneP = document.createElement("div");
    zoneP.id = "zone_P";
    const zoneQ2 = document.createElement("div");
    zoneQ2.id = "zone_Q";
    bottomRow.appendChild(zoneP);
    bottomRow.appendChild(zoneQ2);
    section.appendChild(bottomRow);

    article.appendChild(section);

    _tfConfigurar(article);
    actualizarMatricesDerivadas();
}

export function limpiarTransformaciones() {
    activeV = null;
    activeW = null;
    Object.values(MATRICES).forEach(m => { m.locked = false; m.isIdentity = false; });
    _tfDesconfigurar();
    _article = null;
}
