import { Vector2D, MapNode, NodeZone } from '../models';

export class MapSystem {
  static nodes: Record<string, MapNode> = {};
  
  static initializeMap(mapId: string) {
    // simplified Mirage layout for testing
    this.nodes = {
      't_spawn': { id: 't_spawn', x: 10, y: 50, zone: 'T_SPAWN', connections: ['t_ramp', 'b_apps_entrance', 'mid_t_entrance'], visibilityConnections: [] },
      'ct_spawn': { id: 'ct_spawn', x: 90, y: 50, zone: 'CT_SPAWN', connections: ['a_site', 'b_site', 'jungle'], visibilityConnections: [] },
      'a_site': { id: 'a_site', x: 80, y: 20, zone: 'A_SITE', connections: ['ct_spawn', 'jungle', 'a_main', 'connector'], visibilityConnections: ['a_main', 'jungle', 'connector'], isPlantZone: true },
      'b_site': { id: 'b_site', x: 80, y: 80, zone: 'B_SITE', connections: ['ct_spawn', 'b_apps', 'short'], visibilityConnections: ['b_apps', 'short'], isPlantZone: true },
      'mid': { id: 'mid', x: 50, y: 50, zone: 'MID', connections: ['mid_t_entrance', 'connector', 'short', 'window'], visibilityConnections: ['mid_t_entrance', 'connector', 'short', 'window'] },
      'a_main': { id: 'a_main', x: 30, y: 20, zone: 'A_MAIN', connections: ['t_ramp', 'a_site'], visibilityConnections: ['a_site', 't_ramp'] },
      't_ramp': { id: 't_ramp', x: 20, y: 30, zone: 'A_MAIN', connections: ['t_spawn', 'a_main'], visibilityConnections: ['a_main'] },
      'b_apps_entrance': { id: 'b_apps_entrance', x: 30, y: 80, zone: 'B_MAIN', connections: ['t_spawn', 'b_apps'], visibilityConnections: ['b_apps'] },
      'b_apps': { id: 'b_apps', x: 60, y: 80, zone: 'APARTMENTS', connections: ['b_apps_entrance', 'b_site'], visibilityConnections: ['b_site', 'b_apps_entrance'] },
      'mid_t_entrance': { id: 'mid_t_entrance', x: 30, y: 50, zone: 'MID', connections: ['t_spawn', 'mid'], visibilityConnections: ['mid'] },
      'connector': { id: 'connector', x: 65, y: 35, zone: 'CONNECTOR', connections: ['mid', 'a_site', 'jungle'], visibilityConnections: ['mid', 'a_site'] },
      'short': { id: 'short', x: 65, y: 65, zone: 'SHORT', connections: ['mid', 'b_site'], visibilityConnections: ['mid', 'b_site'] },
      'jungle': { id: 'jungle', x: 75, y: 35, zone: 'CONNECTOR', connections: ['ct_spawn', 'a_site', 'connector', 'window'], visibilityConnections: ['a_site', 'window'] },
      'window': { id: 'window', x: 70, y: 50, zone: 'MID', connections: ['jungle', 'mid'], visibilityConnections: ['mid', 'jungle'] }
    };
    
    // Ensure bi-directional connections for pathfinding & visibility
    for (const node of Object.values(this.nodes)) {
        for (const conn of node.connections) {
            if (this.nodes[conn] && !this.nodes[conn].connections.includes(node.id)) {
                this.nodes[conn].connections.push(node.id);
            }
        }
        for (const vis of node.visibilityConnections) {
            if (this.nodes[vis] && !this.nodes[vis].visibilityConnections.includes(node.id)) {
                this.nodes[vis].visibilityConnections.push(node.id);
            }
        }
    }
  }

  static getNode(id: string): MapNode {
    return this.nodes[id];
  }

  static getSpawns(side: 'CT' | 'T'): string[] {
    return side === 'CT' ? ['ct_spawn'] : ['t_spawn'];
  }
  
  static getSiteNodes(site: 'A' | 'B'): string[] {
    return site === 'A' ? ['a_site'] : ['b_site'];
  }
  
  static hasLineOfSight(nodeId1: string, nodeId2: string): boolean {
    if (nodeId1 === nodeId2) return true;
    const n1 = this.nodes[nodeId1];
    return n1 && n1.visibilityConnections.includes(nodeId2);
  }
  
  static getDistance(n1: MapNode, n2: MapNode): number {
    return Math.hypot(n1.x - n2.x, n1.y - n2.y);
  }
  
  static findPath(startId: string, targetId: string): string[] {
    if (startId === targetId) return [targetId];
    
    const openSet = [startId];
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    
    for (const key of Object.keys(this.nodes)) {
      gScore.set(key, Infinity);
      fScore.set(key, Infinity);
    }
    
    gScore.set(startId, 0);
    fScore.set(startId, this.getDistance(this.nodes[startId], this.nodes[targetId]));
    
    while (openSet.length > 0) {
      // Get node in openSet with lowest fScore
      let current = openSet[0];
      let lowestF = fScore.get(current)!;
      for (let i = 1; i < openSet.length; i++) {
        const score = fScore.get(openSet[i])!;
        if (score < lowestF) {
          lowestF = score;
          current = openSet[i];
        }
      }
      
      if (current === targetId) {
        // Reconstruct path
        const path = [current];
        while (cameFrom.has(current)) {
          current = cameFrom.get(current)!;
          path.unshift(current);
        }
        return path; // includes startId at 0
      }
      
      openSet.splice(openSet.indexOf(current), 1);
      
      for (const neighborId of this.nodes[current].connections) {
        const tentativeG = gScore.get(current)! + this.getDistance(this.nodes[current], this.nodes[neighborId]);
        
        if (tentativeG < gScore.get(neighborId)!) {
          cameFrom.set(neighborId, current);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + this.getDistance(this.nodes[neighborId], this.nodes[targetId]));
          
          if (!openSet.includes(neighborId)) {
            openSet.push(neighborId);
          }
        }
      }
    }
    
    return []; // No path
  }
}
