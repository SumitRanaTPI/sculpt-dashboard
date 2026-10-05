/**
 * Studio wordmark. The source is a wide lockup, so height is set and
 * width follows the image.
 */
export function Logo({ height = 28, className }: { height?: number; className?: string }) {
  return (
    <img
      className={["logo", className].filter(Boolean).join(" ")}
      src="/logo.png"
      alt="SCULPT"
      style={{ height }}
    />
  );
}
