const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.tsx', 'utf8');

const mainReturnTarget = `  return (
    <div className="flex flex-col gap-6">`;

const mainReturnReplacement = `  return (
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

if (code.includes(mainReturnTarget)) {
    code = code.replace(mainReturnTarget, mainReturnReplacement);
    console.log("Main return fixed");
}

fs.writeFileSync('src/components/Simulator.tsx', code);
