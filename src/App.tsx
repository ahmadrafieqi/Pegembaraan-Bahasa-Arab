import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveQuizState,
  CameraMode,
  DeviceMode,
  GameProgressState,
  HERO_OPTIONS,
  HeroId,
  InteractiveEntity,
  NpcId,
  STAGE1_OBJECTS,
  STAGE2_CARDS,
  STAGE3_SENTENCES,
  STAGE4_BOSS_QUESTIONS,
  ScreenPhase,
  WordCategory,
  createInitialGameProgress,
} from './game/curriculum';
import { ensureAudio, playSound } from './game/audio';
import { MinimapSnapshot, WorldCanvas, WorldController } from './game/WorldCanvas';
import { Minimap } from './components/Minimap';
import {
  BossRetryModal,
  DialogueModal,
  HowToPlayModal,
  QuizModal,
  RestartModal,
  SorterModal,
  VictoryModal,
  WorldMapModal,
} from './components/Modals';

function detectInitialDeviceMode(): DeviceMode {
  if (typeof window === 'undefined') return 'PC';
  const w = window.innerWidth;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouch && w < 640) return 'TELEFON';
  if (isTouch && w <= 1024) return 'TABLET';
  if (w <= 1366) return 'LAPTOP';
  return 'PC';
}

const DEVICE_SUMMARIES: Record<DeviceMode, string> = {
  TELEFON: 'Mod Telefon: Pad sentuh padat di skrin untuk pergerakan mudah alih.',
  TABLET: 'Mod Tablet: Butang sentuh skrin luas & zon seret kamera di bahagian bawah.',
  LAPTOP: 'Mod Laptop: Sokongan papan kekunci WASD + pad sesentuh / tetikus.',
  PC: 'Mod PC: Paparan penuh tanpa butang sentuh skrin, kawalan WASD + Tetikus.',
};

const DEVICE_ICONS: Record<DeviceMode, string> = {
  TELEFON: '📱',
  TABLET: '📟',
  LAPTOP: '💻',
  PC: '🖥️',
};

const DEVICE_LABELS: Record<DeviceMode, string> = {
  TELEFON: 'Telefon',
  TABLET: 'Tablet',
  LAPTOP: 'Laptop',
  PC: 'PC',
};

