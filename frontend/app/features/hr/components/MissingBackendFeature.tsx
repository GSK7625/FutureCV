import { Link } from "react-router";
import { IconApiOff, IconArrowRight } from "@tabler/icons-react";
import { buttonVariants, Card, CardContent } from "~/components/ui";
import { cn } from "~/lib/cn";

export function MissingBackendFeature({ eyebrow, title, description, requiredData, action }: { eyebrow: string; title: string; description: string; requiredData: string[]; action?: { to: string; label: string } }) {
  return (
    <section aria-labelledby="missing-feature-title">
      <p className="text-label font-semibold text-gold">{eyebrow}</p>
      <h1 id="missing-feature-title" className="mt-1 text-headline text-navy">{title}</h1>
      <p className="mt-2 max-w-3xl text-ink-variant">{description}</p>
      <Card className="mt-6 max-w-3xl">
        <CardContent className="p-6 md:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-default bg-gold/15 text-gold"><IconApiOff size={26} aria-hidden="true" /></div>
          <h2 className="mt-5 text-headline-md text-navy">Đang chờ hợp đồng API từ backend</h2>
          <p className="mt-2 text-ink-variant">Giao diện không sử dụng dữ liệu giả và không tự suy đoán endpoint. Backend cần cung cấp:</p>
          <ul className="mt-4 space-y-3">
            {requiredData.map((item) => <li key={item} className="flex gap-3 text-ink"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{item}</li>)}
          </ul>
          {action && <Link to={action.to} className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-6")}>{action.label}<IconArrowRight size={18} aria-hidden="true" /></Link>}
        </CardContent>
      </Card>
    </section>
  );
}
