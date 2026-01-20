
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Logo from './components/Logo';
import { searchGamingNews, continueDeepThinking } from './services/geminiService';
import { AppState, SearchResult, ChatMessage } from './types';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const homeInputRef = useRef<HTMLTextAreaElement>(null);
  const followUpInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, state]);

  // Auto-resize textarea function
  const adjustHeight = (el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight(homeInputRef.current);
  }, [query]);

  useEffect(() => {
    adjustHeight(followUpInputRef.current);
  }, [followUpQuery]);

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setState(AppState.LOADING);
    setQuery(q);
    setErrorMsg('');

    try {
      const data = await searchGamingNews(q);
      setHistory([{ role: 'model', text: data.text, sources: data.sources }]);
      setState(AppState.RESULT);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('获取资讯失败，请重试');
      setState(AppState.ERROR);
    }
  }, [query]);

  const handleFollowUp = useCallback(async () => {
    if (!followUpQuery.trim() || state === AppState.THINKING) return;

    const currentQuery = followUpQuery;
    setFollowUpQuery('');
    setState(AppState.THINKING);
    
    // Add user message to history immediately
    const updatedHistory = [...history, { role: 'user', text: currentQuery } as ChatMessage];
    setHistory(updatedHistory);

    try {
      const modelResponse = await continueDeepThinking(updatedHistory.slice(0, -1), currentQuery);
      setHistory(prev => [...prev, modelResponse]);
      setState(AppState.RESULT);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('深度思考失败，请重试');
      setState(AppState.RESULT); // Back to result to allow retry
    }
  }, [followUpQuery, history, state]);

  const reset = () => {
    setState(AppState.IDLE);
    setHistory([]);
    setQuery('');
    setFollowUpQuery('');
  };

  const hotSearches = ['PS5 Pro', '怪物猎人荒野', 'Switch 2 传闻'];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 relative overflow-x-hidden pt-12 md:pt-20">
      {/* Background decoration elements */}
      <div className="fixed top-8 right-8 text-gray-100 pointer-events-none select-none">
        <i className="fa-solid fa-gamepad text-9xl transform rotate-12 opacity-10"></i>
      </div>
      
      <div className="w-full max-w-2xl z-10">
        {state === AppState.IDLE || (state === AppState.LOADING && history.length === 0) ? (
          <div className="flex flex-col items-center">
            <Logo />
            
            <div className="text-center mb-10 px-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                你好，我是 E99，<br />你想探究哪个游戏话题？
              </h2>
              <p className="text-gray-400 text-sm font-medium">您的深度游戏资讯 AI 助手</p>
            </div>

            <div className="w-full space-y-6">
              <div className="relative group">
                <div className="absolute top-6 left-6 flex items-center pointer-events-none z-10">
                  <i className="fa-solid fa-magnifying-glass text-red-500 text-lg"></i>
                </div>
                <textarea
                  ref={homeInputRef}
                  rows={3}
                  className="w-full pl-14 pr-14 py-6 bg-white border-2 border-red-50 rounded-2xl shadow-sm focus:border-red-400 focus:ring-0 outline-none transition-all text-gray-700 placeholder-gray-300 text-lg resize-none min-h-[120px] max-h-[300px]"
                  placeholder='例如：“黑神话：悟空”的最新评价'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
              </div>

              <button
                onClick={() => handleSearch()}
                disabled={state === AppState.LOADING}
                className="w-full py-5 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
              >
                {state === AppState.LOADING ? (
                  <><i className="fa-solid fa-circle-notch animate-spin"></i> 正在收集资讯...</>
                ) : (
                  '开启深度搜索'
                )}
              </button>

              {state === AppState.ERROR && (
                <p className="text-red-500 text-center text-sm">{errorMsg}</p>
              )}
            </div>

            <div className="mt-16 text-center">
              <p className="text-gray-400 text-sm mb-4 font-semibold uppercase tracking-wider">热门趋势</p>
              <div className="flex flex-wrap justify-center gap-3">
                {hotSearches.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleSearch(tag)}
                    className="px-6 py-2.5 bg-white text-gray-600 rounded-xl text-sm font-medium hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-100 shadow-sm"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-6 animate-fade-in-up pb-56">
            <div className="flex justify-center items-center mb-4 px-2">
               <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full uppercase tracking-wider">Live AI Analysis</span>
               </div>
            </div>

            {history.map((msg, index) => (
              <div key={index} className="flex flex-col w-full">
                <div className={`w-full rounded-3xl p-6 shadow-sm border ${
                  msg.role === 'user' 
                  ? 'bg-red-600 text-white border-red-500 rounded-tr-none' 
                  : 'bg-white text-gray-700 border-gray-100 rounded-tl-none'
                }`}>
                  {msg.role === 'model' && (
                    <div className="flex items-center gap-2 mb-3 text-red-600 font-bold text-sm">
                      <i className="fa-solid fa-robot"></i>
                      <span>{index === 0 ? 'E99 简报' : 'E99 深度解析'}</span>
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="flex items-center gap-2 mb-3 text-red-100 font-bold text-sm">
                      <i className="fa-solid fa-user"></i>
                      <span>您的提问</span>
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </div>
                  
                  {msg.sources && msg.sources.length > 0 && (
                    <div className={`mt-6 pt-4 border-t ${msg.role === 'user' ? 'border-red-500' : 'border-gray-50'}`}>
                      <p className={`text-xs font-bold mb-3 ${msg.role === 'user' ? 'text-red-100' : 'text-gray-400'}`}>参考来源</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((s, i) => (
                          <a 
                            key={i} 
                            href={s.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-all truncate max-w-[200px] ${
                              msg.role === 'user' 
                              ? 'bg-red-700 border-red-500 text-white hover:bg-red-800' 
                              : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100'
                            }`}
                          >
                            <i className="fa-solid fa-link mr-1 opacity-70"></i>
                            {s.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {state === AppState.THINKING && (
              <div className="flex flex-col w-full animate-pulse">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 rounded-tl-none flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                    <i className="fa-solid fa-brain animate-bounce"></i>
                  </div>
                  <span className="text-gray-400 font-medium">E99 正在深度思考中...</span>
                </div>
              </div>
            )}

            {/* Restart button aligned with the width */}
            <div className="flex justify-center mt-12 pb-4">
              <button 
                onClick={reset} 
                className="flex items-center gap-2 text-gray-400 hover:text-red-600 transition-colors font-medium bg-white px-8 py-3 rounded-full border border-gray-100 shadow-sm hover:shadow-md active:scale-95"
              >
                <i className="fa-solid fa-arrow-rotate-left"></i>
                <span>重新开始 / 开启新话题</span>
              </button>
            </div>

            <div ref={scrollRef} className="h-1" />

            {/* Bottom Input for Deep Thinking */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent flex justify-center z-20">
              <div className="w-full max-w-2xl relative">
                <div className="bg-white rounded-2xl shadow-2xl border border-red-100 p-3 flex items-end gap-3 group transition-all focus-within:ring-2 focus-within:ring-red-100">
                  <div className="self-start pt-4 pl-3 text-red-500 text-lg">
                    <i className="fa-solid fa-lightbulb"></i>
                  </div>
                  <textarea 
                    ref={followUpInputRef}
                    rows={3}
                    placeholder="针对此答案进行深度追问..." 
                    className="flex-1 py-4 bg-transparent outline-none text-gray-700 placeholder-gray-400 text-lg resize-none min-h-[100px] max-h-[300px]"
                    value={followUpQuery}
                    onChange={(e) => setFollowUpQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleFollowUp();
                      }
                    }}
                    disabled={state === AppState.THINKING}
                  />
                  <button 
                    onClick={handleFollowUp}
                    disabled={!followUpQuery.trim() || state === AppState.THINKING}
                    className="bg-red-600 text-white w-14 h-14 rounded-xl flex items-center justify-center hover:bg-red-700 transition-all disabled:bg-gray-200 active:scale-90 flex-shrink-0"
                  >
                    <i className={`fa-solid text-xl ${state === AppState.THINKING ? 'fa-spinner animate-spin' : 'fa-paper-plane'}`}></i>
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2 font-medium uppercase tracking-widest">Powered by Gemini 2.5 & Google Search</p>
              </div>
            </div>
          </div>
        )}
      </div>

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
