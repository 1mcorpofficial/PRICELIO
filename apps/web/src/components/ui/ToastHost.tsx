import { useUiStore } from '../../stores/uiStore';

export function ToastHost() {
  const toasts = useUiStore((state) => state.toasts);

  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
