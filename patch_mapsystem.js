const fs = require('fs');
let code = fs.readFileSync('src/match-logic/systems/MapSystem.ts', 'utf8');

code = code.replace(
    'static findPath(startId: string, targetId: string): string[] {',
    `private static pathCache = new Map<string, string[]>();

  static findPath(startId: string, targetId: string): string[] {
    const cacheKey = \`\${startId}-\${targetId}\`;
    if (this.pathCache.has(cacheKey)) {
        return this.pathCache.get(cacheKey)!;
    }`
);

code = code.replace(
    /return \[startId\];\n    \}\n    return \[\];\n  \}/,
    `    const resultPath = [startId];
    this.pathCache.set(cacheKey, resultPath);
    return resultPath;
    }
    this.pathCache.set(cacheKey, []);
    return [];
  }`
);

// We need a more precise replacement for the end of findPath. Let's write a targeted script.
