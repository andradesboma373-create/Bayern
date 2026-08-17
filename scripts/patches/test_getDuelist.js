const aliveArr = [
    { nickname: 'm0NESY', role: 'sniper', rating: 130 },
    { nickname: 'kyousuke', role: 'rifler', rating: 76 },
    { nickname: 'Niko', role: 'rifler', rating: 76 },
    { nickname: 'TeSeS', role: 'rifler', rating: 76 },
    { nickname: 'karrigan', role: 'rifler', rating: 76 }
];
const getCharacteristics = (p) => {
    let r = parseFloat(p.rating) || 100;
    if (r < 10) r = r * 100;
    let reaction = r;
    if (p.role === 'sniper') { reaction *= 1.2; }
    return { reaction };
};
const getDuelist = (aliveArr) => {
    let weights = aliveArr.map(p => {
        let w = getCharacteristics(p).reaction;
        if (aliveArr.length > 3 && (p.role === 'opener' || p.role === 'sniper')) w *= 2;
        if (aliveArr.length <= 2 && p.role === 'lurker') w *= 2;
        return w;
    });
    let total = weights.reduce((a,b)=>a+b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < aliveArr.length; i++) {
        r -= weights[i];
        if (r <= 0) return { player: aliveArr[i], index: i };
    }
    return { player: aliveArr[aliveArr.length-1], index: aliveArr.length-1 };
};

let counts = {};
for(let i = 0; i < 1000; i++) {
    let d = getDuelist(aliveArr);
    counts[d.player.nickname] = (counts[d.player.nickname] || 0) + 1;
}
console.log(counts);
