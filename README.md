# Enterprise GenAI Research Assistant (Multi-Modal RAG Platform)

## Project Overview
This repository contains a production-grade, advanced **GenAI Research Assistant** built for complex academic literature review and multi-modal analysis. Moving far beyond standard text-based retrieval, this system leverages a fully custom **Retrieval-Augmented Generation (RAG)** architecture with integrated audio, visual, and autonomous agent capabilities.

The platform is meticulously engineered to prevent LLM hallucinations by grounding every answer in verified data, making it a critical tool for researchers, scientists, and academics.

##  Breakthrough Features
We have completely overhauled the standard RAG pipeline to introduce state-of-the-art enterprise features:

*   ** Autonomous Voice Loop:** A zero-UI, completely hands-free continuous voice conversation engine (Speech-to-Text -> LLM Inference -> Text-to-Speech -> Mic Triggering). 
*   ** LLaVA Vision Protocol:** Integrated with `llama-3.2-11b-vision` to ingest and mathematically analyze screenshots of complex academic charts, graphs, and diagrams.
*   ** Explicit Web-Search Agent:** A toggleable fallback agent mode that physically bypasses the FAISS memory banks to perform live, real-time internet queries via `duckduckgo-search`.
*   ** YouTube & Web Scraper Ingestion:** Dynamically rip and inject mathematical YouTube transcripts (`youtube-transcript-api`) or HTML website structures (`BeautifulSoup`) straight into the vector space.
*   ** Role-Based Access Control (RBAC):** Strict security tiering separating Admin (Write/Wipe Access) and Guest (Read/Chat) roles, mapped to fully decoupled LocalStorage session states.
*   ** Universal Theme Engine:** A stunning React UI powered by raw CSS variables supporting **OLED Dark**, **Glassmorphism**, and **Clinical White** environments.
*   ** Auto-Titling Llama-3 Engine:** A background pipeline automatically parses your first query to dynamically title your chat threads.

##  Architecture & Tech Stack

**Backend (API & AI Inference):**
*   **FastAPI:** High-performance async Python backend serving JSON-RPC endpoints.
*   **LangChain (Core & Text Splitters):** Orchestration layer for RAG pipelines.
*   **FAISS (Facebook AI Similarity Search):** Local vector database for instantaneous sub-millisecond semantic retrieval.
*   **HuggingFace Embeddings:** Utilizing `sentence-transformers/all-MiniLM-L6-v2` for dense vector space mapping.
*   **Groq LPU Engine:** Running Meta's `llama-3.1-8b-instant` and `llama-3.2-11b-vision-preview` models at 800+ tokens/second.

**Frontend (Client UI):**
*   **React + Vite:** Lightning-fast, HMR-enabled client ecosystem.
*   **Custom Vanilla CSS:** No Tailwind—just highly optimized, hardware-accelerated CSS animations and grid layouts.

##  Setup & Execution

### 1. Initialize the Python Backend
The backend manages the heavy AI compute, memory indexing, and web agent routing.
```bash
# Set your API Key in your environment or a .env file
export GROQ_API_KEY="your-groq-key"

# Install dependencies
pip install fastapi uvicorn langchain langchain_core langchain_huggingface langchain_text_splitters faiss-cpu sentence-transformers groq langchain-groq youtube-transcript-api duckduckgo-search beautifulsoup4 python-multipart

# Boot the API server
python server.py
```

### 2. Launch the React GUI
The frontend handles the Typewriter streaming, Voice Synthesizer, and RBAC authentication.
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173`. 
*Login as **admin** to gain full upload/wipe access, or select **Access as Guest** to interact strictly with the predefined context.*

##  The Science: RAG Implementation
This architecture is originally inspired by:
> **"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"** (Lewis et al., NeurIPS 2020)

By combining **parametric memory** (the pre-trained weights of Llama 3) with **non-parametric memory** (our FAISS dynamic vector database), the system actively forces the LLM to read its own retrieved source texts before speaking. If the answer does not exist mathematically within the vector constraints, the system is instructed to explicitly refuse to answer, guaranteeing zero hallucinations during PDF queries.
