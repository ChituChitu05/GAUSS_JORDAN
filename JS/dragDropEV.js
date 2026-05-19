// dragDropEV.js
import { actualizarBotonCalcularEV } from "./celdas.js";

let onMatrixLoadCallback = null;

export function setEVCallbacks(callback) {
    onMatrixLoadCallback = callback;
}

// Validar valor de vector
export function isValidVectorValue(value) {
    if (!value || value.trim() === "") return true;
    
    const trimmed = value.trim();
    
    if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(trimmed)) return false;
    if (/[^0-9\-\/\.]/.test(trimmed)) return false;
    
    const slashCount = (trimmed.match(/\//g) || []).length;
    if (slashCount > 1) return false;
    
    if (/^\//.test(trimmed)) return false;
    if (/\/$/.test(trimmed)) return false;
    
    if (trimmed.includes('/')) {
        const slashIndex = trimmed.indexOf('/');
        const beforeSlash = trimmed.substring(0, slashIndex);
        const afterSlash = trimmed.substring(slashIndex + 1);
        
        if (beforeSlash !== '' && beforeSlash !== '-' && !/^-?\d*\.?\d*$/.test(beforeSlash)) return false;
        if (afterSlash === '' || afterSlash === '-') return false;
        if (!/^-?\d*\.?\d*$/.test(afterSlash)) return false;
        
        const denom = parseFloat(afterSlash);
        if (denom === 0) return false;
    } else {
        if (trimmed !== '-' && !/^-?\d*\.?\d*$/.test(trimmed)) return false;
    }
    
    return true;
}

function limpiarValor(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor).trim();
}

function normalizarFilas(filas) {
    const matrix = filas
        .map(fila => fila.map(limpiarValor))
        .filter(fila => fila.some(celda => celda !== ""));

    if (matrix.length === 0) {
        throw new Error("Archivo vacío");
    }

    const maxCols = Math.max(...matrix.map(row => row.length));
    matrix.forEach(row => {
        while (row.length < maxCols) {
            row.push("0");
        }
    });

    return matrix;
}

function transponerMatriz(matrix) {
    const filas = matrix.length;
    const columnas = matrix[0]?.length || 0;
    const vectores = [];

    for (let j = 0; j < columnas; j++) {
        const vector = [];
        for (let i = 0; i < filas; i++) {
            vector.push(matrix[i][j] || "0");
        }
        vectores.push(vector);
    }

    return vectores;
}

function parseGreekVectorList(text) {
    const vectores = [];
    const regex = /[\u0370-\u03ff]+(?:\d+|[₀-₉]+)?\s*=\s*[\(\[]([^\)\]]+)[\)\]]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const componentes = match[1]
            .split(/[\s,;]+/)
            .map(limpiarValor)
            .filter(valor => valor !== "");

        if (componentes.length > 0) vectores.push(componentes);
    }

    return vectores.length > 0 ? normalizarFilas(vectores) : null;
}

function filasATexto(filas) {
    return filas.map(fila => fila.map(limpiarValor).join(" ")).join("\n");
}

function pedirFormatoArchivo() {
    return confirm(
        "¿El archivo está en forma de matriz?\n\n" +
        "Aceptar: matriz por columnas, cada columna será un vector.\n" +
        "Cancelar: lista de vectores, cada fila será un vector."
    ) ? "matriz" : "lista";
}

export function parseMatrixToVectors(text, modo = "lista") {
    const greekVectors = parseGreekVectorList(text);
    if (greekVectors) return greekVectors;

    const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
        throw new Error("Archivo vacío");
    }
    
    const matrix = normalizarFilas(lines.map((line, index) => {
        const tokens = line.trim().split(/[\s,;]+/).filter(token => token);
        if (tokens.length === 0) {
            throw new Error(`Línea ${index + 1} vacía`);
        }
        return tokens;
    }));
    
    return modo === "matriz" ? transponerMatriz(matrix) : matrix;
}

