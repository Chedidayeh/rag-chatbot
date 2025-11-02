# 🤖 RAG Chatbot - AI-Powered Document Intelligence

> **Intelligent PDF chatbot powered by Google Gemini + Pinecone Vector Database**

---

## ✨ What It Does

- 📄 **Upload PDFs** → Ask questions → Get AI-powered answers with sources
- 🔍 **Semantic Search** → Find relevant information instantly
- 📊 **Multiple Documents** → Search across collections
- 💡 **Smart Retrieval** → AI finds the most relevant sections automatically
- 👤 **User Sessions** → Isolated workspaces for each browser session
- 💾 **Persistent Database** → PostgreSQL stores documents, chunks, and chat history
- 🔐 **Session-Based Isolation** → User namespaces keep documents separate

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
DATABASE_URL=postgresql://user:password@localhost:5432/rag_chatbot

# 3. Run database migrations
npx prisma migrate dev

# 4. Run the app
npm run dev

# 5. Open browser
# http://localhost:3000
```

---

## 🎯 Core Features

### 📤 Document Upload
- ✅ Drag & drop PDF files (up to 8MB)
- ✅ Automatic text extraction
- ✅ Smart chunking with context overlap
- ✅ Real-time processing feedback

### 💬 Chat Interface
- ✅ Ask natural language questions
- ✅ Get instant AI-powered responses
- ✅ Beautiful message formatting

### 🧠 AI Engine
- ✅ **Embeddings**: Google text-embedding-004 (1536 dimensions)
- ✅ **LLM**: Google Gemini 2.5 Flash (faster, optimized responses)
- ✅ **Vector Search**: Pinecone serverless database with user namespaces
- ✅ **RAG Pipeline**: LangChain orchestration with context awareness
- ✅ **Context Awareness**: Up to 5 relevant chunks per query
- ✅ **Database**: PostgreSQL for persistent storage
- ✅ **Chat History**: Full conversation persistence per session

### 🔖 Document Management
- ✅ Track uploaded documents
- ✅ Auto-sync with Pinecone
- ✅ Document registry caching

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│        Frontend (React + TypeScript)             │
│  • Upload component with drag & drop            │
│  • Chat interface with message history          │
│  • Source document display                      │
│  • Session-based user workspace                 │
└──────────────┬───────────────────────────────────┘
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
│  • User namespace isolation      │
└──────────────┬───────────────────┘
               │
    ┌──────────┼─────────┬──────────┐
    ▼          ▼         ▼          ▼
┌─────────┐  ┌──────────┐  ┌─────────┐  ┌────────────┐
│Uploadthing│ │ Pinecone │  │ Gemini  │  │ PostgreSQL │
│(Storage) │ │(Vectors) │  │ (LLM)   │  │(Persistent)│
└─────────┘ └──────────┘  └─────────┘  └────────────┘
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts                 # 💬 Chat endpoint
│   │   ├── documents/route.ts            # 📄 Document listing & deletion
│   │   ├── documents/[id]/route.ts       # 📄 Document details
│   │   ├── delete-all-records/route.ts   # 🗑️  Cleanup endpoint
│   │   ├── upload-document/route.ts      # 📤 Upload handler
│   │   └── uploadthing/
│   │       ├── core.ts                   # ☁️  Upload config
│   │       └── route.ts                  # 📤 Upload webhook
│   ├── globals.css                       # 🎨 Styles
│   ├── layout.tsx                        # 📐 App layout
│   └── page.tsx                          # 🏠 Main page
│
├── components/
│   ├── chat/
│   │   ├── ChatInput.tsx                 # ✍️  Input field
│   │   └── MessageList.tsx               # 💬 Messages display
│   ├── upload/
│   │   ├── DocumentUpload.tsx            # 📤 Upload UI
│   │   └── DocumentList.tsx              # 📋 Document list display
│   └── ui/                               # 🎭 Reusable components
│
├── hooks/
│   └── use-mobile.tsx                    # 📱 Mobile detection
│
└── lib/
    ├── auth.ts                           # 👤 Session management
    ├── prisma.ts                         # � Database client
    ├── uploadthing.ts                    # ☁️  Upload client
    ├── utils.ts                          # �️  Utilities
    ├── api/
    │   └── error.ts                      # ❌ Error handling
    └── rag/
        ├── chain.ts                      # 🧠 RAG pipeline
        ├── document-processor.ts         # 📄 PDF processing
        ├── document-registry.ts          # 📋 Document tracking
        ├── embeddings.ts                 # 🔢 Vector embeddings
        ├── pinecone.ts                   # 🔍 Vector search
        └── vectorstore.ts                # 💾 Vector storage
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
6. Document metadata stored in PostgreSQL
   ↓
7. Vectors stored in Pinecone with user namespace isolation
   ↓
8. Chunks stored in PostgreSQL for reference
   ↓
✅ Ready for queries!
```

