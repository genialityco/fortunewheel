import template from "./AdminScreen.html?raw";
import { subscribePrizes, decrementPrize, updatePrize, addPrize } from "../core/firebasePrizes";

// Tipo estricto del documento
type FirebasePrize = {
    id: string;
    label: string;
    color: string;
    prob: number;     // 0–1
    cantidad: number; // stock
};

// Helper de querySelector con raíz configurable
function qs<T extends Element>(selector: string, root: ParentNode): T {
    const el = root.querySelector(selector);
    if (!el) throw new Error(`No se encontró el selector: ${selector}`);
    return el as T;
}

const AdminScreen = async () => {
    // Contenedor del fragmento
    const container = document.createElement("div");
    container.className = "admin-screen";
    container.innerHTML = template;

    // Referencias DOM (todas dentro del container)
    const tbody = qs<HTMLTableSectionElement>("#prizes-table tbody", container);
    const form = qs<HTMLFormElement>("#prize-form", container);
    const liveBadge = qs<HTMLSpanElement>("#live-badge", container);

    const inputId = qs<HTMLInputElement>("#id", container);
    const inputLabel = qs<HTMLInputElement>("#label", container);
    const inputColor = qs<HTMLInputElement>("#color", container);
    const inputProb = qs<HTMLInputElement>("#prob", container);
    const inputCantidad = qs<HTMLInputElement>("#cantidad", container);
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;

    const rowTpl = qs<HTMLTemplateElement>("#prize-row-tpl", container);
    const emptyTpl = qs<HTMLTemplateElement>("#no-rows-tpl", container);

    // Paginación
    const pagerUL = qs<HTMLUListElement>("#pager", container);
    const pageSizeSel = qs<HTMLSelectElement>("#page-size", container);
    const pageInfo = qs<HTMLSpanElement>("#page-info", container);

    // Estado
    let prizesCache: FirebasePrize[] = [];
    let unsubscribe: (() => void) | undefined;

    // Tamaño por defecto en 5
    pageSizeSel.value = "5";
    let currentPage = 1;
    let pageSize = Number(pageSizeSel.value) || 5;

    function totalPages(): number {
        return Math.max(1, Math.ceil(prizesCache.length / pageSize));
    }

    function renderTablePage(): void {
        tbody.innerHTML = "";

        if (prizesCache.length === 0) {
            tbody.appendChild(document.importNode(emptyTpl.content, true));
            pageInfo.textContent = "0–0 de 0";
            pagerUL.innerHTML = "";
            return;
        }

        const tp = totalPages();
        if (currentPage > tp) currentPage = tp;

        const start = (currentPage - 1) * pageSize;
        const end = Math.min(start + pageSize, prizesCache.length);
        const view = prizesCache.slice(start, end);

        const frag = document.createDocumentFragment();

        for (const p of view) {
            const fragment = document.importNode(rowTpl.content, true);
            const tr = fragment.firstElementChild as HTMLTableRowElement;

            (tr.querySelector(".label") as HTMLElement).textContent = p.label;

            const swatch = tr.querySelector(".color-swatch") as HTMLElement;
            swatch.textContent = p.color;
            swatch.setAttribute(
                "style",
                `padding:0 10px;border:1px solid #ddd;background:${p.color};`
            );

            (tr.querySelector(".prob") as HTMLElement).textContent =
                Number.isFinite(p.prob) ? p.prob.toFixed(2) : "-";

            (tr.querySelector(".cantidad") as HTMLElement).textContent = String(p.cantidad);

            const editBtn = tr.querySelector(".edit-btn") as HTMLButtonElement;
            editBtn.dataset.id = p.id;

            const decBtn = tr.querySelector(".decrement-btn") as HTMLButtonElement;
            decBtn.dataset.id = p.id;

            frag.appendChild(tr);
        }

        tbody.appendChild(frag);
        pageInfo.textContent = `${start + 1}–${end} de ${prizesCache.length}`;
    }

    function renderPagination(): void {
        const tp = totalPages();
        pagerUL.innerHTML = "";

        const makeLi = (label: string, page: number | null, disabled = false, active = false) => {
            const liEl = document.createElement("li");
            liEl.className = `page-item${disabled ? " disabled" : ""}${active ? " active" : ""}`;
            const a = document.createElement("a");
            a.className = "page-link";
            a.href = "#";
            a.textContent = label;
            if (!disabled && page !== null && page !== undefined) {
                a.dataset.page = String(page);
            }
            liEl.appendChild(a);
            return liEl;
        };

        // Prev
        pagerUL.appendChild(makeLi("«", currentPage - 1, currentPage === 1));

        // Ventana de 5 páginas alrededor de la actual
        const windowSize = 5;
        let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
        let end = Math.min(tp, start + windowSize - 1);
        start = Math.max(1, end - windowSize + 1);

        if (start > 1) {
            pagerUL.appendChild(makeLi("1", 1, false, currentPage === 1));
            if (start > 2) {
                const ell = document.createElement("li");
                ell.className = "page-item disabled";
                ell.innerHTML = `<span class="page-link">…</span>`;
                pagerUL.appendChild(ell);
            }
        }

        for (let p = start; p <= end; p++) {
            pagerUL.appendChild(makeLi(String(p), p, false, p === currentPage));
        }

        if (end < tp) {
            if (end < tp - 1) {
                const ell2 = document.createElement("li");
                ell2.className = "page-item disabled";
                ell2.innerHTML = `<span class="page-link">…</span>`;
                pagerUL.appendChild(ell2);
            }
            pagerUL.appendChild(makeLi(String(tp), tp, false, currentPage === tp));
        }

        // Next
        pagerUL.appendChild(makeLi("»", currentPage + 1, currentPage === tp));
    }

    // Suscripción en tiempo real
    unsubscribe = subscribePrizes((prizes: FirebasePrize[]) => {
        prizesCache = prizes ?? [];

        // Mantén la página actual si sigue siendo válida
        const tp = totalPages();
        if (currentPage > tp) currentPage = tp;

        renderTablePage();
        renderPagination();
        // marcar "vivo"
        liveBadge.classList.add("text-bg-success");
    });

    // Navegación por click (delegación)
    pagerUL.addEventListener("click", (ev) => {
        ev.preventDefault();
        const a = (ev.target as HTMLElement).closest("a.page-link") as HTMLAnchorElement | null;
        if (!a) return;
        const dp = Number(a.dataset.page);
        if (Number.isNaN(dp)) return;
        const tp = totalPages();
        currentPage = Math.min(tp, Math.max(1, dp));
        renderTablePage();
        renderPagination();
    });

    // Cambio de tamaño de página
    pageSizeSel.addEventListener("change", () => {
        pageSize = Number(pageSizeSel.value) || 5;
        currentPage = 1; // reinicia a la primera
        renderTablePage();
        renderPagination();
    });

    // Delegación sobre la tabla para Editar y Decrementar
    tbody.addEventListener("click", async (ev) => {
        const target = ev.target as HTMLElement;

        // --- Editar ---
        const editBtn = target.closest("button.edit-btn") as HTMLButtonElement | null;
        if (editBtn && editBtn.dataset.id) {
            const id = editBtn.dataset.id;
            const prize = prizesCache.find((p) => p.id === id);
            if (!prize) return;

            // Popular formulario
            inputId.value = prize.id;
            inputLabel.value = prize.label;

            // Intentar asignar el color si es un hex válido (type="color" lo exige)
            const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(prize.color);
            inputColor.value = isHex ? prize.color : inputColor.value;

            inputProb.value = String(prize.prob);
            inputCantidad.value = String(prize.cantidad);

            // Feedback visual en el botón
            submitBtn.textContent = "Actualizar Premio";
            submitBtn.classList.remove("btn-primary");
            submitBtn.classList.add("btn-success");

            // Llevar foco al formulario
            inputLabel.focus({ preventScroll: false });
            form.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }

        // --- Decrementar ---
        const decBtn = target.closest("button.decrement-btn") as HTMLButtonElement | null;
        if (decBtn && decBtn.dataset.id) {
            const id = decBtn.dataset.id;
            try {
                await decrementPrize(id);
            } catch (err) {
                console.error(err);
                alert("No se pudo decrementar la cantidad.");
            }
            return;
        }
    });

    // Crear/Actualizar premio
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const label = inputLabel.value.trim();
        const color = inputColor.value.trim();
        const prob = parseFloat(inputProb.value);
        const cantidad = parseInt(inputCantidad.value, 10);
        const id = inputId.value.trim();

        if (!label || !color || Number.isNaN(prob) || Number.isNaN(cantidad)) {
            alert("Completa todos los campos correctamente.");
            return;
        }
        if (prob < 0 || prob > 1) {
            alert("La probabilidad debe estar entre 0 y 1.");
            return;
        }
        if (cantidad < 0) {
            alert("La cantidad no puede ser negativa.");
            return;
        }

        try {
            if (id) {
                await updatePrize({ id, label, color, prob, cantidad });
                alert("Premio actualizado");
            } else {
                await addPrize({ label, color, prob, cantidad });
                alert("Premio creado");
            }
        } catch (err) {
            console.error(err);
            alert("Ocurrió un error guardando el premio.");
            return;
        }

        // reset a modo "crear"
        form.reset();
        inputColor.value = "#ff0000"; // default de color
        inputId.value = "";           // salimos de modo edición
        submitBtn.textContent = "Guardar Premio";
        submitBtn.classList.remove("btn-success");
        submitBtn.classList.add("btn-primary");
    });

    // Exponer destroy() para limpieza desde main.ts
    (container as any).destroy = () => {
        try { unsubscribe?.(); } catch { /* noop */ }
    };

    return container;
};

export default AdminScreen;
