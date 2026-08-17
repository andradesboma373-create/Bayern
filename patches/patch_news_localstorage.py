import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

old_code = """    } catch(e) {
      console.warn("Fallback to local save for news", e);
      const itemWithId = { ...newsItem, id: Date.now().toString() };
      setNews(prev => {
        const updated = [itemWithId, ...prev];
        localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
        return updated;
      });
      setShowAddModal(false);"""

new_code = """    } catch(e) {
      console.warn("Fallback to local save for news", e);
      const itemWithId = { ...newsItem, id: Date.now().toString() };
      setNews(prev => {
        const updated = [itemWithId, ...prev];
        try {
          localStorage.setItem(`news_${user.uid}`, JSON.stringify(updated));
        } catch (err) {
          console.error("Failed to save to localStorage", err);
          alert("Не удалось сохранить новость локально (возможно, слишком большая картинка фона).");
        }
        return updated;
      });
      setShowAddModal(false);"""

content = content.replace(old_code, new_code)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
