import React, { useState, useEffect } from 'react';
import { TeamAutocompleteInput } from '../TeamAutocompleteInput';
import { TournamentSettings, Team } from './types';
import { Trash2, ChevronUp, ChevronDown, Upload, Folder, X, HelpCircle, Check } from 'lucide-react';
import MatchCard from './MatchCard';

interface Props {
  user?: any;
  initialName?: string;
  initialLogoUrl?: string;
  initialPrizePool?: string;
  initialSettings?: TournamentSettings;
  initialTeams?: Team[];
  onSave: (name: string, settings: TournamentSettings, teams: Team[], logoUrl?: string, prizePool?: string) => void;
  submitLabel: string;
}

const PRESET_TOURNAMENT_LOGOS = [
  { id: 'blast', name: 'BLAST Premier', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80' },
  { id: 'iem', name: 'IEM Katowice', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150&auto=format&fit=crop&q=80' },
  { id: 'major', name: 'CS2 Major', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=150&auto=format&fit=crop&q=80' },
  { id: 'esl', name: 'ESL Pro League', url: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=150&auto=format&fit=crop&q=80' },
  { id: 'starladder', name: 'StarLadder', url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=150&auto=format&fit=crop&q=80' },
  { id: 'cyber', name: 'CyberCup Pro', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80' },
  { id: 'masters', name: 'CS2 Masters', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&auto=format&fit=crop&q=80' },
  { id: 'pgl', name: 'PGL Arena', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150&auto=format&fit=crop&q=80' },
];

export default function TournamentSettingsForm({ 
    user,
    initialName = "", 
    initialLogoUrl = "",
    initialPrizePool = "$100,000",
    initialSettings, 
    initialTeams = [], 
    onSave, 
    submitLabel 
}: Props) {
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [prizePool, setPrizePool] = useState(initialPrizePool);
  const [settings, setSettings] = useState<TournamentSettings>(initialSettings || {
    mode: 'single_stage',
    stage1Type: 'playoff',
    seedingType: 'manual',
    hasStage2: false,
    matchesPerPairing: 1,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    advancingPerGroup: 2,
    numberOfGroups: 2,
  });
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [newTeamName, setNewTeamName] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [hasCustomized, setHasCustomized] = useState(false);
  const [error, setError] = useState('');

  const [globalTeams, setGlobalTeams] = useState<any[]>([]);
  useEffect(() => {
    if (user?.uid) {
      const stored = localStorage.getItem(`teams_${user.uid}`);
      if (stored) {
        setGlobalTeams(JSON.parse(stored));
      }
    }
  }, [user]);

  const handleAddTeam = (optionalName?: string) => {
    const nameToAdd = typeof optionalName === 'string' && optionalName.trim() ? optionalName : newTeamName;
    if (nameToAdd.trim()) {
      setTeams([...teams, { id: Date.now().toString(), name: nameToAdd.trim() }]);
      setNewTeamName("");
    }
  };

  const handleAddGlobalTeam = (globalTeam: any) => {
    if (!teams.find(t => t.name === globalTeam.name)) {
      setTeams([...teams, { id: Date.now().toString(), name: globalTeam.name }]);
    }
  };

  const handleUpdateTeam = (id: string) => {
    if (editingTeamName.trim()) {
      setTeams(teams.map(t => t.id === id ? { ...t, name: editingTeamName.trim() } : t));
    }
    setEditingTeamId(null);
  };

  const moveTeamUp = (index: number) => {
    if (index === 0) return;
    const newTeams = [...teams];
    const temp = newTeams[index];
    newTeams[index] = newTeams[index - 1];
    newTeams[index - 1] = temp;
    setTeams(newTeams);
    setSettings(prev => ({ ...prev, seedingType: 'manual' }));
  };

  const moveTeamDown = (index: number) => {
    if (index === teams.length - 1) return;
    const newTeams = [...teams];
    const temp = newTeams[index];
    newTeams[index] = newTeams[index + 1];
    newTeams[index + 1] = temp;
    setTeams(newTeams);
    setSettings(prev => ({ ...prev, seedingType: 'manual' }));
  };

  const handleSwapTeams = (idx1: number, idx2: number) => {
    const newTeams = [...teams];
    const temp = newTeams[idx1];
    newTeams[idx1] = newTeams[idx2];
    newTeams[idx2] = temp;
    setTeams(newTeams);
    setSettings(prev => ({ ...prev, seedingType: 'manual' }));
  };

  const handlePairFirstWithLast = () => {
    const sorted = [...teams];
    const rearranged = [];
    let left = 0;
    let right = sorted.length - 1;
    while (left <= right) {
      if (left === right) {
        rearranged.push(sorted[left]);
      } else {
        rearranged.push(sorted[left]);
        rearranged.push(sorted[right]);
      }
      left++;
      right--;
    }
    setTeams(rearranged);
    setSettings(prev => ({ ...prev, seedingType: 'manual' }));
  };

  const handleFormSubmit = () => {
    if (!name.trim()) {
      setError('Введите название турнира');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (teams.length < 2) {
      setError('Добавьте как минимум 2 команды (или загрузите пресет)');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const finalSettings: TournamentSettings = {
      ...settings,
      seedingType: settings.seedingType === 'random' ? 'random' : 'manual'
    };
    onSave(name, finalSettings, teams, logoUrl, prizePool);
  };

  return (
    <div className="bg-[#12121a] p-8 rounded-2xl border border-white/5 flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label className="block text-white/50 font-bold mb-2">Название турнира</label>
            <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 px-4 py-3 rounded-xl text-white outline-none focus:border-[#ff8f00]/50"
                placeholder="Stake Pulse Beat I"
            />
        </div>

        <div>
            <label className="block text-white/50 font-bold mb-2">Призовой фонд ($)</label>
            <input 
                type="text" 
                value={prizePool}
                onChange={e => setPrizePool(e.target.value)}
                className="w-full bg-black/50 border border-white/10 px-4 py-3 rounded-xl text-white outline-none focus:border-[#ff8f00]/50"
                placeholder="$100,000"
            />
        </div>
      </div>

      {/* Tournament Avatar / Logo Section */}
      <div className="bg-black/40 p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-[#ff8f00] font-black uppercase tracking-widest text-xs flex items-center gap-2">
            <Folder className="w-4 h-4" /> Аватарка / Логотип турнира
          </label>
          <span className="text-white/40 text-xs">Загрузите свою или выберите из папки</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Avatar Preview Box - Question mark fallback if empty */}
          <div className="relative shrink-0">
            {logoUrl ? (
              <div className="relative group">
                <img 
                  src={logoUrl} 
                  alt="Tournament Avatar" 
                  className="w-16 h-16 object-contain rounded-2xl border-2 border-[#ff8f00]/50 bg-black/80 p-1 shadow-lg"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white p-1 rounded-full text-xs shadow-md cursor-pointer"
                  title="Удалить логотип"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#18192a] border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-[#ff8f00] shadow-inner">
                <span className="text-2xl font-black">?</span>
                <span className="text-[9px] text-white/40 font-bold uppercase">Без авы</span>
              </div>
            )}
          </div>

          <div className="flex-1 w-full space-y-3">
            {/* File Upload Button & Direct URL Input */}
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="bg-[#ff8f00]/20 hover:bg-[#ff8f00]/30 border border-[#ff8f00]/50 text-[#ff8f00] font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0">
                <Upload className="w-4 h-4" />
                <span>Загрузить фото</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        fetch('/api/upload', { method: 'POST', body: formData })
                          .then(r => r.json())
                          .then(d => { if (d.url) setLogoUrl(d.url); });
                      } catch(e) {}
                    }
                  }}
                  className="hidden" 
                />
              </label>

              <input 
                type="text" 
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 px-4 py-2.5 rounded-xl text-white text-xs outline-none focus:border-[#ff8f00]/50"
                placeholder="Или вставьте прямую ссылку (https://...)"
              />
            </div>

            {/* Folder of Preset Tournament Avatars */}
            <div>
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider block mb-2">
                📂 Папка с турнирными аватарками:
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRESET_TOURNAMENT_LOGOS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setLogoUrl(preset.url)}
                    className={`p-1 rounded-xl border transition-all flex flex-col items-center gap-1 cursor-pointer group ${
                      logoUrl === preset.url 
                        ? 'border-[#ff8f00] bg-[#ff8f00]/20 scale-105' 
                        : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5'
                    }`}
                    title={preset.name}
                  >
                    <img 
                      src={preset.url} 
                      alt={preset.name} 
                      className="w-8 h-8 object-cover rounded-lg"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
          <label className="block text-[#ff8f00] font-black uppercase tracking-widest text-sm mb-4">Формат 1 стадии</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button 
                type="button"
                onClick={() => setSettings({...settings, stage1Type: 'groups', mode: settings.hasStage2 ? 'two_stage' : 'single_stage' })}
                className={`p-4 rounded-xl border ${settings.stage1Type === 'groups' ? 'bg-[#ff8f00]/20 border-[#ff8f00]' : 'bg-black/30 border-white/10'} transition-colors font-bold text-sm`}
              >
                  Круговые группы
              </button>
              <button 
                type="button"
                onClick={() => setSettings({...settings, stage1Type: 'gsl_groups', mode: 'two_stage', hasStage2: true, stage2Type: 'tiered', numberOfGroups: settings.numberOfGroups || 2 })}
                className={`p-4 rounded-xl border ${settings.stage1Type === 'gsl_groups' ? 'bg-[#ff8f00]/20 border-[#ff8f00] text-[#ff8f00]' : 'bg-black/30 border-white/10'} transition-colors font-bold text-sm`}
              >
                  ⭐ Группы GSL (ESL / 2 этапа)
              </button>
              <button 
                type="button"
                onClick={() => setSettings({...settings, stage1Type: 'swiss', mode: 'swiss' })}
                className={`p-4 rounded-xl border ${settings.stage1Type === 'swiss' ? 'bg-[#ff8f00]/20 border-[#ff8f00]' : 'bg-black/30 border-white/10'} transition-colors font-bold text-sm`}
              >
                  Швейцарская система
              </button>
              <button 
                type="button"
                onClick={() => setSettings({...settings, stage1Type: 'playoff', mode: 'single_stage', hasStage2: false })}
                className={`p-4 rounded-xl border ${settings.stage1Type === 'playoff' ? 'bg-[#ff8f00]/20 border-[#ff8f00]' : 'bg-black/30 border-white/10'} transition-colors font-bold text-sm`}
              >
                  Плей-офф
              </button>
          </div>
      </div>

      {settings.stage1Type === 'gsl_groups' && (
          <div className="flex flex-col gap-4 bg-black/20 p-5 rounded-xl border border-white/5">
              <div className="bg-[#ff8f00]/10 border border-[#ff8f00]/30 p-4 rounded-xl text-xs text-white/80 leading-relaxed">
                  <div className="font-extrabold text-[#ff8f00] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      ℹ️ Двухэтапный формат GSL / ESL Pro League:
                  </div>
                  <div>
                      • <strong>1 этап:</strong> Группы по системе Double Elimination. В финале виннеров победитель берет <strong>1 место</strong>, проигравший — <strong>2 место</strong> (не падает в лузера!). В нижней сетке разыгрываются <strong>3 и 4 места</strong>.
                  </div>
                  <div className="mt-1">
                      • <strong>2 этап (Плей-офф):</strong> 3 и 4 места играют в Раунде 1, победители выходят на 2-е места в Раунде 2, а затем на 1-е места в 1/4 финала!
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-white/50 text-xs font-bold uppercase mb-1">Количество групп GSL</label>
                      <select 
                        value={settings.numberOfGroups || 2} 
                        onChange={e => setSettings({...settings, numberOfGroups: parseInt(e.target.value) || 2})} 
                        className="w-full bg-black p-3 rounded-xl text-white outline-none border border-white/10 focus:border-[#ff8f00]/50 font-bold"
                      >
                          <option value={2}>2 группы (по 8 или 4 команды)</option>
                          <option value={4}>4 группы (по 8 или 4 команды)</option>
                      </select>
                  </div>

                  <div>
                      <label className="block text-white/50 text-xs font-bold uppercase mb-1">Формат 2 стадии (Плей-офф)</label>
                      <select 
                        value={settings.stage2Type || 'tiered'} 
                        onChange={e => setSettings({...settings, stage2Type: e.target.value as any, eliminationType: e.target.value === 'double' ? 'double' : 'single' })} 
                        className="w-full bg-black p-3 rounded-xl text-white outline-none border border-white/10 focus:border-[#ff8f00]/50 font-bold"
                      >
                          <option value="tiered">🏆 Ступенчатый Плей-офф (ESL Pro League: R1 -&gt; R2 -&gt; QF -&gt; SF -&gt; GF)</option>
                          <option value="single">🥇 Классический Сингл Элиминейшн (Single Elimination)</option>
                          <option value="double">🥈 Дабл Элиминейшн (Double Elimination)</option>
                      </select>
                  </div>
              </div>
          </div>
      )}

      {settings.stage1Type === 'playoff' && (
          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <label className="block text-white/50 text-sm mb-2">Формат Плей-офф</label>
              <div className="flex gap-2">
                  <button 
                    onClick={() => setSettings({...settings, eliminationType: 'single'})}
                    className={`flex-1 p-3 rounded-xl border ${(!settings.eliminationType || settings.eliminationType === 'single') ? 'bg-[#ff8f00]/20 border-[#ff8f00]' : 'bg-black/30 border-white/10'} transition-colors font-bold text-sm`}
                  >
                      Сингл Элиминейшн (1 жизнь)
                  </button>
                  <button 
                    onClick={() => setSettings({...settings, eliminationType: 'double'})}
                    className={`flex-1 p-3 rounded-xl border ${settings.eliminationType === 'double' ? 'bg-[#ff8f00]/20 border-[#ff8f00]' : 'bg-black/30 border-white/10'} transition-colors font-bold text-sm`}
                  >
                      Дабл Элиминейшн (2 жизни)
                  </button>
              </div>
          </div>
      )}

      {settings.stage1Type === 'swiss' && (
          <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
              <div>
                  <label className="block text-white/50 text-sm mb-1">Побед для выхода (или победы в турнире)</label>
                  <input type="number" value={settings.swissWinsToAdvance || 3} onChange={e => setSettings({...settings, swissWinsToAdvance: parseInt(e.target.value) || 3})} className="w-full bg-black p-2 rounded outline-none border border-white/10 focus:border-[#ff8f00]/50 text-white" />
              </div>
              <div>
                  <label className="block text-white/50 text-sm mb-1">Поражений для вылета</label>
                  <input type="number" value={settings.swissLossesToEliminate || 3} onChange={e => setSettings({...settings, swissLossesToEliminate: parseInt(e.target.value) || 3})} className="w-full bg-black p-2 rounded outline-none border border-white/10 focus:border-[#ff8f00]/50 text-white" />
              </div>
          </div>
      )}

      {settings.stage1Type === 'groups' && (
          <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
              <div>
                  <label className="block text-white/50 text-sm mb-1">Количество групп</label>
                  <input type="number" value={settings.numberOfGroups || 2} onChange={e => setSettings({...settings, numberOfGroups: parseInt(e.target.value) || 2})} className="w-full bg-black p-2 rounded text-white" />
              </div>
              <div>
                  <label className="block text-white/50 text-sm mb-1">Выходят из группы (если есть 2 стадия)</label>
                  <input type="number" value={settings.advancingPerGroup || 2} onChange={e => setSettings({...settings, advancingPerGroup: parseInt(e.target.value) || 2})} className="w-full bg-black p-2 rounded text-white" />
              </div>
              <div>
                  <label className="block text-white/50 text-sm mb-1">Матчей между собой (1 или 2)</label>
                  <select value={settings.matchesPerPairing || 1} onChange={e => setSettings({...settings, matchesPerPairing: parseInt(e.target.value) as 1|2})} className="w-full bg-black p-2 rounded text-white outline-none">
                      <option value={1}>1 круг</option>
                      <option value={2}>2 круга (Дома/В гостях)</option>
                  </select>
              </div>
              <div className="col-span-2 grid grid-cols-3 gap-2 mt-2">
                  <div>
                      <label className="block text-white/50 text-xs mb-1">Очки за победу</label>
                      <input type="number" value={settings.winPoints !== undefined ? settings.winPoints : 3} onChange={e => setSettings({...settings, winPoints: parseInt(e.target.value) || 0})} className="w-full bg-black p-2 rounded text-white" />
                  </div>
                  <div>
                      <label className="block text-white/50 text-xs mb-1">Очки за ничью</label>
                      <input type="number" value={settings.drawPoints !== undefined ? settings.drawPoints : 1} onChange={e => setSettings({...settings, drawPoints: parseInt(e.target.value) || 0})} className="w-full bg-black p-2 rounded text-white" />
                  </div>
                  <div>
                      <label className="block text-white/50 text-xs mb-1">Очки за поражение</label>
                      <input type="number" value={settings.lossPoints !== undefined ? settings.lossPoints : 0} onChange={e => setSettings({...settings, lossPoints: parseInt(e.target.value) || 0})} className="w-full bg-black p-2 rounded text-white" />
                  </div>
              </div>
          </div>
      )}

      {(settings.stage1Type === 'groups' || settings.stage1Type === 'swiss') && (
          <div className="flex flex-col gap-4 bg-black/20 p-6 rounded-xl border border-white/5 mt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                      type="checkbox" 
                      checked={settings.hasStage2 || false} 
                      onChange={(e) => setSettings({...settings, hasStage2: e.target.checked, mode: e.target.checked ? (settings.stage1Type === 'groups' ? 'two_stage' : 'swiss') : (settings.stage1Type === 'groups' ? 'single_stage' : 'swiss')})}
                      className="w-5 h-5 accent-[#ff8f00]"
                  />
                  <span className="font-bold text-white uppercase tracking-widest text-sm">Включить 2 стадию (Плей-офф)</span>
              </label>

              {settings.hasStage2 && (
                  <div className="mt-2 border-t border-white/5 pt-4">
                      <label className="block text-white/50 text-sm mb-2">Формат Плей-офф (2 стадия)</label>
                      <div className="flex gap-2">
                          <button 
                            onClick={() => setSettings({...settings, eliminationType: 'single'})}
                            className={`flex-1 p-3 rounded-xl border ${(!settings.eliminationType || settings.eliminationType === 'single') ? 'bg-[#ff8f00]/20 border-[#ff8f00]' : 'bg-black/30 border-white/10'} transition-colors font-bold text-sm`}
                          >
                              Сингл Элиминейшн (1 жизнь)
                          </button>
                          <button 
                            onClick={() => setSettings({...settings, eliminationType: 'double'})}
                            className={`flex-1 p-3 rounded-xl border ${settings.eliminationType === 'double' ? 'bg-[#ff8f00]/20 border-[#ff8f00]' : 'bg-black/30 border-white/10'} transition-colors font-bold text-sm`}
                          >
                              Дабл Элиминейшн (2 жизни)
                          </button>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Bracket Mode Setting */}
      <div className="bg-black/20 p-5 rounded-xl border border-white/5 flex flex-col gap-3">
          <label className="block text-[#ff8f00] font-black uppercase tracking-widest text-sm">
              ⚙️ Режим работы сетки
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                  type="button"
                  onClick={() => setSettings({ ...settings, bracketMode: 'standard' })}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      (settings.bracketMode || 'standard') === 'standard'
                          ? 'bg-[#ff8f00]/20 border-[#ff8f00] text-white shadow-[0_0_15px_rgba(255,143,0,0.25)]'
                          : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                  }`}
              >
                  <div className="font-extrabold text-sm mb-1 flex items-center justify-between">
                      <span>📝 Обычная сетка</span>
                      {(settings.bracketMode || 'standard') === 'standard' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ff8f00] shadow-[0_0_8px_#ff8f00]" />
                      )}
                  </div>
                  <div className="text-xs text-white/60 leading-relaxed">
                      Ручной ввод счета (числа 1:0, 2:1) и кнопка «Завершить матч». Стандартный режим турниров.
                  </div>
              </button>

              <button
                  type="button"
                  onClick={() => setSettings({ ...settings, bracketMode: 'realtime' })}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.bracketMode === 'realtime'
                          ? 'bg-purple-600/30 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                          : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                  }`}
              >
                  <div className="font-extrabold text-sm mb-1 flex items-center justify-between">
                      <span>🎮 Сетка в реальном времени</span>
                      {settings.bracketMode === 'realtime' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#a855f7]" />
                      )}
                  </div>
                  <div className="text-xs text-white/60 leading-relaxed">
                      Вместо выбора цифр отображается кнопка «🎮 Сыграть Матч» для полноценной симуляции мато-вето.
                  </div>
              </button>
          </div>
      </div>

      {/* Appearance & Bracket Customization Settings */}
      <div className="bg-black/20 p-5 rounded-xl border border-white/5 flex flex-col gap-4">
          <label className="block text-[#ff8f00] font-black uppercase tracking-widest text-sm flex items-center justify-between">
              <span>🎨 Внешний вид и Оформление элементов</span>
          </label>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                  type="button"
                  onClick={() => setShowCustomizationModal(true)}
                  className="bg-[#161726] border border-[#ff8f00]/50 text-[#ff8f00] font-black uppercase tracking-wider text-sm py-4 px-8 rounded-xl hover:bg-[#ff8f00]/20 transition-all flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(255,143,0,0.15)] hover:shadow-[0_0_25px_rgba(255,143,0,0.3)] cursor-pointer"
              >
                  Настроить кастомизацию
              </button>
              
              {hasCustomized && (
                  <div className="flex items-center gap-3 text-emerald-400 font-bold text-sm bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-5 h-5" />
                      </div>
                      Настройки внешнего вида применены!
                  </div>
              )}
          </div>
      </div>
      <div>
          <label className="block text-white/50 font-bold mb-2">Тип жеребьевки</label>
          <div className="flex gap-2">
              <button 
                onClick={() => setSettings({...settings, seedingType: 'random'})}
                className={`flex-1 p-3 rounded-xl border ${settings.seedingType === 'random' ? 'bg-[#ff8f00]/20 border-[#ff8f00]' : 'bg-black/30 border-white/10'} transition-colors font-bold text-sm`}
              >
                  Рандомно (Случайно)
              </button>
              <button 
                onClick={() => setSettings({...settings, seedingType: 'manual'})}
                className={`flex-1 p-3 rounded-xl border ${(settings.seedingType !== 'random') ? 'bg-[#ff8f00]/20 border-[#ff8f00]' : 'bg-black/30 border-white/10'} transition-colors font-bold text-sm`}
              >
                  Вручную (По списку)
              </button>
          </div>
          {settings.seedingType !== 'random' && (
              <p className="text-white/40 text-xs mt-2">
                  Команды будут распределены в сетку в том порядке, в котором они указаны в списке.
                  Для настройки нужных матчей перемещайте команды вверх/вниз в списке ниже.
              </p>
          )}
      </div>

      <div>
          <label className="block text-white/50 font-bold mb-2">Команды</label>
          <div className="flex gap-2 mb-4">
              <TeamAutocompleteInput 
                value={newTeamName}
                onChange={setNewTeamName}
                onSelect={handleAddTeam}
                className="bg-black border border-white/10 px-4 py-2 rounded-xl text-white outline-none flex-1"
                placeholder="Название команды..."
              />
              <button 
                onClick={() => handleAddTeam()}
                className="bg-[#333] hover:bg-[#444] px-4 rounded-xl font-bold transition-colors"
              >
                  Добавить
              </button>
          </div>
          {globalTeams.length > 0 && (
             <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-xs font-bold text-white/50 mb-2 uppercase">Или добавьте из ваших команд:</p>
                <div className="flex flex-wrap gap-2">
                   {globalTeams.filter(gt => !teams.find(t => t.name === gt.name)).map(gt => (
                      <button 
                        key={gt.id} 
                        onClick={() => handleAddGlobalTeam(gt)}
                        className="bg-black/30 hover:bg-black/60 border border-white/5 hover:border-blue-500/50 px-3 py-1.5 rounded-lg text-sm text-white/80 transition-colors flex items-center gap-2"
                      >
                         <span className="text-[10px]">➕</span> {gt.name}
                      </button>
                   ))}
                </div>
             </div>
          )}
          <div className="flex flex-col gap-2">
              {teams.map((t, idx) => (
                  <div key={t.id} className="bg-white/5 px-3 py-2 rounded-lg flex items-center gap-2 border border-white/10">
                      {settings.seedingType === 'manual' && (
                          <div className="flex flex-col gap-1 mr-2">
                              <button onClick={() => moveTeamUp(idx)} disabled={idx === 0} className="text-white/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                                  <ChevronUp className="w-4 h-4" />
                              </button>
                              <button onClick={() => moveTeamDown(idx)} disabled={idx === teams.length - 1} className="text-white/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                                  <ChevronDown className="w-4 h-4" />
                              </button>
                          </div>
                      )}
                      
                      <span className="text-white/20 font-mono text-xs w-6">{idx + 1}.</span>
                      
                      {editingTeamId === t.id ? (
                          <div className="flex gap-2 flex-1">
                              <TeamAutocompleteInput value={editingTeamName} onChange={setEditingTeamName} onSelect={() => handleUpdateTeam(t.id)} className="bg-black text-white px-2 py-0.5 rounded outline-none border border-[#ff8f00]/50 flex-1" />
                              <button onClick={() => handleUpdateTeam(t.id)} className="text-green-400 text-xs uppercase font-bold px-2">ОК</button>
                          </div>
                      ) : (
                          <>
                              <span className="font-bold cursor-pointer hover:text-[#ff8f00] transition-colors flex-1" onClick={() => {
                                  setEditingTeamId(t.id);
                                  setEditingTeamName(t.name);
                              }}>
                                  {t.name}
                              </span>
                              <button onClick={() => setTeams(teams.filter(ct => ct.id !== t.id))} className="text-red-400 hover:text-red-300 ml-2 p-1">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </>
                      )}
                  </div>
              ))}
              {teams.length === 0 && <span className="text-white/30 text-sm">Нет команд</span>}
          </div>
      </div>

      {settings.seedingType !== 'random' && teams.length >= 2 && settings.stage1Type !== 'groups' && (() => {
          const matchCount = Math.floor(teams.length / 2);
          const pairs = [];
          for (let i = 0; i < matchCount; i++) {
              pairs.push({
                  idx1: i * 2,
                  idx2: i * 2 + 1,
                  team1: teams[i * 2],
                  team2: teams[i * 2 + 1]
              });
          }
          const hasBye = teams.length % 2 !== 0;
          const byeTeam = hasBye ? teams[teams.length - 1] : null;

          return (
              <div className="bg-black/30 p-5 rounded-2xl border border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                      <div>
                          <h4 className="text-sm font-black text-[#ff8f00] uppercase tracking-wider">
                              🤝 Конструктор пар 1-го раунда
                          </h4>
                          <p className="text-[11px] text-white/40 mt-0.5">
                              Настройте, кто с кем играет в первом раунде. Выберите соперников из списка.
                          </p>
                      </div>
                      <div className="flex items-center gap-2">
                          <button
                              type="button"
                              onClick={handlePairFirstWithLast}
                              className="px-2.5 py-1 bg-[#ff8f00]/10 hover:bg-[#ff8f00]/20 border border-[#ff8f00]/20 rounded-lg text-[10px] font-bold text-[#ff8f00] transition-all uppercase tracking-wider cursor-pointer"
                              title="Распределить: 1-й против последнего, 2-й против предпоследнего и т.д."
                          >
                              👥 1-й против последнего
                          </button>
                          <button
                              type="button"
                              onClick={() => {
                                  const shuffled = [...teams].sort(() => Math.random() - 0.5);
                                  setTeams(shuffled);
                              }}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-white transition-all uppercase tracking-wider cursor-pointer"
                          >
                              🎲 Перемешать пары
                          </button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
                      {pairs.map((pair, pIdx) => (
                          <div key={pIdx} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col gap-2">
                              <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                                  Матч {pIdx + 1}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                  {/* Team 1 Select */}
                                  <div className="flex-1 min-w-0">
                                      <select
                                          value={pair.team1.id}
                                          onChange={async (e) => {
                                              const targetId = e.target.value;
                                              const targetIdx = teams.findIndex(t => t.id === targetId);
                                              if (targetIdx !== -1) {
                                                  handleSwapTeams(pair.idx1, targetIdx);
                                              }
                                          }}
                                          className="w-full bg-black border border-white/10 px-2 py-1.5 rounded-lg text-xs font-bold text-white outline-none focus:border-[#ff8f00]/50"
                                      >
                                          {teams.map(t => (
                                              <option key={t.id} value={t.id}>{t.name}</option>
                                          ))}
                                      </select>
                                  </div>

                                  <span className="text-[10px] font-black text-[#ff8f00]/60 shrink-0">VS</span>

                                  {/* Team 2 Select */}
                                  <div className="flex-1 min-w-0">
                                      <select
                                          value={pair.team2.id}
                                          onChange={async (e) => {
                                              const targetId = e.target.value;
                                              const targetIdx = teams.findIndex(t => t.id === targetId);
                                              if (targetIdx !== -1) {
                                                  handleSwapTeams(pair.idx2, targetIdx);
                                              }
                                          }}
                                          className="w-full bg-black border border-white/10 px-2 py-1.5 rounded-lg text-xs font-bold text-white outline-none focus:border-[#ff8f00]/50"
                                      >
                                          {teams.map(t => (
                                              <option key={t.id} value={t.id}>{t.name}</option>
                                          ))}
                                      </select>
                                  </div>
                              </div>
                          </div>
                      ))}

                      {hasBye && byeTeam && (
                          <div className="bg-[#ff8f00]/5 border border-[#ff8f00]/10 p-3 rounded-xl flex flex-col gap-2 sm:col-span-2">
                              <div className="text-[10px] font-black text-[#ff8f00]/60 uppercase tracking-widest">
                                  Пропускает 1-й раунд (BYE)
                              </div>
                              <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                                  <span className="text-xs font-bold text-white">{byeTeam.name}</span>
                                  <select
                                      value={byeTeam.id}
                                      onChange={async (e) => {
                                          const targetId = e.target.value;
                                          const targetIdx = teams.findIndex(t => t.id === targetId);
                                          if (targetIdx !== -1) {
                                              handleSwapTeams(teams.length - 1, targetIdx);
                                          }
                                      }}
                                      className="bg-black border border-white/10 px-2 py-1 rounded-lg text-xs font-bold text-white outline-none focus:border-[#ff8f00]/50"
                                  >
                                      {teams.map(t => (
                                          <option key={t.id} value={t.id}>{t.name}</option>
                                      ))}
                                  </select>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          );
      })()}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-xl mt-4 text-center font-bold animate-fade-in">
          {error}
        </div>
      )}
      <button
          onClick={handleFormSubmit}
          className="w-full bg-[#ff8f00] text-black font-black uppercase tracking-wider py-4 rounded-xl hover:bg-[#ffa733] transition-colors mt-4 cursor-pointer"
      >
          {submitLabel}
      </button>

      {/* Customization Modal */}
      {showCustomizationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                <span className="text-2xl">🎨</span> Кастомизация Сетки и Карточек
              </h2>
              <button onClick={() => { setShowCustomizationModal(false); setHasCustomized(true); }} className="text-white/50 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
              {/* Left Side: Settings */}
              <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-white/5 flex flex-col gap-8 custom-scrollbar">
                  {/* Background Dimming & Blur Settings */}
                  <div className="flex flex-col gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                      <h3 className="text-[#ff8f00] font-black uppercase tracking-widest text-xs">Фон Турнира</h3>
                      <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                              <label className="text-white text-xs font-bold">🌓 Затемнение фона (Тёмный фильтр):</label>
                              <span className="text-xs font-mono text-[#ff8f00] font-extrabold bg-[#ff8f00]/10 px-2 py-0.5 rounded border border-[#ff8f00]/20">
                                  {settings.bgOpacity !== undefined ? settings.bgOpacity : 50}%
                              </span>
                          </div>
                          <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={settings.bgOpacity !== undefined ? settings.bgOpacity : 50}
                              onChange={(e) => setSettings({ ...settings, bgOpacity: parseInt(e.target.value) })}
                              className="w-full accent-[#ff8f00] cursor-pointer"
                          />
                      </div>
          
                      <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                              <label className="text-white text-xs font-bold">🌫️ Блюр фона (Размытие):</label>
                              <span className="text-xs font-mono text-[#ff8f00] font-extrabold bg-[#ff8f00]/10 px-2 py-0.5 rounded border border-[#ff8f00]/20">
                                  {settings.bgBlur !== undefined ? settings.bgBlur : 10}px
                              </span>
                          </div>
                          <input
                              type="range"
                              min="0"
                              max="30"
                              step="2"
                              value={settings.bgBlur !== undefined ? settings.bgBlur : 10}
                              onChange={(e) => setSettings({ ...settings, bgBlur: parseInt(e.target.value) })}
                              className="w-full accent-[#ff8f00] cursor-pointer"
                          />
                      </div>
                  </div>
          
                  {/* Match Box Style */}
                  <div className="flex flex-col gap-3">
                      <label className="block text-white/70 text-xs font-black uppercase tracking-widest">
                          📦 Дизайн Карточек Матча
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                          {[
                              { id: 'cyber', name: '🚀 Киберпанк' },
                              { id: 'neon', name: '🔮 Яркий Неон' },
                              { id: 'glass', name: '🧊 Матовое стекло' },
                              { id: 'gold', name: '👑 Золото' },
                              { id: 'dark', name: '🌑 Классик' },
                              { id: 'brutalist', name: '⚡ Брутализм' },
                              { id: 'retro', name: '📟 Ретро 8-бит' },
                              { id: 'minimalist', name: '⚪ Минимализм' },
                          ].map((styleItem) => (
                              <button
                                  key={styleItem.id}
                                  type="button"
                                  onClick={() => setSettings({ ...settings, boxStyle: styleItem.id as any })}
                                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                                      (settings.boxStyle || 'dark') === styleItem.id
                                          ? 'bg-[#ff8f00]/20 border-[#ff8f00] text-white shadow-[0_0_15px_rgba(255,143,0,0.25)]'
                                          : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                                  }`}
                              >
                                  <span>{styleItem.name}</span>
                                  {(settings.boxStyle || 'dark') === styleItem.id && (
                                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff8f00] shadow-[0_0_8px_#ff8f00]" />
                                  )}
                              </button>
                          ))}
                      </div>
                  </div>
        
                  {/* Card Accent Color Palette */}
                  <div className="flex flex-col gap-3">
                      <label className="block text-white/70 text-xs font-black uppercase tracking-widest">
                          🎨 Основной цвет элементов
                      </label>
                      <div className="flex flex-wrap gap-2">
                          {[
                              { id: '#ff8f00', name: 'Оранжевый', class: 'bg-[#ff8f00]' },
                              { id: '#00f0ff', name: 'Неон Голубой', class: 'bg-[#00f0ff]' },
                              { id: '#10b981', name: 'Изумруд', class: 'bg-[#10b981]' },
                              { id: '#a855f7', name: 'Ультрафиолет', class: 'bg-[#a855f7]' },
                              { id: '#ef4444', name: 'Алый Красный', class: 'bg-[#ef4444]' },
                              { id: '#eab308', name: 'Золото', class: 'bg-[#eab308]' },
                              { id: '#ec4899', name: 'Розовый', class: 'bg-[#ec4899]' },
                          ].map((colorItem) => (
                              <button
                                  key={colorItem.id}
                                  type="button"
                                  onClick={() => setSettings({ ...settings, cardThemeColor: colorItem.id })}
                                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                      (settings.cardThemeColor || '#ff8f00') === colorItem.id
                                          ? 'bg-white/15 border-white text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                                          : 'bg-black/40 border-white/10 text-white/50 hover:text-white hover:bg-white/5'
                                  }`}
                              >
                                  <span className={`w-3.5 h-3.5 rounded-full ${colorItem.class} shadow-sm border border-black/50`} />
                                  <span>{colorItem.name}</span>
                              </button>
                          ))}
                      </div>
                  </div>
        
                  {/* Button Style */}
                  <div className="flex flex-col gap-3">
                      <label className="block text-white/70 text-xs font-black uppercase tracking-widest">
                          🔘 Дизайн кнопок (В турнире)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                          {[
                              { id: 'gradient', name: '✨ Сочный Градиент' },
                              { id: 'neon', name: '⚡ Неоновый Контур' },
                              { id: 'solid', name: '⬛ Строгая Заливка' },
                              { id: 'brutal', name: '🟥 3D Брутализм' },
                          ].map((btnItem) => (
                              <button
                                  key={btnItem.id}
                                  type="button"
                                  onClick={() => setSettings({ ...settings, btnStyle: btnItem.id as any })}
                                  className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                      (settings.btnStyle || 'gradient') === btnItem.id
                                          ? 'bg-[#ff8f00]/20 border-[#ff8f00] text-white shadow-[0_0_10px_rgba(255,143,0,0.2)]'
                                          : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                                  }`}
                              >
                                  {btnItem.name}
                              </button>
                          ))}
                      </div>
                  </div>
                  
                  {/* Bracket Scale Setting */}
                  <div className="flex flex-col gap-3">
                      <label className="block text-white/70 text-xs font-black uppercase tracking-widest">
                          🔍 Масштаб Сетки
                      </label>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                          {[
                              { label: '50%', val: 50 },
                              { label: '75%', val: 75 },
                              { label: '90%', val: 90 },
                              { label: '100%', val: 100 },
                              { label: '110%', val: 110 },
                              { label: '125%', val: 125 },
                              { label: '150%', val: 150 },
                          ].map((preset) => (
                              <button
                                  key={preset.val}
                                  type="button"
                                  onClick={() => setSettings({ ...settings, bracketScale: preset.val })}
                                  className={`py-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                      (settings.bracketScale || 100) === preset.val
                                          ? 'bg-[#ff8f00] text-black border-[#ff8f00]'
                                          : 'bg-black/40 text-white/50 border-white/5 hover:text-white hover:bg-white/5'
                                  }`}
                              >
                                  {preset.label}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
              
              {/* Right Side: Preview */}
              <div className="w-full md:w-1/2 p-6 overflow-y-auto flex flex-col items-center justify-center bg-[#0d0e15] border-t md:border-t-0 border-l-0 md:border-l border-white/5 relative min-h-[400px]">
                 <div className="absolute inset-0 z-0 bg-black">
                     <div 
                         className="absolute inset-0 z-0 transition-all bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-[#050508]"
                         style={{
                             filter: settings.bgBlur ? `blur(${settings.bgBlur}px)` : undefined
                         }}
                     />
                     <div 
                         className="absolute inset-0 z-0 bg-black pointer-events-none transition-opacity duration-200" 
                         style={{ opacity: (settings.bgOpacity !== undefined ? settings.bgOpacity : 50) / 100 }} 
                     />
                 </div>

                 <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/40 font-black uppercase text-[10px] tracking-widest bg-black/40 px-4 py-1.5 rounded-full border border-white/5 z-10 backdrop-blur-md">
                     Превью Карточки Матча
                 </div>
                 
                 <div className="w-full max-w-sm flex items-center justify-center transition-transform duration-300 z-10" style={{ transform: `scale(${(settings.bracketScale || 100) / 100})`, transformOrigin: 'center center' }}>
                   <div className="w-full relative pointer-events-none">
                     <MatchCard 
                        match={{
                          id: 'mock-match',
                          team1: { id: 'team1', name: 'Natus Vincere', logoUrl: 'https://img-cdn.hltv.org/teamlogo/9b5o0_R21E8qH8x8K4q_c_.svg?ixlib=java-2.1.0&s=9fcf2b0a6da9b552377b2f0a8d62da3e' },
                          team2: { id: 'team2', name: 'FaZe Clan', logoUrl: 'https://img-cdn.hltv.org/teamlogo/gO-Fp-X6H2p-0o79eH99tB.svg?ixlib=java-2.1.0&s=e6fc339178cbcd253c0ddf3be23c21d8' },
                          score1: 2,
                          score2: 1,
                          winnerId: 'team1',
                          isFinished: true
                        }} 
                        bracketType="winners"
                        rIdx={0}
                        mIdx={0}
                        onUpdateScore={() => {}}
                        onAdvanceWinner={() => {}}
                        boxStyle={settings.boxStyle}
                        cardThemeColor={settings.cardThemeColor}
                        btnStyle={settings.btnStyle}
                        bracketMode={settings.bracketMode}
                     />
                   </div>
                 </div>
                 
                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-[10px] uppercase tracking-widest text-center w-full max-w-[250px] leading-relaxed z-10">
                   Внешний вид может незначительно отличаться в турнирной сетке. (Загрузка кастомного фона доступна внутри турнира)
                 </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-white/5 flex justify-end bg-black/40 shrink-0">
               <button
                  type="button"
                  onClick={() => { setShowCustomizationModal(false); setHasCustomized(true); }}
                  className="bg-[#ff8f00] text-black font-black uppercase tracking-wider py-3 px-8 rounded-xl hover:bg-[#ffa733] transition-colors flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,143,0,0.4)]"
               >
                  <Check className="w-5 h-5" /> Сохранить настройки
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
