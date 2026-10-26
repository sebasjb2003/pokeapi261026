const form = document.getElementById("formBusqueda");
const input = document.getElementById("busqueda");
const resultado = document.getElementById("resultado");
const navegacion = document.getElementById("navegacion");
const btnAnterior = document.getElementById("btnAnterior");
const btnSiguiente = document.getElementById("btnSiguiente");


const MAX_POKEMON = 1025; // total aproximado en la PokéAPI
let idActual = null;

async function buscarPokemon(termino) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${termino}`);
    if (!res.ok) throw new Error("No encontrado");
    return await res.json();
}
async function buscarDescripcion(p) {
    try {
        const res = await fetch(p.species.url);
        if (!res.ok) throw new Error("Sin especie");
        const especie = await res.json();

        const entradas = especie.flavor_text_entries;
        // Preferimos español; si no hay, inglés. Cogemos la última (la más reciente)
        const entrada =
            entradas.filter(e => e.language.name === "es").at(-1) ??
            entradas.filter(e => e.language.name === "en").at(-1);

        return entrada
            ? entrada.flavor_text.replace(/[\n\f\u00ad]/g, " ")
            : "Sin descripción disponible.";
    } catch (error) {
        console.error("Error al cargar la descripción:", error);
        return "Sin descripción disponible.";
    }
}
async function cargar(termino) {
    resultado.innerHTML = `<div class="spinner-border text-primary"></div>`;

    let p;
    let descripcion;

    try {
        p = await buscarPokemon(termino);
        descripcion = await buscarDescripcion(p);
    } catch (error) {
        console.error("Error en la petición:", error);
        resultado.innerHTML = `<div class="alert alert-danger">Pokémon no encontrado</div>`;
        navegacion.hidden = true;
        return;
    }

    try {
        mostrarPokemon(p, descripcion);
    } catch (error) {
        console.error("Error al pintar el Pokémon:", error);
        resultado.innerHTML = `<div class="alert alert-warning">Error al mostrar los datos (mira la consola)</div>`;
    }
}

function mostrarPokemon(p, descripcion) {
    console.log("Descripción recibida:", descripcion);
    idActual = p.id;
    input.value = p.name;

    const stats = p.stats.map(s => `
        <div class="mb-1">
            <small class="text-capitalize">${s.stat.name}: <strong>${s.base_stat}</strong></small>
            <div class="progress" style="height: 8px;">
                <div class="progress-bar" style="width: ${(s.base_stat / 255) * 100}%"></div>
            </div>
        </div>`).join("");

    const habilidades = p.abilities
        .map(a => a.ability.name + (a.is_hidden ? " (oculta)" : ""))
        .join(", ");

    const ataques = p.moves
        .map(m => m.move)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(m => `<button type="button" class="btn btn-sm btn-outline-secondary m-1 text-capitalize"
                        data-move="${m.url}">${m.name.replace(/-/g, " ")}</button>`)
        .join("");

    resultado.innerHTML = `
        <div class="card" style="max-width: 40rem;">
        <img src="${p.sprites.other["official-artwork"].front_default ?? p.sprites.front_default}" class="pokemon-img" alt="${p.name}">
        <div class="card-body">
        <h5 class="card-title text-capitalize">#${p.id} ${p.name}</h5>
        <p class="card-text fst-italic">${descripcion}</p>
        <p class="card-text mb-1">Tipo: ${p.types.map(t => t.type.name).join(", ")}</p>
        <p class="card-text mb-1">Altura: ${p.height / 10} m · Peso: ${p.weight / 10} kg</p>
        <p class="card-text text-capitalize">Habilidades: ${habilidades}</p>

            <h6>Estadísticas</h6>
                ${stats}

            <h6 class="mt-3">Ataques (${p.moves.length})</h6>
            <div id="detalleAtaque" class="alert alert-light small" hidden></div>
            <div style="max-height: 180px; overflow-y: auto;">${ataques}</div>
        </div>
    </div>`;

    navegacion.hidden = false;
    btnAnterior.disabled = idActual <= 1;
    btnSiguiente.disabled = idActual >= MAX_POKEMON;
    input.blur();
}
// Búsqueda por formulario
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const termino = input.value.trim().toLowerCase();
    if (termino) cargar(termino);
});

// Botones siguiente y atrás
btnAnterior.addEventListener("click", () => cargar(idActual - 1));
btnSiguiente.addEventListener("click", () => cargar(idActual + 1));

document.addEventListener("keydown", (e) => {
    // No interferir cuando se escribe en el buscador
    if (e.target.matches("input, textarea")) return;
    // Aún no hay ningún Pokémon cargado
    if (idActual === null) return;

    if (e.key === "ArrowLeft" && idActual > 1) {
        cargar(idActual - 1);
    } else if (e.key === "ArrowRight" && idActual < MAX_POKEMON) {
        cargar(idActual + 1);
    }
});

const lista = document.getElementById("listaPokemon");
let todos = [];      // todos los Pokémon: { id, name }
let visibles = [];   // los que se muestran (más adelante, filtrados)

function idDesdeUrl(url) {
    return Number(url.split("/").filter(Boolean).pop());
}

async function cargarListado() {
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${MAX_POKEMON}`);
        if (!res.ok) throw new Error("Error al cargar el listado");
        const data = await res.json();
        todos = data.results.map(r => ({ id: idDesdeUrl(r.url), name: r.name }));
        visibles = todos;
        pintarLista();
    } catch (error) {
        console.error(error);
        lista.innerHTML = `<li class="text-danger p-2">No se pudo cargar la lista</li>`;
    }
}

function pintarLista() {
    lista.innerHTML = visibles.map(p => `
        <li>
            <button type="button" class="item-pokemon" data-id="${p.id}">
                <img loading="lazy" alt=""
                    src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png">
                <span class="item-num">#${String(p.id).padStart(3, "0")}</span>
                <span class="item-nombre">${p.name.replace(/-/g, " ")}</span>
            </button>
        </li>`).join("");
    marcarActivo();
}

function marcarActivo() {
    lista.querySelector(".activo")?.classList.remove("activo");
    const activo = lista.querySelector(`[data-id="${idActual}"]`);
    if (activo) {
        activo.classList.add("activo");
        activo.scrollIntoView({ block: "nearest" });
    }
}

lista.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-id]");
    if (btn) cargar(Number(btn.dataset.id));
});

cargarListado();
cargar(1);   // abre el libro en Bulbasaur