function parseRowsToVectors(rows, modo = "lista") {
    const texto = filasATexto(rows);
    const greekVectors = parseGreekVectorList(texto);
    if (greekVectors) return greekVectors;

    const matrix = normalizarFilas(rows);
    return modo === "matriz" ? transponerMatriz(matrix) : matrix;
}

function leerArchivoTexto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = () => reject(new Error("Error al leer el archivo"));
        reader.readAsText(file);
    });
}

function leerArchivoArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = () => reject(new Error("Error al leer el archivo"));
        reader.readAsArrayBuffer(file);
    });
}

async function leerXLSX(file) {
    if (!window.XLSX) {
        throw new Error("No se cargó el lector XLSX. Revisa la conexión o usa .txt/.csv.");
    }

    const buffer = await leerArchivoArrayBuffer(file);
    const workbook = window.XLSX.read(new Uint8Array(buffer), { type: "array" });
    const firstSheet = workbook.SheetNames[0];

    if (!firstSheet) {
        throw new Error("El archivo XLSX no contiene hojas");
    }

    const sheet = workbook.Sheets[firstSheet];
    return window.XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: ""
    });
}

// Encontrar errores en los vectores
function findErrorsInVectors(vectores) {
    const errors = [];
    for (let i = 0; i < vectores.length; i++) {
        for (let j = 0; j < vectores[i].length; j++) {
            if (!isValidVectorValue(vectores[i][j])) {
                errors.push({ row: i, col: j, value: vectores[i][j] });
            }
        }
    }
    return errors;
}

// Marcar errores en la tabla EV
function markErrorsInEVTable(table, errors) {
    if (!table) return;
    
    // Limpiar errores existentes
    const allSpans = table.querySelectorAll('.cell-span');
    allSpans.forEach(span => span.classList.remove('cell-error'));
    
    // Marcar nuevos errores
    errors.forEach(({ row, col }) => {
        let filaActual = 0;
        for (let i = 0; i < table.rows.length; i++) {
            const tr = table.rows[i];
            const primeraCelda = tr.cells[0];
            if (primeraCelda && (primeraCelda.innerHTML.includes("α") || primeraCelda.innerHTML.includes("β"))) {
                if (filaActual === row) {
                    const componentes = Array.from(tr.querySelectorAll('.cell-span'));
                    const span = componentes[col];
                    if (span) span.classList.add('cell-error');
                    break;
                }
                filaActual++;
            }
        }
    });
    
    // Actualizar indicador de archivo
    updateEVFileIndicatorBasedOnErrors(errors.length > 0);
    
    // Actualizar botón calcular
    actualizarBotonCalcularEV();
}

function updateEVFileIndicatorBasedOnErrors(hasErrors) {
    let indicator = document.querySelector(".file-indicator-ev");
    if (!indicator) return;
    
    const statusSpan = indicator.querySelector(".file-status");
    if (statusSpan) {
        if (hasErrors) {
            statusSpan.className = "file-status error";
            statusSpan.innerHTML = " Error";
        } else {
            statusSpan.className = "file-status valid";
            statusSpan.innerHTML = " Válido";
        }
    }
}

export function clearEVFileData() {
    const indicator = document.querySelector(".file-indicator-ev");
    if (indicator) {
        indicator.remove();
    }
    // Rehabilitar botón calcular después de eliminar archivo
    setTimeout(() => actualizarBotonCalcularEV(), 50);
}

function updateEVFileIndicator(fileName, isValid) {
    let indicator = document.querySelector(".file-indicator-ev");
    if (!indicator) {
        indicator = document.createElement("div");
        indicator.className = "file-indicator file-indicator-ev";
        document.body.appendChild(indicator);
    }
    indicator.className = "file-indicator file-indicator-ev show";
    indicator.innerHTML = `
        <span class="file-name">📄 ${fileName}</span>
        <span class="file-status ${isValid ? 'valid' : 'error'}">
            ${isValid ? '✓ Válido' : '⚠ Error'}
        </span>
        <button class="remove-file-ev" title="Quitar archivo">×</button>
    `;
    const removeBtn = indicator.querySelector(".remove-file-ev");
    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            clearEVFileData();
            if (onMatrixLoadCallback) {
                onMatrixLoadCallback(null, null);
            }
        });
    }
}

