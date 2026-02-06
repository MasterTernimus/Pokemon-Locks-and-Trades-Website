import { Pokemon, Trainer, Trade } from './interfaces.js'



async function getPokemon(trainerName: string): Promise<Pokemon[]> {
    const response = await fetch(`/api/getPokemon?trainerName=${encodeURIComponent(trainerName)}`);
    if (!response.ok) throw new Error(response.status.toString());
    return await response.json();
};

async function displayPokemon(trainerName: string) {
    const trainer = document.querySelector<HTMLSelectElement>('#pokemonList');
    trainer.innerHTML = '';
    const pokemonList: Pokemon[] = await getPokemon(trainerName);
    pokemonList.forEach(pokemon => {
        const lockStatus = document.createElement('select');
        lockStatus.onchange = (e) => changeLockStatus(pokemon.name, (e.target as HTMLInputElement).value);
        ['hardlock', 'softlock', 'tradeable'].forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            lockStatus.appendChild(opt);
        });

        lockStatus.value = pokemon.lock_status;

        const label = document.createElement('label');
        label.append(lockStatus, ' ', pokemon.name);

        trainer.append(label, document.createElement('br'));
    });
}

async function changeLockStatus(pokemonName: string, newStatus: string) {
    const giveForm = document.querySelector<HTMLFormElement>('#toGive');
    const trainerName: string = localStorage.getItem("currentTrainer");
    if (!trainerName) {
        throw new Error("You have not selected a character!");
    }
    const response = await fetch('/api/user/changeLockStatus', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerName, pokemonName, newStatus })
    });
    if (!response.ok) throw new Error(response.status.toString());
    displayPokemon(trainerName);
    displayTradeablePokemon(trainerName, giveForm);
}

async function getTraders() {
    const response = await fetch('/api/getTrainers');
    if (!response.ok) throw new Error(response.status.toString());
    const trainers: Trainer[] = await response.json();
    const trainerSelector = document.querySelector<HTMLSelectElement>("#trainerName")
    for (const trainer of trainers) {
        if (trainer.trainer_name === localStorage.getItem('currentTrainer')) {
            continue;
        }
        const option = document.createElement("option");
        option.value = trainer.trainer_name;
        option.textContent = trainer.trainer_name;
        trainerSelector.appendChild(option);
    }
    sessionStorage.setItem('currentTradePartner', (trainerSelector.childNodes[0] as HTMLOptionElement).value);
    trainerSelector.value = sessionStorage.getItem('currentTradePartner');
    const receiveForm = document.querySelector<HTMLFormElement>('#toReceive');
    displayTradeablePokemon(trainerSelector.value, receiveForm);
};

function chosenTrainer() {
    const receiveForm = document.querySelector<HTMLFormElement>('#toReceive');
    const trainerSelector = document.querySelector<HTMLSelectElement>("#trainerName");
    displayTradeablePokemon(trainerSelector.value, receiveForm);
}

async function displayTradeablePokemon(trainerName: string, parentForm?: HTMLFormElement) {
    parentForm = parentForm ?? document.querySelector<HTMLFormElement>('#toGive');
    if (!parentForm) {
        throw new Error("A form is missing...?");
    }
    const pokemonList: Pokemon[] = await getPokemon(trainerName);
    parentForm.innerHTML = '';
    pokemonList.forEach(pokemon => {
        const input = document.createElement('input');
        const label = document.createElement('label');
        const br = document.createElement('br');

        input.type = 'checkbox';
        input.value = pokemon.name;
        input.name = 'pokemon';

        label.appendChild(input);
        label.appendChild(document.createTextNode(' ' + pokemon.name + ': ' + pokemon.lock_status));

        parentForm.appendChild(label);
        parentForm.appendChild(br);
    });
    sessionStorage.setItem('currentTradePartner', trainerName);
}

async function sendTrade() {
    const giveForm = document.querySelector<HTMLFormElement>('#toGive');
    const receiveForm = document.querySelector<HTMLFormElement>('#toReceive');
    const toGive: Array<string> = Array.from(giveForm.querySelectorAll('input[name="pokemon"]:checked') as NodeListOf<HTMLInputElement>).map(cb => cb.value) ?? [];
    const toReceive: Array<string> = Array.from(receiveForm.querySelectorAll('input[name="pokemon"]:checked') as NodeListOf<HTMLInputElement>).map(cb => cb.value) ?? [];
    if (!toGive.length && !toReceive.length) {
        throw new Error("At least one side must contain a pokemon to be traded!");
    }
    const trainerName: string = localStorage.getItem("currentTrainer");
    const partnerName: string = (document.getElementById('trainerName') as HTMLInputElement).value;
    if (!trainerName) {
        throw new Error("You have not selected a character!");
    }
    if (!partnerName) {
        throw new Error("You have not selected a trade partner!");
    }
    const response = await fetch('/api/user/sendTrade', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerName, partnerName, toGive, toReceive })
    });
    if (!response.ok) throw new Error(response.status.toString());
    displaySentTrades(trainerName);
}

