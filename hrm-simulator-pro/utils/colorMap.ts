
/**
 * utils/colorMap.ts
 * 
 * Clinical HRM colormap matching standard diagnostic software.
 * Optimized to show Achalasia subtypes clearly.
 */

type RGB = [number, number, number];

interface ColorStop {
  p: number;
  rgb: RGB;
}

// Clinical color scale - tuned to match the reference images:
// - 0–20: blues
// - 30–70: cyan/green (Type II columns)
// - 90–130: orange
// - 130–220: red
// - 220–400: red → white (extreme pressures)
// This matches the classic pedagogic HRM look: blue → green → yellow → red → white.
const HEATMAP_STOPS: ColorStop[] = [
  { p: -10, rgb: [0, 0, 20] },        // Near black
  { p: 0,   rgb: [0, 0, 60] },        // Deep blue (baseline)
  { p: 8,   rgb: [0, 20, 140] },      // Blue (Type I body)
  { p: 18,  rgb: [0, 80, 200] },      // Light blue
  { p: 28,  rgb: [0, 180, 220] },     // Cyan
  { p: 38,  rgb: [0, 220, 160] },     // Cyan-green (Type II columns)
  { p: 48,  rgb: [0, 255, 80] },      // Green
  { p: 60,  rgb: [120, 255, 0] },     // Yellow-green
  { p: 75,  rgb: [255, 255, 0] },     // Yellow
  { p: 95,  rgb: [255, 180, 0] },     // Orange
  { p: 115, rgb: [255, 110, 0] },     // Orange-red
  { p: 135, rgb: [255, 40, 0] },      // Red (start)
  { p: 170, rgb: [255, 0, 0] },       // Pure red
  { p: 220, rgb: [255, 0, 0] },       // Red plateau (typical high)
  { p: 300, rgb: [255, 140, 140] },   // Red → white
  { p: 400, rgb: [255, 255, 255] }    // White (saturation)
];

export const getPressureRGBArray = (pressure: number): RGB => {
  if (pressure <= HEATMAP_STOPS[0].p) {
    return HEATMAP_STOPS[0].rgb;
  }

  const lastIndex = HEATMAP_STOPS.length - 1;
  if (pressure >= HEATMAP_STOPS[lastIndex].p) {
    return HEATMAP_STOPS[lastIndex].rgb;
  }

  for (let i = 0; i < lastIndex; i++) {
    const currentStop = HEATMAP_STOPS[i];
    const nextStop = HEATMAP_STOPS[i + 1];

    if (pressure >= currentStop.p && pressure <= nextStop.p) {
      const range = nextStop.p - currentStop.p;
      const offset = pressure - currentStop.p;
      const t = offset / range;

      const r = Math.round(currentStop.rgb[0] + (nextStop.rgb[0] - currentStop.rgb[0]) * t);
      const g = Math.round(currentStop.rgb[1] + (nextStop.rgb[1] - currentStop.rgb[1]) * t);
      const b = Math.round(currentStop.rgb[2] + (nextStop.rgb[2] - currentStop.rgb[2]) * t);

      return [r, g, b];
    }
  }

  return [0, 0, 0];
};

export const getPressureColor = (pressure: number): string => {
  const [r, g, b] = getPressureRGBArray(pressure);
  return `rgb(${r}, ${g}, ${b})`;
};

export const getLegendGradient = (): string => {
  const minP = HEATMAP_STOPS[0].p;
  const maxP = HEATMAP_STOPS[HEATMAP_STOPS.length - 1].p;
  const totalRange = maxP - minP;

  const stopsCSS = HEATMAP_STOPS.map(stop => {
    const percent = ((stop.p - minP) / totalRange) * 100;
    const color = `rgb(${stop.rgb[0]}, ${stop.rgb[1]}, ${stop.rgb[2]})`;
    return `${color} ${percent.toFixed(2)}%`;
  });

  return `linear-gradient(to top, ${stopsCSS.join(', ')})`;
};

export const getLegendLabels = (): { pressure: number; label: string; color: string }[] => {
  return [
    { pressure: 300, label: '300+', color: '#ffffff' },
    { pressure: 220, label: '220', color: '#ff0000' },
    { pressure: 150, label: '150', color: '#ff3232' },
    { pressure: 120, label: '120', color: '#ff6400' },
    { pressure: 90, label: '90', color: '#ffb400' },
    { pressure: 75, label: '75', color: '#ffff00' },
    { pressure: 60, label: '60', color: '#78ff00' },
    { pressure: 45, label: '45', color: '#00ff50' },
    { pressure: 35, label: '35', color: '#00dca0' },
    { pressure: 25, label: '25', color: '#00b4dc' },
    { pressure: 15, label: '15', color: '#0050c8' },
    { pressure: 0, label: '0', color: '#00003c' },
  ];
};
