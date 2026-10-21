# Implementation Plan: Card-by-Card Series Simulation

## Goal
Replace the "Match Stitcher" (automatic series generation) with a manual, step-by-step card-by-card simulation system for BO1, BO3, and BO5, allowing for re-simulation of specific maps.

## Plan

### 1. State Management (`Simulator.tsx`)
*   Replace/Refactor `result` state to `seriesMatch`.
*   Add `currentMapIndex` state to track the active map in the series.
*   Add `seriesFinished` boolean state.
*   Map-by-map results will be stored within the `seriesMatch.maps` array.

### 2. Logic Refactoring
*   **Initialization**: When "Start Series" is clicked, generate the base `seriesMatch` structure (format, map pool, teams) but with map results initialized as "not played".
*   **Step Simulation (`simulateNextMap`)**:
    *   Run only the single map simulation based on the `currentMapIndex`.
    *   Update `seriesMatch.maps[currentMapIndex]` with results.
    *   Update series score.
    *   Check for series completion (BO3 -> 2 maps, BO5 -> 3 maps).
*   **Re-simulation (`resimulateMap`)**:
    *   Keep `currentMapIndex` the same.
    *   Re-run single map simulation for this index.
    *   **Invalidation**: If a map *before* the last played map is re-simulated, future maps must be reset to "not played" because they depend on the series state.
*   **Persistence**: Update the storage mechanism to save the state of the series and map results in Firebase and localStorage whenever a map is completed or re-simulated.

### 3. UI Changes
*   Remove Match Stitcher UI.
*   Add a series overview dashboard (e.g., "Series: 1-0", Map list with status badges).
*   Buttons: "Simulate Map X", "Re-simulate Map X", "Next Map".

## Risks
*   Complexity in invalidating future maps upon re-simulating previous maps.
*   Potential state desync if Firebase sync fails.
*   Preserving all existing tournament logic.

## Verification
1. Verify BO1 completion.
2. Verify BO3 transition after 2nd map.
3. Verify re-simulation of Map 1 in BO3 resets Map 2.
