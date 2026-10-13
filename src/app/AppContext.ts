import { createContext, useContext } from 'react';
import type { Site } from '#shared/schema';
import type { Collection, History } from './api';
import type { DeviceDrag } from '../canvas/useDeviceDrag';
import type { Theme, ThemePref } from './theme';

export type Kind = 'room' | 'rack' | 'device' | 'wallPort' | 'cable' | 'preset' | 'vlan';
export type View = 'front' | 'rear' | 'both' | 'network';
export type ColourBy = 'cable' | 'vlan';
export type Selection = { kind: Kind; id: string } | null;

export const collectionFor: Record<Kind, Collection> = {
  room: 'rooms',
  rack: 'racks',
  device: 'devices',
  wallPort: 'wall-ports',
  cable: 'cables',
  preset: 'presets',
  vlan: 'vlans',
};

export const siteKeyFor = {
  room: 'rooms',
  rack: 'racks',
  device: 'devices',
  wallPort: 'wallPorts',
  cable: 'cables',
  preset: 'presets',
  vlan: 'vlans',
} as const satisfies Record<Kind, keyof Site>;

type AppState = {
  site: Site;
  history: History;
  selected: Selection;
  select: (s: Selection) => void;
  run: <T>(action: () => Promise<T>) => Promise<T | undefined>;
  error: string | null;
  clearError: () => void;
  drag: DeviceDrag | null;
  setDrag: (d: DeviceDrag | null) => void;
  view: View;
  setView: (v: View) => void;
  colourBy: ColourBy;
  setColourBy: (c: ColourBy) => void;
  theme: Theme;
  themePref: ThemePref;
  setThemePref: (p: ThemePref) => void;
};

export const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppContext.Provider>');
  return ctx;
}