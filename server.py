import os
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Import our backend RAG pipeline components
from qa_chain import load_vector_store, create_rag_chain
from ingest import load_all_pdfs, chunk_documents
from vector_store import create_vector_store

load_dotenv()

app = FastAPI(title="Dynamic RAG AI Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "faiss_index")
DATASET_DIR = os.path.join(BASE_DIR, "dataset")

import time
START_TIME = time.time()

# Global variables so that we can HOT-SWAP the brain when a new PDF is uploaded!
global vector_store
global rag_chain

print("Initializing AI Brain...")
try:
    vector_store = load_vector_store(DB_PATH)
    rag_chain = create_rag_chain(vector_store)
except Exception as e:
    print(f"Warning: Database not found or corrupt. AI will initialize upon first PDF upload. ({e})")
    vector_store = None
    rag_chain = None

class ChatRequest(BaseModel):
    query: str
    chat_history: str = ""
    language: str = "English"
    search_mode: str = "pdf" # 'pdf' or 'web'

@app.get("/api/metrics")
async def get_metrics():
    global vector_store
    uptime_seconds = int(time.time() - START_TIME)
    
    vec_count = 0
    if vector_store and hasattr(vector_store, "index"):
        vec_count = vector_store.index.ntotal
        
    pdf_count = 0
    if os.path.exists(DATASET_DIR):
        pdf_count = len([f for f in os.listdir(DATASET_DIR) if f.endswith(".pdf")])
        
    return {
        "uptime": uptime_seconds,
        "vectors": vec_count,
        "pdfs": pdf_count,
        "model": "Llama 3.1"
    }

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Dynamically ingests a user-uploaded PDF into the AI's mathematical brain.
    """
    global vector_store
    global rag_chain
    
    os.makedirs(DATASET_DIR, exist_ok=True)
    file_path = os.path.join(DATASET_DIR, file.filename)
    
    # Save the PDF to disk securely
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Dynamically trigger the ingestion pipeline!
        documents = load_all_pdfs(DATASET_DIR)
        chunks = chunk_documents(documents)
        
        # Completely re-create and save the FAISS vector index with the new chunks
        vector_store = create_vector_store(chunks, DB_PATH)
        rag_chain = create_rag_chain(vector_store)
        
        # 🚀 Generate Automated Executive Summary:
        # Extract the first 4 chunks (usually Title, Abstract, and Intro) of the uploaded file
        latest_chunks = [c.page_content for c in chunks if c.metadata.get("source_file") == file.filename][:4]
        combined_text = "\n\n".join(latest_chunks)
        
        summary = "No readable text found for summarization."
        if combined_text.strip():
            from langchain_groq import ChatGroq
            from langchain_core.prompts import PromptTemplate
            llm_summarizer = ChatGroq(temperature=0.2, model_name="llama-3.1-8b-instant")
            summary_prompt = PromptTemplate.from_template(
                "You are an expert academic researcher. Read the following introductory excerpts from a newly uploaded document named '{filename}':\n\n{text}\n\nWrite a concise 2-paragraph executive summary detailing the core problem and the proposed solution of this paper. Make it sound extremely professional and engaging."
            )
            summary_chain = summary_prompt | llm_summarizer
            summary_res = summary_chain.invoke({"filename": file.filename, "text": combined_text})
            summary = summary_res.content
        
        return {
            "success": True, 
            "message": f"'{file.filename}' processed safely.", 
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest document: {str(e)}")

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        from langchain_community.tools import DuckDuckGoSearchRun
        from langchain_groq import ChatGroq
        from langchain_core.prompts import PromptTemplate
        
        # 🌐 EXPLICIT WEB SEARCH AGENT MODE OVERRIDE
        if hasattr(request, 'search_mode') and request.search_mode == 'web':
            try:
                search = DuckDuckGoSearchRun()
                web_results = search.run(request.query)
            except Exception as e:
                web_results = f"DuckDuckGo Search Engine blocked the request (Rate Limit / Connection Error). Unable to fetch live data. Error trace: {str(e)}"
                
            llm = ChatGroq(temperature=0.4, model_name="llama-3.1-8b-instant")
            
            lang_instruction = f" You MUST translate your entire answer and output perfectly into {request.language}." if request.language != "English" else ""
            fallback_prompt = PromptTemplate.from_template(
                "You are an AI Web Engine. The user asked: '{query}'. Answer carefully relying ONLY on this real-time scraped web data: {web_data}\n\n(IMPORTANT:{lang_instruction} After your answer, append '|||' and 3 short follow-up questions separated by '|||'.)"
            )
            fallback_ans = (fallback_prompt | llm).invoke({"query": request.query, "web_data": web_results[:3000]})
            
            answer = "🌐 *Explicit Web Search Mode Triggered*\n\n"
            suggestions = []
            if "|||" in fallback_ans.content:
                f_parts = fallback_ans.content.split("|||")
                answer += f_parts[0].strip()
                suggestions = [p.strip() for p in f_parts[1:] if p.strip()][:3]
            else:
                answer += fallback_ans.content
                
            sources = [{"page_content": web_results[:400] + "...", "source_file": "DuckDuckGo Web Scraper Engine", "page": "Live Internet Data"}]
            return {"answer": answer, "sources": sources, "suggestions": suggestions}

        # 📄 STANDARD MULTI-MODAL FAISS PIPELINE
        if not rag_chain:
            raise HTTPException(status_code=500, detail="The AI brain isn't initialized yet. Please upload a PDF or YouTube link first!")
    
        # Secretly force the LLM to generate predicted follow-up queries and Translate!
        lang_instruction = f" You MUST translate your entire answer and output perfectly into {request.language}." if request.language != "English" else ""
        augmented_query = request.query + f"\n\n(IMPORTANT:{lang_instruction} At the very end of your answer, regardless of language, you MUST append the exact delimiter '|||' followed by exactly 3 short, intelligent suggested follow-up questions the user can ask next in {request.language}, separated by '|||'.)"
        
        response = rag_chain.invoke({
            "input": augmented_query,
            "chat_history": request.chat_history
        })
        
        raw_answer = response["answer"]
        sources = []
        suggestions = []
        
        # Parse out the secret suggestions
        if "|||" in raw_answer:
            parts = raw_answer.split("|||")
            answer = parts[0].strip()
            suggestions = [p.strip() for p in parts[1:] if p.strip()][:3] # Grab maximum 3 suggestions safely
        else:
            answer = raw_answer

        # 🌐 AGENTIC HYBRID RAG: Live Internet Web Search Fallback!
        if "don't know" in answer.lower() or "not present in the context" in answer.lower():
            try:
                search = DuckDuckGoSearchRun()
                web_results = search.run(request.query)
                
                llm = ChatGroq(temperature=0.4, model_name="llama-3.1-8b-instant")
                fallback_prompt = PromptTemplate.from_template(
                    "You are an AI. The user asked: '{query}'. Answer this using entirely live internet data: {web_data}\nAfter your answer, append '|||' and 3 short follow-up questions separated by '|||'."
                )
                fallback_ans = (fallback_prompt | llm).invoke({"query": request.query, "web_data": web_results[:3000]})
                
                # Check for suggestions in fallback!
                if "|||" in fallback_ans.content:
                    f_parts = fallback_ans.content.split("|||")
                    answer = "🌐 *Web Search Fallback Triggered*\n\n" + f_parts[0].strip()
                    suggestions = [p.strip() for p in f_parts[1:] if p.strip()][:3]
                else:
                    answer = "🌐 *Web Search Fallback Triggered*\n\n" + fallback_ans.content
                    
                sources.append({
                    "page_content": web_results[:400] + "...", 
                    "source_file": "Live Internet (DuckDuckGo Engine)", 
                    "page": "Web Search"
                })
            except Exception as e:
                pass
        else:
            # 📄 Traditional Document Citations
            for doc in response["context"]:
                sources.append({
                    "page_content": doc.page_content[:400] + "...", 
                    "source_file": doc.metadata.get("source_file", "Unknown Document"),
                    "page": doc.metadata.get("page", "?")
                })
            
        return {
            "answer": answer,
            "sources": sources,
            "suggestions": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/youtube")
async def upload_youtube(link: str = Form(...)):
    global vector_store, rag_chain
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from langchain.schema import Document
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        from vector_store import get_embeddings
        from langchain_community.vectorstores import FAISS
        
        if "v=" in link:
            video_id = link.split("v=")[1].split("&")[0]
        elif "youtu.be/" in link:
            video_id = link.split("youtu.be/")[1].split("?")[0]
        else:
            raise Exception("Invalid YouTube URL")
            
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        full_text = " ".join([t['text'] for t in transcript])
        
        docs = [Document(page_content=full_text, metadata={"source_file": f"YT Video (ID: {video_id})", "page": "Transcript"})]
        
        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)
        splits = splitter.split_documents(docs)
        
        if vector_store:
            vector_store.add_documents(splits)
        else:
            vector_store = FAISS.from_documents(splits, get_embeddings())
            
        vector_store.save_local(DB_PATH)
        rag_chain = create_rag_chain(vector_store)
        
        return {"success": True, "message": "YouTube Video dynamically vectorized and merged!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/wipe")
async def wipe_memory():
    """Destroys FAISS memory context permanently across sessions."""
    global vector_store, rag_chain
    vector_store = None
    rag_chain = None
    
    if os.path.exists(DATASET_DIR):
        try:
            shutil.rmtree(DATASET_DIR)
        except Exception:
            pass
            
    if os.path.exists(DB_PATH):
        try:
            shutil.rmtree(DB_PATH)
        except Exception:
            pass
            
    return {"success": True, "message": "Memory Wiped"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
