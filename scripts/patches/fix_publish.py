import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# Fix the catch block in handleCreateNews
old_catch = """    } catch(e) {
      console.warn("Fallback to local save for news", e);
      const itemWithId = { ...newsItem, id: Date.now().toString() };
      const updated = [itemWithId, ...news];
      
      localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
      setShowAddModal(false);
      setNewTitle('');
      setNewImage('');
      setSelectedTeamId('');
      setSelectedPlayerId('');
    }"""

new_catch = """    } catch(e) {
      console.warn("Fallback to local save for news", e);
      const itemWithId = { ...newsItem, id: Date.now().toString() };
      setNews(prev => {
        const updated = [itemWithId, ...prev];
        localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
        return updated;
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewImage('');
      setSelectedTeamId('');
      setSelectedPlayerId('');
    }"""

content = content.replace(old_catch, new_catch)

# Also fix the success block just in case
content = content.replace("setNews([{ ...newsItem, id: docRef.id }, ...news]);", "setNews(prev => [{ ...newsItem, id: docRef.id }, ...prev]);")

with open('src/components/News.tsx', 'w') as f:
    f.write(content)

print("Fixed handleCreateNews state updates")
