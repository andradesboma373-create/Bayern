import React, { useState } from 'react';
import { X, Download, FileText, Image as ImageIcon, Database, Layers, Sparkles, Loader2, Check } from 'lucide-react';
import { Tournament } from './types';

interface DownloadBracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  stageElement: HTMLElement | null;
  onExportStart?: () => void;
  onExportEnd?: () => void;
  onNotify?: (message: string) => void;
}

export const DownloadBracketModal: React.FC<DownloadBracketModalProps> = ({
  isOpen,
  onClose,
  tournament,
  stageElement,
  onExportStart,
  onExportEnd,
  onNotify,
}) => {
  const [exportOptimize, setExportOptimize] = useState(true);
  const [exportLoadingType, setExportLoadingType] = useState<string | null>(null);
  const [exportProgressText, setExportProgressText] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);

  if (!isOpen || !tournament) return null;

  const getTargetElement = (): HTMLElement | null => {
    if (stageElement && stageElement.isConnected) return stageElement;
    const byId = document.getElementById('tournament-bracket-stage');
    if (byId) return byId;
    const el = document.querySelector<HTMLElement>('[data-export-container="true"]') ||
               document.querySelector<HTMLElement>('[data-exporting="true"]') ||
               document.querySelector<HTMLElement>('.min-h-\\[600px\\]');
    return el;
  };

  const handleDownloadPdf = async (optimized: boolean = true) => {
    const target = getTargetElement();
    if (!target) {
      onNotify?.("Не удалось найти элемент сетки для экспорта. Убедитесь, что сетка открыта.");
      return;
    }

    setExportLoadingType('pdf');
    setExportProgressText(optimized ? 'Оптимизация разметки и сжатие...' : 'Рендеринг сетки в Ultra-HD качестве...');
    onExportStart?.();
    setIsCapturing(true);

    try {
      await new Promise(r => setTimeout(r, 200));

      const { exportElementToDataUrl } = await import('../../lib/exportImage');
      const dataUrl = await exportElementToDataUrl(target, { 
        backgroundColor: '#050508',
        quality: optimized ? 0.88 : 0.98,
        pixelRatio: optimized ? 1.5 : 2.0,
        onProgress: (status) => setExportProgressText(status)
      });
      
      setIsCapturing(false);
      
      if (dataUrl) {
        setExportProgressText('Сборка PDF документа...');
        const { jsPDF } = await import('jspdf');
        const w = Math.max(800, Math.round(target.scrollWidth * 0.75));
        const h = Math.max(600, Math.round(target.scrollHeight * 0.75));
        const pdf = new jsPDF({
          orientation: w >= h ? 'l' : 'p',
          unit: 'px',
          format: [w, h],
          compress: true
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Use matching format: JPEG if dataUrl is JPEG, PNG if PNG
        const imgFormat = dataUrl.includes('image/jpeg') ? 'JPEG' : 'PNG';
        pdf.addImage(dataUrl, imgFormat, 0, 0, pdfWidth, pdfHeight, undefined, optimized ? 'FAST' : 'SLOW');
        
        const cleanName = (tournament.name || 'tournament').replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_');
        const pdfBlob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${cleanName}_bracket.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

        onNotify?.("PDF сетки успешно скачан!");
      }
      onClose();
    } catch (err: any) {
      console.error("PDF Export error:", err);
      onNotify?.("Ошибка при создании PDF: " + (err?.message || 'Попробуйте скачать как PNG'));
    } finally {
      setIsCapturing(false);
      onExportEnd?.();
      setExportLoadingType(null);
      setExportProgressText('');
    }
  };

  const handleDownloadPng = async (optimized: boolean = true) => {
    const target = getTargetElement();
    if (!target) {
      onNotify?.("Не удалось найти элемент сетки для экспорта. Убедитесь, что сетка открыта.");
      return;
    }

    setExportLoadingType('png');
    setExportProgressText('Подготовка изображения...');
    onExportStart?.();
    setIsCapturing(true);

    try {
      await new Promise(r => setTimeout(r, 200));

      const { downloadElementAsImage } = await import('../../lib/exportImage');
      const cleanName = (tournament.name || 'tournament').replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_');
      const filename = `${cleanName}_bracket.png`;
      
      await downloadElementAsImage(target, filename, {
        backgroundColor: '#050508',
        quality: optimized ? 0.9 : 1.0,
        pixelRatio: optimized ? 1.5 : 2.0,
        onProgress: (status) => setExportProgressText(status)
      });
      
      setIsCapturing(false);
      onNotify?.("Изображение сетки успешно скачано!");
      onClose();
    } catch (err: any) {
      console.error("PNG Export error:", err);
      onNotify?.("Ошибка при скачивании PNG: " + (err?.message || 'Ошибка рендеринга'));
    } finally {
      setIsCapturing(false);
      onExportEnd?.();
      setExportLoadingType(null);
      setExportProgressText('');
    }
  };

  const handleDownloadJson = () => {
    try {
      const dataStr = JSON.stringify(tournament, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanName = (tournament.name || 'tournament').replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_');
      link.download = `${cleanName}_data.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      onNotify?.("JSON данные турнира скачаны!");
      onClose();
    } catch (e: any) {
      console.error("JSON Export error:", e);
      onNotify?.("Ошибка при экспорте JSON: " + (e?.message || 'Ошибка'));
    }
  };

  const handleDownloadAll = async () => {
    setExportLoadingType('all');
    try {
      await handleDownloadPng(exportOptimize);
      await new Promise(r => setTimeout(r, 400));
      await handleDownloadPdf(exportOptimize);
      handleDownloadJson();
    } catch (e: any) {
      console.error("Download all error:", e);
    } finally {
      setExportLoadingType(null);
    }
  };

  return (
    <div className={`no-export fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 ${isCapturing ? 'opacity-0 pointer-events-none' : ''}`}>
      <div className="bg-[#12121a] border border-white/10 p-6 sm:p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/15 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/30">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Скачать сетку турнира</h3>
              <p className="text-white/40 text-xs truncate max-w-[280px]">Турнир: «{tournament.name}»</p>
            </div>
          </div>
          <button 
            onClick={() => !exportLoadingType && onClose()}
            disabled={!!exportLoadingType}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optimization Mode Switcher */}
        <div className="bg-black/40 border border-white/5 p-3.5 rounded-2xl mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-black text-white uppercase tracking-wider">
                Оптимизация размера
              </div>
              <div className="text-[10px] text-white/40">
                {exportOptimize 
                  ? 'Сжатие и лёгкий вес (для Telegram, Discord и мобильных)' 
                  : 'Ultra-HD качество (оригинал без сжатия)'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExportOptimize(!exportOptimize)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer border ${
              exportOptimize
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
            }`}
          >
            {exportOptimize ? '⚡ Вкл' : '🌟 Ultra'}
          </button>
        </div>

        {/* In-progress status banner */}
        {exportLoadingType && (
          <div className="mb-5 p-4 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
            <div className="text-xs font-bold text-blue-200">
              {exportProgressText || 'Создание и оптимизация файла...'}
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          {/* Option 1: PDF Document with optimization */}
          <button 
            disabled={!!exportLoadingType}
            onClick={() => handleDownloadPdf(exportOptimize)}
            className="w-full flex items-center justify-between p-4 bg-zinc-900/90 border border-white/10 hover:border-red-500/50 hover:bg-zinc-800/90 rounded-2xl transition-all group text-left cursor-pointer disabled:opacity-40"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-400 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white uppercase tracking-wider">PDF ДОКУМЕНТ</span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/30">
                    {exportOptimize ? 'Оптимизирован' : 'Ultra HD'}
                  </span>
                </div>
                <div className="text-[11px] text-white/40 truncate">
                  Векторный PDF для печати, просмотра и отправки
                </div>
              </div>
            </div>
            {exportLoadingType === 'pdf' ? (
              <Loader2 className="w-5 h-5 text-red-400 animate-spin shrink-0" />
            ) : (
              <Download className="w-4 h-4 text-white/20 group-hover:text-red-400 transition-colors shrink-0" />
            )}
          </button>

          {/* Option 2: High Resolution PNG Image */}
          <button 
            disabled={!!exportLoadingType}
            onClick={() => handleDownloadPng(exportOptimize)}
            className="w-full flex items-center justify-between p-4 bg-zinc-900/90 border border-white/10 hover:border-blue-500/50 hover:bg-zinc-800/90 rounded-2xl transition-all group text-left cursor-pointer disabled:opacity-40"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400 group-hover:scale-105 transition-transform">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white uppercase tracking-wider">PNG ИЗОБРАЖЕНИЕ</span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Чёткость 2X
                  </span>
                </div>
                <div className="text-[11px] text-white/40 truncate">
                  Картинка сетки для постов, стримов и аватарки
                </div>
              </div>
            </div>
            {exportLoadingType === 'png' ? (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
            ) : (
              <Download className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors shrink-0" />
            )}
          </button>

          {/* Option 3: JSON Data file */}
          <button 
            disabled={!!exportLoadingType}
            onClick={handleDownloadJson}
            className="w-full flex items-center justify-between p-4 bg-zinc-900/90 border border-white/10 hover:border-emerald-500/50 hover:bg-zinc-800/90 rounded-2xl transition-all group text-left cursor-pointer disabled:opacity-40"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white uppercase tracking-wider">JSON ДАННЫЕ</span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    База
                  </span>
                </div>
                <div className="text-[11px] text-white/40 truncate">
                  Полная структура матчей, счетов и команд
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-white/20 group-hover:text-emerald-400 transition-colors shrink-0" />
          </button>

          {/* Option 4: Download All (Bundle) */}
          <button 
            disabled={!!exportLoadingType}
            onClick={handleDownloadAll}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl transition-all group cursor-pointer shadow-lg shadow-blue-600/25 disabled:opacity-40"
          >
            <div className="flex items-center gap-4 text-white">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-black uppercase tracking-wider">СКАЧАТЬ ВСЁ (PDF + PNG + JSON)</div>
                <div className="text-[11px] text-white/70">
                  Полный пакет турнира в один клик
                </div>
              </div>
            </div>
            {exportLoadingType === 'all' ? (
              <Loader2 className="w-5 h-5 text-white animate-spin shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-white/60 group-hover:text-white transition-colors shrink-0" />
            )}
          </button>
        </div>

        <button 
          disabled={!!exportLoadingType}
          onClick={onClose}
          className="w-full mt-6 bg-white/5 hover:bg-white/10 text-white font-black py-3.5 rounded-2xl transition-all uppercase text-[10px] tracking-widest border border-white/5 cursor-pointer disabled:opacity-30"
        >
          ЗАКРЫТЬ
        </button>
      </div>
    </div>
  );
};
