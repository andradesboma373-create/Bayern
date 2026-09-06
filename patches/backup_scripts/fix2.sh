sed -i '496a\
                      {(activeTournament.activeStage === 2 || activeTournament.settings.stage1Type === '"'playoff'"' || (!activeTournament.settings.stage1Type && activeTournament.settings.mode === '"'single_stage'"')) && (\
                          <SingleEliminationStage tournament={activeTournament} onUpdate={handleUpdateActive} />\
                      )}\
                  </div>' src/components/setka_tourn/TournamentManager.tsx
