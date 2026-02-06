export interface Pokemon {
    name: string;
    lock_status;
}
export interface Trade {
    tradeId: number;
    giveTrainer: string;
    receiverTrainer: string;
    givePokemon: Pokemon[];
    receivePokemon: Pokemon[];
}
export class Trainer {
    trainer_name: string;
    money: number;
    avatarUrl: string;
    lastActive: number;
    ownedPokemon: Pokemon[];

    constructor(
        trainer_name: string,
        money: number,
        avatarUrl: string,
        lastActive: number,
        ownedPokemon: Pokemon[] = []
    ) {
        this.trainer_name = trainer_name;
        this.money = money;
        this.avatarUrl = avatarUrl;
        this.lastActive = lastActive;
        this.ownedPokemon = ownedPokemon;
    }

    async getPokemon(trainerName: string) {
        const response = await fetch('/api/?ownedPokemon=' + trainerName);
        if (!response.ok) throw new Error(response.status.toString());
        this.ownedPokemon = await response.json() as Pokemon[];
    };
}
