export const color = {
  navy: "#0A192F",
  navy2: "#1B2B45",
  emerald: "#00BF78",
  emeraldInk: "#00744A", // AA contrast on white
  emeraldTint: "#E6F8F1",
  red: "#B42318",
  redTint: "#FDECEA",
  amber: "#B54708",
  amberTint: "#FFF7E6",
  ink: "#0A192F",
  ink2: "#44526A",
  line: "#D9DEE7",
  bg: "#FFFFFF",
  bg2: "#F5F7FA",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = 12;
export const maxWidth = 720;

export const font = {
  h1: { fontSize: 28, fontWeight: "800" as const, color: color.ink, letterSpacing: -0.5 },
  h2: { fontSize: 21, fontWeight: "700" as const, color: color.ink },
  h3: { fontSize: 17, fontWeight: "700" as const, color: color.ink },
  body: { fontSize: 16, lineHeight: 24, color: color.ink },
  small: { fontSize: 14, lineHeight: 20, color: color.ink2 },
};
