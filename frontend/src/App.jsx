import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  // Security Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');

  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your advanced Academic Assistant! I have securely parsed and modeled your Pdfs into our mathematical FAISS vector space. What would you like to ask?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistoryStr, setChatHistoryStr] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(null);
  const fileInputRef = useRef(null);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, uploading]);

  // Voice Interaction - Next-Gen feature
  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance();
      // Remove generic markdown symbols from speech
      msg.text = text.replace(/[*#]/g, '');
      window.speechSynthesis.speak(msg);
    } else {
      alert("Your browser does not support AI Voice Synthesis.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const instantVisualUrl = URL.createObjectURL(file);
    setSelectedPdfUrl(instantVisualUrl);

    setUploading(true);
    setMessages(prev => [...prev, { role: 'assistant', text: `⏳ Uploading and deeply analyzing '${file.name}'... The AI is mathematically processing the document now.` }]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: `✅ **Success!** I have mathematically processed and ingested *${file.name}*.\n\n**🤖 Automated Executive Summary:**\n${data.summary}\n\nWhat highly specific questions do you have about this research?` 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Error during upload: ${err.message}` }]);
      setSelectedPdfUrl(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg, chat_history: chatHistoryStr })
      });

      if (!res.ok) throw new Error("Our backend server rejected the query.");

      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: data.answer,
        sources: data.sources 
      }]);

      setChatHistoryStr(prev => prev + `User: ${userMsg}\nAI: ${data.answer}\n`);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ API Error (Is your FastAPI server running?): ${err.message}` }]);
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

  // 1. Authorized Auth Portal View
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
          <button 
             onClick={() => password === 'admin' ? setIsLoggedIn(true) : alert('Invalid Security Key!')} 
             className="send-btn login-btn"
          >
             Access AI Portal
          </button>
        </div>
      </div>
    );
  }

  // 2. Main Verified PDF Portal View
  return (
    <div className={`app-container ${selectedPdfUrl ? 'split-view' : ''}`}>
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <main className="glass-panel main-chat">
        <header className="chat-header">
          <h1>📚 GenAI Research Assistant</h1>
          <p>Powered by FastAPI, LangChain, and Meta Llama 3</p>
          
          <div className="upload-container">
            <input 
               type="file" 
               accept="application/pdf"
               ref={fileInputRef}
               style={{ display: 'none' }}
               onChange={handleFileUpload}
            />
            <button 
              className="upload-btn" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "⏳ Training AI on new PDF..." : "➕ Upload Dynamic PDF to AI Brain"}
            </button>
          </div>
        </header>

        <div className="messages-container">
          {messages.map((msg, i) => (
            <div key={i} className={`message-wrapper ${msg.role === 'user' ? 'align-right' : 'align-left'}`}>
              <div className={`message-bubble ${msg.role}`}>
                <p>{msg.text}</p>
                
                {msg.role === 'assistant' && (
                  <button className="voice-btn" onClick={() => handleSpeak(msg.text)}>🔊 Read Aloud</button>
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <details className="citation-box">
                    <summary>📄 View Source Citations</summary>
                    <div className="citation-content">
                      {msg.sources.map((s, idx) => (
                        <div key={idx} className="source-item">
                          <strong>Source {idx + 1}: {s.source_file} (Page {s.page})</strong>
                          <p className="source-snippet">"{s.page_content}"</p>
                        </div>
                      ))}
                    </div>
                  </details>
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
          <button onClick={handleSend} disabled={!input.trim() || loading} className="send-btn">
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
