# System Architecture

This document describes the planned architecture for our early-stage RAG pipeline.

## 1. Data Ingestion & Preprocessing
- **Source:** User provides PDFs of academic papers in the `research-papers/` directory.
- **Loader:** Uses `PyMuPDF` or `Langchain PDFLoaders` to extract raw text from documents.
- **Chunking:** The extracted text is split into overlapping chunks (e.g., 500 tokens per chunk with a 50-token overlap) to ensure logical continuity of sentences while preserving vector density.

## 2. Embedding & Indexing
- **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2` (or similar) will map the text chunks into dense, high-dimensional vector representations.
- **Vector Store:** These vectors will be loaded into a local vector database (like `FAISS` or `ChromaDB`) to enable fast similarity search.

## 3. Query & Retrieval
- When a user submits a prompt, the system embeds the query using the same Embedding Model.
- A $k$-Nearest Neighbors (k-NN) search is executed on the Vector Store.
- The top-$k$ most relevant text chunks are returned.

## 4. Generation (LLM)
- The user query and the retrieved top-$k$ text chunks are combined into an augmented prompt.
- **Prompt Template:**
  ```text
  You are an academic assistant. Using the following retrieved document excerpts, answer the user's question. 
  
  Context:
  {retrieved_chunks}

  Question:
  {user_query}
  ```
- The LLM processes the prompt and returns the generated answer back to the user.
