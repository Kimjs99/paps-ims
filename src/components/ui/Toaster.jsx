import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { useToastStore } from "../../store/toastStore";
import { cn } from "../../lib/utils";

const icons = {
  success: <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />,
  error: <XCircle className="h-4 w-4 text-red-500 shrink-0" />,
  info: <Info className="h-4 w-4 text-blue-500 shrink-0" />,
};

const styles = {
  success: "border-green-200 bg-green-50",
  error: "border-red-200 bg-red-50",
  info: "border-blue-200 bg-blue-50",
};

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md animate-in slide-in-from-right-5",
            styles[t.type] || styles.info
          )}
        >
          {icons[t.type] || icons.info}
          <p className="text-sm text-gray-800 flex-1">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
