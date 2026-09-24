/** docs/data-spec.md / docs/api-spec.md に基づくbackendレスポンス型。 */

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  joinCode: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  createdByUserId: string | null;
  createdAt: string;
}

export interface RecordSet {
  id: string;
  recordId: string;
  order: number;
  weight: number;
  reps: number;
  velocity: number | null;
}

export interface RecordVisibility {
  id: string;
  recordId: string;
  groupId: string;
}

export interface RecordItem {
  id: string;
  userId: string;
  exerciseId: string;
  performedAt: string;
  memo: string | null;
  createdAt: string;
  sets: RecordSet[];
  visibility: RecordVisibility[];
  user: { id: string; name: string };
  // 閲覧者は所有者と異なりうる（グループ公開/Feed）ため、閲覧者自身の
  // GET /exercisesでは種目名を解決できないことがある。backendが同梱する。
  exercise: { id: string; name: string };
}

export type StatsMetric = 'maxWeight' | 'est1RM' | 'maxVelocity';

export interface StatsPoint {
  performedAt: string;
  value: number;
}
