#!/bin/bash
sed -i 's/disabled={match.score1 === match.score2}//g' src/components/setka_tourn/BracketRenderer.tsx
sed -i 's/onClick={() => onAdvanceWinner(bracketType, rIdx, mIdx)}/onClick={() => { if (match.score1 === match.score2) { alert("Ничьи не допускаются (или вы не ввели счет). Пожалуйста, укажите победителя."); return; } onAdvanceWinner(bracketType, rIdx, mIdx); }}/g' src/components/setka_tourn/BracketRenderer.tsx
