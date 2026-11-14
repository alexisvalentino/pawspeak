import type { ReactNode } from 'react';

type PageHeadingProps = {
  tone: 'sky' | 'amber' | 'mint';
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
};

export function PageHeading({ tone, icon, title, description, action }: PageHeadingProps) {
  return <div className={`page-heading${action ? ' page-heading-with-action' : ''}`}>
    <span className={`feature-icon feature-icon-${tone}`} aria-hidden="true">{icon}</span>
    <div className="page-heading-copy"><h1>{title}</h1><p>{description}</p></div>
    {action && <div className="page-heading-action">{action}</div>}
  </div>;
}
