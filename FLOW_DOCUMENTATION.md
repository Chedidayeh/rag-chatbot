# 🔄 Complete Data Flow & Function Communication Guide

> **Deep dive into every function, its purpose, inputs, outputs, and interactions**

---

## 🔼 UPLOAD FLOW

### Complete Upload Sequence Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ACTION                                  │
│              User selects PDF file                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  DocumentUpload.tsx                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ onDrop() / onChange()                                   │   │
│  │ INPUT: File (from user drag/drop or input)              │   │
│  │ PROCESS:                                                │   │
│  │  • Validate file type (PDF only)                        │   │
│  │  • Validate file size (<8MB)                            │   │
│  │  • Create FormData with file                            │   │
│  │ OUTPUT: Triggers startUpload()                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  startUpload() [Uploadthing]                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ INPUT: File                                             │   │
│  │ PROCESS:                                                │   │
│  │  • Sends to Uploadthing service                         │   │
│  │  • Shows progress indicator                             │   │
│  │  • Stores file in cloud                                 │   │
│  │ OUTPUT: { fileUrl, fileName, key }                      │   │
│  │         Returns cloud-hosted URL                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │ fileUrl from Uploadthing
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/uploadthing/route.ts                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ON_UPLOAD_COMPLETE(data)                                │   │
│  │ INPUT: { file: { url, name, size } }                    │   │
│  │ PROCESS:                                                │   │
│  │  • Receives Uploadthing confirmation                    │   │
│  │  • Extracts file URL and name                           │   │
│  │  • Forwards to /api/upload-document                     │   │
│  │ OUTPUT: Calls handleDocumentUpload()                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │ fileUrl, documentName, namespace
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/upload-document/route.ts                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ POST Handler (Main Upload Endpoint)                     │   │
│  │ INPUT: { fileUrl, documentName, namespace }             │   │
│  │ PROCESS:                                                │   │
│  │  1. Validate inputs (check for null/empty)              │   │
│  │  2. Call: downloadFileFromUrl(fileUrl)                  │   │
│  │  3. Call: processPdfDocument(filepath, documentName)    │   │
│  │  4. Call: upsertVectors(vectors, namespace)             │   │
│  │  5. Call: registerDocument(metadata)                    │   │
│  │  6. Return stats and success message                    │   │
│  │ OUTPUT: {                                               │   │
│  │   success: true,                                        │   │
│  │   message: "Successfully processed X chunks",           │   │
│  │   stats: {                                              │   │
│  │     totalChunks,                                        │   │
│  │     totalVectors,                                       │   │
│  │     namespace,                                          │   │
│  │     documentName                                        │   │
│  │   }                                                     │   │
│  │ }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────────────────────┐  ┌────────────────────────┐
│ document-processor.ts            │  │ document-registry.ts   │
│                                  │  │                        │
│ processPdfDocument()             │  │ registerDocument()     │
│ ┌────────────────────────────┐   │  │ ┌──────────────────┐  │
│ │ INPUT:                     │   │  │ │ INPUT: metadata  │  │
│ │ • filePath (from download) │   │  │ │ PROCESS:         │  │
│ │ • documentName             │   │  │ │  • Add to Map    │  │
│ │                            │   │  │ │  • Update sync   │  │
│ │ PROCESS:                   │   │  │ │ OUTPUT: void     │  │
│ │ 1. new PDFLoader(path)     │   │  │ │                  │  │
│ │ 2. load() → PDF text+pages │   │  │ │ ASYNC: Yes       │  │
│ │ 3. RecursiveCharacterText  │   │  │ └──────────────────┘  │
│ │    Splitter(config)        │   │  │                       │
│ │ 4. splitDocuments() →      │   │  │ Storage Effect:       │
│ │    chunks with metadata    │   │  │ documentRegistry.set()│
│ │ 5. Create chunk objects    │   │  │ (in-memory cache)     │
│ │    with unique IDs         │   │  │                       │
│ │ 6. Call getEmbeddings()    │   │  └────────────────────────┘
│ │ 7. embedDocuments(texts)   │   │
│ │    → vector array          │   │
│ │                            │   │
│ │ OUTPUT:                    │   │
│ │ [{                         │   │
│ │   id: "doc_chunk_0",       │   │
│ │   values: [...],           │   │
│ │   metadata: {              │   │
│ │     source: "filename",    │   │
│ │     page: 1,               │   │
│ │     text: "chunk text"     │   │
│ │   }                        │   │
│ │ }]                         │   │
│ │                            │   │
│ │ ASYNC: Yes                 │   │
│ └────────────────────────────┘   │
└──────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ embeddings.ts                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ getEmbeddings()                                    │   │
│ │ INPUT: (none - singleton)                          │   │
│ │ PROCESS:                                           │   │
│ │  • Check if instance exists (singleton pattern)    │   │
│ │  • If not, create new GoogleGenerativeAIEmbeddings │   │
│ │  • Model: text-embedding-004                       │   │
│ │ OUTPUT: GoogleGenerativeAIEmbeddings instance      │   │
│ │                                                    │   │
│ │ embeddings.embedDocuments(texts)                   │   │
│ │ INPUT: string[] (text chunks)                      │   │
│ │ PROCESS:                                           │   │
│ │  • Sends to Google API                             │   │
│ │  • Generates 1536-dimensional vectors              │   │
│ │  • Returns array of vectors                        │   │
│ │ OUTPUT: number[][] (vectors)                       │   │
│ │ ASYNC: Yes                                         │   │
│ │                                                    │   │
│ │ CACHE: Yes (singleton instance reused)             │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ pinecone.ts                                              │
│ ┌────────────────────────────────────────────────────┐   │
│ │ upsertVectors(vectors, namespace)                  │   │
│ │ INPUT:                                             │   │
│ │ • vectors: [{                                      │   │
│ │     id: string,                                    │   │
│ │     values: number[],                              │   │
│ │     metadata: {                                    │   │
│ │       source: string,                              │   │
│ │       page: number,                                │   │
│ │       text: string                                 │   │
│ │     }                                              │   │
│ │   }]                                               │   │
│ │ • namespace: string (e.g., "default")              │   │
│ │                                                    │   │
│ │ PROCESS:                                           │   │
│ │ 1. getPineconeClient() → get/create client         │   │
│ │ 2. Connect to Pinecone index                       │   │
│ │ 3. Call index.upsert() with vectors                │   │
│ │ 4. Waits for confirmation                          │   │
│ │                                                    │   │
│ │ OUTPUT: void (success or throws error)             │   │
│ │ ASYNC: Yes                                         │   │
│ │                                                    │   │
│ │ STORAGE: Pinecone Cloud                            │   │
│ │ (vectors permanently stored)                       │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ ✅ UPLOAD COMPLETE                                       │
│                                                          │
│ Data Flow Summary:                                       │
│ File → Uploadthing → API → Download → Extract Text →   │
│ Chunk → Embed → Store in Pinecone → Register in Cache  │
│                                                          │
│ Response sent to frontend with success confirmation     │
└──────────────────────────────────────────────────────────┘
```

---

## 💬 CHAT FLOW

### Complete Chat Sequence Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ACTION                                  │
│          User types question and sends message                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  ChatInput.tsx                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ handleSend() / onSubmit()                               │   │
│  │ INPUT: message string                                   │   │
│  │ PROCESS:                                                │   │
│  │  • Validate message not empty                           │   │
│  │  • Create request payload:                              │   │
│  │    {                                                    │   │
│  │      message,                                           │   │
│  │      namespace,                                         │   │
│  │      conversationHistory[],                             │   │
│  │      stream: false                                      │   │
│  │    }                                                    │   │
│  │  • Call fetch POST /api/chat                            │   │
│  │  • Show loading state                                   │   │
│  │ OUTPUT: Sends HTTP request to backend                   │   │
│  │ ASYNC: Yes                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/chat/route.ts                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ POST Handler (Main Chat Endpoint)                       │   │
│  │                                                         │   │
│  │ INPUT: {                                               │   │
│  │   message: string,                                     │   │
│  │   namespace?: string,                                  │   │
│  │   conversationHistory?: Array,                          │   │
│  │   stream?: boolean                                     │   │
│  │ }                                                      │   │
│  │                                                         │   │
│  │ PROCESS:                                                │   │
│  │ 1. Parse request body                                  │   │
│  │ 2. Validate inputs (message not empty)                 │   │
│  │ 3. Set default namespace = "default"                   │   │
│  │ 4. Call: ragPipeline(message, namespace,              │   │
│  │           conversationHistory)                          │   │
│  │ 5. Destructure: { response, retrievedDocs }            │   │
│  │ 6. Get doc count: getAllDocuments().length             │   │
│  │ 7. Return response object                              │   │
│  │                                                         │   │
│  │ OUTPUT: {                                               │   │
│  │   success: true,                                       │   │
│  │   response: "AI response text",                         │   │
│  │   retrievedDocuments: [{                                │   │
│  │     id: string,                                        │   │
│  │     score: number,                                     │   │
│  │     text: string,                                      │   │
│  │     source: string,                                    │   │
│  │     page: number                                       │   │
│  │   }],                                                  │   │
│  │   documentCount: number                                │   │
│  │ }                                                      │   │
│  │                                                         │   │
│  │ ERROR HANDLING:                                         │   │
│  │ • 400: Missing required fields                          │   │
│  │ • 500: RAG pipeline error                               │   │
│  │                                                         │   │
│  │ ASYNC: Yes                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ chain.ts - RAG PIPELINE (Main orchestrator)                     │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ ragPipeline(query, namespace, history)                  │   │
│ │                                                         │   │
│ │ INPUT:                                                  │   │
│ │ • query: string (user question)                        │   │
│ │ • namespace: string (document namespace)                │   │
│ │ • conversationHistory?: Array (chat history)            │   │
│ │                                                         │   │
│ │ PROCESS:                                                │   │
│ │ 1. Call: retrieveRelevantDocuments(query, namespace)   │   │
│ │    → returns top 5 relevant chunks with scores         │   │
│ │                                                         │   │
│ │ 2. Call: formatContext(retrievedDocs)                  │   │
│ │    → formats chunks into string context                │   │
│ │                                                         │   │
│ │ 3. Call: generateResponse(query, context,              │   │
│ │           retrievedDocs, history)                       │   │
│ │    → calls Gemini LLM                                  │   │
│ │                                                         │   │
│ │ OUTPUT: {                                               │   │
│ │   response: "LLM generated answer",                     │   │
│ │   retrievedDocs: [chunk metadata + scores]             │   │
│ │ }                                                      │   │
│ │                                                         │   │
│ │ ASYNC: Yes                                              │   │
│ └─────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
    Step 1    Step 2    Step 3
┌──────────────────────────────────────────────────────────┐
│ STEP 1: Retrieve Relevant Documents                      │
│ ┌────────────────────────────────────────────────────┐   │
│ │ retrieveRelevantDocuments(query, namespace)        │   │
│ │                                                    │   │
│ │ INPUT:                                             │   │
│ │ • query: string (user question)                   │   │
│ │ • namespace: string                                │   │
│ │                                                    │   │
│ │ PROCESS:                                           │   │
│ │ 1. Call: getEmbeddings()                           │   │
│ │ 2. Call: embeddings.embedQuery(query)              │   │
│ │    → converts query to 1536D vector                │   │
│ │ 3. Call: queryVectors(queryVector, topK=5)         │   │
│ │    → searches Pinecone for similar vectors         │   │
│ │ 4. Filter results if confidence > 0.7              │   │
│ │ 5. Format with metadata (source, page, text)       │   │
│ │                                                    │   │
│ │ OUTPUT: [{                                         │   │
│ │   id: "doc_chunk_0",                               │   │
│ │   score: 0.87,                                     │   │
│ │   text: "chunk content",                           │   │
│ │   metadata: {                                      │   │
│ │     source: "filename",                            │   │
│ │     page: 1                                        │   │
│ │   }                                                │   │
│ │ }]                                                 │   │
│ │                                                    │   │
│ │ ASYNC: Yes                                         │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│  Sub-functions:                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ embeddings.embedQuery(query)                       │  │
│  │ INPUT: string (user question)                      │  │
│  │ PROCESS: Sends to Google Gemini Embeddings API    │  │
│  │ OUTPUT: number[] (1536-dimensional vector)        │  │
│  │ ASYNC: Yes                                        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ queryVectors(vector, topK, namespace)              │  │
│  │ INPUT:                                             │  │
│  │ • vector: number[] (query embedding)               │  │
│  │ • topK: number = 5                                 │  │
│  │ • namespace: string                                │  │
│  │                                                    │  │
│  │ PROCESS:                                           │  │
│  │ 1. Get Pinecone client                             │  │
│  │ 2. Call index.query({                              │  │
│  │      vector,                                       │  │
│  │      topK,                                         │  │
│  │      namespace,                                    │  │
│  │      includeMetadata: true                         │  │
│  │    })                                              │  │
│  │ 3. Pinecone returns matches with scores            │  │
│  │                                                    │  │
│  │ OUTPUT: {                                          │  │
│  │   matches: [{                                      │  │
│  │     id: string,                                    │  │
│  │     score: number,                                 │  │
│  │     metadata: { source, page, text }               │  │
│  │   }]                                               │  │
│  │ }                                                  │  │
│  │                                                    │  │
│  │ ASYNC: Yes                                         │  │
│  │ NETWORK: Yes (Pinecone serverless)                 │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ STEP 2: Format Context                                   │
│ ┌────────────────────────────────────────────────────┐   │
│ │ formatContext(retrievedDocuments)                  │   │
│ │                                                    │   │
│ │ INPUT: [{                                          │   │
│ │   score: 0.87,                                     │   │
│ │   text: "chunk text",                              │   │
│ │   metadata: { source, page }                       │   │
│ │ }]                                                 │   │
│ │                                                    │   │
│ │ PROCESS:                                           │   │
│ │ 1. Iterate through each retrieved document        │   │
│ │ 2. Format as: "[Source: filename, Page: 1]        │   │
│ │    chunk text"                                    │   │
│ │ 3. Join with newlines                             │   │
│ │ 4. Return formatted string                         │   │
│ │                                                    │   │
│ │ OUTPUT: string (formatted context for LLM)        │   │
│ │ EXAMPLE:                                           │   │
│ │ "[Source: report.pdf, Page: 1]                    │   │
│ │  Revenue in Q3 was $5M...                         │   │
│ │  [Source: report.pdf, Page: 2]                    │   │
│ │  Operating costs decreased..."                    │   │
│ │                                                    │   │
│ │ SYNC: Yes (no async operations)                    │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ STEP 3: Generate Response                                │
│ ┌────────────────────────────────────────────────────┐   │
│ │ generateResponse(query, context, docs, history)    │   │
│ │                                                    │   │
│ │ INPUT:                                             │   │
│ │ • query: string (user question)                   │   │
│ │ • context: string (formatted retrieved docs)       │   │
│ │ • docs: array (raw retrieved docs)                │   │
│ │ • history: array (conversation history)            │   │
│ │                                                    │   │
│ │ PROCESS:                                           │   │
│ │ 1. Call: getGeminiClient()                         │   │
│ │    → gets/creates Google Generative AI client      │   │
│ │                                                    │   │
│ │ 2. Build messages array:                           │   │
│ │    [{                                              │   │
│ │      role: "user",                                 │   │
│ │      content: query + context                      │   │
│ │    }]                                              │   │
│ │                                                    │   │
│ │ 3. Call: isDocumentInventoryQuery(query)           │   │
│ │    → checks if asking "what documents?"            │   │
│ │                                                    │   │
│ │ 4. If inventory query:                             │   │
│ │    • Call: getAllDocuments()                       │   │
│ │    • Call: getDocumentStats()                      │   │
│ │    • Enrich context with catalog                   │   │
│ │                                                    │   │
│ │ 5. Build LLM request:                              │   │
│ │    client.generateContent({                        │   │
│ │      systemInstruction: SYSTEM_PROMPT,             │   │
│ │      contents: messagesArray,                      │   │
│ │      generationConfig: {                           │   │
│ │        temperature: 0.7,                           │   │
│ │        maxOutputTokens: 1024                       │   │
│ │      }                                             │   │
│ │    })                                              │   │
│ │                                                    │   │
│ │ 6. Parse response text                             │   │
│ │                                                    │   │
│ │ OUTPUT: string (AI-generated response)             │   │
│ │ ASYNC: Yes                                         │   │
│ │ NETWORK: Yes (Google Gemini API)                   │   │
│ │                                                    │   │
│ │ CONFIGURATION:                                     │   │
│ │ • Model: "gemini-1.5-pro"                         │   │
│ │ • Temperature: 0.7 (balanced creativity)           │   │
│ │ • Max Tokens: 1024 (response length limit)         │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│  Sub-functions:                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ getGeminiClient()                                  │  │
│  │ INPUT: (none - singleton)                          │  │
│  │ PROCESS:                                           │  │
│  │ • Check if client instance exists                  │  │
│  │ • If not, create new GoogleGenerativeAI()          │  │
│  │ OUTPUT: GoogleGenerativeAI instance                │  │
│  │ CACHE: Yes (singleton pattern)                     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ isDocumentInventoryQuery(query)                    │  │
│  │ INPUT: string (user message)                       │  │
│  │ PROCESS:                                           │  │
│  │ • Check if lowercase query includes:               │  │
│  │   "document", "documents", "list", "what do",      │  │
│  │   "what documents", "show documents", etc.         │  │
│  │ OUTPUT: boolean                                    │  │
│  │ SYNC: Yes (string matching)                        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ getAllDocuments()                                  │  │
│  │ INPUT: (none)                                      │  │
│  │ PROCESS:                                           │  │
│  │ • Return documentRegistry.values()                 │  │
│  │ • Converts Map to array of DocumentMetadata        │  │
│  │ OUTPUT: DocumentMetadata[]                         │  │
│  │ SYNC: Yes (in-memory operation)                    │  │
│  │ SPEED: O(n) where n = document count               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ getDocumentStats()                                 │  │
│  │ INPUT: (none)                                      │  │
│  │ PROCESS:                                           │  │
│  │ • Calculate total chunks from all documents        │  │
│  │ • Calculate total pages if available               │  │
│  │ • Return stats object                              │  │
│  │ OUTPUT: {                                          │  │
│  │   totalDocuments: number,                          │  │
│  │   totalChunks: number,                             │  │
│  │   totalPages: number                               │  │
│  │ }                                                  │  │
│  │ SYNC: Yes (in-memory calculation)                  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Response Sent Back to Frontend

```
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Response travels back through                                  │
│  API route → HTTP response → Frontend                           │
│                                                                 │
│  JSON Response: {                                               │
│    success: true,                                               │
│    response: "AI answer text",                                  │
│    retrievedDocuments: [                                        │
│      {                                                          │
│        id: "doc_chunk_0",                                       │
│        score: 0.87,                                             │
│        text: "chunk content",                                   │
│        source: "filename.pdf",                                  │
│        page: 1                                                  │
│      }                                                          │
│    ],                                                           │
│    documentCount: 23                                            │
│  }                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  MessageList.tsx - Display Response                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ renderMessages()                                        │   │
│  │ INPUT: Response data from API                           │   │
│  │ PROCESS:                                                │   │
│  │  • Add AI response to messages list                     │   │
│  │  • Display retrieved documents as citations             │   │
│  │  • Show relevance scores                                │   │
│  │  • Auto-scroll to latest message                        │   │
│  │ OUTPUT: Rendered message components                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

        ▼
