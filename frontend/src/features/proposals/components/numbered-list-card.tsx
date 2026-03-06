import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type NumberedListCardProps = {
  title: React.ReactNode;
  description: string;
  items: Array<string>;
  emptyText: string;
  icon: React.ReactNode;
  iconBgClass?: string;
  className?: string;
};

export function NumberedListCard({
  title,
  description,
  items,
  emptyText,
  icon,
  iconBgClass = 'bg-muted/50',
  className,
}: NumberedListCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <div className={`${iconBgClass} border rounded-full p-2`}>{icon}</div>
        </CardAction>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        {items.length > 0 ? (
          <ol className="space-y-3">
            {items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 rounded-lg border border-primary/10 bg-primary/5 p-2"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {idx + 1}
                </span>
                <span className="text-foreground font-normal text-sm my-auto">
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p>{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}
