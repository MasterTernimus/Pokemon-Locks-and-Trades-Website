import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcrypt';
import path from 'path';
import * as Commands from './src/sqliteCommands.js';

const app = express();

const execute = async (db, sql) => {
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
            if (err) reject(err);
            resolve(sql);
        });
    });
};
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.json());
app.use(cors({
    origin: 'https://localhost:5000',
    credentials: true
}));
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/dist/src/public', express.static(path.join(process.cwd(), 'dist/src/public')));

dotenv.config();
let PORT = process.env.PORT || 5000;

let database = new DatabaseSync('websiteStorage.db');

function requireAuth(req, res, next) {
    const token = req.cookies.auth_token;
    if (!token) return res.sendStatus(401);
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET_KEY);
        next();
    } catch {
        return res.sendStatus(403);
    }
}

app.listen(PORT, () => {
    console.log(`Server is up and running on ${PORT} ...`);
});

app.get('/', (req, res) => {
    res.sendFile('C:\\Users\\chinm\\Desktop\\Chinmaya\\Code\\Websites\\Pokemon Trades\\public\\index.html');
});

app.get('/getTrainers', (req, res) => {
    const trainerList = Commands.qAllTrainers.all();
    if (!trainerList) return res.status(404).send('No trainers!');

    // fetch and display the user's Pokémon
    res.json(trainerList);
});

app.get('/getTrades', (req, res) => {
    const tradeInformation = Commands.qtradeData.all();
    let trades = [];
    for (const trade of tradeInformation) {
        const involvedPokemon = Commands.qpokemonTradeData.all(trade.id);
        let givePokemon = [];
        let receivePokemon = [];
        let receiveTrainer = '';
        let giveTrainer = '';
        for (const pokemonTrade of involvedPokemon) {
            const pokemon = Commands.qpokemonidData.get(pokemonTrade.pokemon_id);
            if (pokemonTrade.from_trainer_id === trade.trainer1_id) {
                givePokemon.push(pokemon);
            } else {
                receivePokemon.push(pokemon);
            }
            receiveTrainer = (Commands.qtraineridData.get(pokemonTrade.to_trainer_id)).trainer_name as string;
            giveTrainer = (Commands.qtraineridData.get(pokemonTrade.from_trainer_id)).trainer_name as string;
        }
        const tradeId = trade.id as number;
        trades.push({ tradeId, givePokemon, receivePokemon, giveTrainer, receiveTrainer });
    }
    return res.json(trades);
});

app.get('/getPokemon', (req, res) => {
    if (!req.query.trainerName) return res.status(404).json({ message: "Trainer unknwon!" });
    const trainer = Commands.qtrainerData.get(req.query.trainerName);
    if (!trainer) return res.status(404).send('User not found!');
    const pokemonList = Commands.qpokemonData.all(trainer.id);
    // fetch and display the user's Pokémon
    res.json(pokemonList);

});


