import re

with open('src/components/MatchDetails.tsx', 'r') as f:
    content = f.read()

old_mvp = """                <span className="text-yellow-500 font-black">{match.mvp.hltvRating || match.mvp.rating || ''}</span>"""

new_mvp = """                <span className="text-yellow-500 font-black">{match.mvp.hltvRating || (match.mvp.rating && Number(match.mvp.rating) < 10 ? match.mvp.rating : '')}</span>"""

content = content.replace(old_mvp, new_mvp)

with open('src/components/MatchDetails.tsx', 'w') as f:
    f.write(content)
