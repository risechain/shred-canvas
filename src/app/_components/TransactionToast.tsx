import { toast } from "sonner";

interface TransactionToastProps {
  pixelCount: number;
  onDismiss: () => void;
}

export function TransactionToast({
  pixelCount,
  onDismiss,
}: Readonly<TransactionToastProps>) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg"
      style={{
        backgroundColor: "var(--purple-10)",
        color: "var(--purple-contrast)",
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 2.5L12.5 7.5L17.5 8.5L14 12L15 17.5L10 15L5 17.5L6 12L2.5 8.5L7.5 7.5L10 2.5Z"
          fill="var(--color-text-contrast)"
          stroke="var(--color-text-contrast)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-medium text-text-contrast">
        Transaction complete! {pixelCount} pixel
        {pixelCount > 1 ? "s" : ""} painted
      </span>
      <button
        onClick={onDismiss}
        className="ml-auto text-current opacity-70 hover:opacity-100 transition-opacity"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4L4 12M4 4L12 12"
            stroke="var(--color-text-contrast)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function showTransactionToast(pixelCount: number) {
  toast.custom(
    (t) => (
      <TransactionToast
        pixelCount={pixelCount}
        onDismiss={() => toast.dismiss(t)}
      />
    ),
    {
      duration: 3000,
    }
  );
}
