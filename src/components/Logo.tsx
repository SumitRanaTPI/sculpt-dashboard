/**
 * Studio mark. The source image has a soft glow around a dark rounded
 * square, so it is cropped slightly inside a rounded frame.
 */
export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <span
      className={["logo", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.22) }}
      aria-hidden="true"
    >
      <img src="/logo.jpg" alt="" width={size} height={size} />
    </span>
  );
}
