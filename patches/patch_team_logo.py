import re

with open('src/components/TeamLogo.tsx', 'r') as f:
    content = f.read()

old_code = """        // Кэшируем успешный результат для ускорения будущих загрузок
        if (url.startsWith('data:') && !localStorage.getItem(directKey)) {
          localStorage.setItem(directKey, url);
        }"""

new_code = """        // Кэшируем успешный результат для ускорения будущих загрузок
        if (url.startsWith('data:') && !localStorage.getItem(directKey)) {
          try {
            localStorage.setItem(directKey, url);
          } catch (e) {}
        }"""

content = content.replace(old_code, new_code)

with open('src/components/TeamLogo.tsx', 'w') as f:
    f.write(content)
