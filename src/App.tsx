import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Languages, 
  ArrowRightLeft, 
  Copy, 
  Check, 
  Loader2, 
  Volume2, 
  Info, 
  Settings2,
  Trash2,
  History,
  Sparkles
} from 'lucide-react';

const LANGUAGES = [
  { code: 'id', name: 'Indonesian' },
  { code: 'jv', name: 'Bahasa Jawa' },
  { code: 'su', name: 'Bahasa Sunda' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh-Hans', name: 'China (aks. sederhana)' },
  { code: 'zh-Hant', name: 'China (aks. tradisional)' },
  { code: 'nan', name: 'Bahasa Taiyu' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'ar', name: 'Arabic' },
];

const TONES = [
  { id: 'natural', name: 'Natural' },
  { id: 'formal', name: 'Formal' },
  { id: 'casual', name: 'Casual' },
  { id: 'poetic', name: 'Puitis' },
  { id: 'professional', name: 'Profesional' },
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [tone, setTone] = useState('natural');
  const [translation, setTranslation] = useState('');
  const [extras, setExtras] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<{ id: string; text: string; result: string; lang: string; isFavorite: boolean }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');

  // Load history and favorites
  useEffect(() => {
    const saved = localStorage.getItem('lingua_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }
  }, []);

  const saveToStorage = (newHistory: typeof history) => {
    setHistory(newHistory);
    localStorage.setItem('lingua_history', JSON.stringify(newHistory));
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          targetLanguage: LANGUAGES.find(l => l.code === targetLang)?.name || 'English',
          tone,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setTranslation(data.translation);
      setExtras(data.extras || '');

      // Add to history
      const newEntry = {
        id: Date.now().toString(),
        text: inputText,
        result: data.translation,
        lang: targetLang,
        isFavorite: false
      };
      const newHistory = [newEntry, ...history].slice(0, 50); // Keep more history
      saveToStorage(newHistory);

    } catch (error) {
      console.error('Translation failed', error);
      alert(error instanceof Error ? error.message : 'Gagal menerjemahkan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (id: string) => {
    const newHistory = history.map(item => 
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    saveToStorage(newHistory);
  };

  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    saveToStorage(newHistory);
  };

  const clearHistory = () => {
    if (confirm('Hapus semua riwayat?')) {
      const newHistory = history.filter(item => item.isFavorite);
      saveToStorage(newHistory);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const swapText = () => {
    if (translation) {
      setInputText(translation);
      setTranslation('');
      setExtras('');
    }
  };

  const currentItem = history.find(h => h.text === inputText && h.result === translation);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold">Riwayat & Favorit</h2>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Trash2 size={20} className="rotate-45" />
                </button>
              </div>

              <div className="flex p-2 gap-2 bg-gray-50 border-b border-gray-100">
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                  }`}
                >
                  Riwayat
                </button>
                <button 
                  onClick={() => setActiveTab('favorites')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'favorites' ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-500'
                  }`}
                >
                  Favorit
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(activeTab === 'history' ? history : history.filter(h => h.isFavorite)).length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <History size={32} />
                    <p className="text-sm">Belum ada data</p>
                  </div>
                ) : (
                  (activeTab === 'history' ? history : history.filter(h => h.isFavorite)).map(item => (
                    <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group relative">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{item.lang}</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => toggleFavorite(item.id)}
                            className={`p-1.5 rounded-lg transition-colors ${item.isFavorite ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100'}`}
                          >
                            <Sparkles size={14} fill={item.isFavorite ? 'currentColor' : 'none'} />
                          </button>
                          <button 
                            onClick={() => deleteHistoryItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-medium mb-1 line-clamp-2">{item.text}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 italic">{item.result}</p>
                      <button 
                        onClick={() => {
                          setInputText(item.text);
                          setTargetLang(item.lang);
                          setTranslation(item.result);
                          setShowHistory(false);
                        }}
                        className="absolute inset-0 z-0"
                      />
                    </div>
                  ))
                )}
              </div>

              {activeTab === 'history' && history.length > 0 && (
                <div className="p-4 border-t border-gray-100">
                  <button 
                    onClick={clearHistory}
                    className="w-full py-2 text-sm text-red-500 font-medium hover:bg-red-50 rounded-xl transition-colors"
                  >
                    Bersihkan Semua Riwayat
                  </button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <Languages size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Lezhai<span className="text-blue-600">Flow</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setShowHistory(true); setActiveTab('favorites'); }}
              className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-xl transition-colors"
              title="Favorit"
            >
              <Sparkles size={20} />
            </button>
            <button 
              onClick={() => { setShowHistory(true); setActiveTab('history'); }}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              title="Riwayat"
            >
              <History size={20} />
            </button>
          </div>
        </div>
      </header>


      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Input Panel */}
          <section id="input-panel" className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Sparkles size={16} className="text-blue-500" />
                Deteksi Otomatis
              </div>
              <div className="flex gap-2">
                {TONES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                      tone === t.id 
                        ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-600/20' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ketik atau tempel teks di sini..."
                className="w-full h-64 md:h-80 p-6 resize-none outline-none text-lg leading-relaxed placeholder:text-gray-400"
                rows={5}
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">{inputText.length} karakter</span>
                <button 
                  onClick={() => setInputText('')}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Hapus"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <button
              onClick={handleTranslate}
              disabled={loading || !inputText.trim()}
              className="lg:hidden w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              Terjemahkan
            </button>
          </section>

          {/* Controls & Output Panel */}
          <section id="output-panel" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[1px] bg-gray-200 lg:hidden"></div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={swapText}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ArrowRightLeft size={20} />
                </button>
                <div className="relative">
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <Languages size={14} />
                  </div>
                </div>
              </div>
              <div className="flex-1 h-[1px] bg-gray-200"></div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={loading ? 'loading' : translation ? 'result' : 'empty'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-64 md:h-80 flex flex-col"
              >
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
                    <Loader2 size={40} className="animate-spin text-blue-500" />
                    <p className="text-sm font-medium animate-pulse">Sedang memproses terjemahan...</p>
                  </div>
                ) : translation ? (
                  <>
                    <div className="flex-1 p-6 overflow-y-auto">
                      <p className="text-lg leading-relaxed text-gray-900">{translation}</p>
                      {extras && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                            <Info size={14} />
                            Penjelasan & Alternatif
                          </div>
                          <p className="text-sm text-gray-600 italic whitespace-pre-wrap">{extras}</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors">
                          <Volume2 size={18} />
                        </button>
                        {translation && (
                          <button 
                            onClick={() => {
                              if (currentItem) {
                                toggleFavorite(currentItem.id);
                              }
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              currentItem?.isFavorite 
                                ? 'text-yellow-500 bg-yellow-50' 
                                : 'text-gray-400 hover:text-yellow-500 hover:bg-white'
                            }`}
                            title={currentItem?.isFavorite ? "Hapus dari Favorit" : "Simpan ke Favorit"}
                          >
                            <Sparkles size={18} fill={currentItem?.isFavorite ? 'currentColor' : 'none'} />
                          </button>
                        )}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(translation)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          copied ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95'
                        }`}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400">
                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                      <Sparkles size={32} className="text-gray-300" />
                    </div>
                    <p className="text-sm">Hasil terjemahan akan muncul di sini</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <button
              onClick={handleTranslate}
              disabled={loading || !inputText.trim()}
              className="hidden lg:flex w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              Terjemahkan
            </button>
          </section>
        </div>

        {/* Features/Trust Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 h-fit">
              <Sparkles className="text-yellow-500" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Konteks Budaya</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Terjemahan yang disesuaikan dengan idiom dan kebiasaan lokal penutur asli.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 h-fit">
              <Settings2 className="text-blue-500" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Kontrol Nada</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Pilih antara nada bicara formal, santai, hingga puitis sesuai kebutuhan Anda.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 h-fit">
              <Check className="text-green-500" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Akurasi Tinggi</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Didukung oleh model bahasa tercanggih untuk hasil yang natural dan profesional.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          &copy; 2026 LezhaiFlow AI. Ditenagai oleh Gemini 3.
        </div>
      </footer>
    </div>
  );
}
