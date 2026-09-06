import fetch from 'node-fetch';
import { simulateMap } from '../src/lib/simulation'; // wait, TS won't run like this natively unless tsx

async function run() {
    console.log("Fetching teams...");
    const res = await fetch('http://localhost:3000/api/db/getDocs', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ path: 'teams', filters: [] })
    });
    const data = await res.json();
    console.log("Teams fetched:", data);
}
run();
