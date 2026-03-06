export type CfpAnalysesParams = {
  page?: number;
  size?: number;
  sort?: string | Array<string>;
  search?: string;
};

export type CfpClassifyPayload = {
  url?: string;
  content: string;
  attachments?: Array<File>;
}

export type CfpReclassifyPayload = {
  url?: string;
  addAttachments?: Array<File>;
}
