# MarketMind RAG Assistant Setup Guide

## Overview

This guide will help you set up the complete RAG (Retrieval-Augmented Generation) assistant for MarketMind, enabling brand-specific knowledge management and AI-powered content assistance.

## Architecture

### Components
- **RAG Service** (FastAPI + PostgreSQL + pgvector): Document processing and vector search
- **Frontend Integration**: Knowledge management UI and campaign workflow integration
- **OpenAI Integration**: Embedding generation and chat completion

### Features
- Document upload (PDF, TXT, MD) with automatic chunking
- Vector similarity search for relevant content retrieval
- Brand-specific knowledge base with citations
- Content validation against brand guidelines
- Campaign workflow integration with assistant access

## Prerequisites

### Database Setup
```bash
# Install PostgreSQL with pgvector extension
brew install postgresql
brew install pgvector

# Create database
createdb marketmind_rag

# Enable pgvector extension
psql marketmind_rag -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Environment Variables
Create `.env` files in each service:

#### RAG Service (`rag-service/.env`)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/marketmind_rag
OPENAI_API_KEY=your_openai_api_key_here
CORS_ORIGIN_LIST=http://localhost:5173,http://localhost:3000
MAX_FILE_SIZE=10485760
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_RETRIEVED_CHUNKS=5
PORT=8003
DEBUG=true
```

#### Frontend (`marketmind-frontend/.env`)
```bash
VITE_API_URL=http://localhost:5001
VITE_CONTENT_API_URL=http://localhost:8002
VITE_AGENTS_API_URL=http://localhost:8001
VITE_RAG_API_URL=http://localhost:8003
```

## Installation & Setup

### 1. Install Dependencies

#### RAG Service
```bash
cd rag-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Frontend
```bash
cd marketmind-frontend
npm install
```

### 2. Database Migration

The RAG service uses SQLAlchemy models that will auto-create tables. For production, consider using Alembic migrations:

```bash
cd rag-service
# Initialize Alembic (first time only)
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

### 3. Start Services

#### Start RAG Service
```bash
cd rag-service
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

#### Start Frontend
```bash
cd marketmind-frontend
npm run dev
```

#### Ensure Other Services Running
- Auth Service: `http://localhost:5001`
- Content Service: `http://localhost:8002`
- AI Agents Service: `http://localhost:8001`

## Usage Guide

### 1. Brand Knowledge Management

1. Navigate to **Brands** → **Manage Brand** → **Knowledge Base** tab
2. Upload documents:
   - Brand voice guidelines (PDF)
   - Menu and pricing information
   - Marketing rules and policies
   - Product descriptions
3. View processing stats (documents, chunks, file types)

### 2. Brand Assistant

1. Navigate to **Brands** → **Manage Brand** → **Brand Assistant** tab
2. Ask questions about:
   - Brand tone and voice
   - Campaign guidelines
   - Product information
   - Marketing policies
3. Get responses with source citations

### 3. Campaign Workflow Integration

1. Navigate to **Campaigns** → **New Campaign**
2. In Step 1 (Campaign Brief), use:
   - **Ask Assistant**: Get brand guidance for campaign ideas
   - **Validate**: Check brief against brand guidelines
3. Assistant provides suggestions and validation feedback

## API Endpoints

### Knowledge Management
```
POST /api/brands/{brand_id}/knowledge/upload
GET  /api/brands/{brand_id}/knowledge/documents
DELETE /api/brands/{brand_id}/knowledge/documents/{doc_id}
GET  /api/brands/{brand_id}/knowledge/stats
```

### Assistant
```
POST /api/brands/{brand_id}/assistant/chat
GET  /api/brands/{brand_id}/assistant/history
POST /api/brands/{brand_id}/assistant/validate
GET  /api/brands/{brand_id}/assistant/suggestions
DELETE /api/brands/{brand_id}/assistant/history
```

## Testing

### 1. Test Document Upload
```bash
curl -X POST \
  http://localhost:8003/api/brands/test-brand/knowledge/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-document.pdf"
```

