import re

with open('src/components/Teams.tsx', 'r') as f:
    content = f.read()

match = re.search(r"import \{.*?\} from 'lucide-react';", content)
if match:
    imports_str = match.group(0)
    new_imports = imports_str.replace("}", ", ChevronLeft, ChevronRight, User }")
    content = content.replace(imports_str, new_imports)
    
with open('src/components/Teams.tsx', 'w') as f:
    f.write(content)
