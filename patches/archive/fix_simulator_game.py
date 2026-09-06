import re

with open('src/components/Simulator.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add game prop to TeamCard
content = re.sub(r'function TeamCard\(\{ nameLabel', 'function TeamCard({ game, nameLabel', content)
content = re.sub(r'onChannelLoad\?: \(\) => void \}\) \{', 'onChannelLoad?: () => void, game?: "cs2" | "s2" }) {', content)

# Pass game to TeamLogo in TeamCard
content = re.sub(r'<TeamLogo teamName=\{nameValue\} sizeClassName="w-14 h-14 text-xl" />', '<TeamLogo game={game} teamName={nameValue} sizeClassName="w-14 h-14 text-xl" />', content)

# Pass game to PlayerAvatar in TeamCard
content = re.sub(r'<PlayerAvatar playerName=\{p\.nickname\} sizeClassName="w-8 h-8" />', '<PlayerAvatar game={game} playerName={p.nickname} sizeClassName="w-8 h-8" />', content)

# Pass game to TeamLogo in match result
content = re.sub(r'<TeamLogo teamName=\{result\.team1Name\} sizeClassName="w-16 h-16 text-2xl" />', '<TeamLogo game={result.gameMode === "cs2" ? "cs2" : "s2"} teamName={result.team1Name} sizeClassName="w-16 h-16 text-2xl" />', content)
content = re.sub(r'<TeamLogo teamName=\{result\.team2Name\} sizeClassName="w-16 h-16 text-2xl" />', '<TeamLogo game={result.gameMode === "cs2" ? "cs2" : "s2"} teamName={result.team2Name} sizeClassName="w-16 h-16 text-2xl" />', content)

# Pass game to PlayerAvatar in match result (if any)
content = re.sub(r'<PlayerAvatar playerName=\{p\.nickname\} sizeClassName="h-6 w-6" className="ring-2 ring-\[\#12121a\]" />', '<PlayerAvatar game={result.gameMode === "cs2" ? "cs2" : "s2"} playerName={p.nickname} sizeClassName="h-6 w-6" className="ring-2 ring-[#12121a]" />', content)

# Pass game to TeamCard in rendering
content = re.sub(r'<TeamCard nameLabel="Команда 1"', '<TeamCard game={game as "cs2"|"s2"} nameLabel="Команда 1"', content)
content = re.sub(r'<TeamCard nameLabel="Команда 2"', '<TeamCard game={game as "cs2"|"s2"} nameLabel="Команда 2"', content)

with open('src/components/Simulator.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
