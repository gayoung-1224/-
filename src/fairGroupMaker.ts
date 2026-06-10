/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * [공정 모둠 배정 알고리즘 - 핵심 요약]
 * 1. 과거의 모둠 편성 기록(localStorage)을 로드하여 어떤 학생 조합이 같이 활동했었는지 빈도수 테이블(pairingCounts)을 빌드합니다.
 * 2. 현재 배정할 학생 명단을 셔플하여 골고루 모둠 버킷(Group Buckets)에 나눕니다.
 * 3. 이렇게 생성된 임시 배정안에 대해 '중복 벌점(Penalty Score)'을 계산합니다.
 *    - 임시 모둠에서 같은 조가 된 모든 학생 쌍(A, B)을 찾습니다.
 *    - 해당 쌍이 과거에 같은 모둠이었던 횟수만큼 벌점을 누적합니다.
 * 4. 이 과정을 1000번 반복(Monte Carlo 시뮬레이션)하여 **중복 벌점이 가장 낮은 최선의 배치안**을 최종 결과로 선택합니다.
 *    - 중복이 한 번도 없는 경우 벌점이 0점이 되어 최우선 선발되며, 과거에 많은 시간을 보낸 친구들일수록 같이 묶일 확률이 최소화됩니다.
 */

import { DayGroupHistory, GroupMission, GroupResult } from './types';
import { getRandomMissions } from './missions';

/**
 * 두 학생의 이름을 가나다순으로 정렬하여 표준화된 키 생성
 * 예: "홍길동", "이영희" -> "이영희|홍길동"
 */
function getPairKey(a: string, b: string): string {
  const [first, second] = [a, b].sort((x, y) => x.localeCompare(y, 'ko'));
  return `${first}|${second}`;
}

/**
 * 1. 과거 히스토리 자료로부터 학생 커플별 공동 소속 빈도수 맵 생성
 */
export function buildPairingCounts(history: DayGroupHistory[]): Record<string, number> {
  const pairingCounts: Record<string, number> = {};

  if (!history || history.length === 0) {
    return pairingCounts;
  }

  for (const day of history) {
    for (const group of day.groups) {
      const members = group.members;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const key = getPairKey(members[i], members[j]);
          pairingCounts[key] = (pairingCounts[key] || 0) + 1;
        }
      }
    }
  }

  return pairingCounts;
}

/**
 * 배정안의 중복 점수를 평가하는 함수
 * 한 모둠 안에 묶인 모든 학생 쌍에 대하여, 과거에 같이 했던 횟수들의 총합을 계산합니다.
 */
function calculatePenalty(
  candidateGroups: string[][],
  pairingCounts: Record<string, number>
): number {
  let totalPenalty = 0;

  for (const group of candidateGroups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const key = getPairKey(group[i], group[j]);
        if (pairingCounts[key]) {
          // 과거에 n번 같이 했다면, n의 제곱 형태로 벌점을 주어 중복이 잦은 만남(예: 2번 이상 본 조합)을 강력히 회수합니다.
          totalPenalty += Math.pow(pairingCounts[key], 2);
        }
      }
    }
  }

  return totalPenalty;
}

/**
 * 배열을 무작위로 섞어주는 Fisher-Yates 셔플 알고리즘
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 공정 모둠 생성 실행 함수 (주 핵심 알고리즘)
 * 
 * @param students 선발할 참여 학생 명단 (현재 등교한 학생들)
 * @param groupCount 타겟 모둠 수
 * @param history 이전 모둠 배정 역사 기록
 */
export function generateFairGroups(
  students: string[],
  groupCount: number,
  history: DayGroupHistory[]
): GroupResult[] {
  if (students.length === 0) return [];
  
  // 가독성을 위한 안전장치: 모둠 수가 학생 수보다 많으면 학생 수에 맞춰 축소
  const finalGroupCount = Math.min(groupCount, students.length);
  const pairingCounts = buildPairingCounts(history);

  let bestGroups: string[][] = [];
  let minPenalty = Infinity;
  const SIMULATION_RUNS = 1000; // 1000번의 임시 배정 시도

  for (let run = 0; run < SIMULATION_RUNS; run++) {
    // 1. 학생 명단을 뒤섞음
    const shuffled = shuffleArray(students);

    // 2. 버킷 분배
    const candidate: string[][] = Array.from({ length: finalGroupCount }, () => []);
    for (let i = 0; i < shuffled.length; i++) {
      candidate[i % finalGroupCount].push(shuffled[i]);
    }

    // 3. 중복 벌점 스코어 계산
    const penalty = calculatePenalty(candidate, pairingCounts);

    // 4. 최적 배치 갱신
    if (penalty < minPenalty) {
      minPenalty = penalty;
      bestGroups = candidate;
    }
  }

  // 각 모둠에 오늘의 재미있는 미션을 무작위로 할당합니다.
  const assignedMissions = getRandomMissions(bestGroups.length);

  // 초등학생 모둠 이름용 컨셉 단어 목록 (귀여운 우리말 모둠명 조합)
  const groupNouns = [
    '햇살', '슬기', '새롬', '하늘', '바다', '들들', '숲속', '별빛', '초록', '우람',
    '꽃잎', '노을', '기쁨', '행복', '누리', '한결', '다솜', '미라', '나래', '가온'
  ];
  // 매번 다른 느낌을 주기 위해 이름을 섞어서 할당
  const shuffledNouns = shuffleArray(groupNouns);

  return bestGroups.map((members, index) => {
    const noun = shuffledNouns[index % shuffledNouns.length];
    return {
      id: index + 1,
      name: `${index + 1}모둠 (${noun} 모둠)`,
      members: members.sort((a, b) => a.localeCompare(b, 'ko')), // 멤버 이름은 깔끔하게 가나다순 출력
      mission: assignedMissions[index],
    };
  });
}