┌─────────────────────────────────────────────────────────────────┐
│ ✅ CHAT COMPLETE - User sees response with sources             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📚 FUNCTION REFERENCE

### Organized by File

---

## **1. src/components/upload/DocumentUpload.tsx**

### Function: `onDrop(acceptedFiles)`
- **Purpose**: Handle file drop event
- **Input**: File[] (from drag & drop)
- **Process**: Validate file type and size, trigger upload
- **Output**: Calls startUpload()
- **Async**: Yes
- **Error Handling**: Shows toast if file invalid

### Function: `onChange(event)`
- **Purpose**: Handle file input change
- **Input**: React ChangeEvent
- **Process**: Extract file from input, validate, trigger upload
- **Output**: Calls startUpload()
- **Async**: Yes

### Function: `startUpload(files)`
- **Purpose**: Upload files to Uploadthing
- **Input**: File[]
- **Process**: Sends to Uploadthing service (external)
- **Output**: FileRouter callback response with URL
- **Async**: Yes (external service)

### Function: `onClientUploadComplete(res)`
- **Purpose**: Handle successful upload
- **Input**: Uploadthing response with fileUrl and name
- **Process**: Send fileUrl to backend API
- **Output**: Calls POST /api/upload-document
- **Async**: Yes

### Function: `onUploadError(error)`
- **Purpose**: Handle upload error
- **Input**: Error object
- **Process**: Log error, show error toast to user
- **Output**: Toast notification
- **Async**: No

