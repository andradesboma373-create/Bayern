const fs = require('fs');
let code = fs.readFileSync('src/match-logic/engine/MatchEngine.ts', 'utf-8');

code = code.replace(
    'static isMatchOver(s1: number, s2: number, format: string): boolean {',
    'static isMatchOver(s1: number, s2: number, format: string, isCS2: boolean = true): boolean {'
);

code = code.replace(
    '    if (s1 >= regTie && s2 >= regTie) {\n      const totalRounds = s1 + s2;\n      const otRounds = Math.max(1, totalRounds - (regTie * 2));\n      const otNumber = Math.floor((otRounds - 1) / 6);\n      const otTarget = regTie + 4 + (otNumber * 3); // 16 in OT1, 19 in OT2, 22 in OT3, 25 in OT4, etc.\n      \n      // Decisive 2-round margin win in OT\n      if (s1 >= otTarget && (s1 - s2) >= 2) return true;\n      if (s2 >= otTarget && (s2 - s1) >= 2) return true;\n    }',
    '    if (s1 >= regTie && s2 >= regTie) {\n      if (!isCS2) {\n        // SO2 OT logic: 2-round halves. Win if securing 3 or 2 rounds lead in OT block\n        const totalRounds = s1 + s2;\n        const otRounds = Math.max(1, totalRounds - (regTie * 2));\n        const otNumber = Math.floor((otRounds - 1) / 4);\n        const otTarget = regTie + 3 + (otNumber * 2);\n        if (s1 >= otTarget && (s1 - s2) >= 2) return true;\n        if (s2 >= otTarget && (s2 - s1) >= 2) return true;\n      } else {\n        // CS2 OT logic: MR3 (3-round halves)\n        const totalRounds = s1 + s2;\n        const otRounds = Math.max(1, totalRounds - (regTie * 2));\n        const otNumber = Math.floor((otRounds - 1) / 6);\n        const otTarget = regTie + 4 + (otNumber * 3);\n        if (s1 >= otTarget && (s1 - s2) >= 2) return true;\n        if (s2 >= otTarget && (s2 - s1) >= 2) return true;\n      }\n    }'
);

code = code.replace(
    'if (this.isMatchOver(t1.score, t2.score, state.format)) {',
    'if (this.isMatchOver(t1.score, t2.score, state.format, state.isCS2)) {'
);

fs.writeFileSync('src/match-logic/engine/MatchEngine.ts', code);
console.log('MatchEngine patched.');
