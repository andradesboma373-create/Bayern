import re

with open('src/components/setka_tourn/TournamentManager.tsx', 'r') as f:
    content = f.read()

old_code = """                          <div className="flex items-center gap-2">
                              <button
                                  onClick={toggleTournamentCompleted}
                                  className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                      activeTournament.completed || activeTournament.status === 'completed'
                                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                  }`}
                              >
                                  {activeTournament.completed || activeTournament.status === 'completed' ? (
                                      <>🏁 В Истории (Завершен)</>
                                  ) : (
                                      <>🏆 Завершить и отправить в Историю</>
                                  )}
                              </button>
                          </div>"""

new_code = """                          <div className="flex items-center gap-2">
                              {!isExporting && (
                                  <button
                                      onClick={toggleTournamentCompleted}
                                      className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                          activeTournament.completed || activeTournament.status === 'completed'
                                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                      }`}
                                  >
                                      {activeTournament.completed || activeTournament.status === 'completed' ? (
                                          <>🏁 В Истории (Завершен)</>
                                      ) : (
                                          <>🏆 Завершить и отправить в Историю</>
                                      )}
                                  </button>
                              )}
                          </div>"""

content = content.replace(old_code, new_code)

with open('src/components/setka_tourn/TournamentManager.tsx', 'w') as f:
    f.write(content)
