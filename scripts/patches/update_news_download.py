import re

with open('src/components/News.tsx', 'r') as f:
    content = f.read()

# Add download button and html-to-image import
import_statement = "import { Newspaper, Plus, X, Image as ImageIcon, Search, LayoutTemplate, Trash2, ArrowRight, Download } from 'lucide-react';\nimport * as htmlToImage from 'html-to-image';"
content = content.replace("import { Newspaper, Plus, X, Image as ImageIcon, Search, LayoutTemplate, Trash2, ArrowRight, Users } from 'lucide-react';", import_statement)
content = content.replace("import { Newspaper, Users, Plus, X, Image as ImageIcon, Search, LayoutTemplate, Trash2, ArrowRight } from 'lucide-react';", import_statement)


download_logic = """
  const handleDownload = async (id: string, title: string) => {
    const node = document.getElementById(`news-banner-${id}`);
    if (!node) return;
    try {
      const dataUrl = await htmlToImage.toPng(node, { 
        backgroundColor: '#12121a',
        style: { borderRadius: '0' } // remove border radius for screenshot
      });
      const link = document.createElement('a');
      link.download = `news_${title.replace(/\\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      alert('Ошибка сохранения картинки');
    }
  };
"""

content = content.replace("  const handleDelete = async (id: string) => {", download_logic + "\n  const handleDelete = async (id: string) => {")

# Add ids to banners
content = content.replace('className="w-full h-64 rounded-xl overflow-hidden relative"', 'id={`news-banner-${n.id}`} className="w-full h-64 rounded-xl overflow-hidden relative"')
content = content.replace('className="w-full h-auto min-h-64 rounded-xl overflow-hidden relative bg-gradient-to-br from-[#1a1a24] to-[#12121a] border border-white/10 p-6 flex flex-col"', 'id={`news-banner-${n.id}`} className="w-full h-auto min-h-64 rounded-xl overflow-hidden relative bg-gradient-to-br from-[#1a1a24] to-[#12121a] border border-white/10 p-6 flex flex-col"')
content = content.replace('className="w-full h-64 rounded-xl overflow-hidden relative bg-gradient-to-tr from-blue-900/40 via-[#12121a] to-[#1a1a24] border border-blue-500/20 p-6 flex flex-col justify-center items-center"', 'id={`news-banner-${n.id}`} className="w-full h-64 rounded-xl overflow-hidden relative bg-gradient-to-tr from-blue-900/40 via-[#12121a] to-[#1a1a24] border border-blue-500/20 p-6 flex flex-col justify-center items-center"')

# Add download button to the UI
download_btn = """               <button 
                 onClick={() => handleDownload(n.id, n.title)}
                 className="absolute top-4 right-14 w-8 h-8 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg items-center justify-center hidden group-hover:flex transition-all z-20"
                 title="Скачать скриншот"
               >
                 <Download className="w-4 h-4" />
               </button>"""

content = content.replace('<button \n                 onClick={() => handleDelete(n.id)}', download_btn + '\n               <button \n                 onClick={() => handleDelete(n.id)}')


with open('src/components/News.tsx', 'w') as f:
    f.write(content)
print("Updated News.tsx for download")
