'use client';

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function PageHeader({ breadcrumbs, title, description, action }: PageHeaderProps) {
  return (
    <>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
        {breadcrumbs.map((item, index) => (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && <span>›</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-white transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-white">{item.label}</span>
            )}
          </span>
        ))}
      </div>

      {/* Title Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-white">{title}</h1>
          {description && <p className="text-white/40 mt-1">{description}</p>}
        </div>
        {action && (
          action.href ? (
            <Link href={action.href} className="btn-secondary">
              {action.label}
            </Link>
          ) : (
            <button onClick={action.onClick} className="btn-secondary">
              {action.label}
            </button>
          )
        )}
      </div>
    </>
  );
}
