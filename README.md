# 🤖 RAG Chatbot - AI-Powered Document Intelligence

> **Intelligent PDF chatbot powered by Google Gemini + Pinecone Vector Database**

---

## ✨ What It Does

- 📄 **Upload PDFs** → Ask questions → Get AI-powered answers with sources
- 🔍 **Semantic Search** → Find relevant information instantly
- 📊 **Multiple Documents** → Organize with namespaces, search across collections
- 💡 **Smart Retrieval** → AI finds the most relevant sections automatically
- 📎 **Source Citations** → See where answers come from with relevance scores

---

## 🚀 Quick Start (60 Seconds)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables (.env)
GOOGLE_API_KEY=your_key_here
PINECONE_API_KEY=your_key_here
PINECONE_INDEX_NAME=chatbot
UPLOADTHING_TOKEN=your_token_here

# 3. Run the app
npm run dev

# 4. Open browser
# http://localhost:3000
```

---

## 🎯 Core Features

### 📤 Document Upload
- ✅ Drag & drop PDF files (up to 8MB)
- ✅ Automatic text extraction
- ✅ Smart chunking with context overlap
- ✅ Real-time processing feedback
- ✅ Organize documents by namespace

### 💬 Chat Interface
- ✅ Ask natural language questions
- ✅ Get instant AI-powered responses
- ✅ See retrieved source documents
- ✅ View relevance scores
- ✅ Beautiful message formatting

### 🧠 AI Engine
- ✅ **Embeddings**: Google text-embedding-004 (1536 dimensions)
- ✅ **LLM**: Google Gemini 1.5 Pro
- ✅ **Vector Search**: Pinecone serverless database
- ✅ **RAG Pipeline**: LangChain orchestration
- ✅ **Context Awareness**: Up to 5 relevant chunks per query

### 🔖 Document Management
- ✅ Track uploaded documents
- ✅ View document statistics
- ✅ Organize by namespaces
- ✅ Auto-sync with Pinecone
- ✅ Document registry caching

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│        Frontend (React + TypeScript)     │
│  • Upload component with drag & drop    │
│  • Chat interface with message history  │
│  • Source document display              │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌─────────────┐  ┌──────────────┐
│Upload API   │  │ Chat API     │
│ /api/       │  │ /api/chat    │
│ upload-doc  │  │              │
└─────┬───────┘  └──────┬───────┘
      │                 │
      ▼                 ▼
┌──────────────────────────────────┐
│    RAG Pipeline & Processing     │
│  • PDF extraction & chunking     │
│  • Vector embedding generation   │
│  • Semantic search               │
│  • Response generation           │
└──────────────┬───────────────────┘
               │
       ┌───────┴────────┬──────────┐
       ▼                ▼          ▼
  ┌─────────┐    ┌──────────┐  ┌─────────┐
  │Uploadthing│  │ Pinecone │  │ Gemini  │
  │(Storage)  │  │(Vectors) │  │  (LLM)  │
  └─────────┘    └──────────┘  └─────────┘
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts                 # 💬 Chat endpoint
│   │   ├── documents/route.ts            # 📄 Document listing
│   │   ├── upload-document/route.ts      # 📤 Upload handler
│   │   └── uploadthing/core.ts           # ☁️  Upload config
│   ├── globals.css                       # 🎨 Styles
│   ├── layout.tsx                        # 📐 App layout
│   └── page.tsx                          # 🏠 Main page
│
├── components/
│   ├── chat/
│   │   ├── ChatInput.tsx                 # ✍️  Input field
│   │   └── MessageList.tsx               # 💬 Messages display
│   ├── upload/
│   │   └── DocumentUpload.tsx            # 📤 Upload UI
│   └── ui/                               # 🎭 Reusable components
│
└── lib/rag/
    ├── embeddings.ts                     # 🔢 Vector embeddings
    ├── pinecone.ts                       # 🔍 Vector search
    ├── document-processor.ts             # 📄 PDF processing
    ├── document-registry.ts              # 📋 Document tracking
    └── chain.ts                          # 🧠 RAG pipeline
```

