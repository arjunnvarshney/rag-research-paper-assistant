import os
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_groq import ChatGroq

# Limit threading to save RAM on memory-constrained servers (512MB)
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
# Specific ONNX Runtime limits
os.environ["ORT_INTRA_OP_NUM_THREADS"] = "1"
os.environ["ORT_INTER_OP_NUM_THREADS"] = "1"
# Linux Memory Trimming (Very important for Render/Docker)
os.environ["MALLOC_TRIM_THRESHOLD_"] = "131072"

# Singleton instance to save RAM on memory-constrained environments like Render Free Tier (512MB)
# Switched to MiniLM-L6 which is ~90MB (40MB smaller than BGE-Small)
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_embeddings = None
_llm = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        print(f"Loading shared embedding model: {EMBEDDING_MODEL_NAME}...")
        _embeddings = FastEmbedEmbeddings(model_name=EMBEDDING_MODEL_NAME)
    return _embeddings

def get_llm(model_name="llama-3.1-8b-instant", temperature=0.4):
    global _llm
    if _llm is None:
        print(f"Initializing shared LLM: {model_name}...")
        _llm = ChatGroq(temperature=temperature, model_name=model_name)
    return _llm
