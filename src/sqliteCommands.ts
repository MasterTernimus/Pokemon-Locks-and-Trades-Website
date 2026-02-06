import { DatabaseSync } from 'node:sqlite';
let database = new DatabaseSync('websiteStorage.db');
export const iuserData = database.prepare('INSERT INTO userData (username, passwordHash) VALUES (?, ?)');
export const quserData = database.prepare('SELECT * FROM userData WHERE username=(?)');

export const qtrainerData = database.prepare('SELECT * FROM trainerData WHERE trainer_name=(?)');
export const qtraineridData = database.prepare('SELECT * FROM trainerData WHERE id=(?)');
export const itrainerData = database.prepare('INSERT INTO trainerData (trainer_name, created_at, last_active, owner_id) VALUES (?, ?, ?, ?)');
export const qAllTrainers = database.prepare('SELECT trainer_name, money, avatar_url, last_active FROM trainerData');
export const quserTrainers = database.prepare('SELECT trainer_name, money, avatar_url, last_active FROM trainerData WHERE owner_id=(?)');

export const qpokemonData = database.prepare('SELECT * FROM pokemonData WHERE owner_id=(?)');
export const qpokemonidData = database.prepare('SELECT * FROM pokemonData WHERE id=(?)');
export const qpokemonnameData = database.prepare('SELECT * FROM pokemonData WHERE name=(?)');
export const upokemonNameData = database.prepare(`
  UPDATE pokemonData
  SET lock_status = ?,
      owner_id = ?
  WHERE name = ?
`);
export const upokemonIdData = database.prepare(`
  UPDATE pokemonData
  SET lock_status = ?,
      owner_id = ?
  WHERE id = ?
`);

export const itradeData = database.prepare('INSERT INTO tradeData (trainer1_id, trainer2_id, status, created_at, completed_at) VALUES (?, ?, ?, ?, ?)');
export const qReceivingTradeData = database.prepare('SELECT * FROM tradeData WHERE trainer2_id=? AND status=\'pending\'');
export const qGivingTradeData = database.prepare('SELECT * FROM tradeData WHERE trainer1_id=? AND status=\'pending\'');
export const qtradeData = database.prepare('SELECT * FROM tradeData WHERE status=\'completed\'');
export const qtradeidData = database.prepare('SELECT * FROM tradeData WHERE id=?');
export const utradeData = database.prepare('UPDATE tradeData SET status=? WHERE id=?');

export const ipokemontradeData = database.prepare('INSERT INTO pokemonTradeData (trade_id, pokemon_id, from_trainer_id, to_trainer_id, status, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
export const qpokemontradeDataReceiving = database.prepare('SELECT * FROM pokemonTradeData WHERE (trade_id=? and (from_trainer_id=? OR to_trainer_id=?))');
export const qpokemonTradeData = database.prepare('SELECT * FROM pokemonTradeData WHERE trade_id=?');
export const qpokemontradeIdData = database.prepare('SELECT * FROM pokemonTradeData WHERE trade_id=?');
export const qpokemonisinTrade = database.prepare(`
    SELECT 1
    FROM pokemonTradeData
    WHERE pokemon_id = ?
      AND status = 'pending'
    LIMIT 1;
`);
export const upokemonTradeData = database.prepare('UPDATE pokemonTradeData SET status=? WHERE trade_id=?');



database.exec(`
  CREATE TABLE IF NOT EXISTS trainerData(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainer_name TEXT NOT NULL,
    money INTEGER NOT NULL,
    avatar_url TEXT, 
    created_at INTEGER NOT NULL,
    last_active INTEGER,
    owner_id INTEGER NOT NULL REFERENCES userData(id)
  ) STRICT
`);
database.exec(`
  CREATE TABLE IF NOT EXISTS pokemonData(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    value INTEGER NOT NULL,
    lock_status TEXT DEFAULT 'unlocked' CHECK(lock_status IN ('hardlock', 'softlock', 'tradeable', 'rulelock', 'unlocked')), 
    sprite_url TEXT DEFAULT NULL,
    owner_id INTEGER DEFAULT NULL REFERENCES trainerData(id)
  ) STRICT
`);
database.exec(`
CREATE TABLE IF NOT EXISTS tradeData(
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    trainer1_id INTEGER NOT NULL REFERENCES trainerData(id),
    trainer2_id INTEGER NOT NULL REFERENCES trainerData(id),

    trainer1_money INTEGER DEFAULT 0 CHECK(trainer1_money >= 0),
    trainer2_money INTEGER DEFAULT 0 CHECK(trainer2_money >= 0),

    status TEXT NOT NULL CHECK(status IN ('pending','accepted','cancelled','completed')),

    created_at INTEGER NOT NULL,
    completed_at INTEGER
    ) STRICT;
`);

database.exec(`
CREATE TABLE IF NOT EXISTS pokemonTradeData(
    trade_id INTEGER NOT NULL REFERENCES tradeData(id) ON DELETE CASCADE,
    pokemon_id INTEGER NOT NULL REFERENCES pokemonData(id),

    from_trainer_id INTEGER NOT NULL REFERENCES trainerData(id),
    to_trainer_id INTEGER NOT NULL REFERENCES trainerData(id),

    status TEXT NOT NULL CHECK(status IN ('pending','accepted','cancelled','completed')),

    created_at INTEGER NOT NULL,
    completed_at INTEGER
    ) STRICT;
`);
