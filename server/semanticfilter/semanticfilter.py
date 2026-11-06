# new content start
"""BERT semantic similarity against the precomputed ASL vocabulary."""
# new content end
# """Local semantic similarity lookup using the bundled GloVe vectors."""

from functools import lru_cache
from pathlib import Path
import shlex

import numpy as np


@lru_cache(maxsize=1)
def _load_embeddings() -> tuple[dict[str, int], np.ndarray]:
	"""Load and normalize the local word vectors once per process."""
	embeddings_path = Path(__file__).with_name("finished_glove.txt")
	words: list[str] = []
	vectors: list[np.ndarray] = []

	with embeddings_path.open("r", encoding="utf-8") as embedding_file:
		for line in embedding_file:
			parts = shlex.split(line)
			if len(parts) < 2:
				continue

			try:
				vector = np.asarray(parts[1:], dtype=np.float32)
			except ValueError:
				continue

			words.append(" ".join(parts[0].casefold().split()))
			vectors.append(vector)

	if not vectors:
		raise ValueError(f"No usable word vectors found in {embeddings_path}")

	dimensions = vectors[0].shape[0]
	valid_rows = [
		(word, vector)
		for word, vector in zip(words, vectors)
		if vector.shape == (dimensions,)
	]
	words = [word for word, _ in valid_rows]
	matrix = np.stack([vector for _, vector in valid_rows])
	norms = np.linalg.norm(matrix, axis=1, keepdims=True)
	np.divide(matrix, norms, out=matrix, where=norms != 0)

	return {word: index for index, word in enumerate(words)}, matrix


# new content start
def _get_similar_words_glove(word: str, limit: int = 6) -> list[tuple[str, float]]:
# new content end
# def get_similar_words(word: str, limit: int = 6) -> list[tuple[str, float]]:
	"""Return up to ``limit`` nearest vocabulary entries by cosine similarity.

	Results are ``(word, similarity)`` pairs sorted from most to least similar.
	An empty list is returned for blank input, an unknown word, or a nonpositive
	limit. The query itself is excluded from the results.
	"""
	query_word = " ".join(word.casefold().split())
	if not query_word or limit <= 0:
		return []

	vocabulary, matrix = _load_embeddings()
	query_index = vocabulary.get(query_word)
	if query_index is None:
		return []

	scores = matrix @ matrix[query_index]
	scores[query_index] = -np.inf
	result_count = min(limit, len(vocabulary) - 1)
	if result_count <= 0:
		return []

	candidate_indices = np.argpartition(scores, -result_count)[-result_count:]
	candidate_indices = candidate_indices[np.argsort(scores[candidate_indices])[::-1]]
	index_to_word = [""] * len(vocabulary)
	for candidate_word, candidate_index in vocabulary.items():
		index_to_word[candidate_index] = candidate_word

	return [
		(index_to_word[int(index)], float(scores[index]))
		for index in candidate_indices
	]
# new content end
"""Find semantic neighbors with BERT and the precomputed ASL vocabulary."""
# Previous non-executable SL-GCN/BERT ensemble fragment retained for reference:
# # slgcn_probs: [batch_size, num_classes]
# # bert_scores: [batch_size, num_classes]
#
# bert_probs = F.softmax(bert_scores, dim=1)
#
# # Equal-weight ensemble
VECTOR_SIZE = 768
REPRESENTATION_FILES = (
	"bert_representations.txt",
	"segmented_bert_representations.txt",
)
# final_probs = 0.5 * slgcn_probs + 0.5 * bert_probs
#
# new content start
@lru_cache(maxsize=1)
def _load_candidate_embeddings() -> tuple[list[str], np.ndarray]:
# new content end
	"""Read and normalize the precomputed BERT vectors once per process."""
	vectors_by_word: dict[str, np.ndarray] = {}

	for filename in REPRESENTATION_FILES:
		embeddings_path = Path(__file__).with_name(filename)
		with embeddings_path.open("r", encoding="utf-8") as embedding_file:
			for line in embedding_file:
				try:
					parts = shlex.split(line)
					if len(parts) != VECTOR_SIZE + 1:
						continue
					word = " ".join(parts[0].casefold().split())
					vector = np.asarray(parts[1:], dtype=np.float32)
				except ValueError:
					continue

				if word:
					vectors_by_word.setdefault(word, vector)

	if not vectors_by_word:
		raise ValueError("No valid BERT vectors found in the semantic-filter data")

	words = list(vectors_by_word)
	matrix = np.stack([vectors_by_word[word] for word in words])
	norms = np.linalg.norm(matrix, axis=1, keepdims=True)
	np.divide(matrix, norms, out=matrix, where=norms != 0)
	return words, matrix


@lru_cache(maxsize=1)
def _load_query_model():
	"""Load Minicons' public BERT model once; weights are cached by Hugging Face."""
	try:
		from minicons import cwe
	except ImportError as error:
		raise RuntimeError(
			"BERT semantic search requires the 'minicons' package. "
			"Install the project requirements and retry."
		) from error

	return cwe.CWE("bert-base-uncased", device="cpu")


