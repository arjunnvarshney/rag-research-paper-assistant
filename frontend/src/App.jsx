import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const TypewriterMessage = ({ msgObj, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    const interval = setInterval(() => {
       if (index < msgObj.text.length) {
         setDisplayedText(prev => prev + msgObj.text.charAt(index));
         index++;
       } else {
         clearInterval(interval);
         if (onComplete) onComplete();
       }
    }, 10);
    return () => clearInterval(interval);
  }, [msgObj.text]);

  const isDone = displayedText.length === msgObj.text.length;

  return (
    <>
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
    </>
  );
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');

  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your advanced Academic Assistant. I have securely parsed and modeled your PDFs into our mathematical FAISS vector space.\n\nWhat would you like to ask?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistoryStr, setChatHistoryStr] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(null);
  
  const [isListening, setIsListening] = useState(false);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // ENTERPRISE FEATURES: Language & Metrics
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [metrics, setMetrics] = useState({ uptime: 0, vectors: 0, pdfs: 0, model: 'Llama 3.1' });
  const [showDevPanel, setShowDevPanel] = useState(false);

  const fileInputRef = useRef(null);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, uploading]);

  useEffect(() => {
    if (isLoggedIn) {
      const pollMetrics = async () => {
        try {
          const res = await fetch("http://localhost:8000/api/metrics");
          const data = await res.json();
          if (res.ok) setMetrics(data);
        } catch(e) {}
      };
      pollMetrics(); // initial ping
      const interval = setInterval(pollMetrics, 5000); // 5 sec live tracking
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance();
      msg.text = text.replace(/[*#]/g, '');
      
      // Auto-detect browser voice language mapping
      if(targetLanguage === "Spanish") msg.lang = 'es-ES';
      if(targetLanguage === "French") msg.lang = 'fr-FR';
      if(targetLanguage === "Hindi") msg.lang = 'hi-IN';
      
      window.speechSynthesis.speak(msg);
    }
  };

  const toggleListening = () => {
    if (!SpeechRecognition) return alert("Microphone unsupported in this browser.");
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    // Map microphone to translation language
    if(targetLanguage === "Spanish") recognition.lang = 'es-ES';
    if(targetLanguage === "French") recognition.lang = 'fr-FR';
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => setInput(prev => prev + (prev.endsWith(' ') ? '' : ' ') + e.results[0][0].transcript);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const exportLog = () => {
    let logText = "👨‍🔬 GenAI Academic Research Log\n===============================\n\n";
    messages.forEach(m => { logText += `[${m.role.toUpperCase()}]:\n${m.text}\n\n--------------------\n`; });
    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Research_Thesis_Log.txt"; a.click(); URL.revokeObjectURL(url);
  };

  const resetDashboard = async () => {
    if (!window.confirm("Are you sure you want to securely wipe the AI's FAISS mathematical memory?")) return;
    try { await fetch("http://localhost:8000/api/wipe", { method: "POST" }); } catch (e) { }
    setMessages([{ role: 'assistant', text: '🧹 Memory professionally wiped. Starting a fresh research session! Please upload a new PDF.' }]);
    setChatHistoryStr(''); setSelectedPdfUrl(null); setInput(''); setMetrics({ ...metrics, vectors: 0, pdfs: 0 });
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

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg, chat_history: chatHistoryStr, language: targetLanguage })
      });
      if (!res.ok) throw new Error("Our backend server rejected the query.");
      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', text: data.answer, sources: data.sources, suggestions: data.suggestions
      }]);
      setChatHistoryStr(prev => prev + `User: ${userMsg}\nAI: ${data.answer}\n`);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ API Error: ${err.message}` }]);
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ---------------- UI RENDERS ---------------- //
  if (!isLoggedIn) {
    return (
      <div className="app-container login-screen">
        <div className="blob blob-1"></div><div className="blob blob-2"></div>
        <div className="glass-panel login-card">
          <h2>🔐 Corporate AI Portal</h2>
          <p>Please enter your Enterprise Security Key.</p>
          <input type="password" className="login-input" placeholder="Admin Key" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && password === 'admin' ? setIsLoggedIn(true) : null} />
          <button onClick={() => password === 'admin' ? setIsLoggedIn(true) : alert('Invalid')} className="send-btn login-btn">Access AI Brain</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${selectedPdfUrl ? 'split-view' : ''}`}>
      <div className="blob blob-1"></div><div className="blob blob-2"></div>

      {/* DEV ANALYTICS SIDEBAR OVERLAY */}
      <div className={`dev-sidebar glass-panel ${showDevPanel ? 'open' : ''}`}>
         <h3>📊 Live AI Metrics</h3>
         <ul>
            <li><strong>Engine:</strong> {metrics.model}</li>
            <li><strong>Vector Dimensions:</strong> {metrics.vectors} mathematical chunks</li>
            <li><strong>Memory Disks:</strong> {metrics.pdfs} Active PDFs</li>
            <li><strong>Server Uptime:</strong> {metrics.uptime} seconds</li>
            <li><strong>LLM Grounding:</strong> Strict RAG</li>
            <li><strong>Web Fallback Agent:</strong> DuckDuckGo Router</li>
         </ul>
      </div>

      <main className="glass-panel main-chat">
        <header className="chat-header">
          <h1>📚 GenAI Research Assistant</h1>
          <p>Powered by FastAPI, LangChain, and Meta Llama 3</p>
          
          <div className="action-bar header-tools">
            <button className="dev-toggle-btn" onClick={() => setShowDevPanel(!showDevPanel)}>
              {showDevPanel ? "Close Analytics" : "⚙️ View Live Analytics"}
            </button>
            <select className="lang-select" value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
               <option value="English">🇺🇸 English</option>
               <option value="Spanish">🇪🇸 Español</option>
               <option value="French">🇫🇷 Français</option>
               <option value="Hindi">🇮🇳 Hindi</option>
               <option value="Japanese">🇯🇵 日本語</option>
            </select>
          </div>

          <div className="action-bar">
            <button className="action-btn" onClick={exportLog}>📥 Export Log</button>
            <button className="action-btn danger-btn" onClick={resetDashboard}>🧠 Reset AI</button>

            <div className="upload-container">
              <input type="file" accept="application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
              <button className="upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
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
                   <TypewriterMessage msgObj={msg} />
                 ) : (
                   <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
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
          <textarea placeholder={`Ask your AI directly in ${targetLanguage}...`} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} rows={1} />
          <button onClick={toggleListening} className={`mic-btn ${isListening ? 'listening' : ''}`} title="Voice Dictation">🎤</button>
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
