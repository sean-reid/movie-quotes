export interface MovieRecord {
  id: number;
  title: string;
  year: number;
  decade: number;
  tmdbRating: number;
  tmdbVotes: number;
  posterPath: string | null;
  genreIds: number[];
  /** TMDb thematic keyword ids, used to score how similar two films are. */
  keywordIds: number[];
}

export interface GenreRecord {
  id: number;
  name: string;
}

/** A film that has a located, downloaded, and stored script. */
export interface ScriptRecord {
  movieId: number;
  source: string;
  /** How to parse the stored text: full screenplay vs dialogue-only transcript. */
  kind: 'screenplay' | 'transcript';
  r2Key: string;
  chars: number;
}

/** A single extracted line of dialogue kept as a candidate quote. */
export interface QuoteRecord {
  id: number;
  movieId: number;
  text: string;
  character: string | null;
}
