/**
 * 확인창. 브라우저 기본 confirm()은 공유 링크(Artifact) 안에서 막혀 항상 "취소"가 되므로,
 * 앱 안에 직접 그리는 확인창(ConfirmHost)을 쓴다. ConfirmHost가 없을 때만 기본 confirm으로 대신한다.
 */
export interface ConfirmRequest {
  message: string;
  confirmLabel?: string;
  resolve: (ok: boolean) => void;
}

let listener: ((r: ConfirmRequest) => void) | null = null;

export function askConfirm(message: string, confirmLabel?: string): Promise<boolean> {
  if (!listener) return Promise.resolve(window.confirm(message));
  const show = listener;
  return new Promise((resolve) => show({ message, confirmLabel, resolve }));
}

export function setConfirmListener(fn: (r: ConfirmRequest) => void): () => void {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}
