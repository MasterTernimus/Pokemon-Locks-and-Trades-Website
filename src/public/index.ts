import { Trainer, Pokemon, Trade } from './interfaces.js'

let trainerPokemons: Map<string, Array<string>> = new Map();
let trades: Array<Array<string>> = [];

async function getPokemon(trainerName: string): Promise<Pokemon[]> {
    const response = await fetch(`/api/getPokemon?trainerName=${encodeURIComponent(trainerName)}`);
    if (!response.ok) throw new Error(response.status.toString());
    return await response.json();
};

async function getTrainers(): Promise<Trainer[]> {
    const response = await fetch('/api/getTrainers');
    if (!response.ok) throw new Error(response.status.toString());
    return await response.json();
};

async function displayTrainers() {
    const trainerList: Trainer[] = await getTrainers();
    const trainerDiv = document.querySelector<HTMLDivElement>('#trainerList');
    if (!trainerDiv) {
        return;
    }
    
    for (const trainer of trainerList) {
        const trainerButton = document.createElement('button');
        trainerButton.textContent = trainer.trainer_name;
        trainerButton.id = trainer.trainer_name;
        trainerButton.onclick = () => displayPokemon(trainer.trainer_name);
        trainerDiv.appendChild(trainerButton); // or append to a container
    }
}

async function displayPokemon(trainerid: string) {
    const trainer = document.querySelector<HTMLSelectElement>('#pokemonList');
    if (!trainerPokemons.get(trainerid)) {
        const pokemonList: Pokemon[] = await getPokemon(trainerid);
        const names = pokemonList.map(p => p.name);
        const concatList = names.join(', ');
        trainer.textContent = concatList;
        const arrayPokemon = pokemonList.map(p => p.name);
        trainerPokemons.set(trainerid, arrayPokemon);
    } else {
        trainer.textContent = trainerPokemons.get(trainerid).join(', ');
    }
}

async function getTrades(): Promise<Trade[]> {
    const response = await fetch('/api/getTrades');
    if (!response.ok) throw new Error(response.status.toString());
    return await response.json();
}

async function displayTrades() {

    const tradeList = document.querySelector<HTMLParagraphElement>('#tradeList');
    tradeList.innerHTML = '';
    if (sessionStorage.getItem('showTrades') === 'false') {
        sessionStorage.setItem('showTrades', 'true');
        return;
    }
    const trades = await getTrades();
    for (const trade of trades) {

        const paragraph = document.createElement('span');
        const br = document.createElement('br');

        const givenPokemon: string = trade.givePokemon?.map(p => p.name).join(', ') ?? 'nothing';
        const receivedPokemon: string = trade.receivePokemon?.map(p => p.name).join(', ') ?? 'nothing';

        paragraph.textContent = trade.giveTrainer + ' traded ' + givenPokemon + ' for ' + receivedPokemon;
        tradeList.appendChild(paragraph);
        tradeList.appendChild(br);
    }
    sessionStorage.setItem('showTrades', 'false');
}

async function validateSession() {
    const res = await fetch('/apihttp://localhost:5000/user/validateToken', {
        method: 'GET',
        credentials: 'include',
    });
     if (res.ok) {
        const userButton = document.querySelector<HTMLAnchorElement>('#userButton');
        userButton.href = '/profile.html';
        userButton.textContent = 'Profile';
    }
}

function initialize() {
    sessionStorage.setItem('showTrades', 'true');
    document.getElementById('displayTrades').addEventListener('click', displayTrades);
    validateSession();
    displayTrainers();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}



