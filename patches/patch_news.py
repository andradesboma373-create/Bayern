import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'alert("Критическая нехватка памяти (LocalStorage). Удалите слишком большие логотипы команд или старые новости.");',
    'alert("Не удалось сохранить новость локально (возможно, слишком большая картинка фона). Критическая нехватка памяти (LocalStorage). Удалите слишком большие логотипы команд или старые новости.");'
)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
