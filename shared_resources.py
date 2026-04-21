from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

# Singleton instance to save RAM on memory-constrained environments like Render Free Tier (512MB)
EMBEDDING_MODEL_NAME = "BAAI/bge-small-en-v1.5"

_embeddings = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        print(f"Loading shared embedding model: {EMBEDDING_MODEL_NAME}...")
        _embeddings = FastEmbedEmbeddings(model_name=EMBEDDING_MODEL_NAME)
    return _embeddings
