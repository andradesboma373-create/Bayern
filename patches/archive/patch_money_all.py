import re

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove state variables
    content = re.sub(r'const \[defaultStartingMoney.*?\] = useState\(.*?\);\n?', '', content)
    content = re.sub(r'const \[customStartingMoney.*?\] = useState\(.*?\);\n?', '', content)
    content = re.sub(r'const \[startingMoney.*?\] = useState\(.*?\);\n?', '', content)
    
    # Remove usages
    content = re.sub(r'setDefaultStartingMoney\(.*?\);\n?', '', content)
    content = re.sub(r'setCustomStartingMoney\(.*?\);\n?', '', content)
    content = re.sub(r'setStartingMoney\(.*?\);\n?', '', content)
    
    content = re.sub(r'startingMoney:.*?,', '', content)
    content = re.sub(r'money:.*?,', '', content)
    
    # Remove HTML for money in TgUsers
    # "Бюджет" or "$" or "Выдать стартовый бюджет"
    
    content = re.sub(r'<div[^>]*>\s*<label[^>]*>Сумма \(💰 \$\)[\s\S]*?<\/div>\s*<\/div>\s*<\/p>\s*<\/div>', '', content)
    content = re.sub(r'<div[^>]*>\s*<label[^>]*>Сумма \(💰 \$\)[\s\S]*?<\/p>\s*<\/div>', '', content)

    # In TgUsers, there's a column for money
    content = re.sub(r'<div[^>]*>💰 Бюджет<\/div>', '', content)
    content = re.sub(r'<div[^>]*>\s*\$\{\(u\.money \|\| 0\)\.toLocaleString\(\)\}\s*<\/div>', '', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

clean_file('src/components/Settings.tsx')
clean_file('src/components/TgUsers.tsx')
