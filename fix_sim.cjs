const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.tsx', 'utf8');

const brokenChunk = `      return (
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
      )}) => window.removeEventListener('tournaments-updated', handleSync);`;

const fixedChunk = `      return () => window.removeEventListener('tournaments-updated', handleSync);`;

code = code.replace(brokenChunk, fixedChunk);

const mainReturnTarget = `  return (
    <div className="min-h-screen`;

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
    <div className="min-h-screen`;

if (code.includes(mainReturnTarget)) {
    code = code.replace(mainReturnTarget, mainReturnReplacement);
    console.log("Main return fixed");
}

fs.writeFileSync('src/components/Simulator.tsx', code);