export default function App() {
  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('MENU');
  const [progress, setProgress] = useState<GameProgressState>(() =>
    createInitialGameProgress('boy', 'TPP', detectInitialDeviceMode(), false)
  );

  // Modal & UI states
  const [showHowTo, setShowHowTo] = useState(false);
  const [activeNpc, setActiveNpc] = useState<NpcId | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizState | null>(null);
  const [sorterOpen, setSorterOpen] = useState(false);
  const [sorterIdx, setSorterIdx] = useState(0);
  const [worldMapOpen, setWorldMapOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [victoryOpen, setVictoryOpen] = useState(false);
  const [bossRetryScore, setBossRetryScore] = useState<number | null>(null);

  const [nearestEntity, setNearestEntity] = useState<InteractiveEntity | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [minimapSnap, setMinimapSnap] = useState<MinimapSnapshot>({
    playerX: 0,
    playerZ: 42,
    playerYaw: Math.PI,
  });

  const controllerRef = useRef<WorldController | null>(null);
  const lookTouchRef = useRef<{ id: number | null; x: number; y: number }>({
    id: null,
    x: 0,
    y: 0,
  });
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const isAnyModalOpen =
    showHowTo ||
    activeNpc !== null ||
    activeQuiz !== null ||
    sorterOpen ||
    worldMapOpen ||
    restartOpen ||
    victoryOpen ||
    bossRetryScore !== null;

  // --- Handlers ---
  const handleOpenCharSelect = () => {
    ensureAudio();
    const detected = detectInitialDeviceMode();
    setProgress((prev) => ({ ...prev, deviceMode: detected }));
    setScreenPhase('CHAR_SELECT');
  };

  const handleSelectHero = (heroId: HeroId) => {
    setProgress((prev) => ({ ...prev, heroId }));
    controllerRef.current?.rebuildHero(heroId);
  };

  const handleSelectCameraMode = (cameraMode: CameraMode) => {
    setProgress((prev) => ({ ...prev, cameraMode }));
  };

  const handleToggleCameraMode = useCallback(() => {
    setProgress((prev) => {
      const next: CameraMode = prev.cameraMode === 'TPP' ? 'FPP' : 'TPP';
      showToast(
        next === 'FPP'
          ? 'Mod FPP (Pandangan Orang Pertama) 👁️'
          : 'Mod TPP (Pandangan Orang Ketiga) 🧍'
      );
      return { ...prev, cameraMode: next };
    });
  }, [showToast]);

  const handleSelectDeviceMode = (deviceMode: DeviceMode) => {
    setProgress((prev) => ({ ...prev, deviceMode }));
  };

  const handleCycleDeviceMode = () => {
    const order: DeviceMode[] = ['TELEFON', 'TABLET', 'LAPTOP', 'PC'];
    const next = order[(order.indexOf(progress.deviceMode) + 1) % order.length];
    handleSelectDeviceMode(next);
    showToast(`Mod Peranti ditukar kepada: ${DEVICE_LABELS[next]}`);
  };

  const handleToggleMute = () => {
    setProgress((prev) => {
      const nextMuted = !prev.muted;
      showToast(nextMuted ? 'Bunyi dimatikan 🔇' : 'Bunyi diaktifkan 🔊');
      return { ...prev, muted: nextMuted };
    });
  };

  const handleStartGameWorld = () => {
    ensureAudio();
    playSound('unlock', progress.muted);
    controllerRef.current?.rebuildHero(progress.heroId);
    controllerRef.current?.teleportTo(0, 42);
    controllerRef.current?.resetCameraBehindPlayer();
    setScreenPhase('PLAYING');
    window.setTimeout(() => {
      setActiveNpc('ustaz');
    }, 350);
  };

  const handleInteractEntity = useCallback(
    (ent: InteractiveEntity) => {
      if (ent.type === 'NPC' && ent.npcId) {
        setActiveNpc(ent.npcId);
      } else if (ent.type === 'STAGE1_OBJ' && ent.data) {
        if (Object.prototype.hasOwnProperty.call(progress.s1Answered, ent.id)) {
          showToast('Soalan ini telah dijawab (1 kali percubaan sahaja).');
          return;
        }
        setActiveQuiz({
          mode: 'STAGE1',
          item: ent.data as (typeof STAGE1_OBJECTS)[number],
          bossIdx: 0,
          bossCorrect: 0,
          answered: false,
        });
      } else if (ent.type === 'STAGE3_SENT' && ent.data) {
        if (Object.prototype.hasOwnProperty.call(progress.s3Answered, ent.id)) {
          showToast('Soalan ini telah dijawab (1 kali percubaan sahaja).');
          return;
        }
        setActiveQuiz({
          mode: 'STAGE3',
          item: ent.data as (typeof STAGE3_SENTENCES)[number],
          bossIdx: 0,
          bossCorrect: 0,
          answered: false,
        });
      }
    },
    [progress.s1Answered, progress.s3Answered, showToast]
  );

  const handleAutoCollectStage2Card = useCallback(
    (ent: InteractiveEntity) => {
      setProgress((prev) => {
        if (prev.s2Collected[ent.id]) return prev;
        const nextCollected = { ...prev.s2Collected, [ent.id]: true };
        const count = Object.keys(nextCollected).length;
        controllerRef.current?.setStage2CardVisible(ent.id, false);
        playSound('pickup', prev.muted);

        if (count === 5) {
          showToast('✨ Semua 5 Kad Hikmah ditemui! Membuka Penyusun Kad Ajaib...');
          window.setTimeout(() => {
            setSorterIdx(0);
            setProgress((p) => ({ ...p, s2Sorted: {} }));
            setSorterOpen(true);
          }, 550);
        } else {
          const card = ent.data as (typeof STAGE2_CARDS)[number];
          showToast(`Kad Hikmah ditemui (${count}/5): ${card.arabic}`);
        }

        return {
          ...prev,
          score: prev.score + 50,
          s2Collected: nextCollected,
        };
      });
    },
    [showToast]
  );

  const handleSubmitQuizAnswer = (choice: WordCategory) => {
    if (!activeQuiz || activeQuiz.answered) return;
    const isBoss = activeQuiz.mode === 'BOSS';
    const target = isBoss ? STAGE4_BOSS_QUESTIONS[activeQuiz.bossIdx] : activeQuiz.item!;
    const isCorrect = choice === target.type;

    if (isCorrect) {
      playSound('correct', progress.muted);
      controllerRef.current?.triggerCheer(1.4);
    } else {
      playSound('wrong', progress.muted);
    }

    setActiveQuiz((prev) =>
      prev
        ? {
            ...prev,
            answered: true,
            lastChoiceCorrect: isCorrect,
            bossCorrect: isBoss && isCorrect ? prev.bossCorrect + 1 : prev.bossCorrect,
          }
        : null
    );

    if (activeQuiz.mode === 'STAGE1' && activeQuiz.item) {
      const itemId = activeQuiz.item.id;
      controllerRef.current?.markEntityStatus(itemId, isCorrect ? 'correct' : 'wrong');
      setProgress((prev) => {
        const nextS1 = { ...prev.s1Answered, [itemId]: isCorrect };
        const totalDone = Object.keys(nextS1).length;
        const correctCount = Object.values(nextS1).filter(Boolean).length;
        let nextUnlocked = prev.unlockedStage;
        let nextPassed = prev.s1Passed;
        let nextStars = prev.stars;
        const nextBadges = [...prev.badges] as [boolean, boolean, boolean, boolean];

        if (totalDone === 5) {
          if (correctCount >= 2 && !prev.s1Passed) {
            nextPassed = true;
            nextUnlocked = Math.max(nextUnlocked, 2);
            nextBadges[0] = true;
            nextStars += Math.min(3, Math.max(1, Math.ceil(correctCount * 0.6)));
            controllerRef.current?.unlockGate(1);
            playSound('unlock', prev.muted);
            showToast('🎉 Tahap 1 Lulus! Laluan ke Hutan Ajaib kini terbuka!');
          } else if (correctCount < 2) {
            showToast(`Anda mendapat ${correctCount}/5. Jumpa Ustaz Hakim untuk cuba semula!`);
          }
        }

        return {
          ...prev,
          score: prev.score + (isCorrect ? 100 : 0),
          stars: nextStars,
          unlockedStage: nextUnlocked,
          badges: nextBadges,
          s1Answered: nextS1,
          s1Passed: nextPassed,
        };
      });
    } else if (activeQuiz.mode === 'STAGE3' && activeQuiz.item) {
      const itemId = activeQuiz.item.id;
      controllerRef.current?.markEntityStatus(itemId, isCorrect ? 'correct' : 'wrong');
      setProgress((prev) => {
        const nextS3 = { ...prev.s3Answered, [itemId]: isCorrect };
        const totalDone = Object.keys(nextS3).length;
        const correctCount = Object.values(nextS3).filter(Boolean).length;
        let nextUnlocked = prev.unlockedStage;
        let nextPassed = prev.s3Passed;
        let nextStars = prev.stars;
        const nextBadges = [...prev.badges] as [boolean, boolean, boolean, boolean];

        if (totalDone === 5) {
          if (correctCount >= 2 && !prev.s3Passed) {
            nextPassed = true;
            nextUnlocked = Math.max(nextUnlocked, 4);
            nextBadges[2] = true;
            nextStars += Math.min(3, Math.max(1, Math.ceil(correctCount * 0.6)));
            controllerRef.current?.unlockGate(3);
            playSound('unlock', prev.muted);
            showToast('🎉 Tahap 3 Lulus! Singgahsana Raja Penjaga Ilmu kini terbuka!');
          } else if (correctCount < 2) {
            showToast(`Anda mendapat ${correctCount}/5. Jumpa Wazir Faris untuk ulang semula!`);
          }
        }

        return {
          ...prev,
          score: prev.score + (isCorrect ? 100 : 0),
          stars: nextStars,
          unlockedStage: nextUnlocked,
          badges: nextBadges,
          s3Answered: nextS3,
          s3Passed: nextPassed,
        };
      });
    } else if (isBoss) {
      setProgress((prev) => ({
        ...prev,
        score: prev.score + (isCorrect ? 150 : 0),
      }));
    }
  };

  const handleNextQuiz = () => {
    if (!activeQuiz) return;
    if (activeQuiz.mode === 'BOSS') {
      if (activeQuiz.bossIdx < STAGE4_BOSS_QUESTIONS.length - 1) {
        setActiveQuiz((prev) =>
          prev
            ? {
                ...prev,
                bossIdx: prev.bossIdx + 1,
                answered: false,
                lastChoiceCorrect: undefined,
              }
            : null
        );
      } else {
        const finalBossCorrect = activeQuiz.bossCorrect;
        setActiveQuiz(null);
        if (finalBossCorrect >= 5) {
          playSound('unlock', progress.muted);
          controllerRef.current?.triggerCheer(3.0);
          setProgress((prev) => {
            const nextBadges = [...prev.badges] as [boolean, boolean, boolean, boolean];
            nextBadges[3] = true;
            return {
              ...prev,
              s4Completed: true,
              badges: nextBadges,
              stars: prev.s4Completed ? prev.stars : Math.min(12, prev.stars + 3),
            };
          });
          setVictoryOpen(true);
        } else {
          setBossRetryScore(finalBossCorrect);
        }
      }
      return;
    }
    setActiveQuiz(null);
  };

  const handleOpenSorter = () => {
    setSorterIdx(0);
    setProgress((prev) => ({ ...prev, s2Sorted: {} }));
    setSorterOpen(true);
  };

  const handleSortCard = (bucket: WordCategory) => {
    const card = STAGE2_CARDS[sorterIdx];
    if (Object.prototype.hasOwnProperty.call(progress.s2Sorted, card.id)) return;
    const isCorrect = bucket === card.type;
    if (isCorrect) {
      playSound('correct', progress.muted);
    } else {
      playSound('wrong', progress.muted);
    }
    setProgress((prev) => ({
      ...prev,
      score: prev.score + (isCorrect ? 100 : 0),
      s2Sorted: { ...prev.s2Sorted, [card.id]: isCorrect },
    }));
  };

  const handleNextSorterCard = () => {
    if (sorterIdx < 4) {
      setSorterIdx((i) => i + 1);
      return;
    }
    setSorterOpen(false);
    const correctCount = Object.values(progress.s2Sorted).filter(Boolean).length;
    if (correctCount >= 2) {
      playSound('unlock', progress.muted);
      controllerRef.current?.unlockGate(2);
      controllerRef.current?.triggerCheer(1.6);
      setProgress((prev) => {
        const nextBadges = [...prev.badges] as [boolean, boolean, boolean, boolean];
        nextBadges[1] = true;
        return {
          ...prev,
          s2Passed: true,
          unlockedStage: Math.max(prev.unlockedStage, 3),
          badges: nextBadges,
          stars: prev.s2Passed ? prev.stars : prev.stars + Math.min(3, Math.max(1, Math.ceil(correctCount * 0.6))),
        };
      });
      showToast(`🎉 Tahap 2 Lulus (${correctCount}/5)! Gerbang Istana Misteri dibuka!`);
    } else {
      showToast(`Anda mendapat ${correctCount}/5. Cuba susun semula kad (minima 2/5)!`);
    }
  };

  const handleRetryStage1 = () => {
    STAGE1_OBJECTS.forEach((o) => controllerRef.current?.markEntityStatus(o.id, 'default'));
    setProgress((prev) => ({ ...prev, s1Answered: {} }));
    setActiveNpc(null);
    showToast('Tahap 1 ditetapkan semula! Periksa semula 5 objek Arab.');
  };

  const handleRetryStage3 = () => {
    STAGE3_SENTENCES.forEach((s) => controllerRef.current?.markEntityStatus(s.id, 'default'));
    setProgress((prev) => ({ ...prev, s3Answered: {} }));
    setActiveNpc(null);
    showToast('Tahap 3 ditetapkan semula! Periksa 5 podium ayat.');
  };

  const handleStartBossBattle = () => {
    setActiveNpc(null);
    setBossRetryScore(null);
    setActiveQuiz({
      mode: 'BOSS',
      bossIdx: 0,
      bossCorrect: 0,
      answered: false,
    });
  };

  const handleConfirmRestart = () => {
    setRestartOpen(false);
    setVictoryOpen(false);
    setBossRetryScore(null);
    setActiveNpc(null);
    setActiveQuiz(null);
    setSorterOpen(false);
    setWorldMapOpen(false);

    controllerRef.current?.lockAllGates();
    controllerRef.current?.resetAllStageVisuals();
    controllerRef.current?.teleportTo(0, 42);
    controllerRef.current?.resetCameraBehindPlayer();

    setProgress((prev) =>
      createInitialGameProgress(prev.heroId, prev.cameraMode, prev.deviceMode, prev.muted)
    );
    showToast('Kembara dimulakan semula! Selamat berjuang ⚔️');
  };

  const handleToggleWorldMap = useCallback(() => {
    setWorldMapOpen((open) => !open);
  }, []);

  const currentHero = useMemo(
    () => HERO_OPTIONS.find((h) => h.id === progress.heroId) || HERO_OPTIONS[0],
    [progress.heroId]
  );

  // Mission summary
  const missionSummary = useMemo(() => {
    if (progress.unlockedStage === 1) {
      return {
        title: 'TAHAP 1: PEMBURU PERKATAAN',
        desc: 'Cari & periksa 5 objek Arab di Kampung Permulaan!',
        count: `${Object.keys(progress.s1Answered).length} / 5`,
      };
    }
    if (progress.unlockedStage === 2) {
      const col = Object.keys(progress.s2Collected).length;
      return {
        title: 'TAHAP 2: HUTAN AJAIB',
        desc:
          col < 5
            ? 'Kumpul 5 Kad Hikmah tersembunyi di hutan!'
            : 'Susun 5 Kad Hikmah ke dalam peti Isim & Fi‘il!',
        count: `${col} / 5`,
      };
    }
    if (progress.unlockedStage === 3) {
      return {
        title: 'TAHAP 3: DETEKTIF AYAT ISTANA',
        desc: 'Selesaikan 5 teka-teki ayat Arab di Istana Misteri!',
        count: `${Object.keys(progress.s3Answered).length} / 5`,
      };
    }
    return {
      title: 'TAHAP 4: RAJA PENJAGA ILMU',
      desc: 'Bersemuka dengan Sultan Harun di Singgahsana!',
      count: progress.s4Completed ? 'SELESAI' : '10 Ujian',
    };
  }, [progress]);

  const showTouchControls =
    progress.deviceMode === 'TELEFON' || progress.deviceMode === 'TABLET';

  const stage2ReadyToSort =
    Object.keys(progress.s2Collected).length === 5 && !progress.s2Passed;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Live 3D World Canvas */}
      <WorldCanvas
        screenPhase={screenPhase}
        heroId={progress.heroId}
        cameraMode={progress.cameraMode}
        muted={progress.muted}
        isModalOpen={isAnyModalOpen}
        collectedStage2Ids={progress.s2Collected}
        onNearestEntityChange={setNearestEntity}
        onInteractEntity={handleInteractEntity}
        onAutoCollectStage2Card={handleAutoCollectStage2Card}
        onToggleCameraMode={handleToggleCameraMode}
        onToggleWorldMap={handleToggleWorldMap}
        onToast={showToast}
        onMinimapUpdate={setMinimapSnap}
        controllerRef={controllerRef}
      />

      {/* =========================================================
          1. MENU UTAMA
      ========================================================== */}
      {screenPhase === 'MENU' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-slate-950/45 overflow-y-auto">
          <div className="quest-panel max-w-2xl w-full rounded-3xl p-5 sm:p-9 text-center animate-pop relative overflow-hidden my-auto">
            <p className="text-xs sm:text-sm font-bold text-amber-800 mb-2 tracking-wide">
              Kembara Bahasa Arab Tahun 4 · Edisi 3D Realistik ·{' '}
              <span className="arabic-text">الِاسْمُ وَالْفِعْلُ</span>
            </p>

            <h1 className="text-2xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-1">
              KEMBARA BAHASA ARAB
            </h1>
            <h2 className="text-lg sm:text-2xl font-bold text-amber-600 tracking-wide mb-3">
              KERAJAAN YANG HILANG
            </h2>
            <div className="arabic-display text-xl sm:text-3xl font-bold text-emerald-700 mb-4 bg-emerald-50 py-2 px-6 rounded-2xl inline-block border-2 border-emerald-200 max-w-full">
              رِحْلَةُ اللُّغَةِ الْعَرَبِيَّةِ
            </div>

            <p className="text-slate-600 text-xs sm:text-base max-w-lg mx-auto mb-6 leading-relaxed">
              Terokai Kerajaan Arab 3D yang realistik, temui para ilmuwan bijaksana, kumpulkan skrol hikmah, dan kuasai rahsia{' '}
              <strong className="text-blue-600">
                Isim (<span className="arabic-text">الِاسْمُ</span>)
              </strong>{' '}
              serta{' '}
              <strong className="text-rose-600">
                Fi‘il (<span className="arabic-text">الْفِعْلُ</span>)
              </strong>!
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={handleOpenCharSelect}
                className="btn-quest w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-extrabold text-base sm:text-xl border-2 border-amber-300 flex items-center justify-center gap-3 cursor-pointer"
              >
                <span>⚔️</span>
                <span>MULA KEMBARA</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHowTo(true)}
                className="btn-quest w-full sm:w-auto px-6 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-b from-sky-400 to-sky-500 text-white font-bold text-sm sm:text-lg border-2 border-sky-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📖</span>
                <span>CARA BERMAIN</span>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t-2 border-amber-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-xl shrink-0">
                  📘
                </div>
                <div>
                  <div className="font-bold text-blue-900 text-sm">
                    Isim <span className="arabic-text text-base text-blue-700">(الِاسْمُ)</span> — Kata Nama
                  </div>
                  <div className="text-xs text-blue-700">
                    Nama bagi manusia, tempat, haiwan, atau benda (cth:{' '}
                    <span className="arabic-text font-bold">كِتَابٌ</span>).
                  </div>
                </div>
              </div>
              <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-xl shrink-0">
                  ⚡
                </div>
                <div>
                  <div className="font-bold text-rose-900 text-sm">
                    Fi‘il <span className="arabic-text text-base text-rose-700">(الْفِعْلُ)</span> — Kata Kerja
                  </div>
                  <div className="text-xs text-rose-700">
                    Perkataan yang menunjukkan perbuatan atau tindakan (cth:{' '}
                    <span className="arabic-text font-bold">يَكْتُبُ</span>).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          2. SKRIN PEMILIHAN WATAK, MOD KAMERA & 4 MOD PERANTI
      ========================================================== */}
      {screenPhase === 'CHAR_SELECT' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center lg:justify-end p-3 sm:p-6 bg-slate-950/30 pointer-events-none">
          <div className="quest-panel max-w-2xl w-full rounded-3xl p-5 sm:p-7 animate-pop max-h-[94vh] overflow-y-auto pointer-events-auto">
            <div className="text-center mb-4">
              <p className="text-purple-700 font-bold text-xs uppercase tracking-wider">
                Langkah 1 · Persediaan Watak 3D (Pratonton Langsung)
              </p>
              <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                Pilih Watak, Kamera & Mod Peranti
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm">
                Pilih watak 3D Lelaki atau Perempuan, sudut kamera, dan aturan peranti anda!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
              {HERO_OPTIONS.map((hero) => {
                const selected = progress.heroId === hero.id;
                return (
                  <button
                    key={hero.id}
                    type="button"
                    onClick={() => handleSelectHero(hero.id)}
                    className={`p-3.5 sm:p-4 rounded-2xl text-left transition cursor-pointer ${
                      selected
                        ? 'border-4 border-amber-500 bg-amber-100 shadow-md'
                        : 'border-2 border-slate-300 bg-white hover:border-amber-300'
                    }`}
                  >
                    <div className="text-3xl sm:text-4xl mb-1">{hero.avatar}</div>
                    <div className="font-extrabold text-slate-900 text-sm sm:text-base">
                      {hero.name}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">{hero.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-3 sm:p-3.5 mb-4">
              <div className="font-bold text-sky-950 text-xs sm:text-sm mb-2 flex items-center gap-2">
                <span>🎥</span>
                <span>Pilih Mod Pandangan Kamera (Boleh ditukar semasa bermain):</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectCameraMode('TPP')}
                  className={`p-2.5 sm:p-3 rounded-xl text-left transition flex items-center gap-2 cursor-pointer ${
                    progress.cameraMode === 'TPP'
                      ? 'border-4 border-amber-500 bg-amber-100'
                      : 'border-2 border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-xl sm:text-2xl shrink-0">🧍</span>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight">
                      Mod TPP (Orang Ketiga)
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-600 leading-tight mt-0.5">
                      Kamera di belakang watak
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectCameraMode('FPP')}
                  className={`p-2.5 sm:p-3 rounded-xl text-left transition flex items-center gap-2 cursor-pointer ${
                    progress.cameraMode === 'FPP'
                      ? 'border-4 border-amber-500 bg-amber-100'
                      : 'border-2 border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-xl sm:text-2xl shrink-0">👁️</span>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight">
                      Mod FPP (Orang Pertama)
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-600 leading-tight mt-0.5">
                      Lihat dari mata watak
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 sm:p-3.5 mb-5">
              <div className="font-bold text-amber-950 text-xs sm:text-sm mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span>📲</span>
                  <span>Pilih Mod Peranti Anda:</span>
                </span>
                <span className="text-[10px] text-amber-800 font-bold">Auto-Kesan</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['TELEFON', 'TABLET', 'LAPTOP', 'PC'] as DeviceMode[]).map((mode) => {
                  const active = progress.deviceMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleSelectDeviceMode(mode)}
                      className={`p-2.5 rounded-xl text-center transition flex flex-col items-center justify-center cursor-pointer ${
                        active
                          ? 'border-4 border-amber-500 bg-amber-100 shadow-sm'
                          : 'border-2 border-slate-300 bg-white'
                      }`}
                    >
                      <span className="text-xl sm:text-2xl mb-0.5">{DEVICE_ICONS[mode]}</span>
                      <div className="font-extrabold text-slate-900 text-xs leading-tight">
                        {DEVICE_LABELS[mode]}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-amber-900 font-semibold mt-2 text-center bg-white/85 rounded-xl py-1.5 px-3 border border-amber-200">
                {DEVICE_SUMMARIES[progress.deviceMode]}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setScreenPhase('MENU')}
                className="btn-quest px-5 py-3.5 rounded-2xl bg-slate-200 text-slate-800 font-bold text-sm sm:text-base cursor-pointer"
              >
                ← Kembali
              </button>
              <button
                type="button"
                onClick={handleStartGameWorld}
                className="btn-quest flex-1 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-extrabold text-base sm:text-xl border-2 border-emerald-300 cursor-pointer"
              >
                MASUK KE KERAJAAN 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          3. PAPARAN HUD PERMAINAN
      ========================================================== */}
      {screenPhase === 'PLAYING' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            {/* Profil & Lencana */}
            <div className="hud-surface rounded-2xl p-2 sm:p-2.5 text-white pointer-events-auto flex flex-col gap-1.5 max-w-[205px] sm:max-w-[245px]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center text-lg sm:text-xl font-bold border-2 border-white shrink-0">
                  {currentHero.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-[11px] sm:text-xs leading-relaxed text-amber-300 break-words">
                    {currentHero.name}
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] sm:text-xs font-bold mt-0.5 tabular-nums">
                    <span className="text-yellow-300">⭐ {progress.stars}/12</span>
                    <span className="text-emerald-300">💎 {progress.score}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 pt-1 border-t border-white/15 text-[11px] sm:text-xs">
                <span className="text-slate-300 font-semibold">Lencana:</span>
                {(['🏺', '🍄', '🏰', '👑'] as const).map((icon, idx) => (
                  <span
                    key={icon}
                    title={`Lencana Tahap ${idx + 1}`}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                      progress.badges[idx]
                        ? 'bg-amber-400 border-white scale-105'
                        : 'bg-slate-800 border-slate-600 opacity-40'
                    }`}
                  >
                    {icon}
                  </span>
                ))}
              </div>
            </div>

            {/* Bar Kemajuan Tahap & Misi Semasa (Desktop) */}
            <div className="hidden lg:flex flex-col items-center gap-2 pointer-events-auto max-w-lg w-full">
              <div className="hud-surface rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-bold text-white">
                {['1. Kampung', '2. Hutan', '3. Istana', '4. Raja'].map((label, idx) => {
                  const stageNum = idx + 1;
                  const unlocked = stageNum <= progress.unlockedStage;
                  return (
                    <React.Fragment key={label}>
                      {idx > 0 && (
                        <span className={unlocked ? 'text-amber-400' : 'text-slate-500'}>➔</span>
                      )}
                      <div
                        className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                          unlocked ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <span>{unlocked ? label : `🔒 ${label}`}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="hud-surface rounded-2xl px-4 py-2 text-white w-full flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">
                    {missionSummary.title}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-100">
                    {missionSummary.desc}
                  </div>
                </div>
                <div className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-sm shrink-0 tabular-nums">
                  {missionSummary.count}
                </div>
              </div>
            </div>

            {/* Kawalan Kanan Atas & Minimap */}
            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <div className="flex flex-wrap justify-end items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCycleDeviceMode}
                  title="Tukar Mod Peranti"
                  className="btn-quest px-2.5 py-2 rounded-xl bg-indigo-600 text-white font-extrabold text-[11px] sm:text-xs flex items-center gap-1 border border-indigo-300 cursor-pointer whitespace-nowrap"
                >
                  <span>{DEVICE_ICONS[progress.deviceMode]}</span>
                  <span>{DEVICE_LABELS[progress.deviceMode]}</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleCameraMode}
                  title="Tukar Mod Kamera FPP / TPP (Kekunci V)"
                  className="btn-quest px-2.5 py-2 rounded-xl bg-sky-500 text-white font-extrabold text-[11px] sm:text-xs flex items-center gap-1 border border-sky-300 cursor-pointer whitespace-nowrap"
                >
                  <span>{progress.cameraMode === 'TPP' ? '🧍' : '👁️'}</span>
                  <span>{progress.cameraMode}</span>
                </button>
                <button
                  type="button"
                  onClick={() => controllerRef.current?.resetCameraBehindPlayer()}
                  title="Laraskan Kamera ke Belakang Watak (Kekunci R)"
                  className="btn-quest px-2.5 py-2 rounded-xl bg-slate-700 text-white font-extrabold text-[11px] sm:text-xs border border-slate-500 cursor-pointer whitespace-nowrap"
                >
                  🎯
                </button>
                <button
                  type="button"
                  onClick={() => setWorldMapOpen(true)}
                  title="Peta Dunia (M)"
                  className="btn-quest px-2.5 py-2 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-[11px] sm:text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>🗺️</span>
                  <span className="hidden sm:inline">Peta</span>
                </button>
                {stage2ReadyToSort && (
                  <button
                    type="button"
                    onClick={handleOpenSorter}
                    className="btn-quest px-2.5 py-2 rounded-xl bg-emerald-400 text-slate-950 font-extrabold text-[11px] sm:text-xs animate-bounce cursor-pointer whitespace-nowrap"
                  >
                    ✨ Susun Kad!
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  title="Bunyi"
                  className="btn-quest w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 text-white border border-slate-600 flex items-center justify-center text-sm sm:text-base cursor-pointer"
                >
                  {progress.muted ? '🔇' : '🔊'}
                </button>
                <button
                  type="button"
                  onClick={() => setRestartOpen(true)}
                  title="Mula Semula"
                  className="btn-quest w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-600 text-white border border-rose-400 flex items-center justify-center text-xs sm:text-sm font-bold cursor-pointer"
                >
                  ↻
                </button>
              </div>

              <Minimap
                snapshot={minimapSnap}
                progress={progress}
                onOpenWorldMap={() => setWorldMapOpen(true)}
              />
            </div>
          </div>

          {/* Bar Misi Mudah Alih */}
          <div className="lg:hidden hud-surface rounded-xl px-3 py-2 text-white pointer-events-auto flex items-center justify-between gap-2 mt-1">
            <div className="truncate">
              <span className="text-[10px] font-bold text-amber-300 block">
                {missionSummary.title}
              </span>
              <span className="text-xs font-medium">{missionSummary.desc}</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-extrabold text-xs shrink-0 tabular-nums">
              {missionSummary.count}
            </span>
          </div>

          {/* Bahagian Bawah: Petunjuk Interaksi & Kawalan Sentuh */}
          <div className="flex flex-col items-center gap-2 mt-auto">
            {nearestEntity && !isAnyModalOpen && (
              <div className="pointer-events-auto z-30">
                <button
                  type="button"
                  onClick={() => handleInteractEntity(nearestEntity)}
                  className="btn-quest px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 font-extrabold text-sm sm:text-lg border-2 border-white shadow-xl flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-amber-300 text-xs sm:text-sm">
                    E
                  </span>
                  <span>{nearestEntity.label}</span>
                </button>
              </div>
            )}

            {showTouchControls && (
              <div className="flex w-full items-end justify-between pointer-events-auto px-1 pb-1 gap-2">
                {/* Pad Arah (D-Pad) */}
                <div className="grid grid-cols-3 gap-1.5 w-32 h-32 sm:w-40 sm:h-40 shrink-0">
                  <div />
                  <button
                    type="button"
                    onTouchStart={() => controllerRef.current?.setTouchKey('KeyW', true)}
                    onTouchEnd={() => controllerRef.current?.setTouchKey('KeyW', false)}
                    onTouchCancel={() => controllerRef.current?.setTouchKey('KeyW', false)}
                    onMouseDown={() => controllerRef.current?.setTouchKey('KeyW', true)}
                    onMouseUp={() => controllerRef.current?.setTouchKey('KeyW', false)}
                    onMouseLeave={() => controllerRef.current?.setTouchKey('KeyW', false)}
                    className="bg-slate-900/85 active:bg-amber-400 active:text-slate-950 text-white rounded-2xl border-2 border-white/30 font-bold text-base sm:text-lg shadow-md"
                  >
                    ▲
                  </button>
                  <div />
                  <button
                    type="button"
                    onTouchStart={() => controllerRef.current?.setTouchKey('KeyA', true)}
                    onTouchEnd={() => controllerRef.current?.setTouchKey('KeyA', false)}
                    onTouchCancel={() => controllerRef.current?.setTouchKey('KeyA', false)}
                    onMouseDown={() => controllerRef.current?.setTouchKey('KeyA', true)}
                    onMouseUp={() => controllerRef.current?.setTouchKey('KeyA', false)}
                    onMouseLeave={() => controllerRef.current?.setTouchKey('KeyA', false)}
                    className="bg-slate-900/85 active:bg-amber-400 active:text-slate-950 text-white rounded-2xl border-2 border-white/30 font-bold text-base sm:text-lg shadow-md"
                  >
                    ◀
                  </button>
                  <div className="bg-slate-900/40 rounded-2xl flex items-center justify-center text-[9px] sm:text-[10px] text-white/70 font-bold">
                    GERAK
                  </div>
                  <button
                    type="button"
                    onTouchStart={() => controllerRef.current?.setTouchKey('KeyD', true)}
                    onTouchEnd={() => controllerRef.current?.setTouchKey('KeyD', false)}
                    onTouchCancel={() => controllerRef.current?.setTouchKey('KeyD', false)}
                    onMouseDown={() => controllerRef.current?.setTouchKey('KeyD', true)}
                    onMouseUp={() => controllerRef.current?.setTouchKey('KeyD', false)}
                    onMouseLeave={() => controllerRef.current?.setTouchKey('KeyD', false)}
                    className="bg-slate-900/85 active:bg-amber-400 active:text-slate-950 text-white rounded-2xl border-2 border-white/30 font-bold text-base sm:text-lg shadow-md"
                  >
                    ▶
                  </button>
                  <div />
                  <button
                    type="button"
                    onTouchStart={() => controllerRef.current?.setTouchKey('KeyS', true)}
                    onTouchEnd={() => controllerRef.current?.setTouchKey('KeyS', false)}
                    onTouchCancel={() => controllerRef.current?.setTouchKey('KeyS', false)}
                    onMouseDown={() => controllerRef.current?.setTouchKey('KeyS', true)}
                    onMouseUp={() => controllerRef.current?.setTouchKey('KeyS', false)}
                    onMouseLeave={() => controllerRef.current?.setTouchKey('KeyS', false)}
                    className="bg-slate-900/85 active:bg-amber-400 active:text-slate-950 text-white rounded-2xl border-2 border-white/30 font-bold text-base sm:text-lg shadow-md"
                  >
                    ▼
                  </button>
                  <div />
                </div>

                {/* Zon Seret Kamera Sentuh */}
                <div
                  onTouchStart={(e) => {
                    if (e.changedTouches.length > 0) {
                      const t = e.changedTouches[0];
                      lookTouchRef.current = { id: t.identifier, x: t.clientX, y: t.clientY };
                    }
                  }}
                  onTouchMove={(e) => {
                    for (let i = 0; i < e.changedTouches.length; i++) {
                      const t = e.changedTouches[i];
                      if (t.identifier === lookTouchRef.current.id) {
                        const dx = t.clientX - lookTouchRef.current.x;
                        const dy = t.clientY - lookTouchRef.current.y;
                        lookTouchRef.current.x = t.clientX;
                        lookTouchRef.current.y = t.clientY;
                        controllerRef.current?.rotateCameraBy(dx, dy);
                      }
                    }
                  }}
                  onTouchEnd={() => {
                    lookTouchRef.current.id = null;
                  }}
                  onTouchCancel={() => {
                    lookTouchRef.current.id = null;
                  }}
                  className="flex-1 h-24 sm:h-32 rounded-2xl bg-slate-950/40 border-2 border-dashed border-white/25 flex items-center justify-center text-center px-2 touch-none"
                >
                  <span className="text-[10px] sm:text-xs font-bold text-white/80 pointer-events-none">
                    👆 Seret di sini untuk pusing kamera
                  </span>
                </div>

                {/* Butang Aksi Kanan */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => nearestEntity && handleInteractEntity(nearestEntity)}
                    className="w-20 h-14 sm:w-24 sm:h-16 rounded-2xl bg-amber-400 active:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm border-2 border-white shadow-lg flex flex-col items-center justify-center"
                  >
                    <span>💬</span>
                    <span>INTERAKSI</span>
                  </button>
                  <button
                    type="button"
                    onTouchStart={() => controllerRef.current?.triggerJump()}
                    onMouseDown={() => controllerRef.current?.triggerJump()}
                    className="w-20 h-14 sm:w-24 sm:h-16 rounded-2xl bg-emerald-500 active:bg-emerald-400 text-white font-extrabold text-xs sm:text-sm border-2 border-white shadow-lg flex flex-col items-center justify-center"
                  >
                    <span>🦘</span>
                    <span>LOMPAT</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          MODALS
      ========================================================== */}
      <HowToPlayModal open={showHowTo} onClose={() => setShowHowTo(false)} />

      <DialogueModal
        npcId={activeNpc}
        progress={progress}
        onClose={() => setActiveNpc(null)}
        onRetryStage1={handleRetryStage1}
        onRetryStage3={handleRetryStage3}
        onOpenSorter={() => {
          setActiveNpc(null);
          handleOpenSorter();
        }}
        onStartBossBattle={handleStartBossBattle}
      />

      <QuizModal
        quiz={activeQuiz}
        progress={progress}
        onSubmitAnswer={handleSubmitQuizAnswer}
        onNext={handleNextQuiz}
      />

      <SorterModal
        open={sorterOpen}
        cardIdx={sorterIdx}
        progress={progress}
        onSort={handleSortCard}
        onNext={handleNextSorterCard}
      />

      <WorldMapModal
        open={worldMapOpen}
        unlockedStage={progress.unlockedStage}
        onClose={() => setWorldMapOpen(false)}
        onTeleport={(x, z, name) => {
          controllerRef.current?.teleportTo(x, z);
          setWorldMapOpen(false);
          showToast(`Tiba di ${name}`);
        }}
      />

      <BossRetryModal
        bossCorrect={bossRetryScore}
        onRetry={handleStartBossBattle}
        onClose={() => setBossRetryScore(null)}
      />

      <RestartModal
        open={restartOpen}
        onCancel={() => setRestartOpen(false)}
        onConfirm={handleConfirmRestart}
      />

      <VictoryModal
        open={victoryOpen}
        score={progress.score}
        stars={progress.stars}
        onRestart={handleConfirmRestart}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900/95 text-amber-300 border-2 border-amber-400 font-extrabold text-xs sm:text-sm shadow-2xl text-center max-w-md animate-pop pointer-events-none">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