---

## **2. src/app/api/uploadthing/core.ts**

### Function: `f()` (main export)
- **Purpose**: Define upload route configuration
- **Input**: (none - configuration object)
- **Process**: Configure PDF uploader restrictions
- **Output**: FileRouter with upload handlers
- **Restrictions**:
  - maxFileSize: "8MB"
  - allowedFileTypes: ["application/pdf"]

### Function: `onUploadComplete(data)`
- **Purpose**: Handle successful file storage
- **Input**: UploadedFile data with URL
- **Process**: Extract file info, call handleDocumentUpload
- **Output**: Calls next API route
- **Async**: Yes

---

## **3. src/app/api/upload-document/route.ts**

### Function: `POST(request)`
- **Purpose**: Main upload endpoint
- **Input**: HTTP POST request with JSON body:
  ```typescript
  {
    fileUrl: string,
    documentName: string,
    namespace?: string
  }
  ```
- **Process**:
  1. Parse request JSON
  2. Validate inputs (not null/empty)
  3. Set default namespace
  4. Download file from URL
  5. Process PDF document
  6. Generate embeddings
  7. Upsert vectors to Pinecone
  8. Register document in cache
- **Output**: JSON response:
  ```typescript
  {
    success: true,
    message: string,
    stats: {
      totalChunks: number,
      totalVectors: number,
      namespace: string,
      documentName: string
    }
  }
  ```
