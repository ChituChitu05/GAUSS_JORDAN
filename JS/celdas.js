import Auxiliares from "./auxiliares.js";
export function crearSpanCelda(value, row, col) {
    const span = document.createElement("span");
    span.className = "cell-span";
    span.setAttribute("data-row", row);
    span.setAttribute("data-col", col);
    span.tabIndex = 0;

    if (value && Auxiliares.esFraccion(value)) {
        const fraccion = Auxiliares.parsearFraccion(value);
        const [numSimp, denSimp] = Auxiliares.simplificar(fraccion.num, fraccion.den);
        const valorSimplificado = denSimp === 1 ? `${numSimp}` : `${numSimp}/${denSimp}`;

        if (denSimp === 1) {
            span.setAttribute('data-value', valorSimplificado);
            span.textContent = numSimp;
        } else if (Auxiliares.tieneDecimales(value)) {
            const [num, den] = value.split("/");
            span.setAttribute('data-value', value);
            span.innerHTML = `
                <span class="frac">
                    <span class="top">${num}</span>
                    <span class="bottom">${den}</span>
                </span>
            `;
        } else {
            span.setAttribute('data-value', valorSimplificado);
            span.innerHTML = `
                <span class="frac">
                    <span class="top">${numSimp}</span>
                    <span class="bottom">${denSimp}</span>
                </span>
            `;
        }
    } else {
        span.setAttribute('data-value', value || "");
        span.textContent = value || "";
    }

    return span;
}

/**
 * Convierte un span a input para edición
 */
export function spanToInput(span) {
    if (!span || !span.classList.contains('cell-span')) return null;

    const row = parseInt(span.getAttribute('data-row'));
    const col = parseInt(span.getAttribute('data-col'));
    const value = span.getAttribute('data-value') || '';

    const input = document.createElement("input");
    input.type = "text";
    input.className = "cell-input";
    input.value = value;
    input.setAttribute("data-row", row);
    input.setAttribute("data-col", col);

    span.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    return input;
}

/**
 * Convierte un input a span (simplificando si es posible)
 */
export function inputToSpan(input) {
    if (!input || input.tagName !== 'INPUT' || !input.classList.contains('cell-input')) return null;

    const row = parseInt(input.getAttribute('data-row'));
    const col = parseInt(input.getAttribute('data-col'));
    const value = input.value.trim();

    let finalValue = value;
    if (value && Auxiliares.esFraccion(value)) {
        const fraccion = Auxiliares.parsearFraccion(value);
        const [numSimp, denSimp] = Auxiliares.simplificar(fraccion.num, fraccion.den);

        if (denSimp === 1) {
            finalValue = `${numSimp}`;
        } else if (!Auxiliares.tieneDecimales(value)) {
            finalValue = `${numSimp}/${denSimp}`;
        }
    }

    const span = crearSpanCelda(finalValue, row, col);
    input.replaceWith(span);

    return span;
}

// Función para enfocar una celda específica
export function focusCell(row, col, table) {
    if (row < 0 || col < 0 || row >= table.rows.length) return false;
    if (col >= table.rows[row].cells.length) return false;

    const cell = table.rows[row].cells[col];
    if (!cell) return false;

    const span = cell.querySelector('.cell-span');
    const input = cell.querySelector('.cell-input');

    if (span) {
        return !!spanToInput(span);
    } else if (input) {
        input.focus();
        input.select();
        return true;
    }

    return false;
}