import re

with open('src/components/Simulator.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to remove the auto simulation.
# Look for "// 3. Immediately run the simulation with these exact variables"
auto_sim_start = content.find("// 3. Immediately run the simulation with these exact variables")
if auto_sim_start != -1:
    auto_sim_end = content.find("runPassedSimulation();", auto_sim_start)
    if auto_sim_end != -1:
        # We delete from auto_sim_start to auto_sim_end + len("runPassedSimulation();")
        content = content[:auto_sim_start] + content[auto_sim_end + len("runPassedSimulation();"):]

with open('src/components/Simulator.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
