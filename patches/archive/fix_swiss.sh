sed -i '36i\
  const undoMatchWinner = (rIdx: number, mIdx: number) => {\
      const newRounds = [...swissRounds];\
      newRounds[rIdx] = [...newRounds[rIdx]];\
      const match = { ...newRounds[rIdx][mIdx] };\
      match.winnerId = null;\
      newRounds[rIdx][mIdx] = match;\
      onUpdate({ ...tournament, swissRounds: newRounds });\
  };\
\
  const handleUndoLastRound = () => {\
      if (swissRounds.length <= 1) return;\
      if (!window.confirm("Вы уверены, что хотите отменить этот раунд?")) return;\
      const newRounds = swissRounds.slice(0, swissRounds.length - 1);\
      onUpdate({ ...tournament, swissRounds: newRounds });\
  };\
' src/components/setka_tourn/SwissStage.tsx
