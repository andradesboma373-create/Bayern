import re
with open('src/components/setka_tourn/MatchVetoModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """
    const finalPicks = vetoPicked.map(p => MAP_POOL.find(m => m.id === p.mapId)).filter(m => !!m);
    const mapNames = finalPicks.map(m => m?.name || 'Unknown Map');
    
    // Call simulateMatchSeries
"""
content = content.replace("    const mapNames = finalPicks.map(m => m.name);\n    \n    // Call simulateMatchSeries", replacement)

with open('src/components/setka_tourn/MatchVetoModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