### 2. Test Assistant Chat
```bash
curl -X POST \
  http://localhost:8003/api/brands/test-brand/assistant/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What tone should we use for promotions?"}'
```

### 3. Test Content Validation
```bash
curl -X POST \
  http://localhost:8003/api/brands/test-brand/assistant/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Get 50% off everything!"}'
```

## Configuration

### Text Processing
- **Chunk Size**: 1000 characters (configurable)
- **Chunk Overlap**: 200 characters (configurable)
- **Max Retrieved Chunks**: 5 (configurable)

### Vector Search
- **Embedding Model**: OpenAI text-embedding-3-small (1536 dimensions)
- **Similarity Metric**: Cosine similarity
- **Index Type**: HNSW (fast approximate search)

### File Support
- **PDF**: Automatic text extraction using PyPDF
- **TXT/MD**: Direct text reading
- **Max File Size**: 10MB (configurable)
- **Future**: DOCX, images with OCR

## Monitoring

### Health Checks
- RAG Service: `GET /health`
- Database: Check connection and extension status

### Logging
- Application logs via console
- Error tracking with structured logging
- Performance metrics for search queries

## Security

### Authentication
- JWT token validation (shared with auth service)
- Brand membership verification
- User-scoped chat history

### File Security
- File type validation
- Size limits
- Safe file handling
- No code execution

## Performance Optimization

### Database Indexing
```sql
-- Vector similarity index
CREATE INDEX idx_document_chunks_embedding 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### Caching
- Document metadata caching
- Embedding result caching
- Chat session management

### Scaling Considerations
- Async document processing
- Background job queue for large files
- Connection pooling for database

## Troubleshooting

### Common Issues

#### 1. Database Connection
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Check pgvector extension
psql marketmind_rag -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

#### 2. OpenAI API Issues
```bash
# Test API key
curl -H "Authorization: Bearer YOUR_KEY" \
  https://api.openai.com/v1/models

# Check rate limits
# Verify OpenAI dashboard for usage
```

#### 3. File Upload Problems
- Check file size limits
- Verify file type support
- Check upload directory permissions

#### 4. Vector Search Issues
- Verify embeddings are generated
- Check vector dimensions (should be 1536)
- Test similarity queries manually

### Debug Mode
Enable debug logging:
```bash
# RAG Service
export DEBUG=true

# Frontend
export VITE_DEBUG=true
```

## Production Deployment

### Docker Setup
```dockerfile
# rag-service/Dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8003
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
```

### Environment Configuration
- Use environment variables for all configuration
- Secure database connections with SSL
- Implement proper secret management
- Set up monitoring and alerting

### Scaling
- Horizontal scaling for RAG service
- Database read replicas
- CDN for file storage
- Load balancer configuration

## Next Steps

### Phase 2 Enhancements
1. **Advanced File Support**: DOCX, images with OCR
2. **Conversation Memory**: Multi-turn dialogue context
3. **Analytics**: Knowledge base usage metrics
4. **Workflow Automation**: Auto-validation in campaign generation
5. **Multi-brand Support**: Cross-brand knowledge sharing

### Integration Opportunities
1. **Content Generation**: Pass brand context to AI agents
2. **Calendar Integration**: Schedule posts based on assistant insights
3. **Performance Analytics**: Track RAG-powered content performance
4. **Team Collaboration**: Shared knowledge base editing
5. **API Extensions**: Third-party integrations

## Support

### Documentation
- API docs: `http://localhost:8003/docs`
- OpenAPI spec: `http://localhost:8003/openapi.json`

### Logs and Monitoring
- Application logs in console
- Database query performance
- OpenAI API usage tracking

### Getting Help
1. Check this guide for common issues
2. Review API documentation
3. Check application logs
4. Verify environment configuration
5. Test with sample data

---

**The RAG assistant is now ready to enhance your MarketMind platform with brand-specific knowledge management and AI-powered content assistance!**
