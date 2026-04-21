import { inicializarMatriz, cambiarModo } from "./ux.js";

const article = document.getElementById("article");
const btnAXB = document.getElementById("AXB");
const btnInversa = document.getElementById("inversa");
const btnDeterminante = document.getElementById("determinante");

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