import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix the fallback for simulator demo mode
old_sim = """        const localMatches = JSON.parse(localStorage.getItem(`matches_${user.uid}`) || '[]');"""
new_sim = """        const localMatches = JSON.parse(localStorage.getItem(`matches_${user.uid}`) || '[]');"""

# Wait, let's just make the user.isLocalDemo not throw an error in Simulator.tsx?
# In Simulator.tsx:
# if (user.isLocalDemo) {
#   throw new Error("Local demo mode");
# }