### Chat Flow
```
1. User asks a question
   ↓
2. User session automatically created/retrieved from database
   ↓
3. Query embedded with same model (text-embedding-004)
   ↓
4. Pinecone searches in user's namespace (top 5 results)
   ↓
5. Retrieved chunks formatted with metadata
   ↓
6. Document catalog provided for context
   ↓
7. Sent to Gemini 2.5 Flash with system prompt & chat history
   ↓
8. Chat message and response stored in PostgreSQL
   ↓
✅ Response displayed with citations and sources!
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

# PostgreSQL Database
DATABASE_URL=postgresql://user:password@localhost:5432/rag_chatbot
```

### Database Setup
```bash
# Create initial migration (from schema.prisma)
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# View database GUI
npx prisma studio
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
model: "gemini-2.5-flash" # Fast, optimized model
```

**Upload Limits** (`app/api/uploadthing/core.ts`):
```typescript
maxFileSize: "8MB"        # Maximum file size
fileType: ["application/pdf"]  # Only PDFs
```

**User Session** (`lib/auth.ts`):
```typescript
sessionExpiry: 30 * 24 * 60 * 60  # 30 days (seconds)
namespace: "user_${userId}"       # Isolated user namespace
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
| **AI Responses** | ✅ | Gemini 2.5 Flash with context |
| **Document Registry** | ✅ | PostgreSQL + Pinecone sync |
| **Error Handling** | ✅ | Comprehensive with user feedback |
| **Streaming** | ✅ | Real-time response generation |
| **Mobile Responsive** | ✅ | Works on all devices |
| **User Sessions** | ✅ | Cookie-based automatic sessions |
| **Chat History** | ✅ | Full persistence in PostgreSQL |
| **Namespace Isolation** | ✅ | User-scoped document namespaces |
| **Document Management** | ✅ | View, delete, track documents |

---

## 🛠️ Technology Stack

| Component | Technology |
|-----------|----------|
| **Frontend** | React 19 + TypeScript |
| **Backend** | Next.js 15 with App Router |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Database** | PostgreSQL + Prisma ORM |
| **PDF Processing** | LangChain + pdf-parse |
| **Embeddings** | @langchain/google-genai (text-embedding-004) |
| **Vector DB** | Pinecone Serverless |
| **LLM** | Google Gemini 2.5 Flash |
| **File Storage** | Uploadthing |
| **UI Components** | shadcn/ui + Radix UI |
| **Auth** | Cookie-based sessions |
| **Validation** | Zod schemas |

---

## 🗄️ Database Schema

### Core Models

**User**
- Session-based user management (cookie: `sessionId`)
- Stores basic profile (name, avatar)
- Relations: documents, chats, sessions

**Document**
- Stores PDF metadata (filename, size, pages, chunks)
- Links to user (isolation)
- Status tracking (processing, completed, failed)
- Pinecone namespace: `user_{userId}`
- Relations: chunks, chats, messages

**DocumentChunk**
- Individual searchable pieces of documents
- Stores text content and embedding vector
- Page number tracking
- Relations: document

**Chat**
- Conversation sessions per user
- Can reference multiple documents
- Relations: user, messages, documents

**Message**
- Individual messages in chats
- Stores role (user/assistant)
- References retrieved documents
- Relations: chat

**Session**
- Explicit session records for timeout/expiry
- 30-day default expiration
- Relations: user

---

## 👤 Authentication & User Isolation

### Session-Based Authentication
```
1. User visits app (first time)
   ↓
2. Server generates unique sessionId (UUID)
   ↓
3. sessionId stored in secure HTTP-only cookie
   ↓
4. User automatically created in database
   ↓
5. All subsequent requests use session cookie
   ↓
6. User namespace derived: user_${userId}
   ↓
✅ Automatic, seamless experience!
```

### User Namespace Isolation
- **Pinecone**: Each user's vectors in `user_{userId}` namespace
- **Database**: Documents, chats, messages linked via userId
- **API**: All endpoints check session and filter by userId
- **Security**: No user can access another user's data

