import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Import our backend RAG pipeline components exactly as they were!
from qa_chain import load_vector_store, create_rag_chain

load_dotenv()

app = FastAPI(title="RAG Research Assistant API")

# Allow requests from our React frontend so they can securely communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Initialize the RAG Backend System once on server boot
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "faiss_index")
print("Initializing LLM Vector System...")
vector_store = load_vector_store(DB_PATH)
rag_chain = create_rag_chain(vector_store)

if rag_chain is None:
    print("WARNING: GROQ_API_KEY is not set. The endpoint will fail.")

# 2. Define the Request Data Model
class ChatRequest(BaseModel):
    query: str
    chat_history: str = ""

# 3. Create the robust `/api/chat` Endpoint
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    if not rag_chain:
        raise HTTPException(status_code=500, detail="LLM Chain is not initialized. Check your Groq API keys.")
    
    try:
        # Pass the request to our LCEL architecture
        response = rag_chain.invoke({
            "input": request.query,
            "chat_history": request.chat_history
        })
        
        # Serialize the mathematical Document context into clean JSON for the React frontend
        sources = []
        for doc in response["context"]:
            sources.append({
                "page_content": doc.page_content[:400] + "...",  # Sending a snippet of the citation
                "source_file": doc.metadata.get("source_file", "Unknown Document"),
                "page": doc.metadata.get("page", "?")
            })
            
        # Deliver the payload back to React
        return {
            "answer": response["answer"],
            "sources": sources
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Start the robust Uvicorn ASGI Web Server
    uvicorn.run(app, host="127.0.0.1", port=8000)
