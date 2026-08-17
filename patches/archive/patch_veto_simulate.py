import re

with open('src/components/setka_tourn/MatchVetoModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """    const mapNames = finalPicks.map(m => m.name);
    
    // Call simulateMatchSeries
    const result = simulateMatchSeries(
      t1Players, t2Players,
      t1Rating, t2Rating,
      'balanced', 'balanced',
      mapNames, vetoFormat, game === 'cs2',
      "Tournament",
      0, 0, {}, {}
    );
    
    // Override team names
    result.team1Name = team1.name;
    result.team2Name = team2.name;"""

content = re.sub(
    r"const finalPicks = [^;]+;[\s\S]*?const result = simulateMatchSeries\([^;]+\);",
    replacement,
    content
)

with open('src/components/setka_tourn/MatchVetoModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
