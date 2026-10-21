# Implementation Plan - Tournament & UI Fixes

This plan outlines the fixes for the reported issues in the tournament bracket, team logos, and map backgrounds.

## 1. Fix Reference Errors
- [x] Fix `ReferenceError: hue is not defined` in `logoMatcher.ts`.
- [x] Fix `ReferenceError: RotateCcw is not defined` in `TournamentManager.tsx`.
- [x] Verified build success.

## 2. Tournament Bracket Improvements
- [x] **Saving Grid**: Moved the `id="tournament-stage-container"` to exclude the top menu bar, ensuring it's not captured during export.
- [x] **TBD Styling**: Updated `MatchCard.tsx` and `TeamLogo.tsx` to use "TBD" and dark backgrounds for empty slots, removing green backgrounds as requested.
- [x] **Undo Button**: Ensured the Undo button (RotateCcw) is correctly implemented and visible when history exists.
- [x] **Game Propagation**: Passed the `game` prop through all stages (`SingleElimination`, `Swiss`, `GSL`, `Qualifier`) to `MatchCard` and `TeamLogo` for correct official logo matching.

## 3. Map Background Fixes
- [x] **Match Details**: Updated `MatchDetails.tsx` to use the `getMapImageUrl` utility for both the main header background and map thumbnails.
- [x] **Path Consistency**: Ensured that the `game` mode is correctly passed to the utility to resolve paths like `/maps/cs2/...` or `/maps/so2/...`.

## 4. Verification
- [x] Run `compile_applet` to ensure no syntax or reference errors.
- [x] Verify visual changes in the bracket view.
