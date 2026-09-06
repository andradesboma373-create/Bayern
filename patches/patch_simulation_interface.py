import re

with open('src/lib/simulation.ts', 'r') as f:
    content = f.read()

old_iface = """interface PlayerStatRecord {
    nickname: string;
    role?: string;
    rating?: number;
    id?: string;
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    totalRounds: number;
    kd?: string;
    adr?: number;
    hltvRating?: string;
}"""

new_iface = """interface PlayerStatRecord {
    nickname: string;
    role?: string;
    rating?: number;
    id?: string;
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    totalRounds: number;
    kd?: string;
    adr?: number;
    hltvRating?: string;
    kast?: string;
    kpr?: string;
    dpr?: string;
    impact?: string;
}"""

content = content.replace(old_iface, new_iface)

with open('src/lib/simulation.ts', 'w') as f:
    f.write(content)
