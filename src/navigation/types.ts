import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { Relation } from '@/canvas/CanvasChrome';

export type RootStackParamList = {
  Trees: undefined;
  Canvas: { treeId: string; focusId?: string; focusNonce?: number };
  PersonDetail: { personId: string };
  PersonForm: { treeId: string; personId?: string; relation?: Relation; ofId?: string };
  Find: { treeId: string };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
