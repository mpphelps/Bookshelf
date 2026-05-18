import { Link } from "react-router";

type BackLinkProps = {
  to: string;
  children: React.ReactNode;
};

export function BackLink({ to, children }: BackLinkProps) {
  return (
    <Link
      to={to}
      className="display inline-flex items-center gap-2 text-[10px] tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
    >
      <span>←</span> {children}
    </Link>
  );
}
