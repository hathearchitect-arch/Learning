'use client';

import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';

export function SiteBreadcrumbs() {
  const pathname = usePathname();
  const pathParts = pathname.split('/').filter((part) => part); // Filter out empty parts

  // If we're exactly on /dashboard, only show Dashboard
  if (pathname === '/dashboard') {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem key={'dashboard'}>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const limitedPathParts = pathParts.slice(0, 2); // Only show first two elements

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {limitedPathParts.map((part, index) => (
          <div key={part} className="flex items-center gap-1">
            <BreadcrumbItem key={part}>
              <BreadcrumbLink asChild>
                <Link
                  key={part}
                  href={`/${limitedPathParts.slice(0, index + 1).join('/')}`}
                >
                  {part.charAt(0).toUpperCase() + part.slice(1)}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {index < limitedPathParts.length - 1 && <BreadcrumbSeparator />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
