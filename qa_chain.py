import os
from dotenv import load_dotenv

# Langchain core imports
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableParallel
from langchain_core.output_parsers import StrOutputParser
from operator import itemgetter

load_dotenv()

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

def load_vector_store(db_path="faiss_index"):
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)
    # allow_dangerous_deserialization is required locally to load the pickle file from FAISS
    vector_store = FAISS.load_local(db_path, embeddings, allow_dangerous_deserialization=True)
    return vector_store

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def create_rag_chain(vector_store):
    """
    Creates the final Conversational RAG chain returning both memories and source citations.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    retriever = vector_store.as_retriever(search_kwargs={"k": 3})
    
    llm = ChatGroq(temperature=0, model_name="llama-3.1-8b-instant")
    
    template = """You are a highly intelligent academic Research Paper Assistant.
For any questions regarding facts, concepts, or information, you MUST answer based strictly on the provided Context excerpts. If the answer is not present in the Context, you must say "I don't know based on the provided research papers," do not guess or hallucinate outside facts.
However, you are allowed to politely respond to simple casual greetings or conversational pleasantries (like "hello", "hi", "how are you", "okay", "thanks") in a friendly manner without referencing the context.

Chat History: 
{chat_history}

Context: 
{context}

Question: {input}

Detailed, academic Answer:"""
    
    prompt = PromptTemplate.from_template(template)
    
    # Inner Chain: Formats the documents string and predicts an answer
    rag_chain_from_docs = (
        RunnablePassthrough.assign(context=(lambda x: format_docs(x["context"])))
        | prompt
        | llm
        | StrOutputParser()
    )
    
    # Outer Chain: Passes the retrieved documents through without converting them to a string 
    # so we can use them for our UI Citations!
    rag_chain_with_source = RunnableParallel(
        {
            "context": itemgetter("input") | retriever, 
            "input": itemgetter("input"), 
            "chat_history": itemgetter("chat_history")
        }
    ).assign(answer=rag_chain_from_docs)
    
    return rag_chain_with_source
