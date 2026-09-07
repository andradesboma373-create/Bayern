const fs = require('fs');
let code = fs.readFileSync('src/match-logic/systems/MapSystem.ts', 'utf8');

code = code.replace(
    'static findPath(startId: string, targetId: string): string[] {',
    `private static pathCache = new Map<string, string[]>();

  static clearCache() {
      this.pathCache.clear();
  }

  static findPath(startId: string, targetId: string): string[] {
    const cacheKey = \`\${startId}-\${targetId}\`;
    if (this.pathCache.has(cacheKey)) {
        return this.pathCache.get(cacheKey);
    }`
);

// find where findPath returns [startId, ...path] and []
code = code.replace(
    /        const path = \[\];\n        let curr = current;\n        while \(cameFrom\.has\(curr\)\) \{\n          path\.unshift\(curr\);\n          curr = cameFrom\.get\(curr\)!;\n        \}\n        path\.unshift\(startId\);\n        return path;\n      \}/g,
    `        const path = [];
        let curr = current;
        while (cameFrom.has(curr)) {
          path.unshift(curr);
          curr = cameFrom.get(curr)!;
        }
        path.unshift(startId);
        this.pathCache.set(cacheKey, path);
        return path;
      }`
);

code = code.replace(
    /    return \[\];\n  \}/g,
    `    this.pathCache.set(cacheKey, []);
    return [];
  }`
);

fs.writeFileSync('src/match-logic/systems/MapSystem.ts', code);
console.log("Patched MapSystem.ts");
