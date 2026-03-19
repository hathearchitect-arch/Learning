// create a page header for the admin pages
'use client';

export function AdminPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">{title}</h2>
          <span className="text-muted-foreground text-sm">{description}</span>
        </div>
        <div className="flex flex-row justify-end gap-4">{children}</div>
      </div>
    </div>
  );
}
