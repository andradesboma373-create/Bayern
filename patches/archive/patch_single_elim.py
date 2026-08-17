import re

with open('src/components/setka_tourn/SingleEliminationStage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "isSwapMode?: boolean;\n}",
    "isSwapMode?: boolean;\n  onVetoMatch?: (team1: Team, team2: Team) => void;\n}"
)
content = content.replace(
    "export default function SingleEliminationStage({ tournament, onUpdate, isExporting, isSwapMode }: Props) {",
    "export default function SingleEliminationStage({ tournament, onUpdate, isExporting, isSwapMode, onVetoMatch }: Props) {"
)
# We need to pass onVetoMatch to BracketRenderer
content = content.replace(
    "<BracketRenderer ",
    "<BracketRenderer onVetoMatch={onVetoMatch} "
)

with open('src/components/setka_tourn/SingleEliminationStage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/components/setka_tourn/BracketRenderer.tsx', 'r', encoding='utf-8') as f:
    content2 = f.read()

content2 = content2.replace(
    "allTeams: Team[];\n}",
    "allTeams: Team[];\n  onVetoMatch?: (team1: Team, team2: Team) => void;\n}"
)
content2 = content2.replace(
    "export default function BracketRenderer({ rounds, type, onUpdateScore, onAdvanceWinner, boxStyle, cardThemeColor, btnStyle, isExporting, isSwapMode, onSwapTeam, allTeams }: Props) {",
    "export default function BracketRenderer({ rounds, type, onUpdateScore, onAdvanceWinner, boxStyle, cardThemeColor, btnStyle, isExporting, isSwapMode, onSwapTeam, allTeams, onVetoMatch }: Props) {"
)
content2 = content2.replace(
    "<MatchCard",
    "<MatchCard onVetoMatch={onVetoMatch}"
)

with open('src/components/setka_tourn/BracketRenderer.tsx', 'w', encoding='utf-8') as f:
    f.write(content2)

with open('src/components/setka_tourn/MatchCard.tsx', 'r', encoding='utf-8') as f:
    content3 = f.read()

content3 = content3.replace(
    "allTeams: Team[];\n}",
    "allTeams: Team[];\n  onVetoMatch?: (team1: Team, team2: Team) => void;\n}"
)
content3 = content3.replace(
    "export default function MatchCard({ match, rIdx, mIdx, bracketType, onUpdateScore, onAdvanceWinner, isFinal, isTop, hasInConnector, hasOutConnector, boxStyle, cardThemeColor, btnStyle, isExporting, isSwapMode, onSwapTeam, allTeams }: Props) {",
    "export default function MatchCard({ match, rIdx, mIdx, bracketType, onUpdateScore, onAdvanceWinner, isFinal, isTop, hasInConnector, hasOutConnector, boxStyle, cardThemeColor, btnStyle, isExporting, isSwapMode, onSwapTeam, allTeams, onVetoMatch }: Props) {"
)

# Add "Play" button next to "Confirm" button
play_btn = """
                    {/* Play Button */}
                    {match.team1 && match.team2 && !match.winnerId && match.team1.id !== 'BYE' && match.team2.id !== 'BYE' && !isExporting && onVetoMatch && (
                        <button 
                            onClick={() => onVetoMatch(match.team1!, match.team2!)} 
                            className="w-full mt-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/50 rounded p-1 text-[10px] font-black uppercase transition-colors"
                        >
                            Сыграть Матч
                        </button>
                    )}
"""

content3 = content3.replace(
    "{/* Confirm Button */}",
    play_btn + "\n                    {/* Confirm Button */}"
)

with open('src/components/setka_tourn/MatchCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content3)
