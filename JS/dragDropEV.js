// dragDropEV.js
import { crearSpanCelda } from "./celdas.js";

let onMatrixLoadCallback = null;

export function setEVCallbacks(callback) {
    onMatrixLoadCallback = callback;
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
    
    // CADA FILA DEL ARCHIVO = VECTOR HORIZONTAL (igual que ingresa el usuario)
    // El usuario ingresa vectores horizontales: v1 = [a, b], v2 = [c, d]
    // El archivo debe tener FILAS = VECTORES, COLUMNAS = COMPONENTES
    return matrix;
}

export function clearEVFileData() {
    const indicator = document.querySelector(".file-indicator-ev");
    if (indicator) {
        indicator.remove();
    }
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
            ${isValid ? '✓ Cargado' : '⚠ Error'}
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
                
                if (onMatrixLoadCallback) {
                    onMatrixLoadCallback(vectores, file.name);
                }
                updateEVFileIndicator(file.name, true);
            } catch (error) {
                alert(`Error al procesar el archivo: ${error.message}`);
            }
        };
        reader.readAsText(file);
    });
}