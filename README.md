# GenAI Research Paper Assistant using Retrieval-Augmented Generation (RAG)

## Project Overview
This repository contains the ongoing development of an intelligent **Research Paper Assistant**, created as an academic AI mini-project. The system is designed to read, comprehend, and answer complex questions based on specific academic literature provided by the user. By leveraging **Retrieval-Augmented Generation (RAG)**, the assistant grounds its answers in verified academic texts rather than relying solely on pre-trained parametric knowledge, resulting in highly accurate, context-aware, and citation-ready responses.

## Problem Statement
Academic researchers, students, and professionals frequently encounter dense, complex scientific papers. Extracting specific methodologies, results, or data points from these extensive documents can be time-consuming and tedious. General-purpose Large Language Models (LLMs) often struggle with hallucinating facts when asked highly specific academic questions or lack access to niche, newly published, or paywalled literature. There is a need for a targeted AI assistant that can accurately retrieve information from a provided corpus of papers and generate comprehensible answers based *only* on that verified context.

## Research Paper Reference
The foundational architecture of this project is inspired by the seminal work on RAG models:
> **"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"**  
> *Authors: Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin, Naman Goyal, Heinrich Küttler, Mike Lewis, Wen-tau Yih, Tim Rocktäschel, Sebastian Riedel, Douwe Kiela*  
> *Published in: NeurIPS 2020*  

This paper demonstrates that combining pre-trained parametric and non-parametric memory for language generation significantly reduces hallucinations and improves performance on knowledge-intensive tasks.

## Objectives of the Project
1. **Accurate Information Retrieval:** Develop a robust document parsing and text-chunking pipeline for academic PDFs.
2. **Context-Aware Generation:** Implement a RAG architecture that accurately answers user queries using only the retrieved document context.
3. **Mitigating Hallucinations:** Evaluate and minimize the model's reliance on external, unverified knowledge.
4. **Academic Application:** Create a practical tool that accelerates the literature review process for students and researchers.

## Dataset and Knowledge Base
The `dataset/` directory acts as the dedicated knowledge base for our retrieval-augmented generation pipeline. The research papers contained within this folder are ingested, split into chunks, and used to generate the dense embeddings that mathematically map into the system's vector database. The system uses this exact dataset to perform semantic retrieval when a user makes a query.

Example literature currently in the dataset includes:
- **Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al.):** The primary reference methodology paper our system is built heavily upon.
- **A Survey Paper on Artificial Intelligence:** Included to demonstrate the system's capacity to digest and answer broader conceptual questions summarizing the AI domain.

## Planned System Architecture
The system follows a standard four-step RAG architecture:
1. **Data Ingestion:** User uploads academic PDFs. The system extracts text and splits it into semantically meaningful chunks with token overlap.
2. **Embedding & Indexing:** A dense embedding model converts the text chunks into vector representations, which are stored in an efficient vector database (Vector Store).
3. **Retrieval:** When a prompt is given, it is embedded using the same model. The system queries the Vector Store using a k-Nearest Neighbors (k-NN) approach to find the most contextually relevant document chunks.
4. **Generation:** A Generative LLM synthesizes an answer by using a prompt template that strictly limits its knowledge source to the retrieved chunks.

## Project Pipeline
- **Step 1: Document Loading:** Read raw text from PDF files using `PyMuPDF` or Langchain loaders.
- **Step 2: Text Chunking:** Split the text into manageable components (e.g., 500-token chunks) to ensure contextual density for the embedding model.
- **Step 3: Vectorization:** Generate embeddings using HuggingFace `sentence-transformers`.
- **Step 4: Vector Database:** Index vectors using `ChromaDB` or `FAISS` for rapid similarity search.
- **Step 5: LLM Setup:** Connect to a generative model (e.g., `Llama-2` or an OpenAI model via Langchain).
- **Step 6: Query Interface:** Formulate an LLM chain that receives the user query, executes the retrieval retrieval search, formats the prompt, and generates the final response.

## Technologies to be Used
- **Core Framework:** Python 3.x
- **LLM Orchestration:** `Langchain`
- **Document Parsers:** `PyMuPDF`, `pdfplumber`
- **Embeddings:** HuggingFace `sentence-transformers` (e.g., `all-MiniLM-L6-v2`)
- **Vector Store:** `FAISS` / `ChromaDB`
- **Generative Model:** Local LLM (e.g., HuggingFace Hub integration) or OpenAI API (if credits permit)
- **Frontend (Planned):** `Streamlit` or `Gradio` for rapid UI prototyping

## Current Progress
*Phase 1: Academic Planning & Repository Setup*
- [x] Defined repository structure and core architecture.
- [x] Analyzed and summarized the primary reference literature (Lewis et al. 2020).
- [x] Established the initial `README.md` and project requirement parameters.
- [x] Created starter Jupyter notebooks for the retrieval pipeline.

## Future Work
*Phase 2 & 3: Implementation & UI*
- [ ] Implement the PDF ingestion and chunking logic.
- [ ] Establish the local Vector Store and test embedding cosine similarity.
- [ ] Integrate the Generative LLM and construct the retrieval QA chain.
- [ ] Build a lightweight graphical user interface (GUI) to allow non-technical users to upload papers and chat with the assistant.
- [ ] Conduct rigorous testing on standard academic queries to benchmark hallucination rates and exact-match performance.
