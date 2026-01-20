
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface SearchSource {
  title: string;
  url: string;
}

export interface SearchResult {
  text: string;
  sources: SearchSource[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: SearchSource[];
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RESULT = 'RESULT',
  ERROR = 'ERROR',
  THINKING = 'THINKING'
}
