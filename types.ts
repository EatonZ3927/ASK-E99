
export interface SearchSource {
  title: string;
  url: string;
}

export interface NewsItem {
  title: string;
  description: string;
}

export interface SearchResult {
  text?: string;
  items?: NewsItem[];
  sources: SearchSource[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text?: string;
  items?: NewsItem[];
  sources?: SearchSource[];
  isExpanded?: boolean;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RESULT = 'RESULT',
  ERROR = 'ERROR',
  THINKING = 'THINKING'
}
