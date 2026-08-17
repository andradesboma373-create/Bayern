import re

with open('src/lib/simulation.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. calculateTeamStrength exponent
content = content.replace("let playerStrength = Math.pow(rating / 100, 0.85)", "let playerStrength = Math.pow(rating / 100, 1.5)")

# 2. computeRoundWinChance diff multiplier and noise
content = content.replace("const clampedDiff = Math.max(-0.30, Math.min(0.30, diff * 0.5));", "const clampedDiff = Math.max(-0.45, Math.min(0.45, diff * 3.5));")
content = content.replace("const roundNoise = (Math.random() - 0.5) * 0.55;", "const roundNoise = (Math.random() - 0.5) * 0.20;")

# 3. getWeightedRandomIndex exponent and roundKills penalty
content = content.replace("w = Math.pow(w, 1.5);", "w = Math.pow(w, 4.5);")
content = content.replace("w = w * Math.pow(0.35, killsInRound);", "w = w * Math.pow(0.70, killsInRound);")
content = content.replace("w = w * (0.8 + Math.random() * 0.4);", "w = w * (0.9 + Math.random() * 0.2);")

# 4. distributeKills chip damage and kills
content = content.replace("if (Math.random() < 0.4) winStats[i].damage += Math.floor(Math.random() * 45);", "if (Math.random() < 0.15) winStats[i].damage += Math.floor(Math.random() * 30);")
content = content.replace("if (Math.random() < 0.4) loseStats[i].damage += Math.floor(Math.random() * 45);", "if (Math.random() < 0.15) loseStats[i].damage += Math.floor(Math.random() * 30);")

# 5. assist chance
content = content.replace("if (Math.random() < 0.25) { // 25% chance for an assist", "if (Math.random() < 0.18) { // 18% chance for an assist")
content = content.replace("if (Math.random() < 0.25) {", "if (Math.random() < 0.18) {")

with open('src/lib/simulation.ts', 'w', encoding='utf-8') as f:
    f.write(content)
