import Svg, { Circle, Path, Rect } from 'react-native-svg';

type P = { size?: number; color?: string; strokeWidth?: number };

export function BackIcon({ size = 22, color = '#242424', strokeWidth = 2 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

/** The steaming-pot mark from the welcome screen. */
export function LogoMark({ size = 48, color = '#F2AD32', strokeWidth = 2 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M22 4c-3 4 3 6 0 10M30 4c-3 4 3 6 0 10" />
      <Path d="M8 26h36M10 26c0 9 7 15 16 15s16-6 16-15" />
      <Path d="M4 26h4M44 26h4M18 46h16" />
    </Svg>
  );
}

export function CalendarIcon({ size = 22, color = '#F2AD32', strokeWidth = 1.8 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Rect x={3} y={5} width={18} height={16} rx={3} />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  );
}

export function ClockIcon({ size = 16, color = '#6B4700', strokeWidth = 2 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function PlusIcon({ size = 16, color = '#242424', strokeWidth = 2.6 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function CheckIcon({ size = 14, color = '#FFF9F0', strokeWidth = 3 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12l5 5 9-10" />
    </Svg>
  );
}

export function SearchIcon({ size = 18, color = '#6B6259', strokeWidth = 2 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-4-4" />
    </Svg>
  );
}

export function BellIcon({ size = 18, color = '#123D2B', strokeWidth = 2 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4" />
    </Svg>
  );
}

export function PhoneIcon({ size = 20, color = '#123D2B', strokeWidth = 1.8 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" />
    </Svg>
  );
}

export function ChevronIcon({ size = 18, color = '#242424', strokeWidth = 2, direction = 'right' }: P & { direction?: 'left' | 'right' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d={direction === 'right' ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'} />
    </Svg>
  );
}
