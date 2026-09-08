const fs = require('fs');
let simCode = fs.readFileSync('src/components/Simulator.tsx', 'utf8');

simCode = simCode.replace('import LiveMatchOverlay from "./LiveMatchOverlay";\n', '');
simCode = simCode.replace('const [liveMatchData, setLiveMatchData] = useState<any>(null);\n', '');

const replaceTargetSim = `      setResult(newMatch);
      if (isSequential && newMatch.bo !== 1) {
        setSequentialRevealedIndex(0);
        setSelectedResultTab(0);
      } else {
        setSequentialRevealedIndex((newMatch.maps?.length || 1) - 1);
        setSelectedResultTab(newMatch.bo === 1 ? 0 : 'overall');
      }
      setLiveMatchData(newMatch);
    } catch (e: any) {
      console.error(e);
      alert('Ошибка симуляции: ' + (e.message || e));
      setIsSimulating(false);
    }`;

const newTargetSim = `      setResult(newMatch);
      if (isSequential && newMatch.bo !== 1) {
        setSequentialRevealedIndex(0);
        setSelectedResultTab(0);
      } else {
        setSequentialRevealedIndex((newMatch.maps?.length || 1) - 1);
        setSelectedResultTab(newMatch.bo === 1 ? 0 : 'overall');
      }
      setView('result');
    } catch (e: any) {
      console.error(e);
      alert('Ошибка симуляции: ' + (e.message || e));
    } finally {
      setIsSimulating(false);
    }`;

if (simCode.includes(replaceTargetSim)) {
    simCode = simCode.replace(replaceTargetSim, newTargetSim);
}

const mainReturnSim = `  return (
    <>
      {liveMatchData && (
        <LiveMatchOverlay 
          matchResult={liveMatchData} 
          onComplete={() => {
            setLiveMatchData(null);
            setIsSimulating(false);
            setView('result');
          }} 
        />
      )}
    <div className="flex flex-col gap-6">`;

const newMainReturnSim = `  return (
    <div className="flex flex-col gap-6">`;

if (simCode.includes(mainReturnSim)) {
    simCode = simCode.replace(mainReturnSim, newMainReturnSim);
}

const endTargetSim = `      />
    </div>
    </>
  );
}`;
const endReplaceSim = `      />
    </div>
  );
}`;
if(simCode.includes(endTargetSim)) {
    simCode = simCode.replace(endTargetSim, endReplaceSim);
}

fs.writeFileSync('src/components/Simulator.tsx', simCode);

let vetoCode = fs.readFileSync('src/components/setka_tourn/MatchVetoModal.tsx', 'utf8');

vetoCode = vetoCode.replace('import LiveMatchOverlay from "../LiveMatchOverlay";\n', '');
vetoCode = vetoCode.replace('const [liveMatchData, setLiveMatchData] = useState<any>(null);\n', '');

const vetoTarget = `        result.team1Name = team1.name;
        result.team2Name = team2.name;
        setLiveMatchData(result);
    }, 50);`;

const vetoReplace = `        result.team1Name = team1.name;
        result.team2Name = team2.name;
        setSimulationResult(result);
        setSimulating(false);
    }, 400);`;

if(vetoCode.includes(vetoTarget)) {
    vetoCode = vetoCode.replace(vetoTarget, vetoReplace);
}

const vetoReturn = `  return (
    <>
      {liveMatchData && (
        <LiveMatchOverlay 
          matchResult={liveMatchData} 
          onComplete={() => {
            setSimulationResult(liveMatchData);
            setLiveMatchData(null);
            setSimulating(false);
          }} 
        />
      )}`;

const newVetoReturn = `  return (`;

if(vetoCode.includes(vetoReturn)) {
    vetoCode = vetoCode.replace(vetoReturn, newVetoReturn);
}

const endTargetVeto = `    </div>
    </>
  );
}`;
const endReplaceVeto = `    </div>
  );
}`;
if(vetoCode.includes(endTargetVeto)) {
    vetoCode = vetoCode.replace(endTargetVeto, endReplaceVeto);
}

fs.writeFileSync('src/components/setka_tourn/MatchVetoModal.tsx', vetoCode);
console.log("Reverted LiveMatchOverlay");
