import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

create_logic = """
    try {
      const isLocal = user.isLocalDemo || !db || db === 'localdb';
      if (isLocal) {
        throw new Error("Local demo mode");
      }
      const docRef = await addDoc(collection(db, 'news'), newsItem);
      setNews([{ ...newsItem, id: docRef.id }, ...news]);
      setShowAddModal(false);
      setNewTitle('');
      setNewImage('');
      setSelectedTeamId('');
      setSelectedPlayerId('');
    } catch(e) {
      console.warn("Fallback to local save for news", e);
      const itemWithId = { ...newsItem, id: Date.now().toString() };
      const updated = [itemWithId, ...news];
      setNews(updated);
      localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
      setShowAddModal(false);
      setNewTitle('');
      setNewImage('');
      setSelectedTeamId('');
      setSelectedPlayerId('');
    }
"""

content = re.sub(
    r'    try \{\n      const isLocal = user\.isLocalDemo \|\| !db \|\| db === \'localdb\';\n      if \(isLocal\) \{\n        const itemWithId = \{ \.\.\.newsItem, id: Date\.now\(\)\.toString\(\) \};\n        const updated = \[itemWithId, \.\.\.news\];\n        setNews\(updated\);\n        localStorage\.setItem\(`news_\$\{user\.uid\}`\, JSON\.stringify\(updated\)\);\n      \} else \{\n        const docRef = await addDoc\(collection\(db, \'news\'\), newsItem\);\n        setNews\(\[\{ \.\.\.newsItem, id: docRef\.id \}, \.\.\.news\]\);\n      \}\n      setShowAddModal\(false\);\n      setNewTitle\(\'\'\);\n      setNewImage\(\'\'\);\n      setSelectedTeamId\(\'\'\);\n      setSelectedPlayerId\(\'\'\);\n    \} catch\(e\) \{\n      console\.error\(e\);\n      alert\("Ошибка при сохранении новости"\);\n    \}',
    create_logic,
    content
)

delete_logic = """
  const handleDelete = async (id: string) => {
    if (!window.confirm("Удалить эту новость?")) return;
    try {
      const isLocal = user.isLocalDemo || !db || db === 'localdb';
      if (isLocal) {
        throw new Error("Local demo mode");
      }
      await deleteDoc(doc(db, 'news', id));
      setNews(news.filter(n => n.id !== id));
    } catch(e) {
      console.warn("Fallback to local delete for news", e);
      const updated = news.filter(n => n.id !== id);
      setNews(updated);
      localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
    }
  };
"""

content = re.sub(
    r'  const handleDelete = async \(id: string\) => \{\n    if \(!window\.confirm\("Удалить эту новость\?"\)\) return;\n    try \{\n      const isLocal = user\.isLocalDemo \|\| !db \|\| db === \'localdb\';\n      if \(isLocal\) \{\n        const updated = news\.filter\(n => n\.id !== id\);\n        setNews\(updated\);\n        localStorage\.setItem\(`news_\$\{user\.uid\}`\, JSON\.stringify\(updated\)\);\n      \} else \{\n        await deleteDoc\(doc\(db, \'news\', id\)\);\n        setNews\(news\.filter\(n => n\.id !== id\)\);\n      \}\n    \} catch\(e\) \{\n      console\.error\(e\);\n    \}\n  \};',
    delete_logic,
    content
)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)

print("Fixed create and delete")
