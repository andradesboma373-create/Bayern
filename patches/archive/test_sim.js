function simRound(t1Players, t2Players, t1Power, t2Power) {
    let t1Alive = [...t1Players];
    let t2Alive = [...t2Players];
    
    let kills = { t1: {}, t2: {} };
    t1Players.forEach(p => kills.t1[p.id] = {k:0, d:0, a:0, dmg:0});
    t2Players.forEach(p => kills.t2[p.id] = {k:0, d:0, a:0, dmg:0});

    // 5v5 duel loop
    while (t1Alive.length > 0 && t2Alive.length > 0) {
        // Find duelists. 
        // Players with higher "Intellect" or "Reaction" take duels. We map this from Rating + Role.
        // E.g. snipers have high priority. Entry fraggers have high priority.
        
        let p1Idx = Math.floor(Math.random() * t1Alive.length);
        let p2Idx = Math.floor(Math.random() * t2Alive.length);
        
        let p1 = t1Alive[p1Idx];
        let p2 = t2Alive[p2Idx];
        
        // Characteristic extraction
        // Let's assume average rating is 100.
        let p1Aim = p1.rating * 0.5 + Math.random() * 20;
        let p2Aim = p2.rating * 0.5 + Math.random() * 20;
        
        let p1Power = (p1Aim) * t1Power;
        let p2Power = (p2Aim) * t2Power;
        
        if (Math.random() < p1Power / (p1Power + p2Power)) {
            // p1 wins
            kills.t1[p1.id].k++;
            kills.t1[p1.id].dmg += 100;
            kills.t2[p2.id].d++;
            t2Alive.splice(p2Idx, 1);
        } else {
            // p2 wins
            kills.t2[p2.id].k++;
            kills.t2[p2.id].dmg += 100;
            kills.t1[p1.id].d++;
            t1Alive.splice(p1Idx, 1);
        }
    }
    
    let winner = t1Alive.length > 0 ? 1 : 2;
    return { winner, kills, t1Alive, t2Alive };
}
