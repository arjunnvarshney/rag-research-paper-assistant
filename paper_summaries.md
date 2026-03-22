# Research Paper Summaries

This document contains summaries of the core academic papers collected for the project, outlining their core concepts and their relevance to the GenAI Research Paper Assistant.

## 1. Retrieval-Augmented Generation: A Comprehensive Survey of Architectures, Enhancements, and Robustness Frontiers (2025)
**File:** `research-papers/RAG_Survey_2025.pdf`

* **Paper Name:** Retrieval-Augmented Generation: A Comprehensive Survey of Architectures, Enhancements, and Robustness Frontiers (2025)
* **Problem Addressed:** AI models easily make up fake facts ("hallucinations") because they only rely on what they memorized during their training. Safely connecting these models to outside knowledge sources is complex.
* **Proposed Solution:** The paper reviews different ways to build Retrieval-Augmented Generation (RAG) systems. It shows how improving the way the system searches for facts and feeds them to the AI can make the answers much more accurate.
* **Key Idea:** RAG systems are not one-size-fits-all. They can be built differently depending on whether your project prioritizes speed, high accuracy, or flexibility.
* **Relevance to this project:** This survey acts as an architectural guide for our GenAI Research Paper Assistant. It helps us choose the best ways to search and filter text so our assistant correctly answers academic questions.

## 2. Retrieval Augmented Generation Evaluation in the Era of Large Language Models: A Comprehensive Survey (2025)
**File:** `research-papers/RAG_Evaluation_2025.pdf`

* **Paper Name:** Retrieval Augmented Generation Evaluation in the Era of Large Language Models: A Comprehensive Survey (2025)
* **Problem Addressed:** It is very difficult to measure exactly how well a RAG system works. Standard testing methods fall short when trying to figure out if an AI is actually using the provided documents correctly.
* **Proposed Solution:** This paper looks at new, specialized frameworks designed to test RAG systems. It focuses on measuring if the AI's answers are factually correct, safe, and truly based on the retrieved information.
* **Key Idea:** Properly testing a RAG system requires a two-step approach: checking how well the system finds the right documents, and checking if the AI uses those documents accurately to form its sentences.
* **Relevance to this project:** If our assistant misinterprets a research paper, that's a big problem for a university project. This paper teaches us how to test our pipeline to guarantee the AI isn't guessing or making things up.

## 3. A Survey of Graph Retrieval-Augmented Generation for Customized Large Language Models (2025)
**File:** `research-papers/GraphRAG_2025.pdf`

* **Paper Name:** A Survey of Graph Retrieval-Augmented Generation for Customized Large Language Models (2025)
* **Problem Addressed:** Standard RAG systems struggle to connect the dots when information is scattered across different parts of a long document or across multiple documents.
* **Proposed Solution:** The survey introduces "GraphRAG," an approach that organizes data like a large mind map (a graph). This helps the AI easily see how different concepts, authors, and methodologies relate to one another.
* **Key Idea:** By mapping out the relationships between different ideas instead of just reading flat text, GraphRAG allows AI models to answer complex, multi-part questions intelligently.
* **Relevance to this project:** Research papers contain incredibly dense, interconnected ideas. This paper offers us an advanced upgrade path—moving beyond simple semantic searches so our assistant could potentially connect complex ideas across entire papers.
