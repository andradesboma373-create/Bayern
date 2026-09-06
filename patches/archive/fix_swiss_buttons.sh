cat << 'INNER_EOF' > replacement.txt
            <div className="flex gap-4">
                {swissRounds.length > 1 && (
                    <button 
                        onClick={handleUndoLastRound}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 px-4 py-2 rounded-xl font-bold transition-colors"
                    >
                        Отменить раунд
                    </button>
                )}
                <button 
                    onClick={handleGenerateNextRound}
                    disabled={!isCurrentRoundFinished()}
                    className="bg-[#ff8f00] hover:bg-[#ffa733] text-black px-4 py-2 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Следующий раунд
                </button>
                <button 
                    onClick={onAdvanceToBracket}
                    disabled={!isCurrentRoundFinished()}
                    className="bg-[#ff8f00]/20 hover:bg-[#ff8f00]/30 text-[#ff8f00] border border-[#ff8f00]/50 px-4 py-2 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Перейти к плей-офф
                </button>
            </div>
INNER_EOF

sed -i -e '/<div className="flex gap-4">/,/<\/div>/c\' -e "$(cat replacement.txt | sed 's/$/\\/')" -e '' src/components/setka_tourn/SwissStage.tsx
