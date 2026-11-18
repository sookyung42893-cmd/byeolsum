import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * 화면을 그리다 오류가 나도 빈 화면 대신 안내를 보여준다.
 * 저장된 데이터가 꼬였을 때 바로 초기화할 수 있게 버튼을 둔다.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; asking: boolean }> {
  state = { error: null as Error | null, asking: false };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('별숨 화면 오류:', error, info.componentStack);
  }

  /** 첫 번째 누름은 확인을 묻고(공유 링크에서는 confirm()이 막혀서 화면 안에서 묻는다), 두 번째 누름에 지운다 */
  private reset = () => {
    if (!this.state.asking) {
      this.setState({ asking: true });
      return;
    }
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('byeolsum:'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* 저장소를 못 지워도 새로고침은 해 본다 */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="theme-night flex min-h-screen items-center justify-center bg-night-bg px-6 text-night-text">
        <div role="alert" className="max-w-md rounded-3xl border border-night-line bg-night-card p-8">
          <h1 className="text-2xl">화면을 그리다 문제가 생겼어요</h1>
          <p className="mt-2 leading-relaxed text-night-sub">
            새로고침해도 계속 이 화면이 나오면, 저장된 데이터가 꼬였을 수 있어요. 아래 버튼으로 데이터를 초기화하면 다시 열려요.
          </p>
          <p className="mt-3 break-all rounded-xl bg-night-bg px-3 py-2 font-mono text-xs text-night-sub">{this.state.error.message}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => window.location.reload()} className="rounded-xl border border-night-line px-4 py-2.5 text-sm hover:bg-night-line/50">
              새로고침
            </button>
            <button type="button" onClick={this.reset} className="rounded-xl bg-night-star px-4 py-2.5 text-sm font-medium text-night-bg hover:brightness-105">
              {this.state.asking ? '정말 초기화하기' : '데이터 초기화하고 다시 시작'}
            </button>
          </div>
          {this.state.asking && (
            <p role="status" className="mt-3 text-sm text-night-sub">
              저장된 데이터를 모두 지우고 예시 데이터로 새로 시작해요. 직접 가입한 계정과 기록도 함께 지워져요. 한 번 더 누르면 초기화돼요.
            </p>
          )}
        </div>
      </div>
    );
  }
}
