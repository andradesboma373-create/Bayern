import fs from 'fs';
let content = fs.readFileSync('src/components/Transfers.tsx', 'utf-8');

// Replace budget check in FFT
content = content.replace(
    'if (tgUser && budget < fftOfferSalary) {',
    'if (false && tgUser && budget < fftOfferSalary) {'
);

// Replace budget check in swap
content = content.replace(
    'if (senderTgUser && swapSurcharge > 0 && senderBudget < swapSurcharge) {',
    'if (false && senderTgUser && swapSurcharge > 0 && senderBudget < swapSurcharge) {'
);

// Replace budget check in accept swap
content = content.replace(
    'if (senderManager && offer.surcharge > 0 && senderBudget < offer.surcharge) {',
    'if (false && senderManager && offer.surcharge > 0 && senderBudget < offer.surcharge) {'
);

fs.writeFileSync('src/components/Transfers.tsx', content);
console.log('patched Transfers.tsx logic');
