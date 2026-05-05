import UI from "./ui.js";

let currentOperation = "li";

export function getCurrentOperation() {
    return currentOperation;
}

export function setCurrentOperation(op) {
    currentOperation = op;
}

// Placeholder - muestra el nombre de la operación seleccionada
export function inicializarEV(article, modo) {
    currentOperation = modo;
    
    // Limpiar article
    while (article.firstChild) article.removeChild(article.firstChild);
    
    const section = UI.createSection("mainSection", "ESPACIOS VECTORIALES");
    const h1 = document.createElement("h1");
    h1.style.textAlign = "center";
    h1.style.color = "var(--text-primary)";
    h1.style.padding = "2rem";
    
    const nombres = {
        "li": "ES LI O LD",
        "pertenecer": "PERTENECE A S",
        "base": "HALLAR BASE",
        "completar": "COMPLETAR BASE"
    };
    
    h1.textContent = nombres[modo] || "OPERACIÓN";
    section.appendChild(h1);
    article.appendChild(section);
}

export function cambiarOperacionEV(article, nuevoModo) {
    inicializarEV(article, nuevoModo);
}