
export enum Status {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

export type AppState =
  | { status: Status.IDLE }
  | { status: Status.LOADING }
  | { status: Status.SUCCESS; videoUrl: string }
  | { status: Status.ERROR; error: string };
