import re

with open('src/components/Teams.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Trophy, ShieldAlert, Plus, Trash2, Edit2, Search, Settings } from 'lucide-react';", "import { Trophy, ShieldAlert, Plus, Trash2, Edit2, Search, Settings, ChevronLeft, ChevronRight, User } from 'lucide-react';")

with open('src/components/Teams.tsx', 'w') as f:
    f.write(content)
