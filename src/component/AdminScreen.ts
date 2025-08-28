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

    const rowTpl = qs<HTMLTemplateElement>("#prize-row-tpl", container);
    const emptyTpl = qs<HTMLTemplateElement>("#no-rows-tpl", container);

    let prizesCache: FirebasePrize[] = [];
    let unsubscribe: (() => void) | undefined;

    function render(prizes: FirebasePrize[]) {
        if (!prizes || prizes.length === 0) {
            tbody.replaceChildren(document.importNode(emptyTpl.content, true));
            return;
        }

        const frag = document.createDocumentFragment();

        for (const p of prizes) {
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
            
            (tr.querySelector(".edit-btn") as HTMLButtonElement).dataset.id = p.id;

            frag.appendChild(tr);
        }

        tbody.replaceChildren(frag);
    }


    // Suscripción en tiempo real
    unsubscribe = subscribePrizes((prizes: FirebasePrize[]) => {
        prizesCache = prizes;
        render(prizesCache);
        liveBadge.classList.add("text-bg-success");
    });

    // Delegación de eventos: tabla (restar y editar)
    tbody.addEventListener("click", async (e) => {
        const target = e.target as HTMLElement;
        const decBtn = target.closest<HTMLButtonElement>(".decrement-btn");
        const editBtn = target.closest<HTMLButtonElement>(".edit-btn");

        if (decBtn) {
            const id = decBtn.dataset.id!;
            decBtn.disabled = true;
            try {
                await decrementPrize(id);
                // No renderizamos manualmente: el snapshot repintará la UI
            } finally {
                decBtn.disabled = false;
            }
            return;
        }

        if (editBtn) {
            const id = editBtn.dataset.id!;
            const prize = prizesCache.find((p) => p.id === id);
            if (prize) {
                inputLabel.value = prize.label;
                inputColor.value = prize.color;
                inputProb.value = String(prize.prob);
                inputCantidad.value = String(prize.cantidad);
                inputId.value = prize.id;
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

        if (id) {
            await updatePrize({ id, label, color, prob, cantidad });
            alert("Premio actualizado");
        } else {
            await addPrize({ label, color, prob, cantidad });
            alert("Premio creado");
        }

        form.reset();
        inputColor.value = "#ff0000"; // default de color
        inputId.value = "";           // salimos de modo edición
    });

    // Exponer destroy() para limpieza desde main.ts
    (container as any).destroy = () => {
        try { unsubscribe?.(); } catch { /* noop */ }
    };

    return container;
};

export default AdminScreen;
