/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  name: string;
  isPresent: boolean; // Teachers can toggle present/absent state so students who are absent won't be assigned!
}

export interface TeacherSetting {
  mode: 'count' | 'size'; // Whether to make dynamic number of groups or fix group size
  targetValue: number; // For 'count': number of groups. For 'size': number of students per group.
}

export interface GroupMission {
  title: string;
  description: string;
  emoji: string;
  color: string; // Visual tag color
}

export interface GroupResult {
  id: number;
  name: string; // e.g., "1모둠 (햇살 모둠)"
  members: string[];
  mission: GroupMission;
}

export interface DayGroupHistory {
  date: string; // YYYY-MM-DD format
  groups: {
    name: string;
    members: string[];
    mission: GroupMission;
  }[];
}

// Past pairing co-occurrences tracker
export interface PairingHistory {
  [studentPairKey: string]: number; // "StudentA|StudentB" -> count of how many times they shared a group
}
