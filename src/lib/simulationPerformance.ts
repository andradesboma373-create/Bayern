/**
 * Simulation Performance Profiler & Diagnostic Logger
 * Controls detailed logging via SIMULATION_DEBUG environment variable or localStorage
 */

export interface SimulationPerfMetrics {
  environment: 'production' | 'development' | 'test';
  platform: string;
  loadPlayersTimeMs: number;
  loadTeamsTimeMs: number;
  loadMapTimeMs: number;
  prepareMatchTimeMs: number;
  simulationEngineTimeMs: number;
  roundSimulationTimeMs: number;
  combatSystemTimeMs: number;
  aiDecisionsTimeMs: number;
  movementPathfindingTimeMs: number;
  saveResultTimeMs: number;
  totalExecutionTimeMs: number;
  roundsCount: number;
  ticksCount: number;
  eventsCount: number;
  firebaseReadsCount: number;
  firebaseWritesCount: number;
}

class SimulationPerformanceTracker {
  private metrics: SimulationPerfMetrics;
  private isEnabled: boolean = true;

  constructor() {
    this.metrics = this.createEmptyMetrics();
    this.checkDebugStatus();
  }

  private checkDebugStatus() {
    // Check Node environment
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.SIMULATION_DEBUG !== undefined) {
        this.isEnabled = process.env.SIMULATION_DEBUG === 'true' || process.env.SIMULATION_DEBUG === '1';
        return;
      }
    }
    // Check Vite browser environment
    try {
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('SIMULATION_DEBUG');
        if (local !== null) {
          this.isEnabled = local === 'true' || local === '1';
          return;
        }
      }
    } catch (e) {}

    // Default to true for diagnostics so developer/user sees the timing reports
    this.isEnabled = true;
  }

  public setDebugEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getDebugEnabled(): boolean {
    return this.isEnabled;
  }

  public reset() {
    this.metrics = this.createEmptyMetrics();
    this.checkDebugStatus();
  }

  private createEmptyMetrics(): SimulationPerfMetrics {
    const isProd = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
    const isRender = (typeof process !== 'undefined' && (process.env?.RENDER === 'true' || process.env?.IS_RENDER === 'true')) || true;
    
    return {
      environment: isProd ? 'production' : 'development',
      platform: isRender ? 'Render' : 'Local',
      loadPlayersTimeMs: 0,
      loadTeamsTimeMs: 0,
      loadMapTimeMs: 0,
      prepareMatchTimeMs: 0,
      simulationEngineTimeMs: 0,
      roundSimulationTimeMs: 0,
      combatSystemTimeMs: 0,
      aiDecisionsTimeMs: 0,
      movementPathfindingTimeMs: 0,
      saveResultTimeMs: 0,
      totalExecutionTimeMs: 0,
      roundsCount: 0,
      ticksCount: 0,
      eventsCount: 0,
      firebaseReadsCount: 0,
      firebaseWritesCount: 0
    };
  }

  public recordLoadPlayers(ms: number) { this.metrics.loadPlayersTimeMs += ms; }
  public recordLoadTeams(ms: number) { this.metrics.loadTeamsTimeMs += ms; }
  public recordLoadMap(ms: number) { this.metrics.loadMapTimeMs += ms; }
  public recordPrepareMatch(ms: number) { this.metrics.prepareMatchTimeMs += ms; }
  public recordSimulationEngine(ms: number) { this.metrics.simulationEngineTimeMs += ms; }
  public recordRoundSim(ms: number) { this.metrics.roundSimulationTimeMs += ms; }
  public recordCombat(ms: number) { this.metrics.combatSystemTimeMs += ms; }
  public recordAIDecisions(ms: number) { this.metrics.aiDecisionsTimeMs += ms; }
  public recordMovement(ms: number) { this.metrics.movementPathfindingTimeMs += ms; }
  public recordSaveResult(ms: number) { this.metrics.saveResultTimeMs += ms; }
  public recordTotalExecution(ms: number) { this.metrics.totalExecutionTimeMs = ms; }

  public addRounds(count: number = 1) { this.metrics.roundsCount += count; }
  public addTicks(count: number = 1) { this.metrics.ticksCount += count; }
  public addEvents(count: number = 1) { this.metrics.eventsCount += count; }
  public addFirebaseReads(count: number = 1) { this.metrics.firebaseReadsCount += count; }
  public addFirebaseWrites(count: number = 1) { this.metrics.firebaseWritesCount += count; }

  public getMetrics(): SimulationPerfMetrics {
    return { ...this.metrics };
  }

  public printReport() {
    if (!this.isEnabled) return;

    const m = this.metrics;
    const loadTotalSec = ((m.loadPlayersTimeMs + m.loadTeamsTimeMs + m.loadMapTimeMs) / 1000).toFixed(2);
    const simSec = (m.simulationEngineTimeMs / 1000).toFixed(2);
    const saveSec = (m.saveResultTimeMs / 1000).toFixed(2);
    const totalSec = (m.totalExecutionTimeMs / 1000).toFixed(2);

    // Format 1: Compact requirement format
    console.log(`\n[MATCH PERF]`);
    console.log(`Load players: ${(m.loadPlayersTimeMs / 1000).toFixed(2)}s`);
    console.log(`Load teams: ${(m.loadTeamsTimeMs / 1000).toFixed(2)}s`);
    console.log(`Load map: ${(m.loadMapTimeMs / 1000).toFixed(2)}s`);
    console.log(`Simulation: ${simSec}s`);
    console.log(`Save result: ${saveSec}s`);
    console.log(`Total: ${totalSec}s`);

    // Format 2: Detailed architecture summary table
    console.log(`\n========== MATCH PERFORMANCE ==========`);
    console.log(`Environment: ${m.environment}`);
    console.log(`Platform: ${m.platform}`);
    console.log(`Load data: ${(m.loadPlayersTimeMs + m.loadTeamsTimeMs + m.loadMapTimeMs).toFixed(1)} ms`);
    console.log(`Prepare match: ${m.prepareMatchTimeMs.toFixed(1)} ms`);
    console.log(`Simulation engine: ${m.simulationEngineTimeMs.toFixed(1)} ms`);
    console.log(`- Round simulation: ${m.roundSimulationTimeMs.toFixed(1)} ms`);
    console.log(`- Combat system: ${m.combatSystemTimeMs.toFixed(1)} ms`);
    console.log(`- AI decisions: ${m.aiDecisionsTimeMs.toFixed(1)} ms`);
    console.log(`- Movement / pathfinding: ${m.movementPathfindingTimeMs.toFixed(1)} ms`);
    console.log(`Save result: ${m.saveResultTimeMs.toFixed(1)} ms`);
    console.log(`Total execution time: ${m.totalExecutionTimeMs.toFixed(1)} ms`);
    console.log(`----------------------------------------`);
    console.log(`Rounds: ${m.roundsCount}`);
    console.log(`Ticks: ${m.ticksCount}`);
    console.log(`Events: ${m.eventsCount}`);
    console.log(`Firebase reads: ${m.firebaseReadsCount}`);
    console.log(`Firebase writes: ${m.firebaseWritesCount}`);
    console.log(`========================================\n`);
  }
}

export const simulationPerf = new SimulationPerformanceTracker();