async function displayReceivedTrades(trainerName: string) {
    const response = await fetch(`/api/user/receivedTrades?trainerName=${encodeURIComponent(trainerName)}`);
    const tradeList = document.querySelector<HTMLSelectElement>("#receivedTrades");
    if (!response.ok) throw new Error(response.status.toString());
    const pendingTrades: Array<Trade> = await response.json();
    tradeList.innerHTML = '';
    for (const trade of pendingTrades) {
        const accept = document.createElement('button');
        const reject = document.createElement('button');
        const paragraph = document.createElement('p');
        const br = document.createElement('br');

        accept.onclick = () => acceptTrade(trade.tradeId);
        reject.onclick = () => rejectTrade(trade.tradeId);
        accept.textContent = "Accept";
        reject.textContent = "Reject";
        const givenPokemon: string = trade.givePokemon?.map(p => p.name).join(', ') ?? 'nothing';
        const receivedPokemon: string = trade.receivePokemon?.map(p => p.name).join(', ') ?? 'nothing';

        paragraph.textContent = trade.giveTrainer + ' offers ' + givenPokemon + ' for ' + receivedPokemon;
        tradeList.appendChild(paragraph);
        tradeList.appendChild(accept);
        tradeList.appendChild(reject);
        tradeList.appendChild(br);
    }
}

async function displaySentTrades(trainerName: string) {
    const response = await fetch(`/api/user/sentTrades?trainerName=${encodeURIComponent(trainerName)}`);
    const tradeList = document.querySelector<HTMLSelectElement>("#sentTrades");
    if (!response.ok) throw new Error(response.status.toString());
    const pendingTrades: Array<Trade> = await response.json();
    tradeList.innerHTML = '';
    for (const trade of pendingTrades) {
        const cancel = document.createElement('button');
        const paragraph = document.createElement('p');
        const br = document.createElement('br');

        cancel.onclick = () => cancelTrade(trade.tradeId);
        cancel.textContent = "Cancel";
        const givenPokemon: string = trade.givePokemon?.map(p => p.name).join(', ') ?? 'nothing';
        const receivedPokemon: string = trade.receivePokemon?.map(p => p.name).join(', ') ?? 'nothing';

        paragraph.textContent = trade.giveTrainer + ' offers ' + givenPokemon + ' for ' + receivedPokemon;
        tradeList.appendChild(paragraph);
        tradeList.appendChild(cancel);
        tradeList.appendChild(br);
    }
}

async function acceptTrade(tradeId: number) {
    const trainerName: string = localStorage.getItem("currentTrainer");
    if (!trainerName) {
        throw new Error("You have not selected a character!");
    }
    const response = await fetch('/api/user/acceptTrade', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId, trainerName })
    });
    if (!response.ok) throw new Error(response.status.toString());
    displayReceivedTrades(trainerName);
    displayPokemon(trainerName);
    displayTradeablePokemon(trainerName);
    getTraders();
}

async function rejectTrade(tradeId: number) {
    const trainerName: string = localStorage.getItem("currentTrainer");
    if (!trainerName) {
        throw new Error("You have not selected a character!");
    }
    const response = await fetch('/api/user/rejectTrade', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId, trainerName })
    });
    if (!response.ok) throw new Error(response.status.toString());
    displayReceivedTrades(trainerName);
}

async function cancelTrade(tradeId: number) {
    const trainerName: string = localStorage.getItem("currentTrainer");
    if (!trainerName) {
        throw new Error("You have not selected a character!");
    }
    const response = await fetch('/api/user/cancelTrade', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId, trainerName })
    });
    if (!response.ok) throw new Error(response.status.toString());
    displaySentTrades(trainerName);
}

async function initialize() {
    const currentTrainer: string = localStorage.getItem("currentTrainer");
    if (!currentTrainer) {
        throw new Error("You have not selected a character!");
    }
    const profileName = document.querySelector<HTMLDivElement>('#profileName');
    profileName.textContent = currentTrainer;
    displayPokemon(currentTrainer);
    getTraders();
    const addPokemon = document.querySelector<HTMLFormElement>('#addPokemon');
    if (addPokemon) {
        addPokemon.addEventListener('submit', (e: SubmitEvent) => {
            e.preventDefault();
            const trainerName = localStorage.getItem("currentTrainer");
            if (!trainerName) {
                throw new Error("You have not selected a character!");
            }
            const form = e.currentTarget as HTMLFormElement;
            const pokemonName = (form.elements.namedItem('pokemonName') as HTMLInputElement).value;
            fetch('/api/user/addPokemon', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pokemonName, trainerName })
            });

            displayPokemon(trainerName);
            (form.elements.namedItem('pokemonName') as HTMLInputElement).value = "";
        });
    }
    displayReceivedTrades(currentTrainer);
    displaySentTrades(currentTrainer);
    const giveForm = document.querySelector<HTMLFormElement>('#toGive');
    displayTradeablePokemon(localStorage.getItem("currentTrainer"), giveForm);
}

document.getElementById('trainerName').addEventListener('change', chosenTrainer);
document.getElementById('doTrade').addEventListener('click', sendTrade);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