// Main Code Here //
// Generating JWT
app.post("/user/generateUser", async (req, res) => {
    const jwtSecretKey = process.env.JWT_SECRET_KEY;
    if (!jwtSecretKey) {
        return res.status(500).json({ message: "Server misconfigured" });
    }
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
    }

    if (Commands.quserData.get(username)) {
        return res.status(409).json({ message: "Username already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    try {
        Commands.iuserData.run(username, passwordHash);
    } catch (err) {
        console.log(err)
    }
    return res.status(201).json({ message: "Registered user" });
});

// Validate Login
app.post("/user/validateUser", async (req, res) => {
    const jwtSecretKey = process.env.JWT_SECRET_KEY;
    if (!jwtSecretKey) {
        return res.status(500).json({ message: "Server misconfigured" });
    }
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
    }

    const user = Commands.quserData.get(username);
    if (!user) {
        return res.status(401).json({ message: "Incorrect Username/Password" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        return res.status(401).json({ message: "Incorrect Username/Password" });
    }

    const token = jwt.sign({ username }, jwtSecretKey, { expiresIn: "24h" });
    res.cookie("auth_token", token, {
        httpOnly: true,
        sameSite: "strict",
        // secure: true, // enable in prod (HTTPS)
        maxAge: 24000 * 60 * 60,
    });
    return res.redirect(302, '/user/trainerSelect');
});

// Verification of JWT
app.get("/user/validateToken", requireAuth, (req, res) => {
    let jwtSecretKey = process.env.JWT_SECRET_KEY;
    return res.status(200).json({ message: "Successfully Verified"});
});

app.post("/user/addTrainer", requireAuth, (req, res) => {
   
    const { trainerName } = req.body;
    if (!trainerName) return res.status(400).json({ message: "Trainer name required!" });

    const tokenInformation = req.user;

    const trainer = Commands.qtrainerData.get(trainerName);
    if (trainer) return res.status(409).json({ message: "Name already taken!" });

    const user = Commands.quserData.get(tokenInformation.username);
    if (!user) return res.status(500).json({ message: "User not found" });

    const currentTime = Math.floor(Date.now() / 1000);
    try {
        Commands.itrainerData.run(trainerName, currentTime, currentTime, user.id);
    } catch (err) {
        console.log(err);
    }
    return res.status(200).json({ message: "Trainer added" });
});

app.get("/user/getTrainers", requireAuth, (req, res) => {
    const tokenInformation = req.user;

    const user = Commands.quserData.get(tokenInformation.username);
    if (!user) return res.status(500).json({ message: "User not found" });
    const trainerList = Commands.quserTrainers.all(user.id);
    return res.send(trainerList)
});

app.post("/user/addPokemon", requireAuth, (req, res) => {
    const tokenInformation = req.user;

    const { trainerName, pokemonName } = req.body;
    if (!pokemonName) return res.status(400).json({ message: "Pokemon name required!" });
    if (!trainerName) return res.status(400).json({ message: "Trainer name required!" });

    const trainer = Commands.qtrainerData.get(trainerName);
    if (!trainer) return res.status(500).json({ message: "Trainer not found, please inform Ternimus" });

    const user = Commands.quserData.get(tokenInformation.username);
    if (!user) return res.status(500).json({ message: "User not found, please inform Ternimus" });

    const pokemon = Commands.qpokemonnameData.get(pokemonName);
    if (!pokemon) return res.status(404).json({ message: "That pokemon does not exist!" });

    if (user.id !== trainer.id) return res.status(403).json({ message: "You do not own that trainer!" });
    if (pokemon.owner_id != null) return res.status(403).json({ message: "That pokemon is not lockable!" });
    try {
        Commands.upokemonNameData.run('hardlock', trainer.id, pokemonName);
    } catch (err) {
        console.log(err);
    }
    return res.status(200).json({ message: "Added Pokemon" });
});

app.post("/user/sendTrade", requireAuth, (req, res) => {
    const tokenInformation = req.user;
    const { trainerName, partnerName, toGive, toReceive } = req.body;
    if ((!toGive && !toReceive) || !trainerName || !partnerName || !Array.isArray(toReceive) || !Array.isArray(toGive)) return res.status(400).json({ message: "Missing/Malformed Input" });
    if (trainerName === partnerName) return res.status(403).json({ message: "Present your case to Ternimus as to why you want to trade with yourself" });
    const currentTrainer = Commands.qtrainerData.get(trainerName);
    const tradePartner = Commands.qtrainerData.get(partnerName);
    const user = Commands.quserData.get(tokenInformation.username);
    if (!user) return res.status(500).json({ message: "User not found, please inform Ternimus" });
    if (!currentTrainer) return res.status(500).json({ message: "Trainer not found, please inform Ternimus" });
    if (!tradePartner) return res.status(500).json({ message: "Partner not found, please inform Ternimus" });
    if (user.id !== currentTrainer.owner_id) return res.status(403).json({ message: "You do not own that trainer!" });

    for (const pokemonName of toGive as Array<string>) {
        const pokemon = Commands.qpokemonnameData.get(pokemonName);
        if (!pokemon) return res.status(404).json({ message: "That pokemon does not exist!" });
        if (pokemon.owner_id != currentTrainer.id) return res.status(403).json({ message: "You do not own " + pokemonName });
        if (pokemon.lock_status === 'hardlock') return res.status(409).json({ message: pokemonName + " is not tradeable!" });
        if (Commands.qpokemonisinTrade.get(pokemon.id) !== undefined) return res.status(409).json({ message: pokemonName + " is already part of a trade!" });
    }
    for (const pokemonName of toReceive as Array<string>) {
        const pokemon = Commands.qpokemonnameData.get(pokemonName);
        if (!pokemon) return res.status(404).json({ message: "That pokemon does not exist!" });
        if (pokemon.owner_id != tradePartner.id) return res.status(403).json({ message: "They do not own " + pokemonName });
        if (pokemon.lock_status === 'hardlock') return res.status(409).json({ message: pokemonName + " is not tradeable!" });
    }
    const currentTime = Math.floor(Date.now() / 1000);

    try {
        database.exec('BEGIN');

        // 1. Create trade
        const latestTrades = Commands.itradeData.run(
            currentTrainer.id,
            tradePartner.id,
            'pending',
            currentTime,
            null
        );

        const latesTradeId = latestTrades.lastInsertRowid;


        if (!latesTradeId) throw new Error('Trade creation failed');

        // 2. Give Pokémon
        for (const pokemonName of toGive as string[]) {
            const pokemon = Commands.qpokemonnameData.get(pokemonName);
            if (!pokemon) throw new Error('Pokemon not found');

            Commands.ipokemontradeData.run(
                latesTradeId,
                pokemon.id,
                currentTrainer.id,
                tradePartner.id,
                'pending',
                currentTime,
                null
            );
        }

        // 3. Receive Pokémon
        for (const pokemonName of toReceive as string[]) {
            const pokemon = Commands.qpokemonnameData.get(pokemonName);
            if (!pokemon) throw new Error('Pokemon not found');

            Commands.ipokemontradeData.run(
                latesTradeId,
                pokemon.id,
                tradePartner.id,
                currentTrainer.id,
                'pending',
                currentTime,
                null
            );
        }

        database.exec('COMMIT');
        res.sendStatus(200);

    } catch (err) {
        database.exec('ROLLBACK');
        console.error(err);
        res.status(400).json({ message: err.message });
    }
    return res.status(200).json({ message: "Trade Sent!" });
});

app.get("/user/sentTrades", requireAuth, (req, res) => {
    const tokenInformation = req.user;
    if (!req.query.trainerName) return res.status(404).json({ message: "Trainer unknwon!" });
    const giveTrainer = req.query.trainerName;
    if (!giveTrainer) return res.status(400).json({ message: "Choose your character please!" });
    const currentTrainer = Commands.qtrainerData.get(giveTrainer);
    const user = Commands.quserData.get(tokenInformation.username);
    if (!user) return res.status(500).json({ message: "User not found, please inform Ternimus" });
    if (!currentTrainer) return res.status(500).json({ message: "Trainer not found, please inform Ternimus" });
    if (user.id !== currentTrainer.owner_id) return res.status(403).json({ message: "You do not own that trainer!" });

    const pendingTradesInformation = Commands.qGivingTradeData.all(currentTrainer.id);
    let pendingTrades = [];
    for (const trade of pendingTradesInformation) {
        const involvedPokemon = Commands.qpokemontradeDataReceiving.all(trade.id, currentTrainer.id, currentTrainer.id);
        let givePokemon = [];
        let receivePokemon = [];
        let receiveTrainer = '';
        for (const pokemonTrade of involvedPokemon) {
            const pokemon = Commands.qpokemonidData.get(pokemonTrade.pokemon_id);
            if (pokemonTrade.from_trainer_id === currentTrainer.id) {
                givePokemon.push(pokemon);
            } else {
                receivePokemon.push(pokemon);
            }
            receiveTrainer = (Commands.qtraineridData.get(pokemonTrade.to_trainer_id)).trainer_name as string;
        }
        const tradeId = trade.id as number;
        pendingTrades.push({ tradeId, givePokemon, receivePokemon, giveTrainer, receiveTrainer });
    }
    return res.json(pendingTrades);
});

app.get("/user/receivedTrades", requireAuth, (req, res) => {
    const tokenInformation = req.user;
    if (!req.query.trainerName) return res.status(404).json({ message: "Trainer unknwon!" });
    const giveTrainer = req.query.trainerName;
    if (!giveTrainer) return res.status(400).json({ message: "Choose your character please!" });
    const currentTrainer = Commands.qtrainerData.get(giveTrainer);
    const user = Commands.quserData.get(tokenInformation.username);
    if (!user) return res.status(500).json({ message: "User not found, please inform Ternimus" });
    if (!currentTrainer) return res.status(500).json({ message: "Trainer not found, please inform Ternimus" });
    if (user.id !== currentTrainer.owner_id) return res.status(403).json({ message: "You do not own that trainer!" });

    const pendingTradesInformation = Commands.qReceivingTradeData.all(currentTrainer.id);
    let pendingTrades = [];
    for (const trade of pendingTradesInformation) {
        const involvedPokemon = Commands.qpokemontradeDataReceiving.all(trade.id, currentTrainer.id, currentTrainer.id);
        let givePokemon = [];
        let receivePokemon = [];
        let receiveTrainer = '';
        for (const pokemonTrade of involvedPokemon) {
            const pokemon = Commands.qpokemonidData.get(pokemonTrade.pokemon_id);
            if (pokemonTrade.from_trainer_id === currentTrainer.id) {
                givePokemon.push(pokemon);
            } else {
                receivePokemon.push(pokemon);
            }
            receiveTrainer = (Commands.qtraineridData.get(pokemonTrade.to_trainer_id)).trainer_name as string;
        }
        const tradeId = trade.id as number;
        pendingTrades.push({ tradeId, givePokemon, receivePokemon, giveTrainer, receiveTrainer });
    }
    return res.json(pendingTrades);
});

app.post("/user/acceptTrade", requireAuth, (req, res) => {
    const tokenInformation = req.user;
    const { tradeId, trainerName } = req.body;
    if (!trainerName) return res.status(400).json({ message: "Choose your character please!" });
    const currentTrainer = Commands.qtrainerData.get(trainerName);
    const user = Commands.quserData.get(tokenInformation.username);
    if (!user) return res.status(500).json({ message: "User not found, please inform Ternimus" });
    if (!currentTrainer) return res.status(500).json({ message: "Trainer not found, please inform Ternimus" });
    if (user.id !== currentTrainer.owner_id) return res.status(403).json({ message: "You do not own that trainer!" });

    const pendingTrade = Commands.qtradeidData.get(tradeId);
    if (!pendingTrade) return res.status(404).json({ message: "Trade not found!" });
    if (pendingTrade.status !== 'pending') return res.status(409).json({ message: "Trade has either already been completed or cancelled" });
    const affectedPokemon = Commands.qpokemontradeIdData.all(pendingTrade.id);
    if (!affectedPokemon) {
        database.prepare('DELETE FROM tradeData WHERE id=' + tradeId).run();
        return res.status(404).json({ message: "No pokemon are affected in this trade. Deleting trade." });
    } 

    let inTransaction = false;
    try {
        database.exec('BEGIN');
        inTransaction = true;

        for (const trade of affectedPokemon) {
            const pokemon = Commands.qpokemonidData.get(trade.pokemon_id);
            if (!pokemon) throw new Error('NOT_FOUND');
            if (pokemon.owner_id !== trade.from_trainer_id) throw new Error('FORBIDDEN');

            Commands.upokemonIdData.run('hardlock', trade.to_trainer_id, trade.pokemon_id);
        }

        Commands.upokemonTradeData.run('completed', tradeId);
        Commands.utradeData.run('completed', tradeId);

        database.exec('COMMIT');
        inTransaction = false;

        return res.status(200).json({ message: "Trade Accepted" });
    } catch (err) {
        if (inTransaction) database.exec('ROLLBACK');

        const status = err.message === 'FORBIDDEN' ? 403 : 400;
        return res.status(status).json({ message: err.message });
    }
});

app.post("/user/rejectTrade", requireAuth, (req, res) => {
    const tokenInformation = req.user;
    const { tradeId, trainerName } = req.body;
    if (!trainerName) return res.status(400).json({ message: "Choose your character please!" });
    const currentTrainer = Commands.qtrainerData.get(trainerName);
    const user = Commands.quserData.get(tokenInformation.username);
    if (!user) return res.status(500).json({ message: "User not found, please inform Ternimus" });
    if (!currentTrainer) return res.status(500).json({ message: "Trainer not found, please inform Ternimus" });
    if (user.id !== currentTrainer.owner_id) return res.status(403).json({ message: "You do not own that trainer!" });

    const pendingTrade = Commands.qtradeidData.get(tradeId);
    if (!pendingTrade) return res.status(404).json({ message: "Trade not found!" });
    if (pendingTrade.to_trainer_id !== currentTrainer.id) return res.status(403).json({ message: "You do not have the authorization to reject this trade!" });
    if (pendingTrade.status !== 'pending') return res.status(409).json({ message: "Trade has either already been completed or cancelled" });

    const attempt = database.prepare('DELETE FROM tradeData WHERE id=' + tradeId).run();
    if (!attempt) return res.status(500).json({ message: "Rejecting trade failed for unknown reasons. Please inform Ternimus" });

    return res.status(200).json({ message: "Trade Rejected" });
});

app.post("/user/cancelTrade", requireAuth, (req, res) => {
    const tokenInformation = req.user;
    const { tradeId, trainerName } = req.body;
    if (!trainerName) return res.status(400).json({ message: "Choose your character please!" });
    const currentTrainer = Commands.qtrainerData.get(trainerName);
    const user = Commands.quserData.get(tokenInformation.username);
    if (!user) return res.status(500).json({ message: "User not found, please inform Ternimus" });
    if (!currentTrainer) return res.status(500).json({ message: "Trainer not found, please inform Ternimus" });
    if (user.id !== currentTrainer.owner_id) return res.status(403).json({ message: "You do not own that trainer!" });

    const pendingTrade = Commands.qtradeidData.get(tradeId);
    if (!pendingTrade) return res.status(404).json({ message: "Trade not found!" });
    if (pendingTrade.trainer1_id !== currentTrainer.id) return res.status(403).json({ message: "You do not have the authorization to cancel this trade!" });
    if (pendingTrade.status !== 'pending') return res.status(409).json({ message: "Trade has either already been completed or cancelled" });

    const attempt = database.prepare('DELETE FROM tradeData WHERE id=' + tradeId).run();
    if (!attempt) return res.status(500).json({ message: "Cancelling trade failed for unknown reasons. Please inform Ternimus" });

    return res.status(200).json({ message: "Trade Rejected" });
});

app.post("/user/changeLockStatus", requireAuth, (req, res) => {
    const tokenInformation = req.user;
    const { trainerName, pokemonName, newStatus } = req.body;
    if (!trainerName || !pokemonName || !newStatus) return res.status(400).json({ message: "Missing/Malformed Input" });

    const currentTrainer = Commands.qtrainerData.get(trainerName);
    const user = Commands.quserData.get(tokenInformation.username);
    if (!user) return res.status(500).json({ message: "User not found, please inform Ternimus" });
    if (!currentTrainer) return res.status(500).json({ message: "Trainer not found, please inform Ternimus" });
    if (user.id !== currentTrainer.owner_id) return res.status(403).json({ message: "You do not own that trainer!" });

    const pokemon = Commands.qpokemonnameData.get(pokemonName);
    const inTrade: boolean = Commands.qpokemonisinTrade.get(pokemon.id) === undefined;
    if (!pokemon) return res.status(404).json({ message: "That pokemon does not exist!" });
    if (pokemon.owner_id != currentTrainer.id) return res.status(403).json({ message: "You do not own " + pokemonName });
    if (!inTrade) return res.status(405).json({ message: "That pokemon is part of a trade!" });
    try {
        Commands.upokemonNameData.run(newStatus, currentTrainer.id, pokemonName);
    } catch (err) {
        console.error(err.message);
    }
    return res.status(200).json({ message: "Lock Status Changed!" });
});

app.get('/user/trainerSelect', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'trainerselect.html'));
});

app.get('/login', (req, res) => {
    res.sendFile('C:\\Users\\chinm\\Desktop\\Chinmaya\\Code\\Websites\\Pokemon Trades\\public\\login.html');
});

app.get('/user/profile', (req, res) => {
    res.sendFile('C:\\Users\\chinm\\Desktop\\Chinmaya\\Code\\Websites\\Pokemon Trades\\public\\profile.html');
});

