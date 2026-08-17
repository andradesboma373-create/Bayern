import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

old_code = """      setNews(prev => {
        const updated = [itemWithId, ...prev];
        try {
          localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
        } catch (err) {
          console.error("Failed to save to localStorage", err);
          alert("Не удалось сохранить новость локально (возможно, слишком большая картинка фона).");
        }
        return updated;
      });"""

new_code = """      setNews(prev => {
        let updated = [itemWithId, ...prev];
        try {
          localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
        } catch (err) {
          console.error("Failed to save to localStorage", err);
          // Если места нет, попробуем оставить только 10 последних новостей
          try {
            updated = updated.slice(0, 10);
            localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
            alert("Лимит памяти исчерпан! Старые новости были удалены, чтобы сохранить новую. Чтобы избежать этого, уменьшите размер картинок команд.");
          } catch (err2) {
            alert("Критическая нехватка памяти (LocalStorage). Удалите слишком большие логотипы команд или старые новости.");
          }
        }
        return updated;
      });"""

content = content.replace(old_code, new_code)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
