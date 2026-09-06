import fs from 'fs';
let content = fs.readFileSync('src/components/Transfers.tsx', 'utf-8');

// revert logic
content = content.replace(
    'if (false && tgUser && budget < fftOfferSalary) {',
    'if (tgUser && budget < fftOfferSalary) {'
);
content = content.replace(
    'if (false && senderTgUser && swapSurcharge > 0 && senderBudget < swapSurcharge) {',
    'if (senderTgUser && swapSurcharge > 0 && senderBudget < swapSurcharge) {'
);
content = content.replace(
    'if (false && senderManager && offer.surcharge > 0 && senderBudget < offer.surcharge) {',
    'if (senderManager && offer.surcharge > 0 && senderBudget < offer.surcharge) {'
);

// revert UI
content = content.replace(
    /\{locked \? ' \(На Туре - LOCK\)' : ''\}/g,
    "{locked ? ' (На Туре - LOCK)' : ` ($ ${budget.toLocaleString()})`}"
);

// revert message
if (!content.includes('Баланс менеджера уменьшен')) {
    content = content.replace(
        'setNegotiationMessage(`Контракт успешно подписан! Игрок ${selectedFftPlayer.nickname} перешел в команду ${team.name}.`);',
        'setNegotiationMessage(`Контракт успешно подписан! Игрок ${selectedFftPlayer.nickname} перешел в команду ${team.name}. Баланс менеджера уменьшен на $ ${fftOfferSalary.toLocaleString()}.`);'
    );
}

fs.writeFileSync('src/components/Transfers.tsx', content);
console.log('patched transfers revert');
