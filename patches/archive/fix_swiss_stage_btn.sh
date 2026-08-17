cat << 'INNER_EOF' > replacement.txt
                                                {match.team1 && match.team2 && match.team1.id !== 'BYE' && match.team2.id !== 'BYE' && (
                                                    !match.winnerId ? (
                                                        <button 
                                                            onClick={() => {
                                                                if (match.score1 === match.score2) {
                                                                    alert("Ничьи в швейцарской системе не допускаются. Пожалуйста, укажите победителя.");
                                                                    return;
                                                                }
                                                                advanceWinner(rIdx, mIdx);
                                                            }} 
                                                            className="mt-1 w-full bg-[#ff8f00] text-black py-1.5 rounded-lg font-black text-xs uppercase hover:bg-[#ffa733] transition-colors"
                                                        >
                                                            Завершить матч
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => undoMatchWinner(rIdx, mIdx)} 
                                                            className="mt-1 w-full bg-red-500/10 text-red-500 border border-red-500/20 py-1.5 rounded-lg font-black text-xs uppercase hover:bg-red-500/20 transition-colors"
                                                        >
                                                            Изменить результат
                                                        </button>
                                                    )
                                                )}
INNER_EOF

sed -i -e '/{match.team1 && match.team2 && match.team1.id !== .BYE. && match.team2.id !== .BYE. && (/,/)}/c\' -e "$(cat replacement.txt | sed 's/$/\\/')" -e '' src/components/setka_tourn/SwissStage.tsx
