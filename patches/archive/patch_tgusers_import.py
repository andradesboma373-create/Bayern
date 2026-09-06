import re

with open('src/components/TgUsers.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';", "import { collection, query, where, getDocs, updateDoc, doc, db } from '../firebase';")
content = content.replace("import { db } from '../firebase';", "")

with open('src/components/TgUsers.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
