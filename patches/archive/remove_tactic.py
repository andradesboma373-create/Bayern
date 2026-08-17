import re

with open('src/components/Simulator.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove tactic select block from TeamCard
tactic_block = """        <div className="flex justify-between items-center text-sm font-bold">
          <span className="text-white/50 uppercase tracking-wider">Тренер (Тактика)</span>
          <select 
            value={tactic}
            onChange={(e) => onTacticChange(e.target.value)}
            className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 outline-none text-white/90"
          >
            <option value="aggressive">Атакующая</option>
            <option value="defensive">Защитная</option>
            <option value="balance">Сбалансированная</option>
            <option value="fake">Фейк-Тактика (CS2)</option>
            
          </select>
        </div>"""

content = content.replace(tactic_block, '')

# 2. Update simulateMatchSeries call (assuming tactic was passed)
# Looking at simulateMatchSeries in Simulator.tsx:
# `team1, team2, team1Synergy, team2Synergy, team1Tactic, team2Tactic, pickedMaps, isCS2 ? 'MR12' : 'MR15', isCS2, tourneyName, team1Form, team2Form, team1MapExp, team2MapExp`
# Wait, simulateMatchSeries is imported from `../utils/matchEngine.ts`. 
# We should probably just pass 'balance' strings instead of team1Tactic/team2Tactic since we are removing the states.
content = re.sub(r'team1Tactic,\s*team2Tactic,', "'balance', 'balance',", content)

# 3. Remove tactic states from Simulator
content = re.sub(r"const \[team1Tactic, setTeam1Tactic\] = useState\([^)]+\);\n", "", content)
content = re.sub(r"const \[team2Tactic, setTeam2Tactic\] = useState\([^)]+\);\n", "", content)

# 4. Remove tactic prop from TeamCard usage
content = re.sub(r'tactic={team1Tactic}\s+', '', content)
content = re.sub(r'tactic={team2Tactic}\s+', '', content)
content = re.sub(r'onTacticChange={setTeam1Tactic}\s+', '', content)
content = re.sub(r'onTacticChange={setTeam2Tactic}\s+', '', content)

# 5. Remove tactic from TeamCard component definition
content = re.sub(r'tactic,\s*', '', content)
content = re.sub(r'onTacticChange,\s*', '', content)
content = re.sub(r'tactic:\s*string,\s*', '', content)
content = re.sub(r'onTacticChange:\s*\([^)]+\)\s*=>\s*void,\s*', '', content)

with open('src/components/Simulator.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
