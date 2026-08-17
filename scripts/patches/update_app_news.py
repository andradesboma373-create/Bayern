import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add import
import_statement = "import News from './components/News';\nimport SettingsComponent"
content = content.replace("import SettingsComponent", import_statement)

# Add nav item
nav_items = """    { icon: Users, label: 'Команды', path: '/teams' },
    { icon: User, label: 'Игроки', path: '/players' },
    { icon: Newspaper, label: 'Новости', path: '/news' },"""
content = content.replace("""    { icon: Users, label: 'Команды', path: '/teams' },
    { icon: User, label: 'Игроки', path: '/players' },""", nav_items)

# Add lucide import
import_lucide = "import { Gamepad2, Users, Trophy, BarChart2, Calendar, User, Newspaper, Database, Settings, Layout, LogOut, ChevronDown, Check, Zap } from 'lucide-react';"
content = re.sub(r"import \{([^}]+)\} from 'lucide-react';", import_lucide, content)

# Add route
routes = """              <Route path="/players" element={<Players user={user} />} />
              <Route path="/news" element={<News user={user} />} />"""
content = content.replace("""              <Route path="/players" element={<Players user={user} />} />""", routes)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Updated App.tsx")
