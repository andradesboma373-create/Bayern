#!/bin/bash
sed -i 's/const isLocal = !user || user.isLocalDemo;/const isLocal = !user || user.isLocalDemo;\n      const matchToSave = { ...newMatch, maps: newMatch.maps.map((m: any) => { const { roundLogs, ...rest } = m; return rest; }) };/g' src/components/Simulator.tsx

sed -i 's/localMatches.push(newMatch);/localMatches.push(matchToSave);/g' src/components/Simulator.tsx
sed -i 's/addDoc(collection(db, '\''matches'\''), newMatch)/addDoc(collection(db, '\''matches'\''), matchToSave)/g' src/components/Simulator.tsx
sed -i 's/await updatePlayerStats(db, user.uid, newMatch, /await updatePlayerStats(db, user.uid, matchToSave, /g' src/components/Simulator.tsx

