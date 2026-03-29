import os
import glob
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

def load_all_pdfs(directory_path):
    """
    Loads all PDF documents from the specified directory and returns a list of Langchain Document objects.
    """
    pdf_files = glob.glob(os.path.join(directory_path, "*.pdf"))
    all_documents = []
    
    print(f"Loading PDFs from: {directory_path}...")
    if not pdf_files:
        print("No PDF files found in the directory.")
        return all_documents
        
    for file_path in pdf_files:
        print(f" - Loading: {os.path.basename(file_path)}")
        try:
            loader = PyMuPDFLoader(file_path)
            documents = loader.load()
            # Adding an identifier to metadata so we know the source
            for doc in documents:
                doc.metadata['source_file'] = os.path.basename(file_path)
            all_documents.extend(documents)
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            
    return all_documents

def chunk_documents(docs, chunk_size=1000, chunk_overlap=200):
    """
    Splits a list of Documents into smaller overlapping chunks to preserve context efficiently.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    
    print("Chunking documents...")
    chunks = text_splitter.split_documents(docs)
    return chunks

if __name__ == "__main__":
    # Define the directory containing research papers
    # We use the absolute path relative to this script
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PAPER_DIR = os.path.join(BASE_DIR, "research-papers")
    
    print("=== Step 1: Document Ingestion and Chunking ===")
    
    # 1. Load PDFs
    pages = load_all_pdfs(PAPER_DIR)
    print(f"\n✅ Successfully loaded {len(pages)} total pages from {len(set(doc.metadata.get('source_file') for doc in pages))} PDFs.\n")
    
    if pages:
        # Print a sample from the first page
        print("--- Sample text from loaded documents ---")
        print(pages[0].page_content[:300].replace('\n', ' ') + "...\n")
        
        # 2. Chunk Documents
        document_chunks = chunk_documents(pages, chunk_size=1000, chunk_overlap=200)
        print(f"\n✅ Successfully split the text into {len(document_chunks)} discrete chunks.\n")
        
        # Print a sample chunk
        print("--- Sample Chunk [Chunk 0] ---")
        print(f"Source: {document_chunks[0].metadata.get('source_file')} | Page: {document_chunks[0].metadata.get('page')}")
        print("-" * 50)
        print(document_chunks[0].page_content)
        print("-" * 50)
        
        print("\nStep 1 Complete! The system has successfully ingested the academic PDFs and chunked them, ready for Vector Embedding.")
    else:
        print("No documents were loaded. Please check the 'research-papers' directory.")
