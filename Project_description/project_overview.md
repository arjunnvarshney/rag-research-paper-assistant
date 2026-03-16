# Project Overview: GenAI Research Paper Assistant

## Objective
To build a Retrieval-Augmented Generation (RAG) assistant that allows users to seamlessly query dense academic texts and receive accurate, contextually relevant answers grounded in the provided literature.

## Motivation
Understanding complex research papers often requires sifting through dense academic jargon to find specific facts or methodologies. This project seeks to simplify this process using modern Generative AI techniques, mitigating hallucinations by grounding the Generative Model with information specifically retrieved from a verified vector store of academic text.

## Core Reference
The implementation principles are derived from:
- **Title:** Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks
- **Authors:** Lewis, Patrick and Perez, Ethan and Piktus, Aleksandra and Petroni, Fabio and Karpukhin, Vladimir and Goyal, Naman and K\"{u}ttler, Heinrich and Lewis, Mike and Yih, Wen-tau and Rockt\"{a}schel, Tim and Riedel, Sebastian and Kiela, Douwe
- **Conference:** NeurIPS 2020

## Key Development Phases
1. **Phase 1: Planning and Setup (Current)**
   - Define directory structure and repository organization.
   - Summarize the core methodology derived from the Lewis et al. paper.
   - Set up initial Jupyter notebooks to validate chunking and embedding logic.

2. **Phase 2: Core RAG Implementation**
   - Implement PDF parsing and token-aware text chunking.
   - Utilize HuggingFace `sentence-transformers` for creating embeddings.
   - Setup a local vector database (FAISS/Chroma).

3. **Phase 3: LLM Integration and Evaluation**
   - Connect a generative model (e.g., OpenAI `gpt-3.5-turbo` or a local equivalent like `Llama-2` via Langchain).
   - Evaluate exact-match and hallucination rates.

4. **Phase 4: User Interface (Future)**
   - Build a lightweight frontend (Streamlit/Gradio) to interact with the assistant.
