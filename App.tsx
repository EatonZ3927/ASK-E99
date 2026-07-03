
import React, { useState, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import Logo from './components/Logo';
import { searchGamingNews, continueDeepThinking, analyzeImageAndSearchNews } from './services/dashscopeService';
import { AppState, SearchResult, ChatMessage, NewsItem } from './types';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const homeInputRef = useRef<HTMLTextAreaElement>(null);
  const followUpInputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, state]);

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

  const handleSaveImage = async () => {
    if (!chatContainerRef.current) return;
    
    showToast('正在生成高清长图...');
    
    try {
        // Wait a bit for any layout shifts
        await new Promise(resolve => setTimeout(resolve, 200));

        const canvas = await html2canvas(chatContainerRef.current, {
            useCORS: true,
            scale: 3, // High resolution for clarity
            backgroundColor: '#FAFAFA', // Match app background
            logging: false,
            onclone: (clonedDoc) => {
                const el = clonedDoc.querySelector('[data-chat-container]') as HTMLElement;
                if (el) {
                    // 1. Layout Adjustments
                    el.style.padding = '40px 20px';

                    // Remove sources container for the screenshot
                    const sourceContainers = el.querySelectorAll('[data-sources-container]');
                    sourceContainers.forEach(container => {
                        (container as HTMLElement).style.display = 'none';
                    });
                    
                    // 2. Contrast & Font Optimization for Screenshot
                    // Inject a style tag to force darker text and heavier weights for better readability in image
                    const style = clonedDoc.createElement('style');
                    style.innerHTML = `
                        /* Global Clarity & Opacity Reset (Fixes "White Fog") */
                        * { 
                            text-rendering: geometricPrecision !important; 
                            -webkit-font-smoothing: antialiased !important; 
                            opacity: 1 !important; /* Force full opacity */
                        }
                        
                        /* Force Pure Black for main paragraphs */
                        .prose, p { 
                            color: #000000 !important; 
                            font-weight: 500 !important; 
                        }
                        
                        /* Force Black for Titles */
                        h3 { 
                            color: #000000 !important; 
                            font-weight: 800 !important; 
                        }
                        
                        /* Darken Descriptions (previously gray-600) to Dark Slate */
                        .text-gray-600, .text-gray-700, .text-gray-800 { 
                            color: #1a202c !important; /* gray-900 equivalent */
                            font-weight: 600 !important;
                        }
                        
                        /* Darken Metadata (previously gray-500/400) */
                        .text-gray-500, .text-gray-400 { 
                            color: #2d3748 !important; /* gray-800 equivalent */
                            font-weight: 600 !important;
                        }

                        /* Ensure sources text is visible and dark */
                        a span.text-gray-600, a {
                            color: #1a202c !important;
                        }

                        /* Fix User Bubble Text (White on Red) */
                        .bg-red-600, .bg-red-600 * {
                            color: #FFFFFF !important;
                        }

                        /* Enhance Red Accents */
                        .text-red-600 {
                            color: #DC2626 !important; /* Vivid Red */
                        }

                        /* Fix Number Badge Alignment */
                        [data-number-badge] {
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            line-height: 1 !important;
                            padding-bottom: 2px !important; /* Visually lift number up to center */
                        }
                    `;
                    el.appendChild(style);

                    // 3. Header Injection
                    const header = clonedDoc.createElement('div');
                    header.style.display = 'flex';
                    header.style.flexDirection = 'column';
                    header.style.alignItems = 'center';
                    header.style.marginBottom = '30px';
                    header.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <div style="width: 32px; height: 32px; background: #FEF2F2; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <svg viewBox="0 0 24 24" fill="#DC2626" style="width: 20px; height: 20px;">
                                    <path d="M21,6H3C1.9,6,1,6.9,1,8v8c0,1.1,0.9,2,2,2h18c1.1,0,2-0.9,2-2V8C23,6.9,22.1,6,21,6z M7,13H5v2H4v-2H2v-1h2V10h1v2h2V13z M10.5,15c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5s1.5,0.7,1.5,1.5S11.3,15,10.5,15z M10.5,11c-0.8,0-1.5-0.7-1.5-1.5 s0.7-1.5,1.5-1.5S12,8.7,12,9.5S11.3,11,10.5,11z M15.5,15c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5s1.5,0.7,1.5,1.5S16.3,15,15.5,15z M18.5,13c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5s1.5,0.7,1.5,1.5S19.3,13,18.5,13z" />
                                </svg>
                            </div>
                            <span style="font-size: 20px; font-weight: 800; color: #000000;">ASK <span style="color: #DC2626;">E99</span></span>
                        </div>
                        <div style="font-size: 12px; color: #1f2937; font-weight: 700; letter-spacing: 0.05em;">INTELLIGENCE REPORT • ${new Date().toLocaleDateString()}</div>
                    `;
                    el.insertBefore(header, el.firstChild);

                    // 4. Footer Injection
                    const footer = clonedDoc.createElement('div');
                    footer.style.textAlign = 'center';
                    footer.style.marginTop = '40px';
                    footer.style.paddingTop = '20px';
                    footer.style.borderTop = '2px solid #E5E7EB';
                    footer.style.color = '#374151';
                    footer.style.fontWeight = '700';
                    footer.style.fontSize = '12px';
                    footer.innerText = 'Generated by ASK E99 AI';
                    el.appendChild(footer);
                }
            }
        });
        
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `E99-Intelligence-${new Date().toISOString().slice(0,10)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('长图已保存到相册');
    } catch (err) {
        console.error('Screenshot failed', err);
        showToast('生成图片失败，请重试');
    }
  };

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery || query;

    // 如果有图片，使用图片识别功能
    if (attachedImage) {
      setState(AppState.LOADING);
      setErrorMsg('');

      try {
        const data = await analyzeImageAndSearchNews(attachedImage, q);
        setHistory([
          { role: 'user', text: q || '识别图片中的游戏' },
          { role: 'model', text: data.text, items: data.items, sources: data.sources }
        ]);
        setState(AppState.RESULT);
        // 清除图片
        handleRemoveImage();
      } catch (err: any) {
        console.error(err);
        setErrorMsg('图片识别失败，请重试');
        setState(AppState.ERROR);
      }
      return;
    }

    if (!q.trim()) return;

    setState(AppState.LOADING);
    setQuery(q);
    setErrorMsg('');

    try {
      const data = await searchGamingNews(q);
      // Include the user's query in the history so it displays on the result page
      setHistory([
        { role: 'user', text: q },
        { role: 'model', text: data.text, items: data.items, sources: data.sources }
      ]);
      setState(AppState.RESULT);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('获取资讯失败，请重试');
      setState(AppState.ERROR);
    }
  }, [query, attachedImage]);

  // 图片上传处理
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        showToast('请上传图片文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('图片大小不能超过10MB');
        return;
      }
      setAttachedImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      showToast('图片已上传，点击搜索识别游戏');
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setAttachedImage(null);
    setImagePreview(null);
  };

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
      setState(AppState.RESULT); 
    }
  }, [followUpQuery, history, state]);

  const reset = () => {
    setState(AppState.IDLE);
    setHistory([]);
    setQuery('');
    setFollowUpQuery('');
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

  // Helper to determine bubble classes based on role and content type
  const getBubbleClasses = (role: 'user' | 'model', isItems: boolean) => {
    if (role === 'user') {
      return "bg-red-600 text-white rounded-2xl rounded-tr-none shadow-md";
    }
    if (isItems) {
        return "w-full"; // Items take full width of container, transparency handled in items
    }
    return "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none shadow-sm";
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 relative overflow-x-hidden pt-12 md:pt-20">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 z-50 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl animate-fade-in flex items-center gap-2">
          <i className="fa-solid fa-check-circle text-green-400"></i>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Background decoration */}
      <div className="fixed top-8 right-8 text-gray-100 pointer-events-none select-none">
        <i className="fa-solid fa-gamepad text-9xl transform rotate-12 opacity-10"></i>
      </div>
      
      <div className="w-full max-w-2xl z-10 pb-48">
        {state === AppState.IDLE || ((state === AppState.LOADING || state === AppState.ERROR) && history.length === 0) ? (
          <div className="flex flex-col items-center animate-fade-in-up">
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
                
                {/* 回形针上传按钮 - 左下角 */}
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="absolute bottom-4 left-5 z-10 w-7 h-7 flex items-center justify-center rounded-full transition-all hover:bg-gray-100"
                  title="上传游戏截图识别游戏"
                >
                  <i className={`fa-solid fa-paperclip text-sm ${imagePreview ? 'text-green-500' : 'text-gray-400 hover:text-red-500'}`}></i>
                </button>

                <div className="relative w-full">
                    <textarea
                    ref={homeInputRef}
                    rows={3}
                    className="w-full pl-14 pr-4 pt-5 bg-white border-2 border-red-50 rounded-2xl shadow-sm focus:border-red-400 focus:ring-0 outline-none transition-all text-gray-700 placeholder-gray-300 text-lg resize-none min-h-[120px] max-h-[300px]"
                    placeholder='例如："黑神话：悟空"的最新评价'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSearch();
                        }
                    }}
                    />
                    
                    {/* 图片文件名显示在输入框底部 */}
                    {attachedImage && (
                      <div className="absolute bottom-3 left-14 flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 max-w-[calc(100%-60px)]">
                        <i className="fa-solid fa-image text-green-500 text-xs flex-shrink-0"></i>
                        <span className="text-xs text-green-700 font-medium truncate">{attachedImage.name}</span>
                        <button
                          onClick={handleRemoveImage}
                          className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                          title="移除图片"
                        >
                          <i className="fa-solid fa-times-circle text-sm"></i>
                        </button>
                      </div>
                    )}
                </div>
              </div>

              {/* 图片上传功能 */}
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

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
          <div 
            ref={chatContainerRef} 
            data-chat-container
            className="w-full space-y-8 animate-fade-in-up p-2"
          >
            <div className="flex justify-center items-center px-2">
               <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full uppercase tracking-wider">Live Intelligence Feed</span>
               </div>
            </div>

            {history.map((msg, index) => (
              <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                    relative flex flex-col gap-2 
                    ${msg.role === 'user' ? 'items-end' : 'items-start'} 
                    ${msg.items ? 'w-full' : 'max-w-[90%] md:max-w-[85%] w-fit'}
                `}>
                    {/* Role Label */}
                    <div className={`flex items-center gap-2 px-1 mb-1 ${msg.role === 'user' ? 'text-xs font-bold opacity-70' : ''}`}>
                        {msg.role === 'user' ? (
                            <>
                                <span className="text-red-600">YOU</span>
                                <i className="fa-solid fa-user text-red-600"></i>
                            </>
                        ) : (
                            <div className={`flex items-center gap-2 ${msg.items && msg.items.length > 0 ? 'text-red-600 font-bold text-sm animate-fade-in' : 'text-xs font-bold text-red-600 opacity-70'}`}>
                                <i className="fa-solid fa-robot"></i>
                                <span>E99</span>
                                {msg.items && msg.items.length > 0 && msg.text && msg.text.length < 50 && (
                                     <span className="ml-1">{msg.text}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Content Bubble */}
                    <div className={`
                        p-5 
                        ${getBubbleClasses(msg.role, !!msg.items)}
                    `}>
                        {/* Text Content - Show if NO items OR if text is long (analysis) */}
                        {msg.text && ((!msg.items || msg.items.length === 0) || (msg.text.length >= 50)) && (
                            <div className={`
                                prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap mb-4
                                ${msg.role === 'user' ? 'text-white' : 'text-gray-800'}
                                ${msg.items && msg.items.length > 0 ? 'bg-white p-5 rounded-xl border border-gray-100 shadow-sm' : ''}
                            `}>
                                {msg.text}
                            </div>
                        )}

                        {/* Itemized List Display (Search Results or Deep Think Points) */}
                        {msg.items && msg.items.length > 0 && (
                            <div className="flex flex-col gap-4 mt-4 w-full">
                                {msg.items.map((item, idx) => (
                                    <div key={idx} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-red-300 hover:shadow-md transition-all duration-300 flex gap-4 group">
                                        <div className="flex-shrink-0">
                                            <span data-number-badge className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 font-bold text-sm leading-none">
                                                {idx + 1}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold text-gray-900 mb-2 leading-tight group-hover:text-red-600 transition-colors">
                                                {item.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-end mt-2">
                                     <button 
                                        onClick={() => handleShareAll(msg.items!)}
                                        className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors"
                                    >
                                        <i className="fa-solid fa-share-nodes"></i>
                                        分享全部情报
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                  
                  {/* Sources - Summary Box */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div data-sources-container className="mt-3 w-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm animate-fade-in">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 flex items-center gap-2 uppercase tracking-wide">
                                <i className="fa-solid fa-layer-group text-red-500"></i>
                                情报来源汇总
                            </span>
                            <span className="text-[10px] font-bold bg-white text-red-600 border border-red-100 px-2 py-0.5 rounded-full">
                                {msg.sources.length} SOURCES
                            </span>
                        </div>
                        <div className="p-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                             {msg.sources.map((s, i) => (
                                <a 
                                    key={i} 
                                    href={s.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg group transition-all border-b border-gray-50 last:border-0"
                                >
                                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-md group-hover:bg-white group-hover:text-red-500 transition-colors">
                                         <i className={`${getSourceIcon(s.url)} text-sm text-gray-400 group-hover:text-red-500`}></i>
                                    </div>
                                    <span className="text-sm text-gray-600 truncate group-hover:text-red-800 font-medium flex-1">{s.title}</span>
                                    <i className="fa-solid fa-arrow-up-right-from-square text-xs text-gray-300 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1"></i>
                                </a>
                             ))}
                        </div>
                    </div>
                  )}

                  {/* Actions for text messages */}
                  {msg.role === 'model' && !msg.items && (
                      <div className="flex gap-2 px-1">
                          <button 
                             onClick={() => handleShare('E99 深度解析', msg.text || '')}
                             className="text-gray-400 hover:text-red-600 text-xs transition-colors"
                             title="复制"
                          >
                             <i className="fa-solid fa-copy"></i>
                          </button>
                      </div>
                  )}
                </div>
              </div>
            ))}

            {state === AppState.THINKING && (
              <div className="flex w-full justify-start">
                  <div className="flex flex-col gap-2 items-start max-w-[85%]">
                    <div className="flex items-center gap-2 text-xs font-bold px-1 opacity-70">
                         <i className="fa-solid fa-robot text-red-600"></i>
                         <span className="text-red-600">E99</span>
                    </div>
                    <div className="bg-white p-5 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce delay-150"></div>
                        <span className="text-sm text-gray-400 font-medium ml-2">正在搜集情报...</span>
                    </div>
                  </div>
              </div>
            )}
            
            <div ref={scrollRef} className="h-1" />
          </div>
        )}

        {/* Persistent Bottom Input (Only when chat is active) */}
        {history.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/95 to-transparent flex justify-center z-20">
              <div className="w-full max-w-2xl relative">
                  {history.length > 0 && (
                      <div className="flex justify-center mb-6 gap-3">
                         <button 
                            onClick={handleSaveImage} 
                            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-600 transition-all bg-white shadow-lg shadow-gray-200/50 px-6 py-3 rounded-full border border-gray-100 hover:scale-105 active:scale-95 group"
                        >
                            <i className="fa-solid fa-image group-hover:text-red-500 transition-colors"></i>
                            保存长图
                        </button>
                        <button 
                            onClick={reset} 
                            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-600 transition-all bg-white shadow-lg shadow-gray-200/50 px-6 py-3 rounded-full border border-gray-100 hover:scale-105 active:scale-95 group"
                        >
                            <i className="fa-solid fa-arrow-rotate-left group-hover:rotate-180 transition-transform duration-500"></i>
                            开启新话题
                        </button>
                      </div>
                  )}

                <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-2 flex items-end gap-2 group transition-all focus-within:ring-2 focus-within:ring-red-50 focus-within:border-red-200">
                  <div className="self-center pl-3 text-red-500">
                    <i className="fa-solid fa-lightbulb"></i>
                  </div>
                  <textarea 
                    ref={followUpInputRef}
                    rows={1}
                    placeholder="深度追问..." 
                    className="flex-1 py-3 bg-transparent outline-none text-gray-700 placeholder-gray-400 text-base resize-none max-h-[150px]"
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
                    className="bg-red-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-red-700 transition-all disabled:bg-gray-100 disabled:text-gray-300 active:scale-95 flex-shrink-0 mb-1"
                  >
                    <i className={`fa-solid text-sm ${state === AppState.THINKING ? 'fa-spinner animate-spin' : 'fa-paper-plane'}`}></i>
                  </button>
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
};

export default App;
