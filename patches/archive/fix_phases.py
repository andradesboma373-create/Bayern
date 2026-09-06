import re

with open('src/components/VetoModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

phases_old = """  const phases = React.useMemo(() => {
    if (format === 'BO1') return ['T1_BAN', 'T2_BAN', 'T1_BAN', 'T2_BAN', 'T1_BAN', 'T2_BAN', 'DECIDER'];
    if (format === 'BO3') return ['T1_BAN', 'T2_BAN', 'T1_PICK', 'T2_PICK', 'T1_BAN', 'T2_BAN', 'DECIDER'];
    return ['T1_BAN', 'T2_BAN', 'T1_PICK', 'T2_PICK', 'T1_PICK', 'T2_PICK', 'DECIDER'];
  }, [format]);"""

phases_new = """  const phases = React.useMemo(() => {
    const totalMaps = game === 'cs2' ? 7 : 6;
    if (totalMaps === 7) {
      if (format === 'BO1') return ['T1_BAN', 'T2_BAN', 'T1_BAN', 'T2_BAN', 'T1_BAN', 'T2_BAN', 'DECIDER'];
      if (format === 'BO3') return ['T1_BAN', 'T2_BAN', 'T1_PICK', 'T2_PICK', 'T1_BAN', 'T2_BAN', 'DECIDER'];
      return ['T1_BAN', 'T2_BAN', 'T1_PICK', 'T2_PICK', 'T1_PICK', 'T2_PICK', 'DECIDER'];
    } else {
      if (format === 'BO1') return ['T1_BAN', 'T2_BAN', 'T1_BAN', 'T2_BAN', 'T1_BAN', 'DECIDER'];
      if (format === 'BO3') return ['T1_BAN', 'T2_BAN', 'T1_PICK', 'T2_PICK', 'T1_BAN', 'DECIDER'];
      return ['T1_BAN', 'T1_PICK', 'T2_PICK', 'T1_PICK', 'T2_PICK', 'DECIDER'];
    }
  }, [format, game]);"""

content = content.replace(phases_old, phases_new)

# Also fix the early return condition:
# We should allow DECIDER to be processed when availableMaps.length === 1
# Actually, if availableMaps.length === 0, it means we exhausted maps.
# Let's change the return condition:
effect_old = """  useEffect(() => {
    if (!isOpen || isFinished || availableMaps.length === 0) return;

    if (phaseIndex >= phases.length) {
      setIsFinished(true);
      return;
    }"""

effect_new = """  useEffect(() => {
    if (!isOpen || isFinished) return;

    if (phaseIndex >= phases.length || availableMaps.length === 0) {
      setIsFinished(true);
      return;
    }"""

content = content.replace(effect_old, effect_new)

with open('src/components/VetoModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
