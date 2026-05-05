from typing import List
import openai
from openai import OpenAI
import numpy as np
from ..config import settings


class EmbeddingService:
    """Service for generating text embeddings using OpenAI"""

    def __init__(self):
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key is required")

        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = "text-embedding-3-small"  # 1536 dimensions

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        try:
            response = self.client.embeddings.create(model=self.model, input=text)
            return response.data[0].embedding
        except Exception as e:
            raise Exception(f"Failed to generate embedding: {str(e)}")

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        if not texts:
            return []

        try:
            # Process in batches to handle rate limits
            batch_size = 100
            all_embeddings = []

            for i in range(0, len(texts), batch_size):
                batch = texts[i : i + batch_size]
                response = self.client.embeddings.create(model=self.model, input=batch)

                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)

            return all_embeddings
        except Exception as e:
            raise Exception(f"Failed to generate embeddings: {str(e)}")

    def cosine_similarity(
        self, embedding1: List[float], embedding2: List[float]
    ) -> float:
        """Calculate cosine similarity between two embeddings"""
        if len(embedding1) != len(embedding2):
            raise ValueError("Embeddings must have same dimensions")

        # Convert to numpy arrays
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)

        # Calculate cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    async def find_similar_chunks(
        self,
        query_embedding: List[float],
        chunk_embeddings: List[List[float]],
        top_k: int = 5,
    ) -> List[tuple]:
        """Find most similar chunks to query embedding"""
        if not chunk_embeddings:
            return []

        similarities = []
        for i, chunk_embedding in enumerate(chunk_embeddings):
            similarity = self.cosine_similarity(query_embedding, chunk_embedding)
            similarities.append((i, similarity))

        # Sort by similarity (descending) and return top_k
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]
