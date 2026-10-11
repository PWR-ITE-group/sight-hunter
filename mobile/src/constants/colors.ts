/** Palette from the HTML prototype (docs/Łowcy Historii.html): warm brick + ochre on grey-green paper. */
export const Colors = {
  primary: '#b5422e', // --brick
  primaryDark: '#93351f',
  primaryLight: '#f3e4df',
  secondary: '#2c52c4', // --odra, used sparingly (links, water on the map)
  success: '#2c8350', // --ok
  error: '#c03838', // --bad
  warning: '#b9800f', // --ochre
  xp: '#6a3fc4', // --xp
  background: '#eef1ea', // --paper
  surface: '#ffffff', // --card
  surfaceElevated: '#ffffff',
  text: '#1b211e', // --ink
  textSecondary: '#5d6862', // --muted
  textTertiary: '#8a948e',
  border: '#d3d9d0', // --line
  overlay: 'rgba(27,33,30,0.5)',
  markerFound: '#2c8350',
  markerUnfound: '#b5422e',
  searchCircle: 'rgba(181,66,46,0.14)',
  searchCircleBorder: 'rgba(181,66,46,0.45)',
} as const;
