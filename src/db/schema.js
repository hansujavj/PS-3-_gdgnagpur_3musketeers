export const SCHEMA = {
    create_user_profile: `
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      language TEXT DEFAULT 'en',
      region_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `,
    create_crops: `
    CREATE TABLE IF NOT EXISTS crops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      variety TEXT,
      sowing_date TEXT,
      area_size REAL,
      image_uri TEXT,
      current_stage TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `,
    create_disease_log: `
    CREATE TABLE IF NOT EXISTS disease_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crop_name TEXT,
      disease_name TEXT,
      confidence REAL,
      image_uri TEXT,
      detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
      treatment_applied BOOLEAN DEFAULT 0
    );
  `,
    create_insights_cache: `
    CREATE TABLE IF NOT EXISTS insights_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT, -- irrigation, pest, fertilizer
      message TEXT,
      severity TEXT, -- high, medium, low
      valid_until TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `,
    create_weather_snapshots: `
    CREATE TABLE IF NOT EXISTS weather_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temp REAL,
      humidity REAL,
      rainfall REAL,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `
};
