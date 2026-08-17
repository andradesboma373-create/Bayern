let t2Alive = [
    { nickname: 'deko' },
    { nickname: 'ct0m' },
    { nickname: 'kelieN' },
    { nickname: 'StRoGo' },
    { nickname: 'm3wsu' }
];

let d2 = { index: 2, player: t2Alive[2] }; // kelieN
t2Alive.splice(d2.index, 1);
console.log("Removed index 2, length is now", t2Alive.length);
console.log(t2Alive.map(p => p.nickname));

d2 = { index: 0, player: t2Alive[0] }; // deko
t2Alive.splice(d2.index, 1);
console.log("Removed index 0, length is now", t2Alive.length);
console.log(t2Alive.map(p => p.nickname));
