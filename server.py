import os
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
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
    if not rag_chain:
        raise HTTPException(status_code=500, detail="The AI brain isn't initialized yet. Please upload a PDF first!")
    
    try:
        response = rag_chain.invoke({
            "input": request.query,
            "chat_history": request.chat_history
        })
        
        answer = response["answer"]
        sources = []
        
        # 🌐 AGENTIC HYBRID RAG: Live Internet Web Search Fallback!
        if "don't know" in answer.lower() or "not present in the context" in answer.lower():
            try:
                from langchain_community.tools import DuckDuckGoSearchRun
                from langchain_groq import ChatGroq
                from langchain_core.prompts import PromptTemplate
                
                # Fetch live data autonomously
                search = DuckDuckGoSearchRun()
                web_results = search.run(request.query)
                
                # Resynthesize web data through Llama 3
                llm = ChatGroq(temperature=0.4, model_name="llama-3.1-8b-instant")
                fallback_prompt = PromptTemplate.from_template(
                    "You are a helpful AI assistant. The user asked: '{query}'. Provide a highly accurate, brief answer using strictly this live internet data: {web_data}"
                )
                fallback_chain = fallback_prompt | llm
                fallback_ans = fallback_chain.invoke({"query": request.query, "web_data": web_results[:3000]})
                
                answer = "🌐 *Web Search Fallback Triggered*\n\n" + fallback_ans.content
                sources.append({
                    "page_content": web_results[:400] + "...", 
                    "source_file": "Live Internet (DuckDuckGo Engine)", 
                    "page": "Web Search"
                })
            except Exception as e:
                # If internet crashes, default to simple failure safely
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
            "sources": sources
        }
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
            pass # Failsafe against write-locks
    return {"success": True, "message": "Memory Wiped"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
