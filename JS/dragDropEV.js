// dragDropEV.js
import { crearSpanCelda, actualizarBotonCalcularEV, tieneErroresEV } from "./celdas.js";

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
            if (primeraCelda && (primeraCelda.innerHTML.includes("v") || primeraCelda.innerHTML.includes("B"))) {
                if (filaActual === row) {
                    const cell = tr.cells[col + 1];
                    if (cell) {
                        const span = cell.querySelector('.cell-span');
                        if (span) span.classList.add('cell-error');
                    }
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
            statusSpan.innerHTML = "⚠ Error";
        } else {
            statusSpan.className = "file-status valid";
            statusSpan.innerHTML = "✓ Válido";
        }
    }
}

export function parseMatrixToVectors(text) {
    const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
        throw new Error("Archivo vacío");
    }
    
    const matrix = lines.map((line, index) => {
        const tokens = line.trim().split(/[\s,;]+/).filter(token => token);
        if (tokens.length === 0) {
            throw new Error(`Línea ${index + 1} vacía`);
        }
        return tokens;
    });
    
    const columnCounts = matrix.map(row => row.length);
    const maxCols = Math.max(...columnCounts);
    
    matrix.forEach(row => {
        while (row.length < maxCols) {
            row.push("0");
        }
    });
    
    return matrix;
}

export function clearEVFileData() {
    const indicator = document.querySelector(".file-indicator-ev");
    if (indicator) {
        indicator.remove();
    }
    // Re-habilitar botón calcular después de eliminar archivo
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
            <p>Formato: cada fila es un vector (componentes separados por espacio, coma o punto y coma)</p>
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
    
    body.addEventListener('drop', (e) => {
        preventDefaults(e);
        dragCounter = 0;
        dropZone.classList.remove('active');
        
        const files = e.dataTransfer.files;
        if (files.length === 0) return;
        
        const file = files[0];
        const validExtensions = ['.txt', '.csv'];
        const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (!hasValidExtension) {
            alert('Formato no soportado. Use archivos .txt o .csv');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const vectores = parseMatrixToVectors(content);
                
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
                
            } catch (error) {
                alert(`Error al procesar el archivo: ${error.message}`);
            }
        };
        reader.readAsText(file);
    });
}