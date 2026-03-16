# Paper Summary: Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al., 2020)

## High-Level Idea
Large Pre-trained Language Models (LLMs) store a vast amount of factual knowledge within their parameters, but they are prone to "hallucinations" and their internal knowledge is static (it cannot be updated without retraining). 
Lewis et al. introduce **RAG (Retrieval-Augmented Generation)**, which combines a pre-trained sequence-to-sequence model (the generator) with a dense vector retrieval mechanism (the retriever).

## Architecture
RAG consists of two main components:
1. **Retriever (Dense Passage Retriever - DPR):** Given an input query $x$, DPR searches a large corpus (like Wikipedia) to find the top-$k$ most relevant document chunks (passages).
2. **Generator (BART):** A seq2seq model that takes the original query $x$ combined with the retrieved passages $z$, and generates the final output $y$.

## Key Findings
- RAG models can successfully perform knowledge-intensive tasks (Open-domain QA, Fact-checking) by dynamically fetching the most up-to-date and relevant information.
- It heavily reduces the "hallucination" problem since the generator is grounded by real documents provided in the prompt context.
- The retrieval index can be hot-swapped or updated without needing to retrain the underlying LLM.

## Relevance to our Project
Our Research Paper Assistant will mimic this RAG architecture on a smaller scale. Instead of Wikipedia, our corpus will consist of user-uploaded academic papers. The system will retrieve relevant text chunks from the papers to answer detailed academic questions.
