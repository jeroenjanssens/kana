<script lang="ts" module>
  const PATHS = {
    home: 'M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9',
    cards:
      'M7 4h11a2 2 0 0 1 2 2v12M4 8a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
    table: 'M4 4h16v16H4zM4 9.33h16M4 14.66h16M9.33 4v16M14.66 4v16',
    pairs: 'M4 6h7v12H4zM13 6h7v12h-7zM7.5 10v4M16.5 10v4',
    ear: 'M7 10a5 5 0 1 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0M10 10a2 2 0 1 1 4 0',
    book: 'M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    speaker: 'M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
    mute: 'M11 5 6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6',
    play: 'M8 5v14l11-7z',
    replay: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
    brush:
      'M9.06 11.9 18.6 2.36a1.24 1.24 0 0 1 1.76 1.76L10.82 13.66M7 14a3 3 0 0 0-3 3c0 1.3-1 2-2 2 1 1.5 3 2 4.5 2a4.5 4.5 0 0 0 4.5-4.5 2.5 2.5 0 0 0-4-2z',
    fonts: 'M4 7V4h16v3M9 20h6M12 4v16',
    close: 'M18 6 6 18M6 6l12 12',
    check: 'M20 6 9 17l-5-5',
    left: 'M15 18l-6-6 6-6',
    right: 'M9 18l6-6-6-6',
    info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
    shuffle: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
    flame: 'M12 22c4 0 7-3 7-7 0-4-3-6-4-9-1 2-2 3-4 3 0-2 0-4-2-6-1 4-4 6-4 12 0 4 3 7 7 7z',
    download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
    upload: 'M12 21V9M7 14l5-5 5 5M5 3h14',
    keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
    image: 'M3 5h18v14H3zM3 16l5-5 5 5 3-3 5 5M15 9h.01',
    sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  } as const
  export type IconName = keyof typeof PATHS
</script>

<script lang="ts">
  let {
    name,
    size = 20,
    label,
    filled = false,
  }: { name: IconName; size?: number; label?: string; filled?: boolean } = $props()
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={filled ? 'currentColor' : 'none'}
  stroke="currentColor"
  stroke-width="1.7"
  stroke-linecap="round"
  stroke-linejoin="round"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  <path d={PATHS[name]} />
</svg>
