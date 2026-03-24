-- similarity-search.sql
-- Busca semântica por cosine similarity via pgvector
-- Parâmetros:
--   $ragIndexId : UUID do RAGIndex (filtro por projeto via rag_index_id)
--   $queryVector: vetor de 384 dimensões como literal, ex: '[0.1, 0.2, ...]'
--   $topK       : número de resultados (default 5)
--   $minSim     : threshold de similaridade mínima (default 0.2)

SELECT
  e.id                  AS embedding_id,
  e.rag_document_id     AS document_id,
  COALESCE(d.source_path, 'unknown') AS document_title,
  COALESCE((e.metadata->>'chunkIndex')::int, 0) AS chunk_index,
  e.chunk_text          AS chunk_text,
  -- <=> é o operador de cosine distance; similarity = 1 - distance
  -- Valores: 1.0 = idêntico, 0.0 = completamente diferente
  1 - (e.embedding <=> $queryVector::vector) AS similarity
FROM embeddings e
LEFT JOIN rag_documents d ON e.rag_document_id = d.id
WHERE e.rag_index_id = $ragIndexId::uuid
  AND e.embedding IS NOT NULL
  AND 1 - (e.embedding <=> $queryVector::vector) >= $minSim
ORDER BY e.embedding <=> $queryVector::vector  -- ASC por distance = DESC por similarity
LIMIT $topK;

-- Verificar uso do índice IVFFlat:
-- EXPLAIN (ANALYZE, BUFFERS)
--   SELECT * FROM embeddings ORDER BY embedding <=> '[...]'::vector LIMIT 5;
-- Deve mostrar "Index Scan using idx_embeddings_vector_ivfflat"
