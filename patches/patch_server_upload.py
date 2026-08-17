import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf8') as f:
        content = f.read()

    upload_endpoint = """
// --- FILE UPLOAD ENDPOINT ---
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    
    const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.webp';
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    const distDir = path.join(process.cwd(), 'dist', 'uploads');
    const hasDist = fs.existsSync(path.join(process.cwd(), 'dist'));
    if (hasDist && !fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    
    const buf = await sharp(req.file.buffer)
      .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
      
    fs.writeFileSync(path.join(uploadDir, filename), buf);
    if (hasDist) fs.writeFileSync(path.join(distDir, filename), buf);
    
    res.json({ url: `/uploads/${filename}` });
  } catch (err: any) {
    console.error("Upload error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// --- END FILE UPLOAD ENDPOINT ---
"""
    if "app.post(\"/api/upload\"" not in content:
        content = content.replace('// --- LOCAL DB API FOR FRONTEND ---', upload_endpoint + '\n// --- LOCAL DB API FOR FRONTEND ---')
        with open(filepath, 'w', encoding='utf8') as f:
            f.write(content)
        print("Upload endpoint added.")
    else:
        print("Upload endpoint already exists.")

patch_file('server.ts')
