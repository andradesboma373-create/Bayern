import re

paths = [
  'src/components/Teams.tsx',
  'src/components/Players.tsx',
  'src/components/News.tsx',
  'src/components/setka_tourn/TournamentSettingsForm.tsx',
  'src/components/setka_tourn/TournamentManager.tsx'
]

for p in paths:
    with open(p, 'r') as f: content = f.read()
    
    # 1. Make onChange async
    content = re.sub(r'onChange=\{\(e\) => \{', 'onChange={async (e) => {', content)
    content = re.sub(r'onChange=\{\(ev\) => \{', 'onChange={async (ev) => {', content)
    
    # 2. Fix the junk in Teams.tsx
    content = content.replace('''const url = data.url;
                          const url = url;
                        if (!url) return;
                        try {
                          const url = await compressImage(url, 128, 128);
                          setNewTeamLogo(url);
                        } catch (err) {
                          console.error(err);
                        }
                        }
                      } catch(e) { console.error("Upload error", e); }''',
                      'setNewTeamLogo(data.url); } } catch(e) { console.error(e); }')
                      
    # 3. Fix the junk in Players.tsx
    content = content.replace('''const url = data.url;
                          const url = url;
                      if (!url) return;
                      setNewPlayer({...newPlayer, avatarUrl: url});
                        }
                      } catch(e) { console.error("Upload error", e); }''',
                      'setNewPlayer({...newPlayer, avatarUrl: data.url}); } } catch(e) { console.error(e); }')

    # 4. Fix the junk in News.tsx
    content = content.replace('''const url = data.url;
                          const url = await compressImage(url, 1200, 800);
                                setNewImage(url);
                        }
                      } catch(e) { console.error("Upload error", e); }''',
                      'setNewImage(data.url); } } catch(e) { console.error(e); }')

    with open(p, 'w') as f: f.write(content)