- **Async**: Yes
- **Error Handling**: Returns 400/500 with error message

### Function: `downloadFileFromUrl(fileUrl)`
- **Purpose**: Download PDF from Uploadthing
- **Input**: fileUrl (string)
- **Process**: Fetch file, save to temp location
- **Output**: File path (string)
- **Async**: Yes
- **Error Handling**: Throws error if download fails

---

## **4. src/lib/rag/document-processor.ts**

### Function: `processPdfDocument(filePath, documentName)`
- **Purpose**: Extract and chunk PDF
- **Input**:
  - filePath: string (local file path)
  - documentName: string (for metadata)
- **Process**:
  1. Create PDFLoader instance
  2. Load PDF → extract text + pages
  3. Create RecursiveCharacterTextSplitter
  4. Split document into chunks (1000 chars, 200 overlap)
  5. Get embeddings instance
  6. Generate embeddings for all chunks
  7. Create vector objects with metadata
- **Output**: Vector array:
  ```typescript
  [{
    id: "documentName_chunk_0",
    values: number[],
    metadata: {
      source: "documentName",
      page: 1,
      text: "chunk content"
    }
  }]
  ```
- **Async**: Yes
- **Error Handling**: Throws error if PDF invalid or extraction fails

### Function: `ChunkConfig` (constant)
- **Purpose**: Configuration for text splitting
- **Value**:
  ```typescript
  {
    chunkSize: 1000,
    chunkOverlap: 200
  }
  ```

