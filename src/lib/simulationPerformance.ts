export class SimulationPerformance {
  private prepareTime: number = 0;
  private simEngineTime: number = 0;
  private saveTime: number = 0;
  private totalTime: number = 0;
  private firebaseWrites: number = 0;
  private rounds: number = 0;

  reset() {
    this.prepareTime = 0;
    this.simEngineTime = 0;
    this.saveTime = 0;
    this.totalTime = 0;
    this.firebaseWrites = 0;
    this.rounds = 0;
  }

  recordPrepareMatch(ms: number) { this.prepareTime = ms; }
  recordSimulationEngine(ms: number) { this.simEngineTime = ms; }
  recordSaveResult(ms: number) { this.saveTime = ms; }
  recordTotalExecution(ms: number) { this.totalTime = ms; }
  addFirebaseWrites(count: number) { this.firebaseWrites += count; }
  addRounds(count: number) { this.rounds += count; }

  printReport() {
    console.log(`=== Simulation Performance Report ===
Prep: ${this.prepareTime.toFixed(2)}ms
Engine: ${this.simEngineTime.toFixed(2)}ms
Save: ${this.saveTime.toFixed(2)}ms
Total: ${this.totalTime.toFixed(2)}ms
Rounds: ${this.rounds}
Firebase Writes: ${this.firebaseWrites}
=======================================`);
  }
}

export const simulationPerf = new SimulationPerformance();
