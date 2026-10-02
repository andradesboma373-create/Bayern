import { RATING_CONFIG } from '../src/match-logic/config/RatingConfig';

export function verifyRatingConfig(): { success: boolean; details: any } {
  console.log('--- VERIFYING CS2 PRO RATING & KAST/SWING PATCH ---');

  const assistMinDamage = RATING_CONFIG.ASSIST_MIN_DAMAGE;
  const assistSwingShare = RATING_CONFIG.ASSIST_SWING_SHARE;
  const tradeBonus = RATING_CONFIG.TRADE_SWING_BONUS;
  const bombPlant = RATING_CONFIG.EVENT_SWING?.BOMB_PLANT;
  const bombDefuse = RATING_CONFIG.EVENT_SWING?.BOMB_DEFUSE;

  console.log(`Assist Min Damage: ${assistMinDamage} (expected <= 27 for realistic CS2 pro assists)`);
  console.log(`Assist Swing Share: ${assistSwingShare} (expected >= 0.45)`);
  console.log(`Trade Bonus: ${tradeBonus} (expected >= 1.4)`);
  console.log(`Bomb Plant Swing: ${bombPlant}`);
  console.log(`Bomb Defuse Swing: ${bombDefuse}`);

  const isOk = assistMinDamage <= 27 && assistSwingShare >= 0.45 && tradeBonus >= 1.4;

  return {
    success: isOk,
    details: {
      assistMinDamage,
      assistSwingShare,
      tradeBonus,
      bombPlant,
      bombDefuse
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = verifyRatingConfig();
  console.log('Rating config verification:', res);
  process.exit(res.success ? 0 : 1);
}