---

## **5. src/lib/rag/embeddings.ts**

### Function: `getEmbeddings()`
- **Purpose**: Get or create embeddings instance (singleton)
- **Input**: (none)
- **Process**:
  - Check if embeddings instance exists
  - If not, create GoogleGenerativeAIEmbeddings
  - Model: "text-embedding-004"
- **Output**: GoogleGenerativeAIEmbeddings instance
- **Async**: No (instantiation only)
- **Caching**: Yes (singleton)

### Instance Method: `embeddings.embedDocuments(texts)`
- **Purpose**: Generate embeddings for multiple texts
- **Input**: string[] (text chunks)
- **Process**: Send to Google Gemini API
- **Output**: number[][] (vectors, each 1536 dimensions)
- **Async**: Yes
- **Batch**: Multiple texts at once

### Instance Method: `embeddings.embedQuery(query)`
- **Purpose**: Generate embedding for single query
- **Input**: string (user question)
- **Process**: Send to Google Gemini API
- **Output**: number[] (1536 dimensions)
- **Async**: Yes

---

## **6. src/lib/rag/pinecone.ts**

### Function: `getPineconeClient()`
- **Purpose**: Get or create Pinecone client (singleton)
- **Input**: (none)
- **Process**:
  - Check if client exists
  - If not, create new Pinecone Serverless client
  - Uses PINECONE_API_KEY from env
