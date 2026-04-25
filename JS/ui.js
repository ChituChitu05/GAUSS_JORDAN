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
export function createSpan(text = "", className = "") {
    const span = document.createElement("span");
    span.textContent = text;
    if (className) span.className = className;
    return span;
}

export function createFractionHTML(value) {
    const str = String(value).trim();
    if (!str.includes("/")) return str;
    
    const [num, den] = str.split("/");
    const container = document.createElement("span");
    container.className = "frac";
    
    const top = document.createElement("span");
    top.className = "top";
    top.textContent = num;
    
    const bottom = document.createElement("span");
    bottom.className = "bottom";
    bottom.textContent = den;
    
    container.appendChild(top);
    container.appendChild(bottom);
    
    return container;
}

export function createSpanCell(value = "", className = "cell-span") {
    const span = document.createElement("span");
    span.className = className;
    
    if (value && value.includes("/")) {
        const fractionElement = createFractionHTML(value);
        span.appendChild(fractionElement);
    } else {
        span.textContent = value || "";
    }
    
    return span;
}

const UI = {
    createSection,
    createButton,
    createInput,
    createLabel,
    createDiv,
    createTable,
    createRow,
    createTd,
    createSpan,
    createFractionHTML,
    createSpanCell         
};

export default UI;