---

## 🔄 How It Works

### Upload Flow
```
1. User selects PDF file
   ↓
2. Uploadthing stores file in cloud
   ↓
3. Backend downloads and extracts text
   ↓
4. Text split into intelligent chunks (1000 chars, 200 overlap)
   ↓
5. Google generates embeddings (text-embedding-004)
   ↓
6. Vectors stored in Pinecone with metadata
   ↓
7. Document registered in memory cache
   ↓
✅ Ready for queries!
```

### Chat Flow
```
1. User asks a question
   ↓
2. Query embedded with same model (text-embedding-004)
   ↓
3. Pinecone searches for similar vectors (top 5)
   ↓
4. Retrieved chunks formatted with context
   ↓
5. Sent to Gemini with system prompt
   ↓
6. AI generates response with sources
   ↓
✅ Response displayed with citations!
```

---

## ⚙️ Configuration

### Environment Variables (Required)
```env
# Google AI APIs
GOOGLE_API_KEY=your_google_api_key

# Pinecone Vector Database
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=chatbot

# File Upload Service
UPLOADTHING_TOKEN=your_uploadthing_token
```

### Tunable Parameters

**PDF Processing** (`lib/rag/document-processor.ts`):
```typescript
chunkSize: 1000           # Characters per chunk
chunkOverlap: 200         # Overlap between chunks
```

**RAG Search** (`lib/rag/chain.ts`):
```typescript
topK: 5                   # Documents to retrieve
temperature: 0.7          # Response creativity
maxTokens: 1024           # Max response length
```

**Upload Limits** (`app/api/uploadthing/core.ts`):
```typescript
maxFileSize: "8MB"        # Maximum file size
fileType: ["application/pdf"]  # Only PDFs
```

---

## 📊 Features & Capabilities

| Feature | Status | Details |
|---------|--------|---------|
| **PDF Upload** | ✅ | Drag & drop, up to 8MB, multiple files |
| **Text Extraction** | ✅ | Automatic with page tracking |
| **Smart Chunking** | ✅ | Intelligent overlap for context |
| **Vector Embeddings** | ✅ | Google text-embedding-004 (1536D) |
| **Semantic Search** | ✅ | Cosine similarity in Pinecone |
| **AI Responses** | ✅ | Gemini 1.5 Pro with context |
| **Source Citation** | ✅ | Document name + page + score |
| **Document Organization** | ✅ | Namespace-based isolation |
| **Document Registry** | ✅ | In-memory cache + Pinecone sync |
| **Error Handling** | ✅ | Comprehensive with user feedback |
| **Streaming** | ✅ | Real-time response generation |
| **Mobile Responsive** | ✅ | Works on all devices |

---

## 🧪 Test It Out

### Test 1: Upload a Document
```
1. Go to http://localhost:3000
2. Click "Upload Documents" section
3. Select a PDF file
4. Wait for processing message
✅ See confirmation with chunk count
```

### Test 2: Ask a Question
```
1. Type: "What is this document about?"
2. Press Ctrl+Enter or click send
3. Wait for AI response
✅ See answer with source documents
```

### Test 3: Multiple Documents
```
1. Change namespace to "finance"
2. Upload another PDF
3. Change back to "default" namespace
4. Ask a question
✅ Results from only that namespace
```

---

## 🛠️ Technology Stack

| Component | Technology 
|-----------|-----------
| **Frontend** | React + TypeScript
| **Backend** | Next.js 
| **Styling** | Tailwind CSS
| **PDF Processing** | LangChain + pdf-parse 
| **Embeddings** | @langchain/google-genai 
| **Vector DB** | Pinecone Serverless
| **LLM** | Google Gemini
| **File Storage** | Uploadthing
| **UI Components** | shadcn/ui

