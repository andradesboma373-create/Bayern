import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# Replace alerts with an error state
content = content.replace(
    "const [selectedPlayerId, setSelectedPlayerId] = useState('');",
    "const [selectedPlayerId, setSelectedPlayerId] = useState('');\n  const [error, setError] = useState('');"
)

content = content.replace(
    "alert(\"Введите заголовок\");",
    "setError(\"Введите заголовок\");\n      setTimeout(() => setError(''), 3000);"
)

content = content.replace(
    "alert(\"Введите ссылку на изображение\");",
    "setError(\"Введите ссылку на изображение\");\n      setTimeout(() => setError(''), 3000);"
)

content = content.replace(
    "alert(\"Выберите команду\");",
    "setError(\"Выберите команду\");\n      setTimeout(() => setError(''), 3000);"
)

content = content.replace(
    "alert(\"Выберите игрока и команду\");",
    "setError(\"Выберите игрока и команду\");\n      setTimeout(() => setError(''), 3000);"
)

content = content.replace(
    "if (!window.confirm(\"Удалить эту новость?\")) return;",
    "// window.confirm is restricted in iframes"
)

content = content.replace(
    "alert('Ошибка сохранения картинки');",
    "// alert removed"
)

# Add error display in modal
error_ui = """            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-blue-400" />
                СОЗДАНИЕ НОВОСТИ
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {error && (
              <div className="bg-red-500/20 text-red-400 p-3 text-center font-bold text-sm border-b border-red-500/20">
                {error}
              </div>
            )}"""

content = content.replace(
    """            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-blue-400" />
                СОЗДАНИЕ НОВОСТИ
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>""",
    error_ui
)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
print("Removed alerts")
