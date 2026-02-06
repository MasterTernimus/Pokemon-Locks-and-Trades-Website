import { Trainer } from './interfaces.js'

async function getCharacters(): Promise<Trainer[]> {
    const response = await fetch('/user/getTrainers', {
        method: 'GET',
        credentials: 'include',
    });
    if (!response.ok) throw new Error(response.status.toString());
    return await response.json();
};

function chooseTrainer(name: string) {
    localStorage.setItem('currentTrainer', name);
    window.location.href = '/';
}

document.addEventListener("DOMContentLoaded", async () => {
    const trainerList: Trainer[] = await getCharacters() as Trainer[];
    const trainerDiv = document.querySelector<HTMLDivElement>('#trainerList');
    for (const trainer of trainerList) {
        const trainerButton = document.createElement('button');
        trainerButton.textContent = trainer.trainer_name;
        trainerButton.id = trainer.trainer_name;
        trainerButton.onclick = () => chooseTrainer(trainer.trainer_name);
        trainerDiv.appendChild(trainerButton); // or append to a container
    }
});