- **Output**: Pinecone client instance
- **Async**: No
- **Caching**: Yes (singleton)

### Function: `queryVectors(vector, topK, namespace)`
- **Purpose**: Search Pinecone for similar vectors
- **Input**:
  - vector: number[] (query embedding)
  - topK: number = 5
  - namespace: string = "default"
- **Process**:
  1. Get Pinecone client
  2. Get index reference
  3. Call index.query() with vector
  4. Filter by namespace
  5. Include metadata in results
- **Output**:
  ```typescript
  {
    matches: [{
      id: string,
      score: number (0-1),
      metadata: {
        source: string,
        page: number,
        text: string
      }
    }]
  }
  ```
- **Async**: Yes
- **Network**: Yes (Pinecone serverless)

### Function: `upsertVectors(vectors, namespace)`
- **Purpose**: Store vectors in Pinecone
- **Input**:
  - vectors: vector object array
  - namespace: string = "default"
- **Process**:
  1. Get Pinecone client
  2. Get index reference
  3. Call index.upsert() with vectors
  4. Wait for confirmation
- **Output**: void (success) or throws error
- **Async**: Yes
- **Side Effect**: Vectors permanently stored in Pinecone

### Function: `discoverDocumentsFromPinecone(namespace)`
- **Purpose**: Auto-discover documents from vectors
- **Input**: namespace?: string
- **Process**:
  1. Query Pinecone for all vectors
  2. Extract unique sources from metadata
  3. Group chunks by source
  4. Build document metadata objects
- **Output**: DocumentMetadata[]
  ```typescript
  [{
    documentId: string,
    fileName: string,
    uploadedAt: Date,
    namespace: string,
    totalChunks: number,
    status: "complete"
  }]
  ```
- **Async**: Yes
- **Purpose**: Recovery after restart

---

## **7. src/lib/rag/document-registry.ts**

### Variable: `documentRegistry`
- **Type**: Map<string, DocumentMetadata>
- **Purpose**: In-memory cache of documents
- **Scope**: Module-level
- **Persistence**: Lost on app restart (synced from Pinecone)

### Function: `initializeRegistry()`
- **Purpose**: Initialize registry on app startup
- **Input**: (none)
- **Process**:
  1. Log initialization start
  2. Call syncRegistryWithPinecone()
  3. Log completion
- **Output**: void
- **Async**: Yes
- **Timing**: Called once on app startup

### Function: `registerDocument(metadata)`
- **Purpose**: Add document to registry
- **Input**:
  ```typescript
  {
    documentId: string,
    fileName: string,
    uploadedAt: Date,
    namespace: string,
    totalChunks: number,
    status: string
  }
  ```
- **Process**:
  1. Validate metadata
  2. Add to documentRegistry Map
  3. Update lastSyncTime
