export type ScrapperResultsParams = {
  page?: number;
  size?: number;
  sort?: string | Array<string>;
  search?: string;
};

// TODO: Define the ScrapperResult type based on actual data structure
export type ScrapperResult = {
  id: number;
  url: string;
  title: string;
  content: string;
  scrapedAt: string;
  promptContext: string;
  status: ScrapperResultStatus;
};

export type ScrapperResultStatus =
  | 'NEW'
  | 'CLASSIFIED_AUTO'
  | 'CLASSIFIED_MANUALLY'
  | 'FAILED'
  | 'REJECTED';