def _embed_query(word: str) -> np.ndarray:
	"""Embed an arbitrary input word or phrase using the candidate-vector method."""
	model = _load_query_model()
	representation = model.extract_representation([[word, word]])[0]
	if hasattr(representation, "detach"):
		representation = representation.detach().cpu().numpy()

	query_vector = np.asarray(representation, dtype=np.float32).reshape(-1)
	if query_vector.shape != (VECTOR_SIZE,):
		raise ValueError(
			f"Expected a {VECTOR_SIZE}-dimensional BERT vector, "
			f"got {query_vector.size} dimensions"
		)
	return query_vector


def get_similar_words(
	word: str, limit: int = 6, candidates: list[str] | None = None
) -> list[tuple[str, float]]:
	"""Return BERT-nearest vocabulary entries for any nonblank input.

	The query is embedded at runtime, so it does not need to be in the
	precomputed vocabulary. Results are (word, cosine similarity) pairs.
	"""
	query_word = " ".join(word.casefold().split())
	if not query_word or limit <= 0:
		return []

	words, matrix = _load_candidate_embeddings()
	query_vector = _embed_query(query_word)
	query_norm = np.linalg.norm(query_vector)
	if query_norm == 0:
		return []

	scores = matrix @ (query_vector / query_norm)
	if candidates is not None:
		word_to_index = {candidate: index for index, candidate in enumerate(words)}
		candidate_matches: list[tuple[str, float]] = []
		seen: set[str] = set()
		for candidate in candidates:
			normalized_candidate = " ".join(candidate.casefold().split())
			candidate_index = word_to_index.get(normalized_candidate)
			if candidate_index is None or normalized_candidate in seen:
				continue
			seen.add(normalized_candidate)
			candidate_matches.append((candidate, float(scores[candidate_index])))
		return sorted(candidate_matches, key=lambda match: match[1], reverse=True)[:limit]

	exact_match = next(
		(index for index, value in enumerate(words) if value == query_word), None
	)
	if exact_match is not None:
		scores[exact_match] = -np.inf

	result_count = min(limit, len(words) - (exact_match is not None))
	if result_count <= 0:
		return []

	candidate_indices = np.argpartition(scores, -result_count)[-result_count:]
	candidate_indices = candidate_indices[np.argsort(scores[candidate_indices])[::-1]]
	return [
		(words[int(index)], float(scores[index]))
		for index in candidate_indices
	]


# Previous exact-vocabulary GloVe implementation retained for reference:
# @lru_cache(maxsize=1)
# def _load_embeddings() -> tuple[dict[str, int], np.ndarray]:
#     embeddings_path = Path(__file__).with_name("finished_glove.txt")
#     words: list[str] = []
#     vectors: list[np.ndarray] = []
#     with embeddings_path.open("r", encoding="utf-8") as embedding_file:
#         for line in embedding_file:
#             parts = shlex.split(line)
#             if len(parts) < 2:
#                 continue
#             try:
#                 vector = np.asarray(parts[1:], dtype=np.float32)
#             except ValueError:
#                 continue
#             words.append(" ".join(parts[0].casefold().split()))
#             vectors.append(vector)
#     if not vectors:
#         raise ValueError(f"No usable word vectors found in {embeddings_path}")
#     dimensions = vectors[0].shape[0]
#     valid_rows = [
#         (word, vector)
#         for word, vector in zip(words, vectors)
#         if vector.shape == (dimensions,)
#     ]
#     words = [word for word, _ in valid_rows]
#     matrix = np.stack([vector for _, vector in valid_rows])
#     norms = np.linalg.norm(matrix, axis=1, keepdims=True)
#     np.divide(matrix, norms, out=matrix, where=norms != 0)
#     return {word: index for index, word in enumerate(words)}, matrix
#
# def get_similar_words(word: str, limit: int = 6) -> list[tuple[str, float]]:
#     query_word = " ".join(word.casefold().split())
#     if not query_word or limit <= 0:
#         return []
#     vocabulary, matrix = _load_embeddings()
#     query_index = vocabulary.get(query_word)
#     if query_index is None:
#         return []
#     scores = matrix @ matrix[query_index]
#     scores[query_index] = -np.inf
#     result_count = min(limit, len(vocabulary) - 1)
#     if result_count <= 0:
#         return []
#     candidate_indices = np.argpartition(scores, -result_count)[-result_count:]
#     candidate_indices = candidate_indices[np.argsort(scores[candidate_indices])[::-1]]
#     index_to_word = [""] * len(vocabulary)
#     for candidate_word, candidate_index in vocabulary.items():
#         index_to_word[candidate_index] = candidate_word
#     return [
#         (index_to_word[int(index)], float(scores[index]))
#         for index in candidate_indices
#     ]