
import React, { useState, useCallback } from 'react';
import Logo from './components/Logo';
import { searchGamingNews } from './services/geminiService';
import { AppState, SearchResult } from './types';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setState(AppState.LOADING);
    setQuery(q);
    setErrorMsg('');

    try {
      const data = await searchGamingNews(q);
      setResult(data);
      setState(AppState.RESULT);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('获取资讯失败，请重试');
      setState(AppState.ERROR);
    }
  }, [query]);

  const reset = () => {
    setState(AppState.IDLE);
    setResult(null);
    setQuery('');
  };

  const hotSearches = ['PS5 Pro', '怪猎荒野', '游戏通行证'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration elements */}
      <div className="absolute top-8 right-8 text-gray-200">
        <i className="fa-solid fa-xmark text-6xl"></i>
      </div>
      <div className="absolute bottom-[-5%] left-[-10%] w-64 h-64 bg-gray-100 opacity-50 transform -rotate-12 rounded-lg" style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }}></div>

      <div className="w-full max-w-lg z-10 flex flex-col items-center">
        {state === AppState.IDLE || state === AppState.LOADING || state === AppState.ERROR ? (
          <>
            <Logo />
            
            <div className="text-center mb-10 px-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                你好，我是E99，<br />你想知道什么游戏新闻？
              </h2>
              <p className="text-gray-400 text-sm font-medium">您的 AI 驱动游戏资讯聚合专家</p>
            </div>

            <div className="w-full space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                  <i className="fa-solid fa-magnifying-glass text-red-500"></i>
                </div>
                <input
                  type="text"
                  className="w-full pl-12 pr-12 py-4 bg-white border-2 border-red-50 rounded-2xl shadow-sm focus:border-red-400 focus:ring-0 outline-none transition-all text-gray-700 placeholder-gray-300"
                  placeholder='搜索“GTA VI”或“艾尔登法环”'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <div className="absolute inset-y-0 right-5 flex items-center">
                   <div className="w-6 h-6 rounded-full border-2 border-gray-100"></div>
                </div>
              </div>

              <button
                onClick={() => handleSearch()}
                disabled={state === AppState.LOADING}
                className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {state === AppState.LOADING ? (
                  <><i className="fa-solid fa-circle-notch animate-spin"></i> 搜索中...</>
                ) : (
                  '立即搜索'
                )}
              </button>

              {state === AppState.ERROR && (
                <p className="text-red-500 text-center text-sm">{errorMsg}</p>
              )}
            </div>

            <div className="mt-16 text-center">
              <p className="text-gray-400 text-sm mb-4">热门搜索</p>
              <div className="flex flex-wrap justify-center gap-3">
                {hotSearches.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleSearch(tag)}
                    className="px-6 py-2 bg-gray-50 text-gray-600 rounded-full text-sm font-medium hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-100"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="w-full bg-white rounded-3xl p-6 shadow-xl border border-gray-100 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                    <i className="fa-solid fa-robot"></i>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">E99 的搜索简报</h3>
               </div>
               <button onClick={reset} className="text-gray-400 hover:text-red-500">
                  <i className="fa-solid fa-arrow-rotate-left"></i>
               </button>
            </div>
            
            <div className="prose prose-red max-w-none text-gray-700 mb-8 leading-relaxed">
              {result?.text.split('\n').map((line, i) => (
                <p key={i} className="mb-4">{line}</p>
              ))}
            </div>

            {result?.sources && result.sources.length > 0 && (
              <div className="border-t border-gray-50 pt-6">
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-link text-red-500"></i>
                  参考来源
                </h4>
                <div className="space-y-2">
                  {result.sources.map((source, i) => (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-xl bg-gray-50 hover:bg-red-50 transition-colors group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 group-hover:text-red-700 truncate mr-4">
                          {source.title}
                        </span>
                        <i className="fa-solid fa-chevron-right text-gray-300 text-xs group-hover:text-red-400"></i>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={reset}
              className="mt-8 w-full py-3 border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
            >
              返回搜索
            </button>
          </div>
        )}
      </div>

      {/* Footer bar indicator */}
      <div className="fixed bottom-2 w-32 h-1 bg-gray-200 rounded-full left-1/2 -translate-x-1/2"></div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
