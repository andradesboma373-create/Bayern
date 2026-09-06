import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# Add compressImage function
add_compress_old = "  const [showAddModal, setShowAddModal] = useState(false);"
add_compress_new = """  const [showAddModal, setShowAddModal] = useState(false);

  const compressImage = (base64Str: string, maxWidth = 1920, maxHeight = 1080): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
    });
  };"""

content = content.replace(add_compress_old, add_compress_new)

# Update upload 1 (Custom Image)
upload1_old = """                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => setNewImage(e.target?.result as string);
                            reader.readAsDataURL(file);
                          }"""

upload1_new = """                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async (e) => {
                              if (e.target?.result) {
                                const compressed = await compressImage(e.target.result as string, 1200, 800);
                                setNewImage(compressed);
                              }
                            };
                            reader.readAsDataURL(file);
                          }"""

content = content.replace(upload1_old, upload1_new)

# Update upload 2 (Custom Background)
upload2_old = """                             if (file) {
                               const reader = new FileReader();
                               reader.onload = (e) => setSelectedBg(e.target?.result as string);
                               reader.readAsDataURL(file);
                             }"""

upload2_new = """                             if (file) {
                               const reader = new FileReader();
                               reader.onload = async (e) => {
                                 if (e.target?.result) {
                                    const compressed = await compressImage(e.target.result as string, 1920, 1080);
                                    setSelectedBg(compressed);
                                 }
                               };
                               reader.readAsDataURL(file);
                             }"""

content = content.replace(upload2_old, upload2_new)

with open('src/components/News.tsx', 'w') as f:
    f.write(content)
