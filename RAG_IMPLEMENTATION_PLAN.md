# MarketMind RAG Assistant Implementation Plan

## Architecture Overview

### Current System
- **Frontend**: React + Vite with brand/campaign management
- **Auth Service**: Node.js/Express (port 5001)
- **Content Service**: FastAPI/Python (port 8002) 
- **AI Agents**: Python with CrewAI/LangChain (port 8001)

### RAG System Components

#### 1. New RAG Service (FastAPI)
**Location**: `/rag-service/`
**Port**: 8003
**Tech Stack**: FastAPI + PostgreSQL + pgvector + OpenAI

**Core Features**:
- Document upload and processing
- Text chunking and embedding
- Vector storage and retrieval
- Q&A with citations

#### 2. Database Schema
```sql
-- Brand Knowledge Base
CREATE TABLE brand_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_brand_documents_brand_id (brand_id),
    INDEX idx_brand_documents_embedding (embedding vector_cosine_ops)
);

-- Document Chunks for better retrieval
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES brand_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_document_chunks_document_id (document_id),
    INDEX idx_document_chunks_embedding (embedding vector_cosine_ops)
);
```

#### 3. API Endpoints
```
POST /api/brands/{brand_id}/knowledge/upload
GET  /api/brands/{brand_id}/knowledge/documents
DELETE /api/brands/{brand_id}/knowledge/documents/{doc_id}
POST /api/brands/{brand_id}/assistant/chat
GET  /api/brands/{brand_id}/assistant/suggestions
```

## Implementation Steps

### Phase 1: RAG Service Setup
1. Create rag-service directory structure
2. Set up FastAPI with PostgreSQL connection
3. Install dependencies: fastapi, uvicorn, psycopg2-binary, pgvector, openai, pypdf
4. Create database models and migrations
5. Implement document upload endpoint

### Phase 2: Document Processing
1. Implement file type detection (PDF, TXT, DOCX)
2. Add text extraction for different formats
3. Implement text chunking strategy
4. Add OpenAI embedding generation
5. Store chunks with embeddings in database

### Phase 3: RAG Assistant
1. Implement semantic search endpoint
2. Create chat endpoint with retrieval + generation
3. Add citation tracking
4. Implement context management per brand

### Phase 4: Frontend Integration
1. Add Knowledge tab to BrandManagePage
2. Create document upload component
3. Build RAG assistant chat interface
4. Add assistant access to campaign workflow
5. Implement content validation feature

### Phase 5: Workflow Integration
1. Add brand context to AI agents service
2. Enhance campaign generation with RAG context
3. Add content validation step
4. Implement brand consistency checks

## File Structure

```
rag-service/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── db.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── document.py
│   │   └── chunk.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── document.py
│   │   └── chat.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── knowledge.py
│   │   └── assistant.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── document_processor.py
│   │   ├── embedding_service.py
│   │   ├── retrieval_service.py
│   │   └── rag_service.py
│   └── utils/
│       ├── __init__.py
│       ├── text_splitter.py
│       └── file_handler.py
├── requirements.txt
├── alembic/
└── .env.example
```

## Integration Points

### 1. Brand Management
- Add "Knowledge" tab to BrandManagePage
- Upload brand voice PDFs, menu docs, guidelines
- List and manage uploaded documents

### 2. Campaign Workflow
- Add "Ask Assistant" button in CampaignNew
- Pre-campaign consultation for tone/guidelines
- Post-generation validation against brand knowledge

### 3. AI Agents Enhancement
- Pass brand context to content generation
- Include relevant knowledge in prompts
- Ensure brand consistency in generated content

## Technical Considerations

### Security
- Document access restricted to brand members
- File upload size limits and virus scanning
- API rate limiting for chat endpoints

### Performance
- Vector indexing for fast similarity search
- Document chunking for optimal retrieval
- Caching for frequent queries

### Scalability
- Async processing for large documents
- Background job queue for embeddings
- Database connection pooling

## MVP Features

### Minimum Viable Product
1. Document upload (PDF, TXT)
2. Basic text chunking
3. Vector search and retrieval
4. Simple Q&A with citations
5. Brand-scoped knowledge base

### Future Enhancements
1. Multiple file format support (DOCX, images)
2. Advanced chunking strategies
3. Conversation memory
4. Content auto-validation
5. Analytics on knowledge usage

## Dependencies

### New Requirements
```txt
# rag-service/requirements.txt
fastapi==0.115.6
uvicorn[standard]==0.32.1
psycopg2-binary==2.9.9
pgvector==0.3.0
openai==1.13.3
pypdf==4.2.0
python-multipart==0.0.9
pydantic==2.10.3
pydantic-settings==2.6.1
python-dotenv==1.0.1
alembic==1.14.0
```

### Frontend Dependencies
```json
{
  "dependencies": {
    "@heroicons/react": "^2.2.0",
    "axios": "^1.13.2",
    "react-dropzone": "^14.2.3"
  }
}
```

## Environment Variables

```bash
# rag-service/.env
DATABASE_URL=postgresql://user:password@localhost:5432/marketmind_rag
OPENAI_API_KEY=your_openai_api_key
CORS_ORIGIN_LIST=http://localhost:5173,http://localhost:3000
MAX_FILE_SIZE=10485760  # 10MB
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```
