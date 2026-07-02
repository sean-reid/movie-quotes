-- Movie Quotes schema for Cloudflare D1 (SQLite).
-- Apply locally:  wrangler d1 execute movie-quotes --local --file=schema.sql
-- Apply remote:   wrangler d1 execute movie-quotes --remote --file=schema.sql

DROP TABLE IF EXISTS rounds;
DROP TABLE IF EXISTS quote_neighbors;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS movie_genres;
DROP TABLE IF EXISTS genres;
DROP TABLE IF EXISTS movies;

CREATE TABLE movies (
  id          INTEGER PRIMARY KEY,
  title       TEXT    NOT NULL,
  year        INTEGER NOT NULL,
  decade      INTEGER NOT NULL,
  tmdb_rating REAL    NOT NULL,
  tmdb_votes  INTEGER NOT NULL,
  poster_path TEXT
);

CREATE TABLE genres (
  id   INTEGER PRIMARY KEY,
  name TEXT    NOT NULL
);

CREATE TABLE movie_genres (
  movie_id INTEGER NOT NULL,
  genre_id INTEGER NOT NULL,
  PRIMARY KEY (movie_id, genre_id)
);

CREATE TABLE quotes (
  id        INTEGER PRIMARY KEY,
  movie_id  INTEGER NOT NULL,
  text      TEXT    NOT NULL,
  character TEXT
);

-- Top-N most similar cross-film quotes per quote (build-time artifact, also
-- future-proofing for larger answer sets).
CREATE TABLE quote_neighbors (
  quote_id    INTEGER NOT NULL,
  neighbor_id INTEGER NOT NULL,
  score       REAL    NOT NULL,
  PRIMARY KEY (quote_id, neighbor_id)
);

-- Pre-generated rounds. decoy_pool is a JSON array of {quoteId, score} ranked
-- most-similar first, so answer size can grow without regenerating rounds.
CREATE TABLE rounds (
  id               INTEGER PRIMARY KEY,
  answer_quote_id  INTEGER NOT NULL,
  movie_id         INTEGER NOT NULL,
  decade           INTEGER NOT NULL,
  primary_genre_id INTEGER,
  band             TEXT    NOT NULL,
  avg_similarity   REAL    NOT NULL,
  decoy_pool       TEXT    NOT NULL
);

CREATE INDEX idx_quotes_movie ON quotes (movie_id);
CREATE INDEX idx_movie_genres_movie ON movie_genres (movie_id);
CREATE INDEX idx_rounds_filter ON rounds (band, decade, primary_genre_id);
