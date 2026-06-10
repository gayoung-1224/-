/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Settings, 
  Shuffle, 
  RotateCcw, 
  Lock, 
  Unlock, 
  Calendar, 
  Sparkles, 
  Trash2, 
  Check, 
  UserMinus, 
  UserCheck,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  Crown,
  Info
} from 'lucide-react';
import { Student, DayGroupHistory, GroupResult, TeacherSetting, GroupMission } from './types';
import { generateFairGroups, buildPairingCounts } from './fairGroupMaker';
import { MISSION_POOL } from './missions';

// 기본 제공되는 귀여운 초등학생 샘플 명단 (24명)
const DEFAULT_STUDENTS: string[] = [
  '고민준', '김서연', '박예준', '이하윤', '최주원', '정지우', 
  '준우', '지원', '도윤', '수아', '건우', '채원', 
  '우진', '서윤', '선우', '지아', '지훈', '에스더', 
  '현우', '유진', '지율', '민서', '민우', '수빈'
];

const CARD_THEMES = [
  {
    bg: 'bg-rose-50/70',
    border: 'border-rose-300',
    badgeBg: 'bg-rose-450 text-white',
    memberText: 'text-rose-600 border-rose-200 bg-white hover:bg-rose-100',
    missionBg: 'bg-rose-100 border border-rose-200 text-rose-800',
    textAccent: 'text-rose-600',
    titleColor: 'text-rose-950',
  },
  {
    bg: 'bg-sky-50/70',
    border: 'border-sky-300',
    badgeBg: 'bg-sky-400 text-white',
    memberText: 'text-sky-600 border-sky-200 bg-white hover:bg-sky-100',
    missionBg: 'bg-sky-100 border border-sky-200 text-sky-800',
    textAccent: 'text-sky-600',
    titleColor: 'text-sky-950',
  },
  {
    bg: 'bg-amber-50/70',
    border: 'border-amber-300',
    badgeBg: 'bg-amber-400 text-white',
    memberText: 'text-amber-600 border-amber-200 bg-white hover:bg-amber-100',
    missionBg: 'bg-amber-100 border border-amber-200 text-amber-800',
    textAccent: 'text-amber-600',
    titleColor: 'text-amber-950',
  },
  {
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-300',
    badgeBg: 'bg-emerald-400 text-white',
    memberText: 'text-emerald-700 border-emerald-250 bg-white hover:bg-emerald-100',
    missionBg: 'bg-emerald-100 border border-emerald-200 text-emerald-800',
    textAccent: 'text-emerald-700',
    titleColor: 'text-emerald-950',
  },
  {
    bg: 'bg-purple-50/70',
    border: 'border-purple-300',
    badgeBg: 'bg-purple-400 text-white',
    memberText: 'text-purple-600 border-purple-200 bg-white hover:bg-purple-100',
    missionBg: 'bg-purple-100 border border-purple-200 text-purple-850',
    textAccent: 'text-purple-600',
    titleColor: 'text-purple-950',
  },
];