async function procesarArchivoEV(file) {
    const fileName = file.name.toLowerCase();
    const esXLSX = fileName.endsWith('.xlsx');
    const esTexto = fileName.endsWith('.txt') || fileName.endsWith('.csv');

    if (!esXLSX && !esTexto) {
        alert('Formato no soportado. Use archivos .txt, .csv o .xlsx');
        return;
    }

    let vectores;

    if (esXLSX) {
        const filas = await leerXLSX(file);
        const texto = filasATexto(filas);
        const greekVectors = parseGreekVectorList(texto);
        if (greekVectors) {
            vectores = greekVectors;
        } else {
            const modo = pedirFormatoArchivo();
            vectores = parseRowsToVectors(filas, modo);
        }
    } else {
        const content = await leerArchivoTexto(file);
        const greekVectors = parseGreekVectorList(content);
        if (greekVectors) {
            vectores = greekVectors;
        } else {
            const modo = pedirFormatoArchivo();
            vectores = parseMatrixToVectors(content, modo);
        }
    }

    if (vectores.length < 2) {
        throw new Error("Se requieren al menos 2 vectores");
    }
    if (vectores[0].length < 2) {
        throw new Error("Los vectores deben tener al menos 2 componentes");
    }

    const errors = findErrorsInVectors(vectores);
    const hasErrors = errors.length > 0;

    if (onMatrixLoadCallback) {
        onMatrixLoadCallback(vectores, file.name);
    }

    // Solo actualizar el indicador existente, no crear uno nuevo
    updateEVFileIndicator(file.name, !hasErrors);

    // Marcar errores después de que la tabla se construya
    setTimeout(() => {
        const table = document.getElementById("inputTable");
        if (table && hasErrors) {
            markErrorsInEVTable(table, errors);
        }
        actualizarBotonCalcularEV();
    }, 100);
}

export function initDragAndDropEV() {
    const existingDropZone = document.getElementById("dropZoneEV");
    if (existingDropZone) existingDropZone.remove();
    
    const body = document.body;
    let dragCounter = 0;
    
    const dropZone = document.createElement("div");
    dropZone.id = "dropZoneEV";
    dropZone.className = "drop-zone";
    dropZone.innerHTML = `
        <div class="drop-zone-content">
            <div class="icon">📥</div>
            <h2>Soltar archivo de vectores</h2>
            <p>Formatos: .txt, .csv o .xlsx</p>
            <p>Lista: cada fila es un vector. Matriz: cada columna será un vector.</p>
        </div>
    `;
    body.appendChild(dropZone);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        body.addEventListener(eventName, preventDefaults, false);
    });
    
    body.addEventListener('dragenter', (e) => {
        preventDefaults(e);
        dragCounter++;
        if (dragCounter === 1) dropZone.classList.add('active');
    });
    
    body.addEventListener('dragleave', (e) => {
        preventDefaults(e);
        dragCounter--;
        if (dragCounter === 0) dropZone.classList.remove('active');
    });
    
    body.addEventListener('drop', async (e) => {
        preventDefaults(e);
        dragCounter = 0;
        dropZone.classList.remove('active');

        // Si no está abierto el módulo de E.V y S.E.V, este manejador no debe procesar el archivo.
        if (!document.getElementById("btnCalcularEV")) return;
        
        const files = e.dataTransfer.files;
        if (files.length === 0) return;
        
        try {
            await procesarArchivoEV(files[0]);
        } catch (error) {
            alert(`Error al procesar el archivo: ${error.message}`);
        }
    });
}
