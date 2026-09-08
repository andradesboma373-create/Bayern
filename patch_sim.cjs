const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.tsx', 'utf8');

code = code.replace(
    'import VetoModal from "./VetoModal";',
    'import VetoModal from "./VetoModal";\nimport LiveMatchOverlay from "./LiveMatchOverlay";'
);

code = code.replace(
    'const [isSimulating, setIsSimulating] = useState(false);',
    'const [isSimulating, setIsSimulating] = useState(false);\n  const [liveMatchData, setLiveMatchData] = useState<any>(null);'
);

const replaceTarget = `      setResult(newMatch);
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

const newCode = `      setResult(newMatch);
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

if (code.includes(replaceTarget)) {
    code = code.replace(replaceTarget, newCode);
    console.log("Replaced handleSimulate successfully");
} else {
    console.log("Could not find replace target in handleSimulate");
}

code = code.replace(
    'return (',
    `return (
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
      )}`
);

code = code.replace(/<\/div>\s*$/i, '</div>\n    </>\n');

fs.writeFileSync('src/components/Simulator.tsx', code);
