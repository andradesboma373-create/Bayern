import re
import sys

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf8') as f:
        content = f.read()

    # Add imports
    if "import { initPostgres, PostgresDB } from './src/db/postgres.js';" not in content:
        content = content.replace('import "dotenv/config";', 'import "dotenv/config";\nimport { initPostgres, PostgresDB } from "./src/db/postgres.js";')

    fallback_db_class = """class FallbackDB {
  private cachePath = path.join(process.cwd(), "local_database_cache.json");
  private data: Record<string, Record<string, any>> = {};
  private pgDb = new PostgresDB();

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.cachePath)) {
        const raw = fs.readFileSync(this.cachePath, 'utf8');
        this.data = JSON.parse(raw);
        console.log("Successfully loaded local database cache from disk.");
        // Migrate to Postgres in background
        this.migrateToPostgres();
      } else {
        this.data = {
          settings: {}, tgUsers: {}, teams: {}, players: {}, swapOffers: {},
          tgVetos: {}, matches: {}, tournaments: {}, freeAgents: {}, mapStats: {}
        };
      }
      
      // Load from Postgres eventually? For now, we trust the in-memory state loaded from JSON if it exists,
      // but if the JSON doesn't exist, we load from Postgres
      if (!fs.existsSync(this.cachePath)) {
         this.loadFromPostgres();
      }
    } catch (err: any) {
      console.error("Error loading local database cache:", err.message);
      this.data = {};
    }
  }
  
  private async loadFromPostgres() {
    try {
       console.log("Loading data from Postgres into memory...");
       const collections = ['settings', 'tgUsers', 'teams', 'players', 'swapOffers', 'tgVetos', 'matches', 'tournaments', 'freeAgents', 'mapStats', 'news', 'customMaps'];
       for (const col of collections) {
         if (!this.data[col]) this.data[col] = {};
         const docs = await this.pgDb.getAll(col);
         for (const doc of docs) {
            if (doc.id) {
               this.data[col][doc.id] = doc;
            }
         }
       }
       console.log("Loaded all data from Postgres.");
    } catch(e) {
       console.error("Error loading from Postgres:", e);
    }
  }

  private async migrateToPostgres() {
     console.log("Starting background migration of local JSON data to PostgreSQL...");
     try {
       for (const [colName, colData] of Object.entries(this.data)) {
         for (const [id, doc] of Object.entries(colData)) {
            await this.pgDb.set(colName, id, doc);
         }
       }
       console.log("Migration complete!");
     } catch (e) {
       console.error("Migration error:", e);
     }
  }

  private save() {
    try {
      fs.writeFileSync(this.cachePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err: any) {
      console.error("Error saving local database cache to disk:", err.message);
    }
  }

  public get(collectionName: string, id: string): any {
    return this.data[collectionName]?.[id] || null;
  }

  public set(collectionName: string, id: string, docData: any) {
    if (!this.data[collectionName]) {
      this.data[collectionName] = {};
    }
    this.data[collectionName][id] = { ...this.data[collectionName][id], ...docData, id };
    this.save();
    
    // Sync to Postgres in background
    this.pgDb.set(collectionName, id, this.data[collectionName][id]).catch(e => console.error("PG Set Error", e));
  }

  public delete(collectionName: string, id: string) {
    if (this.data[collectionName] && this.data[collectionName][id]) {
      delete this.data[collectionName][id];
      this.save();
      
      // Sync to Postgres in background
      this.pgDb.delete(collectionName, id).catch(e => console.error("PG Delete Error", e));
    }
  }

  public getAll(collectionName: string): any[] {
    return Object.values(this.data[collectionName] || {});
  }
}
"""

    old_class = re.search(r'class FallbackDB \{.*?\n\}\n', content, re.DOTALL)
    if old_class:
        content = content[:old_class.start()] + fallback_db_class + content[old_class.end():]
        with open(filepath, 'w', encoding='utf8') as f:
            f.write(content)
        print("Patched server.ts successfully.")
    else:
        print("Could not find FallbackDB class in server.ts.")

patch_file('server.ts')
