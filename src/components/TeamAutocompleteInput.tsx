import React, { useState, useEffect, useRef } from 'react';
import teamsListData from '../teamsList.json';

interface TeamAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function TeamAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder = "Название команды",
  className = "",
  required = false
}: TeamAutocompleteInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter and sort logic
  useEffect(() => {
    if (!value) {
      setSuggestions([]);
      return;
    }
    
    const lowerVal = value.toLowerCase();
    
    // Sort logic: 
    // - Alphabetical order (standard localeCompare)
    // - Filter by prefix match (startsWith)
    // - Wait, the prompt says: "Если введено: V ... Нужно искать команды в алфавитном порядке и учитывать введённые символы."
    // - "Не использовать только точное совпадение. Если ввел часть названия, система находит подходящие команды. F -> Falcons, FURIA. Fu -> FURIA". 
    // - So we can filter by teams that start with or contain the query, prioritizing startsWith.
    
    const allTeams = teamsListData as string[];
    const startsWith: string[] = [];
    const contains: string[] = [];
    
    for (const t of allTeams) {
      const lowerT = t.toLowerCase();
      if (lowerT.startsWith(lowerVal)) {
        startsWith.push(t);
      } else if (lowerT.includes(lowerVal)) {
        contains.push(t);
      }
    }
    
    startsWith.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    contains.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    
    // exact match check to auto-select (if they type "Vitality" and it matches "Vitality")
    // Wait, the prompt says "Если существует точное совпадение: ... то автоматически выбирается ... и отображается логотип Vitality."
    // We shouldn't auto-close the dropdown if they might want to type more, but if it matches exactly, maybe it's fine.
    
    const combined = [...startsWith, ...contains];
    setSuggestions(combined.slice(0, 10)); // limit to 10
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        required={required}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        className={`w-full ${className}`}
        placeholder={placeholder}
      />
      
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl max-h-48 overflow-y-auto">
          {suggestions.map((teamName) => (
            <div
              key={teamName}
              className="px-4 py-2 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors text-white text-sm font-bold"
              onClick={() => {
                onChange(teamName);
                if (onSelect) onSelect(teamName);
                setShowDropdown(false);
              }}
            >
              <img 
                src={`/optimized/${teamName}.webp`} 
                alt={teamName} 
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `/images/${teamName}.png`; // fallback if needed
                }}
              />
              {teamName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
