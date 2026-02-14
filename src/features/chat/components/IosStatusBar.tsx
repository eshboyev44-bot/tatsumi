type IosStatusBarProps = {
  className?: string;
};

export function IosStatusBar({ className }: IosStatusBarProps) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3 text-[15px] font-semibold text-[#1f1f1f] ${className ?? ""}`}
    >
      <span>9:41</span>
      <div className="flex items-center gap-2">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 14"
          className="h-3.5 w-5"
          fill="currentColor"
        >
          <rect x="0" y="8" width="3" height="6" rx="1" />
          <rect x="5" y="6" width="3" height="8" rx="1" />
          <rect x="10" y="3" width="3" height="11" rx="1" />
          <rect x="15" y="0" width="3" height="14" rx="1" />
        </svg>

        <svg
          aria-hidden="true"
          viewBox="0 0 18 14"
          className="h-3.5 w-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 5.5C3.4 3.3 6.2 2.2 9 2.2c2.8 0 5.6 1.1 8 3.3" />
          <path d="M3.8 8.5c1.6-1.4 3.4-2.2 5.2-2.2 1.8 0 3.6.8 5.2 2.2" />
          <path d="M7 11.5c.6-.5 1.3-.8 2-.8s1.4.3 2 .8" />
        </svg>

        <span className="inline-flex h-3.5 w-6 items-center rounded-[3px] border border-current p-[1px]">
          <span className="h-full w-full rounded-[2px] bg-current" />
        </span>
      </div>
    </div>
  );
}
