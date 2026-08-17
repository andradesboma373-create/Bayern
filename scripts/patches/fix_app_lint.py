import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add RefreshCw and Sparkles
import_lucide = "import { Gamepad2, Users, Trophy, BarChart2, Calendar, User, Newspaper, Database, Settings, Layout, LogOut, ChevronDown, Check, Zap, RefreshCw, Sparkles } from 'lucide-react';"
content = re.sub(r"import \{([^}]+)\} from 'lucide-react';", import_lucide, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Fixed App.tsx imports")
