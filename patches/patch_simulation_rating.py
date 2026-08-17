import re

with open('src/lib/simulation.ts', 'r') as f:
    content = f.read()

old_func = """function finalizeStats(stats: any[]) {
    stats.forEach(player => {
        const kills = player.kills || 0;
        const deaths = player.deaths || 0;
        const assists = player.assists || 0;
        const damage = player.damage || 0;
        const rounds = player.totalRounds || 1;

        const kd = deaths > 0 ? kills / deaths : kills;
        player.kd = kd.toFixed(2);
        
        const kpr = kills / rounds;
        const dpr = deaths / rounds;
        const apr = assists / rounds;
        
        player.adr = Math.round(damage / rounds) || Math.round(104 * kpr + 10);
        
        const isSupportOrCaptain = player.role === 'captain' || player.role === 'igl' || player.role === 'support';
        const roleAssistBonus = isSupportOrCaptain ? apr * 0.25 : 0;
        
        const impact = 2.13 * kpr + 0.42 * apr - 0.41 + (isSupportOrCaptain ? 0.20 : 0);
        const baseHltv = 0.30 * (kpr / 0.68) + 0.20 * (player.adr / 72) + 0.10 * (Math.max(0, impact) / 0.8) + 0.25 * (1 - dpr) + roleAssistBonus;
        
        // Ensure rating has a realistic floor around 0.65-0.70 for low fragging games rather than 0.3-0.4
        const hltvRatingVal = Math.max(0.65, Math.min(2.15, baseHltv * 1.04));
        player.hltvRating = hltvRatingVal.toFixed(2);
    });
}"""

new_func = """function finalizeStats(stats: any[]) {
    stats.forEach(player => {
        const kills = player.kills || 0;
        const deaths = player.deaths || 0;
        const assists = player.assists || 0;
        const damage = player.damage || 0;
        const rounds = player.totalRounds || 1;

        const kd = deaths > 0 ? kills / deaths : kills;
        player.kd = kd.toFixed(2);
        
        const kpr = kills / rounds;
        const dpr = deaths / rounds;
        const apr = assists / rounds;
        
        player.adr = Math.round(damage / rounds) || Math.round(104 * kpr + 10);
        
        // Approx KAST (usually 65-80%)
        const kast = Math.max(40, Math.min(100, 68 + (kpr - 0.65) * 45 + (0.65 - dpr) * 35 + apr * 15));
        
        const impact = 2.13 * kpr + 0.42 * apr - 0.41;
        
        // HLTV 2.0 Rating formula
        const rating2 = 0.0073 * kast + 0.3591 * kpr - 0.5329 * dpr + 0.2372 * impact + 0.0032 * player.adr + 0.1587;
        
        // Apply minor buff for supports/captains to compensate for lower frags usually
        const isSupportOrCaptain = player.role === 'captain' || player.role === 'igl' || player.role === 'support';
        const finalRating = rating2 + (isSupportOrCaptain ? 0.03 : 0);
        
        player.kast = kast.toFixed(1);
        player.kpr = kpr.toFixed(2);
        player.dpr = dpr.toFixed(2);
        player.impact = impact.toFixed(2);
        
        const hltvRatingVal = Math.max(0.1, finalRating); // no strict artificial limit, just natural formula
        player.hltvRating = hltvRatingVal.toFixed(2);
    });
}"""

content = content.replace(old_func, new_func)

with open('src/lib/simulation.ts', 'w') as f:
    f.write(content)
