// One tiny stroke-icon set so every shell and page draws from the same shapes.
// Each entry is a list of path strings drawn with a single stroke style.
const PATHS = {
  home: ["M4 11.2 12 4.5l8 6.7V20H4v-8.8Z", "M9.5 20v-5h5v5"],
  store: ["M4.5 9h15l-1-4.5h-13L4.5 9Z", "M6 9v11h12V9", "M9.5 20v-6h5v6"],
  list: ["M8 6h12", "M8 12h12", "M8 18h12", "M4 6h.01", "M4 12h.01", "M4 18h.01"],
  stamp: ["M12 3.5l2.3 4.9 5.2.7-3.8 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2L4.5 9.1l5.2-.7L12 3.5Z"],
  queue: ["M4 7h16", "M4 12h10", "M4 17h6", "M18.5 13.5v7", "M15 17h7"],
  bag: ["M6 8h12l-1 12H7L6 8Z", "M9 8V6a3 3 0 0 1 6 0v2"],
  gift: ["M4 11.5h16V20H4z", "M2.5 7.5h19v4h-19z", "M12 7.5V20", "M12 7.5S9 7.6 8.2 6 10 3.6 12 7.5Zm0 0s3 .1 3.8-1.5S14 3.6 12 7.5Z"],
  box: ["M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16V8Z", "M12 12v8.5", "M3.5 8l8.5 4 8.5-4"],
  reward: ["M12 14.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z", "M9 13.5 7.5 21l4.5-2.5 4.5 2.5L15 13.5"],
  chat: ["M4.5 5.5h15v10.5H9l-4.5 4V5.5Z", "M8.5 10.5h7"],
  users: ["M9 11.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M15.5 11a2.5 2.5 0 1 0 0-5", "M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1", "M16 20v-1a4 4 0 0 0-3-3.8"],
  chart: ["M4 19V9", "M9 19V4.5", "M14 19v-6.5", "M19 19v-9", "M3 21h18"],
  card: ["M3.5 7h17v10h-17z", "M3.5 11h17", "M7 15h3"],
  grid: ["M4 4h6v6H4z", "M14 4h6v6h-6z", "M4 14h6v6H4z", "M14 14h6v6h-6z"],
  briefcase: ["M4 8h16v11H4z", "M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2", "M4 13h16"],
  bell: ["M6.5 9.5a5.5 5.5 0 1 1 11 0c0 4.5 1.8 5.5 1.8 5.5H4.7s1.8-1 1.8-5.5Z", "M10 18.5a2 2 0 0 0 4 0"],
  file: ["M6 3.5h8l4 4V20.5H6z", "M14 3.5v4h4", "M9.5 13h5", "M9.5 16.5h5"],
  logout: ["M15 12H3.5", "M7 8.5 3.5 12 7 15.5", "M11.5 4.5h8v15h-8"],
  close: ["M6.5 6.5l11 11", "M17.5 6.5l-11 11"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
  chevron: ["M9.5 6l6 6-6 6"],
  spark: ["M12 3v4", "M12 17v4", "M3 12h4", "M17 12h4", "M6 6l2.4 2.4", "M15.6 15.6 18 18", "M18 6l-2.4 2.4", "M8.4 15.6 6 18"],
  cart: ["M3.5 5h2.2l2.1 11h10.4l1.8-7.5H7", "M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z", "M17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"],
  shield: ["M12 3.5 19 6.5v5.5c0 4.4-3 7.6-7 9.5-4-1.9-7-5.1-7-9.5V6.5l7-3Z", "M9 12l2 2 4-4.5"],
  phone: ["M7 3.5h10v17H7z", "M10.5 17.5h3"]
};

export function Icon({ name, className = "h-5 w-5", strokeWidth = 1.8 }) {
  const paths = PATHS[name] || PATHS.spark;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export default Icon;
