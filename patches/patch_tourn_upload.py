import re

with open('src/components/setka_tourn/TournamentSettingsForm.tsx', 'r') as f:
    content = f.read()

upload_old = """                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) setLogoUrl(ev.target.result as string);
                      };
                      reader.readAsDataURL(file);
                    }"""

upload_new = """                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const maxSize = 256;
                            if (width > height && width > maxSize) {
                                height *= maxSize / width;
                                width = maxSize;
                            } else if (height > maxSize) {
                                width *= maxSize / height;
                                height = maxSize;
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(img, 0, 0, width, height);
                                const compressed = canvas.toDataURL('image/jpeg', 0.8);
                                setLogoUrl(compressed);
                            }
                          };
                          img.src = ev.target.result as string;
                        }
                      };
                      reader.readAsDataURL(file);
                    }"""

content = content.replace(upload_old, upload_new)

with open('src/components/setka_tourn/TournamentSettingsForm.tsx', 'w') as f:
    f.write(content)
