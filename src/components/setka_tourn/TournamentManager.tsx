import React, { useState, useEffect } from 'react';
import { 
  Trophy, Plus, Trash2, Settings, Download, Users, Swords, 
  Sparkles, RefreshCw, Layers, ArrowRight, Play, Edit3, Image as ImageIcon
} from 'lucide-react';
import { loadTournaments, saveTournament, deleteTournament, getCanonicalRoomId } from './storage';
import { Tournament, Team, TournamentStageConfig } from './types';
import { generateStageData } from './stageGenerator';
import SwissStage from './SwissStage';
import SingleEliminationStage from './SingleEliminationStage';
import GslGroupStage from './GslGroupStage';
import TieredPlayoffStage from './TieredPlayoffStage';
import QualifierStage from './QualifierStage';
import GroupStage from './GroupStage';
import { DownloadBracketModal } from './DownloadBracketModal';
import { TournamentStyleModal } from './TournamentStyleModal';
import TournamentSettingsForm from './TournamentSettingsForm';
import MvpModal from './MvpModal';
import LeadersModal from './LeadersModal';
import MatchVetoModal from './MatchVetoModal';

export const BG_THEMES = {
  cyber_grid: {
    name: 'Cyber Grid',
    className: 'bg-[#0a0a0f] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]',
    watermark: 'MAJOR 2026',
    style: {}
  },
  mirage: {
    name: 'Mirage',
    className: 'bg-[#0f172a] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent)]',
    watermark: 'MIRAGE',
    style: { backgroundImage: 'url(/maps/cs2/mirage.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }
  },
  inferno: {
    name: 'Inferno',
    className: 'bg-[#1a0f0a] bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.15),transparent)]',
    watermark: 'INFERNO',
    style: { backgroundImage: 'url(/maps/cs2/inferno.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }
  },
  dust2: {
    name: 'Dust II',
    className: 'bg-[#1a170a] bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.15),transparent)]',
    watermark: 'DUST II',
    style: { backgroundImage: 'url(/maps/cs2/dust2.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }
  }
};

const DEFAULT_PRESETS = [
  {
    id: 'major_16',
    name: 'Major Championship 16 Teams',
    badge: '🏆 Major',
    desc: 'Swiss Stage (16) → Top 8 Play-off',
    stages: [
      {
        type: 'swiss' as const,
        name: 'Stage 1: Swiss System',
        teamNames: ['NAVI', 'FaZe', 'Spirit', 'Vitality', 'G2', 'MOUZ', 'Astralis', 'Heroic', 'VP', 'Eternal Fire', 'Complexity', 'Liquid', 'MongolZ', 'paiN', 'FURIA', 'Imperial']
      },
      {
        type: 'playoff' as const,
        name: 'Stage 2: Playoffs',
        teamNames: []
      }
    ]
  },
  {
    id: 'playoff_8',
    name: 'Play-off Cup (8 Teams)',
    badge: '⚔️ Play-off',
    desc: 'Single Elimination (Quarter-finals to Final)',
    stages: [
      {
        type: 'playoff' as const,
        name: 'Play-off Bracket',
        teamNames: ['NAVI', 'FaZe', 'Spirit', 'Vitality', 'G2', 'MOUZ', 'VP', 'Astralis']
      }
    ]
  }
];

export default function TournamentManager({ user }: { user: any }) {
  const roomId = 'default-room';
  const canonicalRoom = getCanonicalRoomId(roomId);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    const loaded = loadTournaments(canonicalRoom);
    setTournaments(loaded);
    if (loaded.length > 0 && !activeTournamentId) {
      setActiveTournamentId(loaded[0].id);
    }
  }, [canonicalRoom]);

  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  const handleCreatePreset = (preset: typeof DEFAULT_PRESETS[0]) => {
    const newStages: TournamentStageConfig[] = preset.stages.map((st, idx) => {
      const teams: Team[] = st.teamNames.map((name, i) => ({
        id: `team_${Date.now()}_${idx}_${i}`,
        name,
        seed: i + 1
      }));
      return {
        id: `stage_${Date.now()}_${idx}`,
        name: st.name,
        type: st.type,
        teams,
        matches: generateStageData(st.type, teams)
      };
    });

    const newTourn: Tournament = {
      id: `tourn_${Date.now()}`,
      name: preset.name,
      game: 'cs2',
      stages: newStages,
      createdAt: new Date().toISOString(),
      settings: {
        themeId: 'cyber_grid',
        bestOf: 3
      }
    };

    const updated = [newTourn, ...tournaments];
    setTournaments(updated);
    setActiveTournamentId(newTourn.id);
    setActiveStageIdx(0);
    saveTournament(canonicalRoom, newTourn);
  };

  const handleUpdateActiveTournament = (updated: Tournament) => {
    const newTourns = tournaments.map(t => t.id === updated.id ? updated : t);
    setTournaments(newTourns);
    saveTournament(canonicalRoom, updated);
  };

  const handleDeleteActive = () => {
    if (!activeTournamentId) return;
    if (!window.confirm('Удалить этот турнир?')) return;
    deleteTournament(canonicalRoom, activeTournamentId);
    const updated = tournaments.filter(t => t.id !== activeTournamentId);
    setTournaments(updated);
    setActiveTournamentId(updated[0]?.id || null);
    setActiveStageIdx(0);
  };

  if (!activeTournament) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 bg-purple-600/20 border border-purple-500/30 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
          <Trophy className="w-10 h-10 text-purple-400" />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-wider text-white mb-3">Турнирная сетка и Плей-офф</h2>
        <p className="text-white/60 text-sm max-w-md text-center mb-8">
          Создайте турнир по готовым пресетам или настройте собственный чемпионат с продвинутыми сетками (Швейцарка, GSL, Play-off).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
          {DEFAULT_PRESETS.map(preset => (
            <div 
              key={preset.id}
              onClick={() => handleCreatePreset(preset)}
              className="bg-[#12121a] hover:bg-[#1a1a26] border border-white/5 hover:border-purple-500/50 p-6 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group shadow-xl"
            >
              <div>
                <span className="text-xs font-bold px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full">{preset.badge}</span>
                <h3 className="text-lg font-bold text-white mt-4 group-hover:text-purple-400 transition-colors">{preset.name}</h3>
                <p className="text-xs text-white/50 mt-1">{preset.desc}</p>
              </div>
              <div className="mt-6 flex items-center justify-between text-xs font-bold text-purple-400 uppercase tracking-widest">
                <span>Создать турнир</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentStage = activeTournament.stages?.[activeStageIdx] || activeTournament.stages?.[0];

  return (
    <div className="flex flex-col gap-6" id="tournament-stage-container">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#12121a] p-6 rounded-3xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center">
            <Trophy className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider">{activeTournament.name}</h1>
            <p className="text-xs text-white/50">Этапов: {activeTournament.stages?.length || 0} | Создан: {new Date(activeTournament.createdAt || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowDownloadModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
          >
            <Download className="w-4 h-4" /> Экспорт сетки
          </button>
          <button 
            onClick={() => setShowStyleModal(true)}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2 cursor-pointer border border-white/10"
          >
            <ImageIcon className="w-4 h-4 text-purple-400" /> Оформление
          </button>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2 cursor-pointer border border-white/10"
          >
            <Settings className="w-4 h-4 text-emerald-400" /> Настройки
          </button>
          <button 
            onClick={handleDeleteActive}
            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/20 cursor-pointer"
            title="Удалить турнир"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stage Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {activeTournament.stages?.map((stage, idx) => (
          <button
            key={stage.id || idx}
            onClick={() => setActiveStageIdx(idx)}
            className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeStageIdx === idx 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30' 
                : 'bg-[#12121a] hover:bg-[#1a1a26] text-white/60 border border-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            {stage.name || `Этап ${idx + 1}`}
          </button>
        ))}
      </div>

      {/* Stage View Content */}
      <div className="bg-[#12121a] p-6 rounded-3xl border border-white/5 min-h-[500px]">
        {currentStage?.type === 'swiss' && (
          <SwissStage 
            tournament={activeTournament} 
            onUpdate={handleUpdateActiveTournament} 
          />
        )}
        {currentStage?.type === 'playoff' && (
          <SingleEliminationStage 
            tournament={activeTournament} 
            onUpdate={handleUpdateActiveTournament} 
          />
        )}
        {currentStage?.type === 'gsl_groups' && (
          <GslGroupStage 
            tournament={activeTournament} 
            onUpdate={handleUpdateActiveTournament} 
          />
        )}
        {currentStage?.type === 'qualifier' && (
          <QualifierStage 
            tournament={activeTournament} 
            onUpdate={handleUpdateActiveTournament} 
          />
        )}
        {currentStage?.type === 'groups' && (
          <GroupStage 
            tournament={activeTournament} 
            onUpdate={handleUpdateActiveTournament} 
          />
        )}
      </div>

      {/* Modals */}
      {showDownloadModal && (
        <DownloadBracketModal 
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)} 
          tournament={activeTournament}
          stageElement={document.getElementById('tournament-stage-container')}
        />
      )}
      {showStyleModal && (
        <TournamentStyleModal 
          isOpen={showStyleModal}
          onClose={() => setShowStyleModal(false)}
          currentBoxStyle={activeTournament.settings?.boxStyle || 'dark'}
          currentCardColor={activeTournament.settings?.cardThemeColor || '#3b82f6'}
          currentBgTheme={activeTournament.settings?.themeId || 'cyber_grid'}
          bgThemes={BG_THEMES}
          onSelectBoxStyle={(boxStyle) => handleUpdateActiveTournament({ ...activeTournament, settings: { ...activeTournament.settings, boxStyle } })}
          onSelectCardColor={(cardThemeColor) => handleUpdateActiveTournament({ ...activeTournament, settings: { ...activeTournament.settings, cardThemeColor } })}
          onSelectBgTheme={(themeId) => handleUpdateActiveTournament({ ...activeTournament, settings: { ...activeTournament.settings, themeId } })}
          onUploadBg={(file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const bgImage = e.target?.result as string;
              handleUpdateActiveTournament({ ...activeTournament, settings: { ...activeTournament.settings, bgImage } });
            };
            reader.readAsDataURL(file);
          }}
        />
      )}
      {showSettingsModal && (
        <TournamentSettingsForm 
          user={user}
          initialName={activeTournament.name}
          initialLogoUrl={activeTournament.logoUrl || ''}
          initialPrizePool={activeTournament.prizePool || ''}
          initialGame={activeTournament.game || 'cs2'}
          initialSettings={activeTournament.settings || {}}
          initialTeams={activeTournament.stages?.[0]?.teams || []}
          submitLabel="Сохранить настройки"
          onSave={(data) => {
            handleUpdateActiveTournament({
              ...activeTournament,
              name: data.name,
              logoUrl: data.logoUrl,
              prizePool: data.prizePool,
              game: data.game,
              settings: data.settings,
              stages: [{ ...(activeTournament.stages?.[0] || {}), teams: data.teams }]
            });
            setShowSettingsModal(false);
          }}
        />
      )}
    </div>
  );
}
