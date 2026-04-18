import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const TypewriterMessage = ({ msgObj, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");
  const typeRef = useRef(null);
  
  useEffect(() => {
    let currentText = "";
    let i = 0;
    
    setDisplayedText("");
    
    const interval = setInterval(() => {
       if (i < msgObj.text.length) {
         currentText += msgObj.text.charAt(i);
         setDisplayedText(currentText);
         
         if(typeRef.current) typeRef.current.scrollIntoView({ behavior: "auto", block: "nearest" });
         i++;
       } else {
         clearInterval(interval);
         if (onComplete) onComplete();
       }
    }, 15);
    return () => clearInterval(interval);
  }, [msgObj.text]);

  const isDone = displayedText.length === msgObj.text.length;

  return (
    <div ref={typeRef}>
       <p style={{ whiteSpace: "pre-wrap" }}>
         {displayedText}{(displayedText.length < msgObj.text.length) ? " █" : ""}
       </p>
       
       {isDone && msgObj.sources && msgObj.sources.length > 0 && (
         <details className="citation-box" style={{ marginTop: '15px' }}>
           <summary>📄 View Source Citations</summary>
           <div className="citation-content">
             {msgObj.sources.map((s, idx) => (
               <div key={idx} className="source-item">
                 <strong>Source {idx + 1}: {s.source_file} (Page {s.page})</strong>
                 <p className="source-snippet">"{s.page_content}"</p>
               </div>
             ))}
           </div>
         </details>
       )}
    </div>
  );
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');

  const [sessions, setSessions] = useState(() => {
     const saved = localStorage.getItem("rag_sessions");
     return saved ? JSON.parse(saved) : [{ id: 1, name: "New Chat", messages: [{ role: 'assistant', text: 'Hello! I am your advanced AI. Upload a PDF or ask a question!' }] }];
  });
  const [activeSessionId, setActiveSessionId] = useState(sessions[0].id);
  const [messages, setMessages] = useState([]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistoryStr, setChatHistoryStr] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Hands-Free Auto-Pilot
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const handsFreeRef = useRef(false);

  // New Global App States
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [theme, setTheme] = useState('glass');
  const [searchMode, setSearchMode] = useState('pdf');
  
  const [metrics, setMetrics] = useState({ uptime: 0, vectors: 0, pdfs: 0, model: 'Llama 3.1' });
  const [showDevPanel, setShowDevPanel] = useState(false);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
     const sess = sessions.find(s => s.id === activeSessionId);
     if (sess) {
         setMessages(sess.messages);
         let histStr = "";
         sess.messages.forEach(m => histStr += `${m.role}: ${m.text}\n`);
         setChatHistoryStr(histStr);
     }
  }, [activeSessionId]);

  useEffect(() => {
      if (messages.length === 0) return;
      setSessions(prev => {
          const updated = prev.map(s => {
              if (s.id === activeSessionId) {
                  return { ...s, messages };
              }
              return s;
          });
          localStorage.setItem("rag_sessions", JSON.stringify(updated));
          return updated;
      });
  }, [messages, activeSessionId]);

  const createNewChat = () => {
      const newSess = { id: Date.now(), name: "New Chat", messages: [{ role: 'assistant', text: "Ready! Upload a new PDF or talk to the Agent." }] };
      setSessions(prev => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
  };

  useEffect(() => { endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading, uploading]);

  useEffect(() => {
    if (isLoggedIn) {
      const pollMetrics = async () => {
        try {
          const res = await fetch("http://localhost:8000/api/metrics");
          const data = await res.json();
          if (res.ok) setMetrics(data);
        } catch(e) {}
      };
      pollMetrics();
      const interval = setInterval(pollMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance();
      msg.text = text.replace(/[*#]/g, '');
      if(targetLanguage === "Spanish") msg.lang = 'es-ES';
      if(targetLanguage === "French") msg.lang = 'fr-FR';
      if(targetLanguage === "Hindi") msg.lang = 'hi-IN';
      
      msg.onend = () => {
         if (handsFreeRef.current) {
             toggleListening(); // Autonomous Loop: AI done speaking -> Instantly activate mic
         }
      };
      window.speechSynthesis.speak(msg);
    }
  };

  const toggleListening = () => {
    if (!SpeechRecognition) return alert("Microphone unsupported in this browser.");
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    if(targetLanguage === "Spanish") recognition.lang = 'es-ES';
    if(targetLanguage === "French") recognition.lang = 'fr-FR';
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInput(prev => prev + (prev.endsWith(' ') ? '' : ' ') + transcript);
        if (handsFreeRef.current) {
            handleSend(transcript); // Autonomous Loop: User done dictating -> Instantly hit backend
        }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const exportLog = () => {
    let logText = `👨‍🔬 GenAI Research Log (${sessions.find(s=>s.id===activeSessionId)?.name})\n===============================\n\n`;
    messages.forEach(m => { logText += `[${m.role.toUpperCase()}]:\n${m.text}\n\n--------------------\n`; });
    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Research_Thesis_Log.txt"; a.click(); URL.revokeObjectURL(url);
  };

  const resetDashboard = async () => {
    if (!window.confirm("WARNING: This destroys the AI FAISS Math engine and deletes all cached Chat Sessions completely. Continue?")) return;
    try { 
      const res = await fetch("http://localhost:8000/api/wipe", { method: "POST" });
      if (!res.ok) alert("Backend Server error: You MUST restart your Python terminal server (Ctrl+C then python server.py) to enable the Wipe feature!");
    } catch (e) {
      alert("Network Error: Make sure your Python backend server is running.");
    }
    
    localStorage.removeItem("rag_sessions");
    const blank = [{ id: Date.now(), name: "First Research", messages: [{ role: 'assistant', text: "Memory Professionally wiped! Ready."}] }];
    setSessions(blank);
    setActiveSessionId(blank[0].id);
    setSelectedPdfUrl(null);
  };

  const ingestYouTube = async () => {
    const link = prompt("Enter a standard YouTube URL (e.g. https://www.youtube.com/watch?v=...) to ingest its transcript into the AI FAISS Brain:");
    if (!link) return;
    
    setUploading(true);
    setMessages(prev => [...prev, { role: 'assistant', text: `⏳ Scraping mathematical transcript from YouTube Video and generating vector clusters...` }]);
    
    try {
      const formData = new FormData();
      formData.append("link", link);
      const res = await fetch("http://localhost:8000/api/youtube", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      setMessages(prev => [...prev, { role: 'assistant', text: `✅ Successfully multi-mapped YouTube Video into FAISS Vector Space! You can now cross-reference it with the PDFs.` }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Error during YouTube Ingestion: ${err.message}` }]);
    } finally {
      setUploading(false);
    }
  };

  const ingestWebsite = async () => {
    const link = prompt("Enter a Website URL (Wikipedia, Blog, etc.) to securely extract its text into the AI FAISS Brain:");
    if (!link) return;
    
    setUploading(true);
    setMessages(prev => [...prev, { role: 'assistant', text: `⏳ Deploying BeautifulSoup Scraper to extract HTML structure from ${link}...` }]);
    
    try {
      const formData = new FormData();
      formData.append("link", link);
      const res = await fetch("http://localhost:8000/api/scrape", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      
      setMessages(prev => [...prev, { role: 'assistant', text: `✅ Successfully ripped webpage text and structurally mapped it to the Vector Space!` }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Error during Web Scrape: ${err.message}` }]);
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const imgUrl = URL.createObjectURL(file);
    setMessages(prev => [...prev, { role: 'user', text: "Please analyze this complex chart/diagram in extreme detail.", image: imgUrl }]);
    setLoading(true);

    const formData = new FormData(); 
    formData.append('image', file);
    try {
      const res = await fetch("http://localhost:8000/api/vision", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Vision inference failed.");
      
      setMessages(prev => [...prev, { role: 'assistant', text: `👁️ **Vision Protocol Analysis:**\n\n${data.answer}` }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Vision Error: ${err.message}` }]);
    } finally {
      setLoading(false);
      if (imageInputRef.current) imageInputRef.current.value = null;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedPdfUrl(URL.createObjectURL(file));
    setUploading(true);
    setMessages(prev => [...prev, { role: 'assistant', text: `⏳ Analyzing '${file.name}' into vector space...` }]);

    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await fetch("http://localhost:8000/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setMessages(prev => [...prev, { 
        role: 'assistant', text: `✅ **Success!** I have ingested *${file.name}*.\n\n**🤖 Executive Summary:**\n${data.summary}\n\nWhat questions do you have?` 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Error: ${err.message}` }]);
      setSelectedPdfUrl(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  const handleSend = async (overrideText = null) => {
    const userMsg = overrideText || input.trim();
    if (!userMsg) return;
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    if(!overrideText) setInput('');
    setLoading(true);
    
    if (messages.length === 1) {
        fetch("http://localhost:8000/api/title", {
           method: "POST", headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ query: userMsg })
        }).then(r=>r.json()).then(data => {
           setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, name: data.title } : s));
        }).catch(()=>{});
    }

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg, chat_history: chatHistoryStr, language: targetLanguage, search_mode: searchMode })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Our backend server rejected the query.");
      
      setMessages(prev => [...prev, { 
        role: 'assistant', text: data.answer, sources: data.sources, suggestions: data.suggestions
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ API Error: ${err.message}` }]);
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!isLoggedIn) {
    return (
      <div className="app-container login-screen" data-theme={theme}>
        <div className="blob blob-1"></div><div className="blob blob-2"></div>
        <div className="glass-panel login-card">
          <h2>📚 GenAI Research Gateway</h2>
          <p>Please enter your Authorized Researcher Key.</p>
          <input type="password" className="login-input" placeholder="Researcher Key" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && password === 'admin' ? setIsLoggedIn(true) : null} />
          <button onClick={() => password === 'admin' ? setIsLoggedIn(true) : alert('Invalid')} className="send-btn login-btn" style={{marginBottom: "10px"}}>Access AI Brain</button>
          <button onClick={() => setIsLoggedIn(true)} className="action-btn login-btn">Access as Guest</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${selectedPdfUrl ? 'split-view' : ''}`} data-theme={theme}>
      <div className="blob blob-1"></div><div className="blob blob-2"></div>

      <aside className="chat-history-sidebar glass-panel">
         <button className="new-chat-btn" onClick={createNewChat}>➕ New Chat</button>
         <p className="sidebar-title">Recent Threads</p>
         <div className="sessions-list">
            {sessions.map(s => (
               <div key={s.id} className={`session-item ${s.id === activeSessionId ? 'active' : ''}`} onClick={() => setActiveSessionId(s.id)}>
                   💬 {s.name}
               </div>
            ))}
         </div>
         <p className="sidebar-footer">Powered by FAISS RAG</p>
      </aside>

      <div className={`dev-sidebar glass-panel ${showDevPanel ? 'open' : ''}`}>
         <h3>📊 Live AI Metrics</h3>
         <ul>
            <li><strong>Engine:</strong> {metrics.model}</li>
            <li><strong>Vector Dims:</strong> {metrics.vectors} chunks</li>
            <li><strong>Memory Disks:</strong> {metrics.pdfs} Active PDFs</li>
            <li><strong>Uptime:</strong> {metrics.uptime} seconds</li>
            <li><strong>LLM Grounding:</strong> RAG + YouTube</li>
            <li><strong>Web Fallback Agent:</strong> DuckDuckGo</li>
         </ul>
      </div>

      <main className="glass-panel main-chat">
        <header className="chat-header">
          <h1>📚 GenAI Research Assistant</h1>
          
          <div className="action-bar header-tools">
            <button className="dev-toggle-btn" onClick={() => setShowDevPanel(!showDevPanel)}>
              {showDevPanel ? "Close Analytics" : "⚙️ Diagnostics"}
            </button>
            <select className="lang-select" value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
               <option value="English">🇺🇸 English</option>
               <option value="Spanish">🇪🇸 Español</option>
               <option value="French">🇫🇷 Français</option>
               <option value="Hindi">🇮🇳 Hindi</option>
            </select>
            <select className="lang-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
               <option value="glass">🌌 Glassmorphism</option>
               <option value="oled">🌑 OLED Dark Mode</option>
               <option value="clinical">☀️ Clinical White</option>
            </select>
            <select className="lang-select" style={{background: searchMode === 'web' ? 'rgba(56, 189, 248, 0.4)' : ''}} value={searchMode} onChange={(e) => setSearchMode(e.target.value)}>
               <option value="pdf">📚 Search PDF Models</option>
               <option value="web">🌐 Explicit Internet Search</option>
            </select>
          </div>

          <div className="action-bar">
            <button className="action-btn" onClick={exportLog}>📥 Export Log</button>
            <button className="action-btn danger-btn" onClick={resetDashboard}>🧠 Wipe All</button>
            
            <button className="action-btn" style={{color: '#f87171'}} onClick={ingestYouTube} disabled={uploading}>
              {uploading ? "⏳..." : "▶️ YouTube"}
            </button>

            <button className="action-btn" style={{color: '#34d399'}} onClick={ingestWebsite} disabled={uploading}>
              {uploading ? "⏳..." : "🔗 Web Link"}
            </button>

            <input type="file" accept="image/*" ref={imageInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
            <button className="action-btn" style={{color: '#c084fc'}} onClick={() => imageInputRef.current?.click()} disabled={uploading || loading}>
              {loading ? "⏳..." : "📸 Analyze Chart"}
            </button>

            <div className="upload-container">
              <input type="file" accept="application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
              <button className="action-btn upload-btn" style={{color: '#60a5fa'}} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? "⏳ Analyzing..." : "➕ Upload Dynamic PDF"}
              </button>
            </div>
          </div>
        </header>

        <div className="messages-container">
          {messages.map((msg, i) => (
             <div key={i} className={`message-wrapper ${msg.role === 'user' ? 'align-right' : 'align-left'}`}>
               <div className={`message-bubble ${msg.role}`}>
                 
                 {msg.role === 'assistant' ? (
                   <TypewriterMessage msgObj={msg} onComplete={() => {
                       if (handsFreeRef.current) handleSpeak(msg.text); // Autonomous Loop: Typewriter done -> Instantly read aloud
                   }} />
                 ) : (
                   <>
                     {msg.image && <img src={msg.image} alt="Upload" style={{maxWidth: '100%', borderRadius: '10px', display: 'block', marginBottom: '10px'}} />}
                     <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                   </>
                 )}
                
                 {msg.role === 'assistant' && (
                   <div className="ai-buttons">
                     <button className="voice-btn" onClick={() => handleSpeak(msg.text)}>🔊 Translate & Speak</button>
                   </div>
                 )}

                 {msg.suggestions && msg.suggestions.length > 0 && (
                   <div className="suggestion-chips">
                      <p className="chip-title">✨ Predictive Follow-Ups:</p>
                      {msg.suggestions.map((sug, idx) => (
                         <button key={idx} className="chip-option" onClick={() => handleSend(sug)}>
                           {sug}
                         </button>
                      ))}
                   </div>
                 )}
               </div>
             </div>
          ))}
          {loading && (
            <div className="message-wrapper align-left">
              <div className="message-bubble assistant loading-indicator"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>

        <div className="input-area">
          <textarea placeholder={searchMode === 'web' ? 'Ask an open-ended Internet Question...' : `Ask your AI directly in ${targetLanguage}...`} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} rows={1} />
          
          <button onClick={() => {
             const val = !handsFreeMode;
             setHandsFreeMode(val); handsFreeRef.current = val;
             if(val) toggleListening(); else window.speechSynthesis.cancel();
          }} className={`mic-btn ${handsFreeMode ? 'listening' : ''}`} style={{ width: 'auto', padding: '0 15px', borderRadius: '15px' }} title="Continuous Conversation">
             {handsFreeMode ? "🛑 End Voice Mode" : "🎙️ Advanced Voice Mode"}
          </button>
          
          <button onClick={toggleListening} className={`mic-btn ${isListening && !handsFreeMode ? 'listening' : ''}`} title="Voice Dictation">🎤</button>
          <button onClick={() => handleSend(input)} disabled={!input.trim() || loading} className="send-btn">{loading ? "..." : "Send"}</button>
        </div>
      </main>

      {selectedPdfUrl && (
        <aside className="pdf-viewer-pane"><iframe src={selectedPdfUrl} title="PDF Viewer" width="100%" height="100%" frameBorder="0" /></aside>
      )}
    </div>
  );
}

export default App;
