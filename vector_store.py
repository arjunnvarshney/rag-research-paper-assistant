import os
from langchain_community.vectorstores import FAISS
from shared_resources import get_embeddings
from ingest import load_all_pdfs, chunk_documents

def create_vector_store(chunks, db_path="faiss_index"):
    """
    Embeds document chunks into continuous vector space and saves them into a local FAISS index.
    """
    embeddings = get_embeddings()
    
    print(f"Embedding {len(chunks)} chunks and building FAISS index. This may take a moment...")
    vector_store = FAISS.from_documents(chunks, embeddings)
    
    print(f"Saving vector database locally to '{db_path}' ...")
    vector_store.save_local(db_path)
    
    return vector_store

if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PAPER_DIR = os.path.join(BASE_DIR, "research-papers")
    DB_PATH = os.path.join(BASE_DIR, "faiss_index")
    
    print("=== Step 2: Vector Embedding & Database Assembly ===")
    
    # Reuse Stage 1 logic to retrieve fresh chunks
    print("\n-> Executing Step 1 (Ingestion) to gather chunks...")
    pages = load_all_pdfs(PAPER_DIR)
    
    if pages:
        document_chunks = chunk_documents(pages, chunk_size=1000, chunk_overlap=200)
        print(f"Successfully generated {len(document_chunks)} chunks for embedding.\n")
        
        # Proceed with Step 2 Database Creation
        print("-> Executing Step 2: Vectorization & Storage")
        vector_store = create_vector_store(document_chunks, DB_PATH)
        
        print(f"\n✅ Step 2 Complete! The FAISS vector database has been successfully created and saved at: {DB_PATH}")
        print("The chunks have been geometrically indexed. You are now ready for Retrieval and LLM Integration!")
    else:
        print("No documents were loaded from the 'research-papers' directory.")
