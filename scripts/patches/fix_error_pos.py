import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# Remove old error
old_error = """            {error && (
              <div className="bg-red-500/20 text-red-400 p-3 text-center font-bold text-sm border-b border-red-500/20">
                {error}
              </div>
            )}"""
content = content.replace(old_error, "")

# Add error above the actions
actions_div = """            <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3">"""
new_actions = """            {error && (
              <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-sm font-bold animate-fade-in flex items-center justify-center">
                {error}
              </div>
            )}
            <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3">"""

content = content.replace(actions_div, new_actions)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
print("Moved error")
