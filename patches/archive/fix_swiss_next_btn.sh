cat << 'INNER_EOF' > replacement_next.txt
                <button 
                    onClick={handleGenerateNextRound}
                    disabled={!isCurrentRoundFinished()}
                    title={!isCurrentRoundFinished() ? "Сначала завершите все матчи текущего раунда" : ""}
                    className="bg-[#ff8f00] hover:bg-[#ffa733] text-black px-4 py-2 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Следующий раунд
                </button>
INNER_EOF

sed -i -e '/<button/,/Следующий раунд/c\' -e "$(cat replacement_next.txt | sed 's/$/\\/')" -e '' src/components/setka_tourn/SwissStage.tsx
