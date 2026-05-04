'use client';

type IconName =
  | 'home' | 'orders' | 'sites' | 'invoice' | 'pipe' | 'team' | 'write'
  | 'inbox' | 'check' | 'cash' | 'settings' | 'plus' | 'search' | 'bell'
  | 'chev' | 'chevd' | 'arrow' | 'filter' | 'sort' | 'more' | 'file'
  | 'link' | 'money' | 'chart' | 'book' | 'close' | 'ext';

const PATHS: Record<IconName, React.ReactNode> = {
  home:    <><path d="M3 9.5L10 4l7 5.5V16a1 1 0 01-1 1h-3v-5H9v5H4a1 1 0 01-1-1V9.5z"/></>,
  orders:  <><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M6 8h8M6 11h8M6 14h5"/></>,
  sites:   <><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3a10 10 0 010 14M10 3a10 10 0 000 14"/></>,
  invoice: <><path d="M5 3h7l3 3v11a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M7 9h6M7 12h6M7 15h4"/></>,
  pipe:    <><rect x="3" y="3" width="4" height="14" rx="1"/><rect x="9" y="3" width="4" height="9" rx="1"/><rect x="15" y="3" width="2" height="6" rx="1"/></>,
  team:    <><circle cx="7" cy="8" r="2.5"/><circle cx="14" cy="8" r="2.5"/><path d="M3 16c0-2 2-3.5 4-3.5s4 1.5 4 3.5M11 16c0-2 1-3.5 3-3.5s3 1.5 3 3.5"/></>,
  write:   <><path d="M3 17l1-4 9-9 3 3-9 9-4 1z"/><path d="M12 5l3 3"/></>,
  inbox:   <><path d="M3 12V5a1 1 0 011-1h12a1 1 0 011 1v7"/><path d="M3 12h4l1 2h4l1-2h4v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4z"/></>,
  check:   <><path d="M4 10l4 4 8-8"/></>,
  cash:    <><rect x="3" y="5" width="14" height="10" rx="1"/><circle cx="10" cy="10" r="2"/><path d="M5 8v4M15 8v4"/></>,
  settings:<><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></>,
  plus:    <><path d="M10 4v12M4 10h12"/></>,
  search:  <><circle cx="9" cy="9" r="5"/><path d="M13 13l3 3"/></>,
  bell:    <><path d="M5 8a5 5 0 0110 0v4l1 2H4l1-2V8z"/><path d="M8 16a2 2 0 004 0"/></>,
  chev:    <><path d="M7 4l5 6-5 6"/></>,
  chevd:   <><path d="M5 7l5 5 5-5"/></>,
  arrow:   <><path d="M4 10h12M11 5l5 5-5 5"/></>,
  filter:  <><path d="M3 5h14M5 10h10M8 15h4"/></>,
  sort:    <><path d="M5 5l3-3 3 3M8 2v12M15 15l-3 3-3-3M12 6v12"/></>,
  more:    <><circle cx="5" cy="10" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></>,
  file:    <><path d="M5 3h7l3 3v11a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M12 3v3h3"/></>,
  link:    <><path d="M9 11l4-4M7 13a3 3 0 010-4l2-2a3 3 0 014 4M11 7a3 3 0 010 4l-2 2a3 3 0 01-4-4"/></>,
  money:   <><circle cx="10" cy="10" r="7"/><path d="M10 5v10M12.5 7.5h-3a1.5 1.5 0 000 3h1a1.5 1.5 0 010 3h-3"/></>,
  chart:   <><path d="M3 17V3M3 17h14M6 13l3-4 3 2 4-6"/></>,
  book:    <><path d="M4 4h5a3 3 0 013 3v10a2 2 0 00-2-2H4V4zM16 4h-5a3 3 0 00-3 3v10a2 2 0 012-2h6V4z"/></>,
  close:   <><path d="M5 5l10 10M15 5L5 15"/></>,
  ext:     <><path d="M11 4h5v5M16 4l-7 7M9 5H5a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-4"/></>,
};

export default function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name as IconName] ?? null}
    </svg>
  );
}
