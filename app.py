import streamlit as st
import os

# Import our backend RAG pipeline components
from qa_chain import load_vector_store, create_rag_chain

st.set_page_config(page_title="GenAI Paper Assistant", page_icon="📚", layout="wide")

st.title("📚 GenAI Research Paper Assistant")
st.markdown("Ask highly specific academic questions based on your ingested research papers! Powered by **FAISS**, **LangChain**, and **Meta Llama 3**.")

# 1. Initialize the RAG Backend 
@st.cache_resource(show_spinner="Loading Vector Database and LLM...")
def initialize_system():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, "faiss_index")
    vector_store = load_vector_store(DB_PATH)
    rag_chain = create_rag_chain(vector_store)
    return rag_chain

rag_chain = initialize_system()

if not rag_chain:
    st.error("⚠️ GROQ_API_KEY is missing! Please check your .env file.")
    st.stop()

# 2. Setup visual Chat Memory in Streamlit Session State
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "assistant", "content": "Hello! I have loaded your research papers into the mathematical vector space. What would you like to know about them?"}
    ]
if "chat_history_str" not in st.session_state:
    st.session_state.chat_history_str = ""

# Display previous chat history on page reload
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        # If it was an AI message that had citations attached, we could render them here, 
        # but for simplicity we only print text on reload.

# 3. Handle User Chat Input
if prompt := st.chat_input("Ask a question about the papers (e.g., 'What problem does GraphRAG solve?')..."):
    
    # Immediately render user question to UI
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
        
    # Generate Assistant Response
    with st.chat_message("assistant"):
        with st.spinner("🧠 Searching Documents via Semantic Similarity & GenAI..."):
            try:
                # Query our backend LCEL chain, injecting memory
                response = rag_chain.invoke({
                    "input": prompt,
                    "chat_history": st.session_state.chat_history_str
                })
                
                answer = response["answer"]
                source_docs = response["context"]
                
                # Render the final answer
                st.markdown(answer)
                
                # Render highly requested CITATIONS feature!
                with st.expander("📄 View Source Citations"):
                    for i, doc in enumerate(source_docs):
                        source_file = doc.metadata.get('source_file', 'Unknown Document')
                        page_num = doc.metadata.get('page', '?')
                        st.markdown(f"**Source {i+1}: {source_file} (Page {page_num})**")
                        st.caption(doc.page_content[:400] + "...")
                
                # Append assistant reply to visual chat history
                st.session_state.messages.append({"role": "assistant", "content": answer})
                
                # Update hidden internal chat memory for the LLM context
                st.session_state.chat_history_str += f"User: {prompt}\nAI: {answer}\n"
                
            except Exception as e:
                error_msg = f"Error generating answer: {e}"
                st.error(error_msg)
                st.session_state.messages.append({"role": "assistant", "content": error_msg})
