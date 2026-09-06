import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

old_code = """      setNews(prev => {
        const updated = prev.filter(n => n.id !== id);
        localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
        return updated;
      });"""

new_code = """      setNews(prev => {
        const updated = prev.filter(n => n.id !== id);
        setTimeout(() => {
          try {
            localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
          } catch(e) {}
        }, 0);
        return updated;
      });"""

content = content.replace(old_code, new_code)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
