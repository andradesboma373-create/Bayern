import re

with open('src/components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

old_circle = """              {/* TOP RATING CARD (CENTERED CIRCLE) */}
              <div className="bg-[#161726] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center">
                {/* Rating Circular Display */}
                <div className="flex flex-col items-center justify-center relative py-2">
                  <div className="w-36 h-36 rounded-full border-4 border-[#ff8f00] bg-[#0c0d14] flex flex-col items-center justify-center shadow-[0_0_30px_rgba(255,143,0,0.25)] relative">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#ff8f00] mb-0.5">RATING 3.0</span>
                    <span className="text-4xl font-black text-white font-mono">{playerStats.rating3.toFixed(2)}</span>
                    <span className={`text-[10px] font-black tracking-widest mt-1 px-2 py-0.5 rounded border ${ratingLabel.bg} ${ratingLabel.color}`}>
                      {ratingLabel.text}
                    </span>
                  </div>
                </div>
              </div>"""

new_circle = """              {/* TOP K/D CARD & RATING */}
              <div className="bg-[#161726] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center">
                {/* K/D Circular Display */}
                <div className="flex flex-col items-center justify-center relative py-2">
                  <div className="w-36 h-36 rounded-full border-4 border-blue-500 bg-[#0c0d14] flex flex-col items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.25)] relative mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-0.5">K/D RATIO</span>
                    <span className="text-4xl font-black text-white font-mono">{playerStats.kd}</span>
                  </div>
                  
                  {/* Rating below the circle */}
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#ff8f00] mb-0.5">RATING 3.0</span>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-white font-mono">{playerStats.rating3.toFixed(2)}</span>
                        <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded border ${ratingLabel.bg} ${ratingLabel.color}`}>
                          {ratingLabel.text}
                        </span>
                    </div>
                  </div>
                </div>
              </div>"""

content = content.replace(old_circle, new_circle)

with open('src/components/PlayerProfileModal.tsx', 'w') as f:
    f.write(content)
