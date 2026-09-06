import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

old_bgs = """                    {[
                      "bg-gradient-to-br from-[#1a1a24] to-[#12121a]",
                      "bg-gradient-to-tr from-blue-900/40 via-[#12121a] to-[#1a1a24]",
                      "bg-gradient-to-r from-purple-900/50 via-black to-blue-900/50",
                      "bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-[#0a0a0f]",
                      "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-indigo-950",
                      "bg-gradient-to-br from-green-900/40 to-[#12121a]",
                      "bg-gradient-to-bl from-orange-900/40 to-black"
                    ].map((bg, i) => ("""

new_bgs = """                    {[
                      "bg-gradient-to-br from-[#1a1a24] to-[#12121a]",
                      "bg-gradient-to-tr from-blue-900/40 via-[#12121a] to-[#1a1a24]",
                      "bg-[url('https://i.ibb.co/LdvD7pXY/2025-02-27-01-26-28.jpg')]",
                      "bg-gradient-to-r from-purple-900/50 via-black to-blue-900/50",
                      "bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-[#0a0a0f]",
                      "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-indigo-950",
                      "bg-gradient-to-br from-green-900/40 to-[#12121a]",
                      "bg-gradient-to-bl from-orange-900/40 to-black"
                    ].map((bg, i) => ("""

content = content.replace(old_bgs, new_bgs)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
