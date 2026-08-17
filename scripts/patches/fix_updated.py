import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

bad_string = """      setNews(prev => {
        const updated = prev.filter(n => n.id !== id);
        localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
        return updated;
      });
      
      localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));"""

good_string = """      setNews(prev => {
        const updated = prev.filter(n => n.id !== id);
        localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
        return updated;
      });"""

content = content.replace(bad_string, good_string)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
print("Fixed updated error")
