import * as SQLite from 'expo-sqlite';

type UserProfile = {
  name: string;
  login: string;
};

let databasePromise: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;

async function getAuthDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('stride.db')
      .then(async (database) => {
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            login TEXT NOT NULL COLLATE NOCASE UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        return database;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }

  return databasePromise;
}

export async function initializeAuthDatabase() {
  await getAuthDatabase();
}

export async function saveUserProfile(profile: UserProfile) {
  const database = await getAuthDatabase();
  await database.runAsync(
    `INSERT INTO users (name, login)
     VALUES (?, ?)
     ON CONFLICT(login) DO UPDATE SET name = excluded.name`,
    profile.name,
    profile.login
  );
}
