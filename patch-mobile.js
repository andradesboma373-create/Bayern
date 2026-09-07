import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add Menu and X to lucide-react imports if not there
if (!code.includes('Menu, X,')) {
    code = code.replace(/from 'lucide-react';/, ', Menu, X } from \'lucide-react\';');
    code = code.replace('{ Gamepad2', '{ Menu, X, Gamepad2');
}

// 2. Modify Sidebar signature
code = code.replace('function Sidebar() {', 'function Sidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {');

// 3. Modify Sidebar return
code = code.replace(
    '  return (\n    <div className="w-64 bg-[#12121a] border-r border-white/5 h-full flex flex-col">\n      <div className="p-6 flex items-center gap-3 border-b border-white/5">',
    '  return (\n    <>\n      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={onClose} />}\n      <div className={`fixed inset-y-0 left-0 w-64 bg-[#12121a] border-r border-white/5 h-full flex flex-col z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>\n        <div className="p-6 flex items-center justify-between gap-3 border-b border-white/5">\n          <div className="flex items-center gap-3">'
);

code = code.replace(
    '          </svg>\n        </div>\n        <div className="font-black tracking-widest text-lg text-white">MATCH<br/><span className="text-sm font-semibold tracking-[0.2em] text-white/50">SIMULATOR</span></div>\n      </div>',
    '          </svg>\n          </div>\n          <div className="font-black tracking-widest text-lg text-white">MATCH<br/><span className="text-sm font-semibold tracking-[0.2em] text-white/50">SIMULATOR</span></div>\n        </div>\n        <button onClick={onClose} className="lg:hidden text-white/50 hover:text-white p-1">\n          <X className="w-6 h-6" />\n        </button>\n      </div>'
);

code = code.replace(
    '            <Link key={idx} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? \'bg-blue-600/10 text-blue-500\' : \'text-white/60 hover:bg-white/5 hover:text-white\'}`}>',
    '            <Link key={idx} to={item.path} onClick={onClose} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? \'bg-blue-600/10 text-blue-500\' : \'text-white/60 hover:bg-white/5 hover:text-white\'}`}>'
);

// End of Sidebar tag
code = code.replace(
    '    </div>\n  );\n}',
    '    </div>\n    </>\n  );\n}'
);

// 4. Modify TopBar signature
code = code.replace(
    'function TopBar({ user, onCustomLogin, onLogout }: { user: any, onCustomLogin: () => void, onLogout: () => void }) {',
    'function TopBar({ user, onCustomLogin, onLogout, onToggleSidebar }: { user: any, onCustomLogin: () => void, onLogout: () => void, onToggleSidebar: () => void }) {'
);

// 5. Modify TopBar return
code = code.replace(
    '  return (\n    <div className="h-20 border-b border-white/5 px-8 flex items-center justify-between">\n      <div className="flex items-center gap-4">\n        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl text-sm font-semibold text-white">',
    '  return (\n    <div className="h-20 border-b border-white/5 px-4 lg:px-8 flex items-center justify-between">\n      <div className="flex items-center gap-3 lg:gap-4">\n        <button onClick={onToggleSidebar} className="lg:hidden p-2 -ml-2 text-white/70 hover:text-white rounded-xl hover:bg-white/5">\n          <Menu className="w-6 h-6" />\n        </button>\n        <div className="flex items-center gap-2 bg-white/5 px-3 py-2 lg:px-4 rounded-xl text-sm font-semibold text-white">'
);

// 6. Modify App state
code = code.replace(
    '  const [showPassword, setShowPassword] = useState(false);',
    '  const [showPassword, setShowPassword] = useState(false);\n  const [isSidebarOpen, setIsSidebarOpen] = useState(false);'
);

// 7. Modify App return
code = code.replace(
    '        <Sidebar />',
    '        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />'
);

code = code.replace(
    '          <TopBar user={user} onCustomLogin={() => setShowLoginModal(true)} onLogout={handleLogout} />',
    '          <TopBar user={user} onCustomLogin={() => setShowLoginModal(true)} onLogout={handleLogout} onToggleSidebar={() => setIsSidebarOpen(true)} />'
);

code = code.replace(
    '          <div className="flex-1 overflow-y-auto z-10 p-8">',
    '          <div className="flex-1 overflow-y-auto z-10 p-4 lg:p-8">'
);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx patched for mobile sidebar!');
