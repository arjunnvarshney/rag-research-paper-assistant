import React, { useState, useRef, useEffect } from 'react';
import './App.css';

// ⌨️ FEATURE: Simulated LLM Typing Engine
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
    }, 10); // Streaming speed
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

  const fileInputRef = useRef(null);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, uploading]);

  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance();
      msg.text = text.replace(/[*#]/g, '');
      window.speechSynthesis.speak(msg);
    }
  };

  const toggleListening = () => {
    if (!SpeechRecognition) {
      alert("Microphone unsupported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev.endsWith(' ') ? '' : ' ') + transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const exportLog = () => {
    let logText = "👨‍🔬 GenAI Academic Research Log\n===============================\n\n";
    messages.forEach(m => {
      logText += `[${m.role.toUpperCase()}]:\n${m.text}\n\n--------------------\n`;
    });
    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Research_Thesis_Log.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetDashboard = async () => {
    if (!window.confirm("Are you sure you want to securely wipe the AI's FAISS mathematical memory?")) return;
    try { await fetch("http://localhost:8000/api/wipe", { method: "POST" }); } catch (e) { }
    setMessages([{ role: 'assistant', text: '🧹 Memory professionally wiped. Starting a fresh research session! Please upload a new PDF.' }]);
    setChatHistoryStr('');
    setSelectedPdfUrl(null);
    setInput('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const instantVisualUrl = URL.createObjectURL(file);
    setSelectedPdfUrl(instantVisualUrl);

    setUploading(true);
    setMessages(prev => [...prev, { role: 'assistant', text: `⏳ Analyzing '${file.name}' into vector space...` }]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch("http://localhost:8000/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: `✅ **Success!** I have ingested *${file.name}*.\n\n**🤖 Executive Summary:**\n${data.summary}\n\nWhat questions do you have?` 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Error: ${err.message}` }]);
      setSelectedPdfUrl(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  // 🔮 FEATURE: Overridden Send command dynamically triggers clicks from suggestion chips!
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
        body: JSON.stringify({ query: userMsg, chat_history: chatHistoryStr })
      });

      if (!res.ok) throw new Error("Our backend server rejected the query.");

      const data = await res.json();
      
      // Inject AI response + 3 secret suggested Prompts
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: data.answer,
        sources: data.sources,
        suggestions: data.suggestions
      }]);

      setChatHistoryStr(prev => prev + `User: ${userMsg}\nAI: ${data.answer}\n`);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ API Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="app-container login-screen">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="glass-panel login-card">
          <h2>🔐 Authorized Access Only</h2>
          <p>Please log in to your Academic Dashboard.</p>
          <input 
             type="password" 
             className="login-input"
             placeholder="Enter Security Key (Hint: admin)" 
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && password === 'admin' ? setIsLoggedIn(true) : null}
          />
          <button onClick={() => password === 'admin' ? setIsLoggedIn(true) : alert('Invalid Key')} className="send-btn login-btn">
             Access AI Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${selectedPdfUrl ? 'split-view' : ''}`}>
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <main className="glass-panel main-chat">
        <header className="chat-header">
          <h1>📚 GenAI Research Assistant</h1>
          <p>Powered by FastAPI, LangChain, and Meta Llama 3</p>
          
          <div className="action-bar">
            <button className="action-btn" onClick={exportLog} title="Export to .txt">📥 Export Log</button>
            <button className="action-btn danger-btn" onClick={resetDashboard} title="Wipe Dashboard Memory">🧠 Reset AI</button>

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
                 
                 {/* Trigger Animated Stream effect if AI, or print User Text flatly */}
                 {msg.role === 'assistant' ? (
                   <TypewriterMessage msgObj={msg} />
                 ) : (
                   <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                 )}
                
                 {msg.role === 'assistant' && (
                   <div className="ai-buttons">
                     <button className="voice-btn" onClick={() => handleSpeak(msg.text)}>🔊 Read Voice</button>
                   </div>
                 )}

                 {/* Render 🔮 Predictive Copilot Follow-Up Question Chips */}
                 {msg.suggestions && msg.suggestions.length > 0 && (
                   <div className="suggestion-chips">
                      <p className="chip-title">✨ Suggested Follow-Ups:</p>
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
              <div className="message-bubble assistant loading-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>

        <div className="input-area">
          <textarea 
            placeholder="Ask a specific academic question based on your uploaded research..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button onClick={toggleListening} className={`mic-btn ${isListening ? 'listening' : ''}`} title="Voice Dictation">🎤</button>
          <button onClick={() => handleSend(input)} disabled={!input.trim() || loading} className="send-btn">
            {loading ? "..." : "Send"}
          </button>
        </div>
      </main>

      {selectedPdfUrl && (
        <aside className="pdf-viewer-pane">
           <iframe src={selectedPdfUrl} title="PDF Viewer" width="100%" height="100%" frameBorder="0" />
        </aside>
      )}
    </div>
  );
}

export default App;
