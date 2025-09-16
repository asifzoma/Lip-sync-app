export enum Status {
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export interface GenerationJob {
  id: string;
  status: Status;
  imageFile: File;
  imagePreviewUrl: string;
  audioFile: File;
  script: string;
  gender: Gender;
  videoUrl?: string;
  error?: string;
  operation?: any; // The operation object from the VEO API
  progressMessage: string;
  offendingWords?: string[];
}