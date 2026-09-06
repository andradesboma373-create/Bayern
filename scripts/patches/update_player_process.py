import re

with open('src/components/PlayerProfileModal.tsx', 'r') as f:
    content = f.read()

# We need to change processStats signature to processStats(st, mapObj, isTeam1, isLegacy, skipPush)
old_process_sig = r"const processStats = \(st: any, mapObj: any, isTeam1: boolean, isLegacy: boolean\) => \{"

# Let's replace the whole processMatchObj block, since it's around 80 lines and tricky to sed.

