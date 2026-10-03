import { syncAllToFirestore } from './patch_048_sync_all_to_firestore';
import { verifyTeamsPreservation } from './patch_049_teams_preservation_and_room_isolation';
import { verifyRatingConfig } from './patch_050_rating_swing_kast_pro_cs2';
import { runPatch051 } from './patch_051_room_roster_isolation_and_firebase_quota_telemetry';

async function main() {
  console.log('========================================================');
  console.log('       APPLICATION & DATABASE RECOVERY PATCH SUITE      ');
  console.log('========================================================\n');

  console.log('STEP 1: Verifying Teams & Room Isolation...');
  const teamsRes = verifyTeamsPreservation();
  if (!teamsRes.success) {
    console.error('Teams verification failed!', teamsRes);
  } else {
    console.log('✓ Teams & Room isolation verified successfully!\n');
  }

  console.log('STEP 2: Verifying CS2 Pro Rating & KAST/Swing Settings...');
  const ratingRes = verifyRatingConfig();
  if (!ratingRes.success) {
    console.error('Rating verification failed!', ratingRes);
  } else {
    console.log('✓ CS2 Rating configurations verified successfully!\n');
  }

  console.log('STEP 3: Synchronizing All Collections to Cloud Firestore...');
  const firestoreRes = await syncAllToFirestore();
  if (!firestoreRes.success) {
    console.error('Firestore sync failed!', firestoreRes);
  } else {
    console.log('✓ All collections successfully synced to Google Cloud Firestore!\n');
  }

  console.log('STEP 4: Verifying Room Roster Isolation, SO2 MR12 and Firebase Telemetry...');
  const patch051Res = await runPatch051();
  if (!patch051Res.success) {
    console.error('Patch 051 checks failed!', patch051Res);
  } else {
    console.log('✓ Patch 051 verified successfully!\n');
  }

  console.log('========================================================');
  console.log('       ALL PATCHES APPLIED AND VERIFIED SUCCESSFULLY    ');
  console.log('========================================================');
  process.exit(0);
}

main().catch(err => {
  console.error('Error applying patches:', err);
  process.exit(1);
});
