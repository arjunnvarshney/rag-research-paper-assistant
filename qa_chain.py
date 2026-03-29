import os
from dotenv import load_dotenv

# Langchain core imports
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from operator import itemgetter

# Load environment variables (.env files containing API keys)
load_dotenv()

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

def load_vector_store(db_path="faiss_index"):
    """
    Loads the geometrically indexed FAISS database from local storage exactly as created in Step 2.
    """
    print(f"Loading embedding model: {EMBEDDING_MODEL_NAME} ...")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)
    
    print(f"Loading local Vector Database from '{db_path}' ...")
    # allow_dangerous_deserialization is required locally to load the pickle file from FAISS
    vector_store = FAISS.load_local(db_path, embeddings, allow_dangerous_deserialization=True)
    return vector_store

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def create_rag_chain(vector_store):
    """
    Creates the final RAG chain, marrying the Document Retriever to the Generative LLM using modern LCEL.
    """
    # 1. Ensure API key is found
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("\n⚠️ WARNING: No GROQ_API_KEY found in your environment.")
        return None

    # 2. Convert VectorStore into an intelligent Retriever
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})
    
    # 3. Initialize the Generative LLM (Free Llama 3)
    llm = ChatGroq(temperature=0, model_name="llama-3.1-8b-instant")
    
    # 4. Construct a Strict Prompt Template
    template = """You are a highly intelligent academic Research Paper Assistant.
You must answer the user's question based strictly on the provided Context excerpts.
If the answer is not present in the Context, you must say "I don't know based on the provided research papers," do not guess or hallucinate any outside facts.

Context: 
{context}

Question: {input}

Detailed, academic Answer:"""
    
    prompt = PromptTemplate.from_template(template)
    
    # 5. Build the pipeline chain using LCEL (LangChain Expression Language)
    rag_chain = (
        {
            "context": itemgetter("input") | retriever | format_docs, 
            "input": itemgetter("input")
        }
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return rag_chain

def test_raw_retrieval(vector_store, query):
    """
    A diagnostic test to visually output exactly what the FAISS database finds for a given query.
    No LLM is used here.
    """
    print("\n" + "="*50)
    print(f"[Raw Retrieval Test - No LLM]")
    print(f"Question: '{query}'")
    print("="*50)
    
    retriever = vector_store.as_retriever(search_kwargs={"k": 2})
    docs = retriever.invoke(query)
    
    for i, doc in enumerate(docs):
        print(f"\n--- Retrieved Paragraph {i+1} [Source: {doc.metadata.get('source_file')}, Page: {doc.metadata.get('page')}] ---")
        print(doc.page_content[:350] + "...")
        print("-" * 50)

if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, "faiss_index")
    
    print("=== Step 3: Retriever Setup & LLM Integration ===")
    
    # Load database
    vector_store = load_vector_store(DB_PATH)
    
    # Scenario 1: Test raw vector mathematics
    sample_query = "What is GraphRAG?"
    test_raw_retrieval(vector_store, sample_query)
    
    # Scenario 2: Build and Test Full LLM Generation
    rag_chain = create_rag_chain(vector_store)
    
    if rag_chain:
        print(f"\n✅ Full RAG Chain Successfully Initialized! Generating answer via Groq LLM for: '{sample_query}'...\n")
        try:
            response = rag_chain.invoke({"input": sample_query})
            print("\n" + "="*50)
            print("🤖 Generated Academic Answer:")
            print("="*50)
            print(response)
            print("="*50 + "\n")
            print("Step 3 Complete! You have successfully built a working RAG AI for completely free!")
        except Exception as e:
            print(f"Error connecting to LLM: {e}")
    else:
        print("Skipping LLM Generation test until API key is provided.")
