import re

with open('src/components/setka_tourn/Top20Modal.tsx', 'r') as f:
    content = f.read()

replacement = """
                <p className="text-white/40 text-xs uppercase tracking-[0.3em] mt-2 font-bold">ТОП-20 ИГРОКОВ ТУРНИРА • ПОДРОБНАЯ СТАТИСТИКА</p>
                <p className="text-blue-400/80 text-[10px] uppercase tracking-wider mt-2 font-bold">В Топ-20 попадают только игроки из матчей, сыгранных через симулятор (кнопка "Играть Матч"). Быстрый ввод счета не генерирует статистику.</p>
"""

content = content.replace('<p className="text-white/40 text-xs uppercase tracking-[0.3em] mt-2 font-bold">ТОП-20 ИГРОКОВ ТУРНИРА • ПОДРОБНАЯ СТАТИСТИКА</p>', replacement)

with open('src/components/setka_tourn/Top20Modal.tsx', 'w') as f:
    f.write(content)
