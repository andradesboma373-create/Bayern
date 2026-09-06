import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

content = content.replace("setNews(news.filter(n => n.id !== id));", "setNews(prev => prev.filter(n => n.id !== id));")
content = content.replace("const updated = news.filter(n => n.id !== id);", "setNews(prev => {\n        const updated = prev.filter(n => n.id !== id);\n        localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));\n        return updated;\n      });")
content = content.replace("setNews(updated);", "")

with open('src/components/News.tsx', 'w') as f:
    f.write(content)

print("Fixed setNews")