- **Output**: void
- **Async**: No
- **Side Effect**: Updates in-memory cache

### Function: `getAllDocuments()`
- **Purpose**: Get all documents from cache
- **Input**: (none)
- **Process**: Return documentRegistry.values() as array
- **Output**: DocumentMetadata[]
- **Async**: No
- **Speed**: O(n) where n = document count

### Function: `syncRegistryWithPinecone(namespace)`
- **Purpose**: Sync cache with Pinecone
- **Input**: namespace?: string
- **Process**:
  1. Check if recent sync exists
  2. Skip if synced recently and cache not empty
  3. Call discoverDocumentsFromPinecone()
  4. Update documentRegistry with results
  5. Update lastSyncTime
- **Output**: void
- **Async**: Yes
- **Frequency**: Every 5 minutes (SYNC_INTERVAL)
- **Manual**: Can be called via API

### Function: `getDocumentStats()`
- **Purpose**: Get statistics about documents
- **Input**: (none)
- **Process**:
  1. Iterate through all documents
  2. Sum totalChunks from each
  3. Sum totalPages if available
- **Output**:
  ```typescript
  {
    totalDocuments: number,
    totalChunks: number,
    totalPages: number
  }
  ```
- **Async**: No

### Function: `clearRegistry()`
- **Purpose**: Clear all documents (utility)
- **Input**: (none)
- **Process**: Clear documentRegistry Map
- **Output**: void
- **Async**: No
- **Warning**: Dangerous - only for testing

### Constant: `SYNC_INTERVAL`
- **Value**: 5 * 60 * 1000 (5 minutes)
- **Purpose**: Auto-sync frequency
- **Configurable**: Yes

---

## **8. src/lib/rag/chain.ts**

### Function: `ragPipeline(query, namespace, history)`
- **Purpose**: Main RAG orchestrator
- **Input**:
  - query: string (user question)
  - namespace: string (default: "default")
  - history?: ConversationMessage[]
- **Process**:
  1. Call retrieveRelevantDocuments()
  2. Call formatContext()
  3. Call generateResponse()
  4. Return combined response
- **Output**:
  ```typescript
  {
    response: string,
    retrievedDocs: DocumentMatch[]
  }
  ```
- **Async**: Yes
- **Main Function**: Coordinates all RAG steps

### Function: `retrieveRelevantDocuments(query, namespace)`
- **Purpose**: Search for similar documents
- **Input**:
  - query: string
  - namespace: string
- **Process**:
  1. Get embeddings instance
  2. embedQuery() → convert query to vector
  3. queryVectors() → search Pinecone
  4. Format results with scores
  5. Filter by confidence threshold (0.7)
- **Output**: DocumentMatch[]
  ```typescript
  [{
    id: string,
    score: number,
    text: string,
    source: string,
    page: number
  }]
  ```
- **Async**: Yes
- **topK**: 5 (configurable)

### Function: `formatContext(documents)`
- **Purpose**: Format retrieved docs for LLM
- **Input**: DocumentMatch[] (retrieved documents)
- **Process**:
  1. For each document:
     - Extract source and page
     - Extract text
     - Format as "[Source: X, Page: Y] text"
  2. Join all with newlines
- **Output**: string (formatted context)
- **Async**: No
- **Example Output**:
  ```
  [Source: report.pdf, Page: 1]
  Revenue increased by 20%...
  [Source: report.pdf, Page: 2]
  Operating expenses decreased...
  ```

### Function: `generateResponse(query, context, docs, history)`
- **Purpose**: Generate AI response
- **Input**:
  - query: string (user question)
  - context: string (formatted retrieved docs)
  - docs: DocumentMatch[] (raw documents)
  - history?: ConversationMessage[]
- **Process**:
  1. Get Gemini client
  2. Check if inventory query
  3. If yes: enrich context with document catalog
  4. Build messages array with context
  5. Call client.generateContent()
  6. Parse and return response
- **Output**: string (AI response)
- **Async**: Yes
- **Config**:
  - Model: "gemini-1.5-pro"
  - Temperature: 0.7
  - maxOutputTokens: 1024

### Function: `getGeminiClient()`
- **Purpose**: Get or create Gemini client (singleton)
- **Input**: (none)
- **Process**: Create GoogleGenerativeAI instance if not exists
- **Output**: GoogleGenerativeAI instance
- **Async**: No
- **Caching**: Yes

### Function: `isDocumentInventoryQuery(query)`
- **Purpose**: Detect "what documents" questions
- **Input**: query string
- **Process**:
  - Convert to lowercase
  - Check for keywords: "document", "documents", "list", "what do", "catalog", etc.
- **Output**: boolean
- **Async**: No

