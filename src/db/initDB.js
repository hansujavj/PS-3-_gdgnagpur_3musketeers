import * as SQLite from 'expo-sqlite';
import { SCHEMA } from './schema';
import { DB_NAME } from '../utils/constants';
import { seedDatabase } from '../data/seedData';

let dbInstance = null;

export const getDB = async () => {
    if (dbInstance) return dbInstance;
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    return dbInstance;
};

export const initDB = async () => {
    try {
        const db = await getDB();

        // Enable WAL support
        await db.execAsync('PRAGMA journal_mode = WAL;');

        // Create tables
        for (const [tableName, query] of Object.entries(SCHEMA)) {
            console.log(`Creating table: ${tableName}`);
            await db.execAsync(query);
        }

        await seedDatabase();

        console.log('Database initialized successfully');
        return true;
    } catch (error) {
        console.error('Database initialization failed:', error);
        return false;
    }
};

export const clearDB = async () => {
    try {
        const db = await getDB();
        // Logic to clear tables if needed
        // This is a placeholder
        console.log('Clear DB not fully implemented');
    } catch (e) {
        console.error(e);
    }
}
