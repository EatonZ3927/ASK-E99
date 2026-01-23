import React, { useState, useCallback, useRef, useEffect } from 'react';
import Logo from './components/Logo';
import { searchGamingNews, continueDeepThinking } from './services/geminiService';
import { AppState, SearchResult, ChatMessage, NewsItem } from './types';

// Helper for generating range numbers
const getRange = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
const months = getRange(1, 12);
const currentYear = new Date().getFullYear();
const years = getRange(currentYear - 5, currentYear);

const ScrollColumn: React.FC<{
  items: number[];
  selected: number;
  onSelect: (val: number) => void;
  label: string;
}> = ({ items, selected, onSelect, label }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isHovering = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const scrollToSelected = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      const index = items.indexOf(selected);
      if (index !== -1) {
        containerRef.current.scrollTo({
          top: index * 32,
          behavior
        });
      }
    }
  }, [selected, items]);

  // Center the selected item when it changes or on mount
  useEffect(() => {
    scrollToSelected(isFirstRender.current ? 'instant' : 'smooth');
    isFirstRender.current = false;
  }, [selected, scrollToSelected]);

  const handleScroll = () => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      // If not interacting (hovering), snap back to selected
      if (!isHovering.current) {
        scrollToSelected('smooth');
      }
    }, 500);
  };

  const handleMouseEnter = () => { isHovering.current = true; };
  
  const handleMouseLeave = () => { 
    isHovering.current = false; 
    // Snap back immediately on leave if scroll has settled, or let scroll timeout handle it
    scrollToSelected('smooth');
  };

  const handleTouchStart = () => { isHovering.current = true; };
  const handleTouchEnd = () => { 
    isHovering.current = false;
    // For touch, momentum scroll might continue, so we rely on handleScroll timeout
    // but we can start the timeout logic here essentially by doing nothing and letting onScroll fire
  };

  return (
    <div 
      className="flex flex-col h-32 relative group w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
       <div className="text-center text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">{label}</div>
       <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto scrollbar-hide snap-y snap-mandatory bg-gray-50 rounded-lg border border-gray-100 relative"
       >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 bg-red-100/50 pointer-events-none border-y border-red-200"></div>
          <div className="py-[36px]"> {/* Spacer to allow top/bottom scrolling */}
            {items.map((val) => (
              <div
                key={val}
                onClick={() => onSelect(val)}
                className={`snap-center h-8 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors ${
                  val === selected ? 'text-red-600 font-bold scale-110' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {val < 10 ? `0${val}` : val}
              </div>
            ))}
          </div>
       </div>
    </div>
  );
};

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  
  // Date Picker State
  const today = new Date();
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [startYear, setStartYear] = useState(today.getFullYear());
  const [startMonth, setStartMonth] = useState(today.getMonth() + 1);
  const [startDay, setStartDay] = useState(today.getDate());
  
  const [endYear, setEndYear] = useState(today.getFullYear());
  const [endMonth, setEndMonth] = useState(today.getMonth() + 1);
  const [endDay, setEndDay] = useState(today.getDate());

  const scrollRef = useRef<HTMLDivElement>(null);
  const homeInputRef = useRef<HTMLTextAreaElement>(null);
  const followUpInputRef = useRef<HTMLTextAreaElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Dynamic days based on year/month
  const getDaysInMonth = (year: number, month: number) => {
    // new Date(year, month, 0) returns the last day of the given month index 
    // (month is 1-based from state, Date constructor takes 0-based month, 
    // so passing `month` which is `nextMonthIndex` works for day 0)
    return new Date(year, month, 0).getDate(); 
  };

  const startMonthDays = getRange(1, getDaysInMonth(startYear, startMonth));
  const endMonthDays = getRange(1, getDaysInMonth(endYear, endMonth));

  // Auto-correct days if month/year changes to one with fewer days
  useEffect(() => {
    const max = getDaysInMonth(startYear, startMonth);
    if (startDay > max) setStartDay(max);
  }, [startMonth, startYear]);

  useEffect(() => {
    const max = getDaysInMonth(endYear, endMonth);
    if (endDay > max) setEndDay(max);
  }, [endMonth, endYear]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, state]);

  // Click outside to close picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (msg: string) => {
    setToast(msg);
  };

  const handleShare = async (title: string, text: string) => {
    const shareData = {
      title: 'ASK E99 游戏资讯',
      text: `${title}\n\n${text}\n\nVia ASK E99 AI`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as any).name !== 'AbortError') {
             console.error('Share failed', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.text);
        showToast('已复制到剪贴板');
      } catch (err) {
        showToast('复制失败');
      }
    }
  };

  const handleShareAll = (items: NewsItem[]) => {
    const title = "E99 游戏资讯简报";
    const text = items.map((item, idx) => `${idx + 1}. ${item.title}\n${item.description}`).join('\n\n');
    handleShare(title, text);
  };

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery || query;
    const isDateModified = 
        startYear !== today.getFullYear() || startMonth !== today.getMonth() + 1 || startDay !== today.getDate() ||
        endYear !== today.getFullYear() || endMonth !== today.getMonth() + 1 || endDay !== today.getDate();

    const hasDateRange = showDatePicker || isDateModified;
    
    if (!q.trim() && !hasDateRange) return;

    setState(AppState.LOADING);
    setQuery(q);
    setErrorMsg('');
    setShowDatePicker(false);

    let dateRangeText = undefined;
    if (hasDateRange) {
        dateRangeText = `${startYear}年${startMonth}月${startDay}日 到 ${endYear}年${endMonth}月${endDay}日`;
    }

    try {
      const data = await searchGamingNews(q, dateRangeText);
      setHistory([{ role: 'model', text: data.text, items: data.items, sources: data.sources }]);
      setState(AppState.RESULT);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('获取资讯失败，请重试');
      setState(AppState.ERROR);
    }
  }, [query, startYear, startMonth, startDay, endYear, endMonth, endDay, showDatePicker]);

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
    // Reset dates to today
    const now = new Date();
    setStartYear(now.getFullYear());
    setStartMonth(now.getMonth() + 1);
    setStartDay(now.getDate());
    setEndYear(now.getFullYear());
    setEndMonth(now.getMonth() + 1);
    setEndDay(now.getDate());
  };

  const getSourceIcon = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('reddit.com')) return 'fa-brands fa-reddit text-[#FF4500]';
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'fa-brands fa-x-twitter';
    if (lowerUrl.includes('youtube.com')) return 'fa-brands fa-youtube text-[#FF0000]';
    if (lowerUrl.includes('steampowered.com')) return 'fa-brands fa-steam';
    return 'fa-solid fa-link';
  };

  const hotSearches = ['PS5 Pro', '怪物猎人荒野', 'Switch 2 传闻'];

  const isDateModified = 
    startYear !== today.getFullYear() || startMonth !== today.getMonth() + 1 || startDay !== today.getDate() ||
    endYear !== today.getFullYear() || endMonth !== today.getMonth() + 1 || endDay !== today.getDate();

  return (
    <div className="min-h-screen flex flex-col items-center p-4 relative overflow-x-hidden pt-12 md:pt-20">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 z-50 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl animate-fade-in flex items-center gap-2">
          <i className="fa-solid fa-check-circle text-green-400"></i>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

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
                
                {/* Textarea Container */}
                <div className="relative w-full">
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

                    {/* Date Picker Toggle Button */}
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={`absolute bottom-4 right-4 p-2 rounded-lg transition-all ${
                            showDatePicker || isDateModified
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-transparent text-gray-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title="选择时间范围"
                    >
                        <i className="fa-regular fa-calendar-alt text-xl"></i>
                        {isDateModified && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                </div>

                {/* Date Picker Panel */}
                {showDatePicker && (
                    <div 
                        ref={datePickerRef}
                        className="absolute top-[105%] left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-50 animate-fade-in-up"
                    >
                        <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-2">
                             <h3 className="font-bold text-gray-700 text-sm">时间穿越器</h3>
                             <button 
                                onClick={() => {
                                    const now = new Date();
                                    setStartYear(now.getFullYear());
                                    setStartMonth(now.getMonth() + 1);
                                    setStartDay(now.getDate());
                                    setEndYear(now.getFullYear());
                                    setEndMonth(now.getMonth() + 1);
                                    setEndDay(now.getDate());
                                }}
                                className="text-xs text-red-500 hover:underline"
                             >
                                重置为今天
                             </button>
                        </div>
                        <div className="flex gap-4">
                            {/* Start Section */}
                            <div className="flex-1 min-w-0">
                                <div className="text-center text-xs font-bold text-red-600 bg-red-50 rounded-md py-1 mb-2">起始时间</div>
                                <div className="flex gap-1">
                                    <div className="w-[60px] flex-shrink-0">
                                        <ScrollColumn items={years} selected={startYear} onSelect={setStartYear} label="年" />
                                    </div>
                                    <div className="flex-1">
                                        <ScrollColumn items={months} selected={startMonth} onSelect={setStartMonth} label="月" />
                                    </div>
                                    <div className="flex-1">
                                        <ScrollColumn items={startMonthDays} selected={startDay} onSelect={setStartDay} label="日" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Divider Arrow */}
                            <div className="flex flex-col justify-center items-center text-gray-300 pt-6 px-1">
                                <i className="fa-solid fa-arrow-right"></i>
                            </div>

                            {/* End Section */}
                            <div className="flex-1 min-w-0">
                                <div className="text-center text-xs font-bold text-gray-600 bg-gray-100 rounded-md py-1 mb-2">结束时间</div>
                                <div className="flex gap-1">
                                    <div className="w-[60px] flex-shrink-0">
                                        <ScrollColumn items={years} selected={endYear} onSelect={setEndYear} label="年" />
                                    </div>
                                    <div className="flex-1">
                                        <ScrollColumn items={months} selected={endMonth} onSelect={setEndMonth} label="月" />
                                    </div>
                                    <div className="flex-1">
                                        <ScrollColumn items={endMonthDays} selected={endDay} onSelect={setEndDay} label="日" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
              </div>

              <button
                onClick={() => handleSearch()}
                disabled={state === AppState.LOADING}
                className="w-full py-5 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
              >
                {state === AppState.LOADING ? (
                  <><i className="fa-solid fa-circle-notch animate-spin"></i> 正在深度搜索...</>
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
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full uppercase tracking-wider">Live Reddit Analysis</span>
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
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                        <i className="fa-solid fa-robot"></i>
                        <span>{index === 0 ? '您好，我是E99，这里是为你专属总结的游戏传闻' : 'E99 深度解析'}</span>
                      </div>
                      {/* Global Share Button */}
                      {msg.items && msg.items.length > 0 && (
                        <button 
                          onClick={() => handleShareAll(msg.items!)}
                          className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100 transition-colors"
                        >
                          <i className="fa-solid fa-share-nodes"></i>
                          <span>分享全篇</span>
                        </button>
                      )}
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="flex items-center gap-2 mb-3 text-red-100 font-bold text-sm">
                      <i className="fa-solid fa-user"></i>
                      <span>您的提问</span>
                    </div>
                  )}
                  
                  {/* Content Rendering: Horizontal List Style */}
                  {msg.items ? (
                    <div className="flex flex-col gap-3">
                      {msg.items.map((item, idx) => (
                        <div key={idx} className="relative group bg-white rounded-xl border border-gray-200 p-5 hover:border-red-400 hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row gap-5 items-start">
                          {/* Number Badge */}
                          <div className="flex-shrink-0">
                             <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-700 font-bold text-sm ring-4 ring-white shadow-sm">
                                {idx + 1}
                             </span>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0 pt-0.5">
                             <div className="pr-8">
                                <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-red-600 transition-colors">
                                   {item.title}
                                </h3>
                             </div>
                             <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line line-clamp-4 group-hover:line-clamp-none transition-all">
                                {item.description}
                             </p>
                          </div>
                          
                          {/* Individual Share Button */}
                          <button 
                            onClick={() => handleShare(item.title, item.description)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                            title="分享此条"
                          >
                            <i className="fa-solid fa-share-nodes"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap relative group">
                       {msg.text}
                       {msg.role === 'model' && (
                         <button 
                           onClick={() => handleShare('E99 深度解析', msg.text || '')}
                           className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                         >
                            <i className="fa-solid fa-share-nodes"></i>
                         </button>
                       )}
                    </div>
                  )}
                  
                  {msg.sources && msg.sources.length > 0 && (
                    <div className={`mt-8 pt-6 border-t ${msg.role === 'user' ? 'border-red-500' : 'border-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <i className={`fa-solid fa-link text-xs ${msg.role === 'user' ? 'text-red-200' : 'text-gray-400'}`}></i>
                        <p className={`text-xs font-bold uppercase tracking-wider ${msg.role === 'user' ? 'text-red-100' : 'text-gray-400'}`}>参考来源</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((s, i) => (
                          <a 
                            key={i} 
                            href={s.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all truncate max-w-[240px] ${
                              msg.role === 'user' 
                              ? 'bg-red-700 border-red-500 text-white hover:bg-red-800' 
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 hover:shadow-sm'
                            }`}
                          >
                            <i className={`${getSourceIcon(s.url)} text-sm opacity-70`}></i>
                            <span className="truncate font-medium">{s.title}</span>
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
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;