### Constant: `SYSTEM_PROMPT`
- **Purpose**: System instruction for Gemini
- **Content**: Instructs AI on document analysis behavior
- **Key Points**: 
  - Be helpful and accurate
  - Reference sources
  - Admit when uncertain

---

## **9. src/app/page.tsx (Main Chat Interface)**

### Component: `ChatPage()`
- **Purpose**: Main chat application
- **State Management**:
  - messages: Message[] (chat history)
  - isLoading: boolean (API loading state)
  - namespace: string (current namespace)
- **Render**:
  - DocumentUpload component
  - MessageList component
  - ChatInput component

---

## **10. src/components/chat/ChatInput.tsx**

### Function: `onSubmit(e)`
- **Purpose**: Handle message submission
- **Input**: React FormEvent
- **Process**:
  1. Prevent default
  2. Validate message not empty
  3. Create request payload
  4. Call fetch POST /api/chat
  5. Update messages on response
  6. Handle errors
- **Output**: HTTP request to backend
- **Async**: Yes

### Function: `handleKeyDown(e)`
- **Purpose**: Handle keyboard shortcuts
- **Input**: React KeyboardEvent
- **Process**: Trigger submit on Ctrl+Enter
- **Output**: Calls onSubmit()
- **Async**: No

---

## **11. src/components/chat/MessageList.tsx**

### Function: `renderMessages()`
- **Purpose**: Display chat messages
- **Input**: messages array from state
- **Process**:
  1. Map through messages
  2. Render user and AI messages differently
  3. Show retrieved documents for AI responses
  4. Auto-scroll to bottom
- **Output**: Rendered JSX components
- **Async**: No

### Function: `useEffect(() => scroll())`
- **Purpose**: Auto-scroll on new messages
- **Input**: messages array (dependency)
- **Process**: Scroll to bottom when messages change
- **Output**: DOM manipulation
- **Async**: No

---

## 🔗 DATA STRUCTURES

### DocumentMetadata
```typescript
{
  documentId: string,        // Unique ID
  fileName: string,          // Original filename
  uploadedAt: Date,          // Upload timestamp
  namespace: string,         // Namespace for organization
  totalChunks: number,       // Number of chunks
  status: "complete" | "processing" | "failed"
}
```

### Vector (Pinecone)
```typescript
{
  id: string,                // "documentName_chunk_0"
  values: number[],          // 1536-dimensional vector
  metadata: {
    source: string,          // Document filename
    page: number,            // PDF page number
    text: string             // Chunk content
  }
}
```

### DocumentMatch (Retrieved)
```typescript
{
  id: string,
  score: number,             // 0-1 relevance score
  text: string,              // Chunk content
  source: string,            // Document name
  page: number               // PDF page
}
```

### Message
```typescript
{
  role: "user" | "assistant",
  content: string,
  retrievedDocuments?: DocumentMatch[]
}
```

---

## ⚠️ ERROR HANDLING

### Upload Errors
- **File validation**: Show toast "Invalid file type or size"
- **Download failure**: Return 500 "Failed to download file"
- **PDF extraction**: Return 500 "Failed to extract PDF"
- **Embedding generation**: Return 500 "Failed to generate embeddings"
- **Pinecone upsert**: Return 500 "Failed to store vectors"

### Chat Errors
- **Missing query**: Return 400 "Message required"
- **Retrieval failure**: Return 500 "Failed to retrieve documents"
- **Gemini API error**: Return 500 "Failed to generate response"
- **Network error**: Show toast "Connection failed"

### Logging
- Console.log for all major operations
- Error stacks for debugging
- Timestamps for tracking

---

## 🔄 COMPLETE DATA FLOW SUMMARY

```
USER UPLOADS PDF
  ↓
DocumentUpload component
  ↓
Uploadthing stores file (cloud)
  ↓
/api/uploadthing/core.ts receives confirmation
  ↓
/api/upload-document/route.ts processes
  ↓
  ├─ downloadFileFromUrl() → file
  ├─ processPdfDocument() → chunks + embeddings
  ├─ embeddings.embedDocuments() → vectors
  ├─ upsertVectors() → Pinecone stores
  └─ registerDocument() → in-memory cache
  ↓
✅ Response: stats and confirmation

---

USER ASKS QUESTION
  ↓
ChatInput component
  ↓
/api/chat/route.ts receives query
  ↓
ragPipeline() orchestrates:
  ├─ embeddings.embedQuery() → query vector
  ├─ queryVectors() → Pinecone searches
  ├─ formatContext() → prepare context
  ├─ isDocumentInventoryQuery() → check type
  ├─ generateResponse() → Gemini API
  └─ return response + sources
  ↓
MessageList component displays
  ├─ AI response
  ├─ Retrieved documents
  └─ Relevance scores
  ↓
✅ User sees answer with sources
```

