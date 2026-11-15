import { LayoutGrid } from 'lucide-react';

export const Logo = ({ className = 'w-6 h-6' }) => (
  <img src="/zentriq-icon.png" alt="Zentriq" className={`${className} object-contain`} />
);

export const LogoWordmark = ({ className = 'h-7' }) => (
  <img src="/zentriq-logo.png" alt="Zentriq" className={`${className} object-contain`} />
);

export const Sheet = ({ className = '', children, ...p }) => (
  <section className={`bg-card border border-line rounded-xl min-w-0 ${className}`} {...p}>{children}</section>
);

export const LinkBtn = ({ className = '', ...p }) => (
  <button className={`text-brand font-medium text-[13px] underline underline-offset-4 decoration-brand/30 hover:decoration-brand whitespace-nowrap ${className}`} {...p} />
);

export const SectionHead = ({ title, sub, action, onAction, flat }) => (
  <div className={`flex items-baseline gap-2.5 ${flat ? 'pb-3' : 'px-6 pt-5 pb-3'}`}>
    <h2 className="text-base font-semibold tracking-tight">{title}</h2>
    {sub && <p className="text-[13px] text-ink2">{sub}</p>}
    {action && <LinkBtn className="ml-auto" onClick={onAction}>{action}</LinkBtn>}
  </div>
);

const variants = {
  primary: 'bg-brand border-brand text-white hover:bg-brandh',
  secondary: 'bg-card border-line text-ink hover:bg-hov',
};
export const Btn = ({ variant = 'secondary', className = '', ...p }) => (
  <button className={`h-8 px-3 rounded-lg border text-[13px] font-medium whitespace-nowrap transition-colors disabled:opacity-60 ${variants[variant]} ${className}`} {...p} />
);

export const Dot = ({ className = '' }) => <span className={`inline-block w-[7px] h-[7px] rounded-full shrink-0 ${className}`} />;

export const KIND = {
  blocked: { label: 'BLOCKED', dot: 'bg-amber', text: 'text-amber' },
  decision: { label: 'DECISION', dot: 'bg-brand', text: 'text-brand' },
  review: { label: 'REVIEW', dot: 'bg-sage', text: 'text-sagedk' },
  moving: { label: 'MOVING', dot: 'bg-ok', text: 'text-ok' },
};

export const Empty = ({ title, children }) => (
  <div className="px-6 py-6 text-center text-ink2 border-t border-line">
    {title && <b className="block text-ink font-semibold">{title}</b>}
    {children}
  </div>
);

export const TeamsIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.5 7.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM21.75 9h-4.5c-.69 0-1.25.56-1.25 1.25v4.5c0 .35.14.67.37.9.61.62 1.48.97 2.38.97h3a1.5 1.5 0 0 0 1.5-1.5v-4.87c0-.69-.56-1.25-1.25-1.25ZM13.5 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm3 2h-6A2.5 2.5 0 0 0 8 10.5V18a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-7.5A2.5 2.5 0 0 0 16.5 8ZM4.5 9A4.5 4.5 0 1 0 9 4.5 4.5 4.5 0 0 0 4.5 9Zm3.75 3.5h-4.5A2.25 2.25 0 0 0 1.5 14.75V19a2 2 0 0 0 2 2h4.5a2 2 0 0 0 2-2v-4.25a2.25 2.25 0 0 0-1.75-2.25Z" />
  </svg>
);

export const TeamsLogo = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4.8" fill="#505AC9" />
    <path d="M16.5 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" fill="#7B83EB" />
    <path d="M18.5 10.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" fill="#9DA5F5" />
    <path d="M18.75 13h-3.5c-.7 0-1.25.55-1.25 1.25v3.25h4.75c.69 0 1.25-.56 1.25-1.25v-2c0-.69-.56-1.25-1.25-1.25Z" fill="#9DA5F5" />
    <path d="M14.5 8.5h-5A1.5 1.5 0 0 0 8 10v6a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5Z" fill="#7B83EB" />
    <rect x="4" y="6" width="9" height="12" rx="1.5" fill="#464EB8" />
    <path d="M8.5 9h-2v1.5h.5V15h1.5v-4.5H9V9Z" fill="white" />
  </svg>
);

export { LayoutGrid };