export default function App() {
  // --- 상태 관리 (State) ---
  const [students, setStudents] = useState<Student[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [setting, setSetting] = useState<TeacherSetting>({ mode: 'count', targetValue: 4 });
  const [history, setHistory] = useState<DayGroupHistory[]>([]);
  const [currentResult, setCurrentResult] = useState<GroupResult[]>([]);
  const [selectedResultDate, setSelectedResultDate] = useState<string>(''); // YYYY-MM-DD
  
  // 선생님 보관함/기능 관련 모달 및 패널 토글
  const [showTeacherPanel, setShowTeacherPanel] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isDrawAgainConfirmOpen, setIsDrawAgainConfirmOpen] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  
  // 슬롯머신 애니메이션 관련 상태
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinningNames, setSpinningNames] = useState<Record<number, string[]>>({}); // 모둠 번호별 무작위 이름 프레임
  const [revealedGroups, setRevealedGroups] = useState<number[]>([]); // 애니메이션이 끝난 모둠 리스트
  
  // 알림 메시지 상태
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);

  // 캔버스 효과 레프
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // 현재 날짜 구하기 (한국 시간대 기준 YYYY-MM-DD 형식)
  const getTodayDateString = (): string => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const KST_OFFSET = 9 * 60 * 60000;
    const kstDate = new Date(utc + KST_OFFSET);
    const year = kstDate.getFullYear();
    const month = String(kstDate.getMonth() + 1).padStart(2, '0');
    const day = String(kstDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayDateString();

  // --- 저장소 연동 (Initialization & Load) ---
  useEffect(() => {
    // 1. 학생 명단 불러오기 또는 기본값 적용
    const savedStudents = localStorage.getItem('FAIR_GROUP_STUDENTS');
    if (savedStudents) {
      try {
        setStudents(JSON.parse(savedStudents));
      } catch (e) {
        setStudents(DEFAULT_STUDENTS.map(name => ({ name, isPresent: true })));
      }
    } else {
      const defaultState = DEFAULT_STUDENTS.map(name => ({ name, isPresent: true }));
      setStudents(defaultState);
      localStorage.setItem('FAIR_GROUP_STUDENTS', JSON.stringify(defaultState));
    }

    // 2. 모둠 히스토리 전체 불러오기
    const savedHistory = localStorage.getItem('FAIR_GROUP_HISTORY');
    let loadedHistory: DayGroupHistory[] = [];
    if (savedHistory) {
      try {
        loadedHistory = JSON.parse(savedHistory);
        setHistory(loadedHistory);
      } catch (e) {
        console.error('이력 로딩 실패', e);
      }
    }

    // 3. 오늘 자물쇠(당일 배정 상태가 있는지 점검)
    const todayMatch = loadedHistory.find(h => h.date === todayStr);
    if (todayMatch) {
      // 이미 오늘 완료된 경우 결과를 가져와서 바로 표시하고 결과 날짜 선택을 오늘로 설정
      const formattedResults: GroupResult[] = todayMatch.groups.map((g, idx) => ({
        id: idx + 1,
        name: g.name,
        members: g.members,
        mission: g.mission
      }));
      setCurrentResult(formattedResults);
      setSelectedResultDate(todayStr);
    }
  }, []);

  // 토스트 도우미
  const showToast = (text: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // --- 학생 명단 편집 기능 ---
  useEffect(() => {
    // 입력창 텍스트 업데이트 동기화
    if (students.length > 0) {
      setInputText(students.map(s => s.name).join(', '));
    }
  }, [students]);

  // 학생 명단 저장 적용
  const handleApplyStudents = () => {
    // 쉼표, 띄어쓰기, 줄바꿈 등으로 파싱
    const parsedNames = inputText
      .split(/[,\s\n]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (parsedNames.length === 0) {
      showToast('⚠️ 한 명 이상의 학생 이름을 입력해주세요!', 'warn');
      return;
    }

    // 기존 출석 여부를 지키기 위해 매핑
    const newStudents: Student[] = parsedNames.map(name => {
      const existing = students.find(s => s.name === name);
      return {
        name,
        isPresent: existing ? existing.isPresent : true
      };
    });

    setStudents(newStudents);
    localStorage.setItem('FAIR_GROUP_STUDENTS', JSON.stringify(newStudents));
    showToast('🎒 학생 명단이 예쁘게 저장되었습니다!');
  };

  // 개별 학생 출결 및 등교 상태 토글 (클릭 시 제외할 수 있는 친절한 UI)
  const toggleAttendance = (index: number) => {
    const updated = [...students];
    updated[index].isPresent = !updated[index].isPresent;
    setStudents(updated);
    localStorage.setItem('FAIR_GROUP_STUDENTS', JSON.stringify(updated));
    showToast(
      `${updated[index].name} 학생이 ${updated[index].isPresent ? '🌳 출석' : '💤 모둠 대상에서 제외'} 상태로 바뀌었어요.`
    );
  };

  // 학생 일괄 등교 / 일괄 제외
  const setAllAttendance = (isPresent: boolean) => {
    const updated = students.map(s => ({ ...s, isPresent }));
    setStudents(updated);
    localStorage.setItem('FAIR_GROUP_STUDENTS', JSON.stringify(updated));
    showToast(isPresent ? '🏫 모든 학생들을 등교 처리했어요!' : '💤 전체 학생을 구성 대상에서 임시 제외했습니다.');
  };

  // --- 모둠 세팅 변경 ---
  const changeTargetValue = (amount: number) => {
    setSetting(prev => {
      const newVal = Math.max(2, Math.min(20, prev.targetValue + amount));
      return { ...prev, targetValue: newVal };
    });
  };

  const changeMode = (mode: 'count' | 'size') => {
    setSetting({
      mode,
      targetValue: mode === 'count' ? 4 : 4
    });
  };

  // --- 핵심 비즈니스 로직: 모둠 생성하기 (당일 중복 차단 및 공정 편성 알고리즘 매칭) ---
  const handleGenerateGroups = () => {
    // [안전 장치 / 재추첨 제한]: 당일 결과 이미 있는 경우 재생성 전면 잠금
    const alreadyDone = history.some(h => h.date === todayStr);
    if (alreadyDone) {
      showToast('🔒 오늘은 결과가 고정되어 있습니다! 선생님 도구함에서 잠금을 풀어주세요.', 'warn');
      return;
    }

    // 선발을 위한 출석한 학생 명단 수집
    const presentStudents = students.filter(s => s.isPresent).map(s => s.name);
    if (presentStudents.length < 2) {
      showToast('⚠️ 출석 처리된 학생이 최소 2명 이상이어야 모둠을 구상할 수 있어요!', 'warn');
      return;
    }

    // 모둠 개수 계산 결정
    let finalGroupCount = setting.targetValue;
    if (setting.mode === 'size') {
      // 1인당 인원수 선택 시 전체 학생을 인원수로 나누어 모둠 수 반올림 계산
      const size = setting.targetValue;
      finalGroupCount = Math.max(1, Math.round(presentStudents.length / size));
    }

    if (finalGroupCount > presentStudents.length) {
      finalGroupCount = presentStudents.length;
    }

    // 1. 공정 배정 알고리즘 실행
    const results = generateFairGroups(presentStudents, finalGroupCount, history);

    // 2. 오늘의 기록으로 저장 준비
    const newDayHistory: DayGroupHistory = {
      date: todayStr,
      groups: results.map(r => ({
        name: r.name,
        members: r.members,
        mission: r.mission
      }))
    };

    // 3. 상태와 LocalStorage 업데이트
    const updatedHistory = [newDayHistory, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('FAIR_GROUP_HISTORY', JSON.stringify(updatedHistory));

    // 4. 슬롯머신 애니메이션 시작 설정
    setCurrentResult(results);
    setSelectedResultDate(todayStr);
    runSlotMachineAnimation(results, presentStudents);
  };

  // --- 놀라운 슬롯머신 로직 (Slot Machine Animation) ---
  const runSlotMachineAnimation = (finalResults: GroupResult[], allPresentPool: string[]) => {
    setIsSpinning(true);
    setRevealedGroups([]);

    // 멈추는 시점 딜레이 단계 설정 (모둠별로 순차적으로 스르륵 멈추는 효과 제작)
    const durationPerGroup = 600; // 모둠 간 등장 간격 (밀리초)
    const animationSteps = 80; // 이름이 바뀌는 주기 (80ms마다 체인지)

    // 애니메이션 셔플러 시작
    const intervalId = setInterval(() => {
      const nextSpinning: Record<number, string[]> = {};
      
      finalResults.forEach(group => {
        // 이 모둠의 최종 구성원 인원수만큼 랜덤 이름들을 마구잡이 풀에서 골라 표시
        nextSpinning[group.id] = group.members.map(() => {
          const randomIndex = Math.floor(Math.random() * allPresentPool.length);
          return allPresentPool[randomIndex];
        });
      });
      setSpinningNames(nextSpinning);
    }, animationSteps);

    // 순차적으로 모둠 잠금 열기
    finalResults.forEach((group, index) => {
      setTimeout(() => {
        setRevealedGroups(prev => [...prev, group.id]);

        // 만약 모든 모둠이 공개 완료되었다면 셔플 끄고 종료 파티 시작!
        if (index === finalResults.length - 1) {
          clearInterval(intervalId);
          setIsSpinning(false);
          showToast('🎉 오늘의 새로운 공정 모둠이 아름답게 배정되었습니다!');
          triggerConfetti();
        }
      }, (index + 1) * durationPerGroup);
    });
  };

  // --- 선생님 전용 리스크 복구 도구들 (재출전 잠금해제 및 히스토리 삭제) ---
  
  // 오늘 배정한 결과만 리셋하기 (자물쇠 풀고 다시 뽑기)
  const handleResetTodayOnly = () => {
    const updatedHistory = history.filter(h => h.date !== todayStr);
    setHistory(updatedHistory);
    localStorage.setItem('FAIR_GROUP_HISTORY', JSON.stringify(updatedHistory));
    
    // 현재 결과 창 비우기
    setCurrentResult([]);
    setSelectedResultDate('');
    setIsDrawAgainConfirmOpen(false);
    showToast('🔓 오늘 생성된 모둠 결과가 열렸습니다. 이제 새로운 무작위 모둠을 생성할 수 있습니다!', 'info');
  };

  // 모든 과거 히스토리 통째로 지우기 (학기 초 초기화 등)
  const handleResetAllHistory = () => {
    localStorage.removeItem('FAIR_GROUP_HISTORY');
    setHistory([]);
    setCurrentResult([]);
    setSelectedResultDate('');
    setIsResetConfirmOpen(false);
    showToast('🧹 이전의 모든 모둠 히스토리 조합 기록이 지워졌습니다. 이제 다시 0부터 시작합니다!', 'warn');
  };

  // 히스토리 항목 클릭 시 이전 모둠 조합 조회하기 (보기 전용)
  const handleViewHistoricalResult = (dateStr: string) => {
    const found = history.find(h => h.date === dateStr);
    if (found) {
      const formatted: GroupResult[] = found.groups.map((g, idx) => ({
        id: idx + 1,
        name: g.name,
        members: g.members,
        mission: g.mission
      }));
      setCurrentResult(formatted);
      setSelectedResultDate(dateStr);
      showToast(`📅 ${dateStr}에 만들어진 모둠 결과를 불러왔습니다.`, 'info');
    }
  };

  // --- 풍성하고 감동적인 캔버스 꽃가루/폭발 애니메이션 (CSS-Free Canvas Confetti) ---
  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 반응형 크기 세팅
    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    const colors = ['#FFC107', '#FF5722', '#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#4CAF50', '#8BC34A'];
    const pCount = 120;
    const particles: {
      x: number;
      y: number;
      radius: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }[] = [];

    for (let i = 0; i < pCount; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height - 20,
        radius: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        // 분수 발사 효과 속도
        speedX: (Math.random() - 0.5) * 15,
        speedY: -Math.random() * 12 - 8,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.speedY += 0.35; // 중력 영향
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height + 20) {
          alive = true;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        // 사각형 / 오각형 모양 꽃가루 그리기
        ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 1.5);
        ctx.restore();
      });

      if (alive) {
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    animate();
  };

  // --- 과거 대결 통계 및 분석 (선생님이 투명하게 볼 수 있는 공정 매트릭스 도우미) ---
  const calculatedPairs = buildPairingCounts(history);
  const getTotalPastCombosCount = () => {
    return Object.values(calculatedPairs).reduce((sum, count) => sum + count, 0);
  };

  return (
    <div className="min-h-screen bg-[#f0f9ff] font-sans text-stone-800 pb-16 relative overflow-hidden selection:bg-yellow-200 font-medium">
      
      {/* 귀여운 아기자기 배경 데코레이션 */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-yellow-250/50 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute top-40 right-20 w-36 h-36 bg-orange-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-pink-100/60 rounded-full blur-2xl pointer-events-none"></div>

      {/* 헤더 섹션 (Vibrant Palette Theme) */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-white rounded-3xl p-5 shadow-lg border-4 border-sky-450 mt-6 mb-2 max-w-6xl mx-auto gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center text-3xl shadow-inner animate-wiggle select-none">✨</div>
          <div>
            <h1 className="text-3xl font-display font-black text-sky-600 tracking-tight flex items-center gap-2">
              공정 모둠 메이커 🎒
            </h1>
            <p className="text-xs font-bold text-sky-400 uppercase tracking-widest font-sans">
              Fair Group Maker for Kids
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-sky-50 px-6 py-2.5 rounded-2xl border-2 border-sky-150 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-500" />
            <span className="font-black text-xs md:text-sm text-sky-600 tracking-wider font-display">오늘 날짜: {todayStr}</span>
          </div>

          {history.some(h => h.date === todayStr) ? (
            <div className="flex items-center gap-1.5 text-xs bg-amber-50 hover:bg-amber-100 border-2 border-amber-205 text-amber-800 px-4 py-2 rounded-2xl font-black">
              <Lock className="w-3.5 h-3.5 text-amber-600 stroke-[3px]" />
              <span>오늘 모둠 잠김 🔒</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs bg-lime-50 border-2 border-lime-200 text-lime-800 px-4 py-2 rounded-2xl font-black bounce-subtle">
              <Unlock className="w-3.5 h-3.5 text-lime-600" />
              <span>오늘 미추첨상태 🎲</span>
            </div>
          )}
          
          <button 
            onClick={() => setIsResetConfirmOpen(true)}
            className="bg-pink-100 hover:bg-pink-200 text-pink-600 font-extrabold px-5 py-2 rounded-2xl border-b-4 border-pink-300 transition-all active:border-b-0 active:translate-y-1 shrink-0 text-xs flex items-center gap-1 cursor-pointer"
          >
            데이터 초기화 🗑️
          </button>
        </div>
      </header>

      {/* 토스트 메시지 팝업 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-pop-in max-w-sm">
          <div className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 border-2 ${
            toastMessage.type === 'warn' 
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : toastMessage.type === 'info'
                ? 'bg-sky-50 border-sky-300 text-sky-950'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}>
            <div className="p-1 rounded-full">
              {toastMessage.type === 'warn' ? (
                <AlertCircle className="w-6 h-6 text-rose-500" />
              ) : toastMessage.type === 'info' ? (
                <Info className="w-6 h-6 text-sky-500" />
              ) : (
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              )}
            </div>
            <p className="text-sm font-medium">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* 설명 가이드 모달 */}
      {showHelp && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-yellow-400 relative">
            <button 
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 bg-stone-100 hover:bg-stone-200 w-8 h-8 rounded-full flex items-center justify-center font-bold"
            >
              ✕
            </button>
            <h3 className="text-xl font-display font-bold text-amber-900 mb-3 flex items-center gap-2">
              💡 사이좋은 모둠 메이커 사용설명서
            </h3>
            <div className="space-y-3 text-stone-600 text-sm font-sans leading-relaxed">
              <p>
                <strong>1. 🍀 무엇이 공정할까요?</strong><br />
                과거의 모둠 편성 일자 데이터를 누적 계산하여, <strong>이미 같이 조를 해본 친구들이 다시 묶일 가능성을 극도로 낮추도록 설계</strong>되었습니다. 1,000번의 모둠 조합 시뮬레이션을 돌려 최상의 조합을 자동으로 추출합니다.
              </p>
              <p>
                <strong>2. 🔒 하루에 딱 한 번만!</strong><br />
                초등학생들의 단골 불평인 <em>"선생님, 마음에 안 들어요! 다시 뽑아주세요!"</em>를 사전에 예방하기 위해, <strong>'모둠 생성' 버튼을 누르면 당일에는 결과가 완전히 고정</strong>됩니다. 하루 한 번 승부 원칙을 통해 공정함을 배웁니다.
              </p>
              <p>
                <strong>3. 💤 결석 처리 기능이 있어요!</strong><br />
                등교하지 않은 학생들의 이름을 클릭하면 임시 제외 상태가 되어 오늘 모둠 생성 대상에서 즉시 제외됩니다.
              </p>
              <p>
                <strong>4. 🎁 오늘의 미션 임명장!</strong><br />
                모둠별로 리더(모둠장), 발표 요정, 정리 수호선 등 협동심을 기를 수 있는 다양한 오늘의 신선한 미션이 랜덤 부여됩니다!
              </p>
            </div>
            <button 
              onClick={() => setShowHelp(false)}
              className="w-full mt-5 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold py-2.5 rounded-xl transition shadow-md"
            >
              훌륭해요! 이제 모둠 만들래요
            </button>
          </div>
        </div>
      )}

      {/* 메인 작업 영역 */}
      <main className="max-w-6xl mx-auto mt-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 왼쪽 사이드 및 설정 영역 (Grid: 4 cols) */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* 아기자기 등교부 카드 (명단 편집 & 출결체크) - Vibrant Palette Theme */}
          <div className="bg-white rounded-3xl border-4 border-amber-300 shadow-xl p-5 relative flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-black text-amber-600 flex items-center gap-2">
                👥 학생 명단 입력
              </h2>
              <button 
                onClick={() => setShowHelp(true)}
                className="text-stone-400 hover:text-stone-600 transition flex items-center gap-1 text-xs cursor-pointer font-bold"
              >
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                도움말 💡
              </button>
            </div>

            {/* 수동 입력 텍스트 영역 토글 */}
            <details className="bg-amber-50/50 rounded-2xl p-3.5 border border-amber-200">
              <summary className="text-amber-800 font-bold text-xs cursor-pointer select-none flex items-center justify-between">
                <span>🎒 명단 직접 수정 (선생님 전용)</span>
                <span className="text-[9px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">자세히 보기</span>
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-amber-700 font-medium">학생들의 이름을 쉼표(,)나 공백으로 나열해 적은 후 아래 '저장' 버튼을 꼭 클릭해 주세요!</p>
                <textarea
                  className="w-full h-24 p-2.5 text-xs border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-sans text-stone-800"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="예: 홍길동, 김영희, 서준우, 박채원"
                />
                <button
                  onClick={handleApplyStudents}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-black py-2 rounded-xl transition duration-150 shadow-sm cursor-pointer border-b-2 border-amber-600"
                >
                  명단 저장 및 즉시 반영 💾
                </button>
              </div>
            </details>

            {/* 인명 리스트 요약 표시 */}
            <div className="flex justify-between items-center bg-amber-50 py-2.5 px-4 rounded-xl text-xs border border-amber-100">
              <span className="font-bold text-stone-600">
                총 등록 인원: <span className="text-amber-700 font-extrabold">{students.length}명</span>
              </span>
              <span className="font-bold text-emerald-700">
                출석 학생: <span className="font-extrabold">{students.filter(s => s.isPresent).length}명</span>
              </span>
            </div>

            {/* 개별 등교 체크 박스 */}
            <div className="p-1">
              <p className="text-[11px] text-stone-500 mb-2.5 flex items-center gap-1 font-medium select-none">
                <Info className="w-4 h-4 text-sky-500 shrink-0" />
                <span>이름을 클릭해서 결석 학생을 <b>제외</b>하세요!</span>
              </p>
              
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
                {students.map((student, idx) => (
                  <button
                    key={`${student.name}-${idx}`}
                    onClick={() => toggleAttendance(idx)}
                    className={`text-xs py-2 px-1 rounded-xl font-bold transition duration-150 flex flex-col items-center justify-center gap-0.5 border-2 cursor-pointer ${
                      student.isPresent
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-850 hover:bg-emerald-100/70'
                        : 'bg-stone-50 border-stone-200 text-stone-400 line-through decoration-stone-405 hover:bg-stone-100/70'
                    }`}
                  >
                    <span className="truncate max-w-full">{student.name}</span>
                    <span className="text-[9px] opacity-80">
                      {student.isPresent ? '💚 출석' : '💤 결석'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 단축 제어 */}
            <div className="flex gap-2">
              <button
                onClick={() => setAllAttendance(true)}
                className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs py-2 rounded-xl border border-emerald-250 transition font-black cursor-pointer"
              >
                모두 출석 🏫
              </button>
              <button
                onClick={() => setAllAttendance(false)}
                className="flex-1 bg-stone-50 hover:bg-stone-100 text-stone-600 text-xs py-2 rounded-xl border border-stone-250 transition font-black cursor-pointer"
              >
                모두 결석 💤
              </button>
            </div>

          </div>

          {/* 모둠 배정 세팅 관리 */}
          <div className="bg-white rounded-3xl border-4 border-orange-300 shadow-sm p-5 relative">
            <h2 className="text-lg font-display font-bold text-amber-900 mb-4 flex items-center gap-2">
              ⚙️ 모둠 설정하기
            </h2>
            
            {/* 방식 선택 탭 */}
            <div className="flex bg-stone-100 p-1 rounded-2xl mb-4">
              <button
                onClick={() => changeMode('count')}
                className={`flex-1 text-xs py-2 rounded-xl font-bold transition ${
                  setting.mode === 'count'
                    ? 'bg-orange-400 text-white shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                모둠 개수로 정하기
              </button>
              <button
                onClick={() => changeMode('size')}
                className={`flex-1 text-xs py-2 rounded-xl font-bold transition ${
                  setting.mode === 'size'
                    ? 'bg-orange-400 text-white shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                모둠당 인원수로 정하기
              </button>
            </div>

            {/* 수치 조정기 */}
            <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100 text-center mb-6">
              <p className="text-xs text-stone-600 mb-2 font-semibold">
                {setting.mode === 'count' ? '몇 개의 모둠을 만들까요?' : '한 모둠당 몇 명씩 묶을까요??'}
              </p>
              
              <div className="flex items-center justify-center gap-5 my-2">
                <button
                  onClick={() => changeTargetValue(-1)}
                  className="bg-white hover:bg-stone-100 border-2 border-orange-300 text-orange-600 w-10 h-10 rounded-full flex items-center justify-center text-xl font-black transition active:scale-95"
                >
                  -
                </button>
                <span className="text-3xl font-display font-black text-orange-950">
                  {setting.targetValue}
                  <span className="text-lg font-bold ml-1">
                    {setting.mode === 'count' ? '모둠' : '명'}
                  </span>
                </span>
                <button
                  onClick={() => changeTargetValue(1)}
                  className="bg-white hover:bg-stone-100 border-2 border-orange-300 text-orange-600 w-10 h-10 rounded-full flex items-center justify-center text-xl font-black transition active:scale-95"
                >
                  +
                </button>
              </div>

              <div className="text-[11px] text-orange-700/80 mt-1 min-h-[1.5rem]">
                {setting.mode === 'count' ? (
                  <span>
                    오늘 등교한 {students.filter(s => s.isPresent).length}명이 평균{' '}
                    <strong>
                      {Math.ceil(students.filter(s => s.isPresent).length / setting.targetValue)}명
                    </strong>
                    씩 나뉩니다.
                  </span>
                ) : (
                  <span>
                    오늘 대략{' '}
                    <strong>
                      {Math.max(1, Math.round(students.filter(s => s.isPresent).length / setting.targetValue))}개
                    </strong>
                    의 모둠이 생성됩니다.
                  </span>
                )}
              </div>
            </div>

            {/* 생성용 발사 버튼 */}
            {history.some(h => h.date === todayStr) ? (
              <div className="space-y-2">
                <button
                  disabled
                  className="w-full bg-stone-300 text-stone-500 py-3.5 px-4 rounded-2xl font-display font-extrabold text-base flex items-center justify-center gap-2 cursor-not-allowed border-b-4 border-stone-400"
                >
                  <Lock className="w-5 h-5 text-stone-400" />
                  오늘의 모둠 추천 고정됨 🔒
                </button>
                <p className="text-[11px] text-center text-stone-500 leading-relaxed">
                  초등학생의 단판 승부 원칙을 준수하기 위해 오늘의 추첨이 완료되었습니다. 
                </p>
              </div>
            ) : (
              <button
                onClick={handleGenerateGroups}
                className="w-full bg-[#3d6547] hover:bg-[#2c4e36] hover:-translate-y-0.5 active:translate-y-0 text-white font-display font-extrabold text-lg py-4 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md transform hover:shadow-lg border-b-6 border-[#1e3525]"
              >
                <Shuffle className="w-6 h-6 animate-pulse" />
                ⭐ 공정하게 모둠 만들기 ⭐
              </button>
            )}

          </div>

          {/* 과거 매칭 현황 정보 데스크 */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-700" />
              알고리즘 공정 상태판
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-stone-150">
                <span className="block text-[10px] text-stone-400">누적 활동 일수</span>
                <span className="text-base font-bold text-stone-700">{history.length}일</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-stone-150">
                <span className="block text-[10px] text-stone-400">등록된 매칭 짝꿍</span>
                <span className="text-base font-bold text-emerald-700">
                  {students.length * (students.length - 1) / 2}개 조합
                </span>
              </div>
            </div>
            {getTotalPastCombosCount() > 0 && (
              <div className="mt-3 text-[11px] text-stone-500 leading-normal">
                현재 총 <strong>{getTotalPastCombosCount()}번</strong>의 과거 같은 모둠 페어링 횟수가 기록되어 다음 모둠 배정 시 무조적으로 회피되어 가산됩니다.
              </div>
            )}
          </div>

        </section>

        {/* 오른쪽 메인 결과 화면 영역 (Grid: 8 cols) */}
        <section className="lg:col-span-8 space-y-6">
          
          <div className="bg-white rounded-3xl border-4 border-emerald-400 shadow-sm p-6 relative min-h-[500px] flex flex-col">
            
            {/* Confetti Canvas */}
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 pointer-events-none z-10 w-full h-full rounded-2xl"
            />

            {/* 카드 배경 무늬 */}
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none select-none">
              <Users className="w-48 h-48" />
            </div>

            {/* 결과 상단바 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-stone-100 pb-4 mb-6 z-20">
              <div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                  {selectedResultDate === todayStr ? '☀️ 오늘의 배정안' : selectedResultDate ? `📅 ${selectedResultDate} 결과 조회` : '💡 모둠 준비 완료'}
                </span>
                <h2 className="text-2xl font-display font-bold text-amber-950 mt-1">
                  {isSpinning 
                    ? '🎰 행운의 슬롯머신 돌아가는 중...' 
                    : selectedResultDate 
                      ? '🎉 이번 주 우리들의 행복 모둠 결과' 
                      : '등교를 마친 후 생성 버튼을 눌러주세요'}
                </h2>
              </div>
              
              {/* 날짜 배정 상태 텍스트 */}
              {selectedResultDate && (
                <div className="text-xs font-mono text-stone-400">
                  {selectedResultDate === todayStr && (
                    <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                      <Check className="w-3.5 h-3.5" /> 대진표 고정완료
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 본문 결과 컨텐츠 */}
            {currentResult.length > 0 ? (
              <div className="flex-1 flex flex-col justify-between z-20">
                
                {/* 모둠 카드 격자 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  {currentResult.map((group) => {
                    const groupSpinning = !revealedGroups.includes(group.id) && isSpinning;
                    
                    return (
                      <div
                        key={group.id}
                        className={`bg-white rounded-2xl border-3 transition-all duration-300 relative overflow-hidden ${
                          groupSpinning
                            ? 'border-yellow-400 bg-yellow-50/20 scale-[0.98] shadow-inner'
                            : 'border-emerald-200 hover:border-emerald-400 hover:shadow-md'
                        }`}
                        style={{
                          animation: groupSpinning ? 'wiggle 0.3s ease-in-out infinite' : 'none'
                        }}
                      >
                        {/* 모둠 카드 헤더 블록 */}
                        <div className={`px-4 py-2.5 font-display font-black text-base flex justify-between items-center ${
                          groupSpinning 
                            ? 'bg-yellow-400 text-yellow-950' 
                            : 'bg-emerald-50 text-emerald-950 border-b-2 border-emerald-150'
                        }`}>
                          <span>{group.name}</span>
                          
                          {/* 스핀 여부에 따른 뱃지 */}
                          {groupSpinning ? (
                            <span className="text-[10px] bg-yellow-700 text-yellow-50 px-1.5 py-0.5 rounded-full animate-bounce">
                              스피닝! 🎰
                            </span>
                          ) : (
                            <span className="text-xs bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full">
                              ⭐ 배정 완료
                            </span>
                          )}
                        </div>

                        {/* 구성 학생들 몸통 */}
                        <div className="p-4 space-y-3.5">
                          
                          {/* 모둠 구성원 명 작성 영역 */}
                          <div>
                            <span className="text-[10px] text-stone-400 block mb-1 font-bold">모둠 어깨동무 친구들</span>
                            
                            {groupSpinning ? (
                              <div className="flex flex-wrap gap-1.5 min-h-[40px] items-center text-stone-400">
                                {/* 슬롯머신 도는 동안의 난수 시각 대치 */}
                                {(spinningNames[group.id] || group.members).map((name, index) => (
                                  <span
                                    key={index}
                                    className="bg-yellow-100/50 border border-yellow-200 px-2.5 py-1 rounded-xl text-xs text-yellow-800 font-bold blur-[0.5px]"
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 min-h-[40px] items-center">
                                {group.members.map((member, index) => (
                                  <span
                                    key={member}
                                    className="bg-[#e4ebd3] border-2 border-[#b5cc92]/40 px-3 py-1 rounded-xl text-stone-900 text-sm font-bold flex items-center gap-1 shadow-sm transition hover:scale-105"
                                  >
                                    👤 {member}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 오늘의 미션 부여 카드 */}
                          {!groupSpinning && (
                            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 shadow-sm relative overflow-hidden">
                              {/* 미션 타이틀 및 비주얼 그라데이션 */}
                              <div className="flex items-center gap-1.5 mb-1 text-xs">
                                <span className={`font-display font-semibold text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${group.mission.color}`}>
                                  {group.mission.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-600 font-medium leading-relaxed mt-1">
                                {group.mission.description}
                              </p>
                            </div>
                          )}

                          {/* 슬롯머신 돌아가는 중 메시지 대체 */}
                          {groupSpinning && (
                            <div className="bg-yellow-50 text-center py-2.5 rounded-xl border border-dashed border-yellow-300 text-[10px] text-yellow-700 font-semibold uppercase animate-pulse">
                              임무 지정하는 대기 중... 🎁
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 결과 조율 후 투명한 진단 피드백 */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3px]" />
                    <span>
                      <strong>중복 회비 알고리즘 정상작동중!</strong> 1,000회 모둠 편성을 테스트한 뒤 가장 중복 확률이 낮은 무적 배치도를 확정했습니다.
                    </span>
                  </div>
                  
                  {selectedResultDate === todayStr && (
                    <span className="font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block">
                      🔒 오늘 기록 자동 고정됨 (안전 장치 작동 중)
                    </span>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-20">
                <div className="w-24 h-24 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mb-4 border-2 border-yellow-200">
                  <Shuffle className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-display font-semibold text-amber-950 mb-2">
                  행복한 모둠 추첨을 시작해볼까요?
                </h3>
                <p className="text-stone-500 text-sm max-w-sm leading-relaxed">
                  오늘 등교하지 않은 친구를 왼쪽 명단에서 등교 해제한 후, 오렌지색 슬라이더로 크기를 정하고 <strong>'공정하게 모둠 만들기'</strong> 버튼을 눌러주세요!
                </p>
              </div>
            )}

          </div>

        </section>

      </main>

      {/* 선생님 전용 보안 기능 / 히스토리 열람 아코디언 메뉴 */}
      <footer className="max-w-6xl mx-auto mt-12 px-4">
        
        <div className="bg-white rounded-3xl border-4 border-stone-300 p-5 shadow-sm">
          <button
            onClick={() => setShowTeacherPanel(!showTeacherPanel)}
            className="w-full flex items-center justify-between font-display font-bold text-amber-950 text-base"
          >
            <span className="flex items-center gap-2.5 text-stone-700">
              <Settings className="w-5 h-5 text-stone-600" />
              💼 선생님 비밀 설정창 (과거 이력 및 초기화 도구함)
            </span>
            <span className="text-xs bg-stone-100 hover:bg-stone-200 px-3 py-1 rounded-full text-stone-600">
              {showTeacherPanel ? '설정 닫기 ▲' : '설정 열기 ▼'}
            </span>
          </button>

          {showTeacherPanel && (
            <div className="mt-5 pt-5 border-t border-stone-200 grid grid-cols-1 md:grid-cols-12 gap-8 animate-pop-in">
              
              {/* 과거 매칭 히스토리 인덱스 일람 */}
              <div className="md:col-span-8 space-y-3">
                <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-stone-500" />
                  지난 모둠 히스토리 전체 조회 ({history.length}일 전 편성이 축적됨)
                </h3>
                
                {history.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {history.map((day) => (
                      <button
                        key={day.date}
                        onClick={() => handleViewHistoricalResult(day.date)}
                        className={`text-xs p-2 rounded-xl border text-left flex flex-col justify-between hover:bg-emerald-50 hover:border-emerald-300 transition duration-150 ${
                          selectedResultDate === day.date
                            ? 'bg-emerald-50/70 border-emerald-400 font-bold'
                            : 'bg-stone-50 border-stone-200'
                        }`}
                      >
                        <span className="text-stone-700">{day.date} 배정</span>
                        <span className="text-[10px] text-stone-400 mt-1 block">
                          성공 편성: {day.groups.length}개 모둠 ({day.groups.reduce((sum, g) => sum + g.members.length, 0)}명)
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-stone-50 text-center py-6 rounded-2xl text-stone-400 text-xs border border-dashed border-stone-200">
                    아직 이전 모둠 배정 역사 기록이 없습니다. 앞으로 모둠을 생성할수록 공정성 매트릭스가 두터워집니다.
                  </div>
                )}
              </div>

              {/* 영구 완전 기어 초기화 버튼 */}
              <div className="md:col-span-4 space-y-4">
                <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 text-stone-500" />
                  비상 제어 복원 도구
                </h3>
                
                <div className="space-y-2.5">
                  
                  {/* 단방향 오늘 잠금 날리기 */}
                  {history.some(h => h.date === todayStr) ? (
                    <button
                      onClick={() => setIsDrawAgainConfirmOpen(true)}
                      className="w-full bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-300 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      🔓 오늘 모둠만 잠금해제 (오늘 다시 뽑기)
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-stone-50 text-stone-400 border border-stone-200 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      🔓 오늘 다시 뽑기 (활성화되지 않음)
                    </button>
                  )}

                  {/* 전체 이력 리클레임 */}
                  <button
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    🧹 모든 모둠 역사 지우기 (전체 데이터 초기화)
                  </button>

                </div>

                <p className="text-[10px] text-stone-400 leading-normal">
                  * <strong>모든 모둠 역사 지우기</strong>를 누르면 첫날 상태가 되며 이전 파트너 만남 이력 중복 점수도 전부 날아갑니다. 새로운 학기를 시작할 때 추천드려요.
                </p>

              </div>

            </div>
          )}
        </div>

        <div className="text-center mt-6 text-xs text-stone-400">
          <p>© 2026 사이좋은 초등학교 공정 모둠 메이커 • 선생님과 학생들이 함께하는 깨끗하고 올바른 자치 활동 도우미</p>
        </div>

      </footer>

    </div>
  );
}
