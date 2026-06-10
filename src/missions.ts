/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GroupMission } from './types';

export const MISSION_POOL: GroupMission[] = [
  {
    title: '👑 모둠장 정하기',
    description: '모둠을 따뜻하게 이끌어주고 친구들의 의견을 골고루 들어주는 리더를 정해보세요!',
    emoji: '👑',
    color: 'from-amber-400 to-yellow-500 text-amber-950',
  },
  {
    title: '✍️ 기록하기 대장',
    description: '친구들이 나누는 멋진 생각과 기발한 이야기들을 꼼꼼하고 예쁘게 적을 친구를 정해요!',
    emoji: '✍️',
    color: 'from-blue-400 to-indigo-500 text-blue-950',
  },
  {
    title: '📢 용기 있는 발표자',
    description: '우리 모둠의 훌륭한 의견을 다른 친구들에게 씩씩하고 큰 목소리로 소개해줄 친구를 뽑아요!',
    emoji: '📢',
    color: 'from-emerald-400 to-teal-500 text-emerald-950',
  },
  {
    title: '🧹 반짝반짝 정리요정',
    description: '활동이 끝난 뒤에 책상 위와 주변 바닥을 깨끗이 정돈해줄 최고 매너쟁이를 선정해요!',
    emoji: '🧹',
    color: 'from-rose-400 to-pink-500 text-rose-950',
  },
  {
    title: '⏰ 째깍째깍 시간 지킴이',
    description: '시계를 잘 보면서 모둠 친구들에게 활동 시간을 안내하고 제시간에 마칠 수 있게 도와줘요!',
    emoji: '⏰',
    color: 'from-cyan-400 to-sky-500 text-cyan-950',
  },
  {
    title: '💖 싱글벙글 리액션 왕',
    description: '모둠원이 한 마디씩 할 때마다 손뼉을 치며 "우와!" 하고 에너지를 듬뿍 주는 칭찬대장을 정해요!',
    emoji: '💖',
    color: 'from-purple-400 to-fuchsia-500 text-purple-950',
  },
  {
    title: '🤝 도란도란 평화지킴이',
    description: '서로 다른 생각이 나와도 다투지 않도록 가위바위보나 민주적인 투표를 제안하는 수호신을 정해요!',
    emoji: '🤝',
    color: 'from-violet-400 to-purple-500 text-violet-950',
  },
  {
    title: '🎨 알록달록 꾸미기 요정',
    description: '모둠 학습지를 더 신나고 귀엽게 꾸며줄 반 최고의 미술 비주얼 디렉터를 임명해요!',
    emoji: '🎨',
    color: 'from-orange-400 to-amber-500 text-amber-900',
  },
  {
    title: '🧪 안전 배달 물건 요정',
    description: '필요한 도구(풀, 가위, 색칠 도구 등)를 상자에서 안전하게 가져오고 반납하는 안전 책임자를 뽑아요!',
    emoji: '🧪',
    color: 'from-lime-400 to-green-500 text-lime-950',
  },
  {
    title: '🙌 으랏차차 응원단장',
    description: '활동을 시작하기 전, 모둠만의 신나는 손 모으기 구호(예: 아자아자 화이팅!)를 만들어 함께 외쳐봐요!',
    emoji: '🙌',
    color: 'from-amber-400 to-orange-500 text-orange-950',
  },
];

// Helper to get a random list of unique missions of size `count`
export function getRandomMissions(count: number): GroupMission[] {
  const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5);
  const result: GroupMission[] = [];
  for (let i = 0; i < count; i++) {
    // If we have fewer total unique missions in pool than groups, we cycle them
    result.push(shuffled[i % shuffled.length]);
  }
  return result;
}
