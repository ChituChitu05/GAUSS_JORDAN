import { inicializarMatriz, cambiarModo } from "./ux.js";

const article = document.getElementById("article");
const btnAXB = document.getElementById("AXB");
const btnInversa = document.getElementById("inversa");
const btnDeterminante = document.getElementById("determinante");
const btnTheme = document.getElementById("themeToggle");
const helpBtn = document.getElementById("helpBtn");
const modal = document.getElementById("helpModal");
const modalClose = document.querySelector(".modal-close");
const btnCloseModal = document.querySelector(".btn-close-modal");

// Funciones del modal
function openModal() {
    modal.classList.add("show");
}

function closeModal() {
    modal.classList.remove("show");
}
//jaja estoy borracho cuando escribo esto, si se rompe fui yo xdd uwu
// Eventos  modal
if (helpBtn) {
    helpBtn.addEventListener("click", openModal);
}

if (modalClose) {
    modalClose.addEventListener("click", closeModal);
}

if (btnCloseModal) {
    btnCloseModal.addEventListener("click", closeModal);
}

// Cerrar modal al hacer clic fuera del contenido
if (modal) {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Cerrar modal con tecla Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.classList.contains("show")) {
        closeModal();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    inicializarMatriz(article, "axb");
    btnAXB.classList.add("seleccionado");
});

btnAXB.addEventListener('click', () => {
    cambiarModo(article, "axb");
    btnAXB.classList.add("seleccionado");
    btnInversa.classList.remove("seleccionado");
    if (btnDeterminante) btnDeterminante.classList.remove("seleccionado");
});

btnInversa.addEventListener('click', () => {
    cambiarModo(article, "inversa");
    btnInversa.classList.add("seleccionado");
    btnAXB.classList.remove("seleccionado");
    if (btnDeterminante) btnDeterminante.classList.remove("seleccionado");
});

if (btnDeterminante) {
    btnDeterminante.addEventListener('click', () => {
        cambiarModo(article, "determinante");
        btnDeterminante.classList.add("seleccionado");
        btnAXB.classList.remove("seleccionado");
        btnInversa.classList.remove("seleccionado");
    });
}

btnTheme.addEventListener("click", () => {
    document.body.classList.toggle("light");
    btnTheme.textContent = document.body.classList.contains("light")
        ? "MODO OSCURO"
        : "MODO CLARO";
});