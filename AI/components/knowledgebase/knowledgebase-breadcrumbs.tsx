'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export function FolderBreadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs?: {
    id: string;
    name: string;
  }[];
}) {
  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem key={'home'}>
            <BreadcrumbLink
              key={`home-link`}
              href={`/dashboard/knowledgebase`}
              className="flex items-center"
            >
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbs?.map((breadcrumb, index) => (
            <div key={breadcrumb.id} className={'flex flex-row gap-1'}>
              <BreadcrumbSeparator key={`${breadcrumb.id}-separator`}>
                /
              </BreadcrumbSeparator>
              <BreadcrumbItem key={`${breadcrumb.id}-item`}>
                <BreadcrumbLink
                  key={`${breadcrumb.id}-link`}
                  href={`/dashboard/knowledgebase/${breadcrumb.id}`}
                  className="flex items-center"
                >
                  {breadcrumb.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
