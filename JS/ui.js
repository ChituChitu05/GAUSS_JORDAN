export function createSection(id, title = "") {
    const section = document.createElement("section");
    section.id = id;
    if (title) {
        const h2 = document.createElement("h2");
        h2.textContent = title;
        section.appendChild(h2);
    }
    return section;
}

export function createButton(id, text, className = "") {
    const btn = document.createElement("button");
    btn.id = id;
    btn.textContent = text;
    if (className) btn.className = className;
    return btn;
}

export function createInput(clas) {
    const input = document.createElement("input");
    input.className = clas; 
    input.type = "text";
    return input;
}

export function createLabel(text, htmlFor = "") {
    const label = document.createElement("label");
    label.textContent = text;
    if (htmlFor) label.htmlFor = htmlFor;
    return label;
}
export function createDiv(id){
    const div = document.createElement("div");
    div.id = id;
    return div;
}


// Tablas
export function createTable(id){
    const table = document.createElement("table");
    table.id = id;
    return table;
}

export function createRow(id){
    const tr = document.createElement("tr");
    tr.id = id;
    return tr;

}

export function createTd(id){
    const td = document.createElement("td");
    td.id = id;
    return td;
}
const UI = {
    createSection,
    createButton,
    createInput,
    createLabel,
    createDiv,
    createTable,
    createRow,
    createTd
};

export default UI;