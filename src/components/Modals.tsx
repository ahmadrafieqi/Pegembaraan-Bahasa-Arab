import React from 'react';
import {
  ActiveQuizState,
  GameProgressState,
  NpcId,
  STAGE2_CARDS,
  STAGE4_BOSS_QUESTIONS,
  Stage1Object,
  Stage3Sentence,
  WordCategory,
  ZONES_META,
} from '../game/curriculum';
import { speakArabic } from '../game/audio';

interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
      <div className="quest-panel max-w-xl w-full rounded-3xl p-5 sm:p-8 animate-pop max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>🎮</span> Kawalan & Peraturan Permainan
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 font-bold hover:bg-rose-200 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-sm">
          <div className="bg-amber-50 p-3 rounded-2xl border-2 border-amber-200">
            <span className="font-bold text-amber-800 block mb-1">🏃 Gerakkan Watak</span>
            <span className="text-slate-700">
              <kbd className="px-2 py-0.5 bg-white border rounded font-bold">W A S D</kbd>, Anak Panah, atau Pad Sentuh
            </span>
          </div>
          <div className="bg-amber-50 p-3 rounded-2xl border-2 border-amber-200">
            <span className="font-bold text-amber-800 block mb-1">🦘 Melompat</span>
            <span className="text-slate-700">
              <kbd className="px-2 py-0.5 bg-white border rounded font-bold">SPACEBAR</kbd> atau Butang <strong>Lompat</strong>
            </span>
          </div>
          <div className="bg-amber-50 p-3 rounded-2xl border-2 border-amber-200">
            <span className="font-bold text-amber-800 block mb-1">💬 Berbual / Periksa</span>
            <span className="text-slate-700">
              <kbd className="px-2 py-0.5 bg-white border rounded font-bold">E</kbd>, Klik Objek 3D, atau Butang <strong>Interaksi</strong>
            </span>
          </div>
          <div className="bg-amber-50 p-3 rounded-2xl border-2 border-amber-200">
            <span className="font-bold text-amber-800 block mb-1">🎥 Kamera & Mod FPP/TPP</span>
            <span className="text-slate-700">
              Seret Skrin · Skrol Zum · <kbd className="px-1.5 py-0.5 bg-white border rounded font-bold">V</kbd> FPP/TPP · <kbd className="px-1.5 py-0.5 bg-white border rounded font-bold">R</kbd> Reset
            </span>
          </div>
        </div>

        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-xs sm:text-sm text-emerald-900 mb-6 space-y-1.5">
          <p className="font-bold">🗺️ Misi 4 Peringkat Kerajaan & Peraturan Markah:</p>
          <p>1. <strong>Kampung Permulaan:</strong> Cari 5 objek Arab & kenal pasti Isim atau Fi‘il.</p>
          <p>2. <strong>Hutan Ajaib:</strong> Kumpul 5 kad tersembunyi & asingkan ke peti Isim & Fi‘il.</p>
          <p>3. <strong>Istana Misteri:</strong> Selesaikan 5 teka-teki ayat Arab sebagai Detektif Ayat.</p>
          <p>4. <strong>Raja Terakhir:</strong> Tewaskan Penjaga Ilmu dalam pertarungan 10 soalan!</p>
          <p className="pt-1.5 border-t border-emerald-200 font-bold text-rose-800">
            ⚠️ Peraturan: Setiap soalan hanya boleh dijawab 1 kali (salah = 0 mata). Lulus sekurang-kurangnya 2/5 betul (Tahap 1–3) atau 5/10 betul (Tahap 4)!
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-quest w-full py-3.5 rounded-2xl bg-amber-400 text-slate-950 font-extrabold text-lg cursor-pointer"
        >
          FAHAM!
        </button>
      </div>
    </div>
  );
};

interface DialogueModalProps {
  npcId: NpcId | null;
  progress: GameProgressState;
  onClose: () => void;
  onRetryStage1: () => void;
  onRetryStage3: () => void;
  onOpenSorter: () => void;
  onStartBossBattle: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  npcId,
  progress,
  onClose,
  onRetryStage1,
  onRetryStage3,
  onOpenSorter,
  onStartBossBattle,
}) => {
  if (!npcId) return null;

  let avatar = '👳‍♂️';
  let name = 'Ustaz Hakim';
  let arabTitle = 'الْأُسْتَاذُ حَكِيمٌ';
  let role = 'Penjaga Kampung Permulaan (Tahap 1)';
  let body: React.ReactNode = null;
  let primaryAction: { label: string; className: string; onClick: () => void } | null = null;

  if (npcId === 'ustaz') {
    const done = Object.keys(progress.s1Answered).length;
    const correct = Object.values(progress.s1Answered).filter(Boolean).length;
    if (progress.s1Passed) {
      body = (
        <p>
          Syabas wahai penuntut ilmu! Anda telah menjawab <strong>{correct}/5</strong> objek di Kampung Permulaan dan membuka laluan ke <strong>Hutan Ajaib</strong>.
        </p>
      );
    } else if (done === 5 && correct < 2) {
      body = (
        <p>
          Anda hanya mendapat <strong>{correct}/5</strong> betul. Syarat lulus ialah sekurang-kurangnya <strong>2/5 betul</strong>. Mari ulang semula cabaran Kampung Permulaan!
        </p>
      );
      primaryAction = {
        label: 'Ulang Tahap 1 ↻',
        className: 'bg-amber-400 text-slate-950',
        onClick: onRetryStage1,
      };
    } else {
      body = (
        <>
          <p>
            Assalamualaikum! Selamat datang ke <strong>Kampung Permulaan</strong>.
          </p>
          <p>
            Terdapat <strong>5 objek Arab</strong> bercahaya di sekitar kampung ini ({done}/5 diperiksa). Dekati setiap objek dan tentukan sama ada ia{' '}
            <strong className="text-blue-700">
              Isim (<span className="arabic-text">الِاسْمُ</span>)
            </strong>{' '}
            atau{' '}
            <strong className="text-rose-700">
              Fi‘il (<span className="arabic-text">الْفِعْلُ</span>)
            </strong>!
          </p>
        </>
      );
    }
  } else if (npcId === 'ranger') {
    avatar = '🧕';
    name = 'Penjaga Hutan Safiyyah';
    arabTitle = 'حَارِسَةُ الْغَابَةِ';
    role = 'Penjaga Hutan Ajaib (Tahap 2)';
    const colCount = Object.keys(progress.s2Collected).length;

    if (progress.s2Passed) {
      body = (
        <p>
          Hebat! Semua kad hikmah telah disusun dengan jayanya. Gerbang menuju <strong>Istana Misteri</strong> telah terbuka!
        </p>
      );
    } else if (colCount === 5) {
      body = (
        <p>
          Anda telah mengumpulkan kesemua <strong>5 Kad Hikmah</strong>! Klik butang di bawah untuk menyusun kad ke dalam Peti Isim dan Peti Fi‘il.
        </p>
      );
      primaryAction = {
        label: 'Buka Penyusun Kad Ajaib ✨',
        className: 'bg-emerald-500 text-white',
        onClick: onOpenSorter,
      };
    } else {
      body = (
        <>
          <p>
            Selamat datang ke <strong>Hutan Ajaib</strong> yang rendang dan subur!
          </p>
          <p>
            Cari <strong>5 Kad Hikmah</strong> yang terapung di celah-celah pokok besar ({colCount}/5 ditemui), kemudian susunkan ke peti yang betul.
          </p>
        </>
      );
    }
  } else if (npcId === 'wazir') {
    avatar = '🧔‍♂️';
    name = 'Wazir Faris';
    arabTitle = 'الْوَزِيرُ فَارِسٌ';
    role = 'Detektif Ayat Istana Misteri (Tahap 3)';
    const done = Object.keys(progress.s3Answered).length;
    const correct = Object.values(progress.s3Answered).filter(Boolean).length;

    if (progress.s3Passed) {
      body = (
        <p>
          Kebijaksanaan anda luar biasa! Pintu ke <strong>Singgahsana Raja Penjaga Ilmu</strong> kini terbuka luas.
        </p>
      );
    } else if (done === 5 && correct < 2) {
      body = (
        <p>
          Markah anda <strong>{correct}/5</strong>. Anda perlukan sekurang-kurangnya <strong>2/5 betul</strong> untuk melepasi Istana Misteri.
        </p>
      );
      primaryAction = {
        label: 'Ulang Tahap 3 ↻',
        className: 'bg-amber-400 text-slate-950',
        onClick: onRetryStage3,
      };
    } else {
      body = (
        <>
          <p>
            Selamat tiba di <strong>Istana Misteri</strong>!
          </p>
          <p>
            Periksa <strong>5 Podium Kristal</strong> di dewan istana ({done}/5 diselesaikan). Baca ayat Arab dengan teliti dan kenal pasti jenis perkataan yang diuji.
          </p>
        </>
      );
    }
  } else if (npcId === 'king') {
    avatar = '👑';
    name = 'Sultan Harun (Penjaga Ilmu)';
    arabTitle = 'سُلْطَانُ الْعِلْمِ';
    role = 'Raja Terakhir Kerajaan Yang Hilang (Tahap 4)';
    body = (
      <>
        <p>Selamat datang ke puncak kerajaan, wira muda!</p>
        <p>
          Hanya mereka yang mampu melepasi sekurang-kurangnya <strong>5 daripada 10 Ujian Diraja</strong> (
          <span className="arabic-text font-bold">الِاسْمُ وَالْفِعْلُ</span>) layak dinobatkan sebagai Juara Kerajaan Yang Hilang. Adakah anda bersedia?
        </p>
      </>
    );
    primaryAction = {
      label: '⚔️ Mula Pertarungan 10 Soalan!',
      className: 'bg-rose-600 text-white',
      onClick: onStartBossBattle,
    };
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-slate-950/70">
      <div className="quest-panel max-w-2xl w-full rounded-3xl p-5 sm:p-7 animate-pop">
        <div className="flex items-start gap-3 sm:gap-4 mb-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-100 border-2 border-amber-400 flex items-center justify-center text-3xl sm:text-4xl shrink-0">
            {avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-2xl font-extrabold text-slate-900">{name}</h3>
              <span className="arabic-text px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold">
                {arabTitle}
              </span>
            </div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">{role}</p>
          </div>
        </div>

        <div className="bg-amber-50/90 border-2 border-amber-200 rounded-2xl p-4 text-slate-800 text-sm sm:text-base leading-relaxed mb-5 space-y-2">
          {body}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className={`btn-quest px-5 py-2.5 rounded-xl font-extrabold text-sm cursor-pointer ${primaryAction.className}`}
            >
              {primaryAction.label}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn-quest px-5 py-2.5 rounded-xl bg-slate-200 text-slate-800 font-bold text-sm cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

interface QuizModalProps {
  quiz: ActiveQuizState | null;
  progress: GameProgressState;
  onSubmitAnswer: (choice: WordCategory) => void;
  onNext: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  quiz,
  progress,
  onSubmitAnswer,
  onNext,
}) => {
  if (!quiz) return null;

  const isBoss = quiz.mode === 'BOSS';
  const bossQ = isBoss ? STAGE4_BOSS_QUESTIONS[quiz.bossIdx] : null;
  const stage1Item = quiz.mode === 'STAGE1' ? (quiz.item as Stage1Object) : null;
  const stage3Item = quiz.mode === 'STAGE3' ? (quiz.item as Stage3Sentence) : null;

  const targetItem = isBoss ? bossQ! : quiz.item!;
  const totalDone =
    quiz.mode === 'STAGE1'
      ? Object.keys(progress.s1Answered).length + (quiz.answered ? 0 : 1)
      : Object.keys(progress.s3Answered).length + (quiz.answered ? 0 : 1);

  const badgeText = isBoss
    ? 'TAHAP 4 • PERTARUNGAN RAJA ILMU'
    : quiz.mode === 'STAGE1'
    ? 'TAHAP 1 • OBJEK KAMPUNG'
    : 'TAHAP 3 • DETEKTIF AYAT';

  const progressText = isBoss
    ? `Ujian ${quiz.bossIdx + 1} / 10`
    : `Soalan ${Math.min(5, totalDone)} / 5`;

  const remainingHp = 10 - quiz.bossCorrect;
  const speechText = stage3Item ? stage3Item.arabic : targetItem.arabic;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75">
      <div className="quest-panel max-w-xl w-full rounded-3xl p-5 sm:p-7 animate-pop max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-extrabold text-xs uppercase">
            {badgeText}
          </span>
          <span className="text-xs font-extrabold text-slate-600 bg-slate-100 px-3 py-1 rounded-full tabular-nums">
            {progressText}
          </span>
        </div>

        {isBoss && (
          <div className="mb-4 bg-rose-50 border-2 border-rose-300 rounded-2xl p-3">
            <div className="flex justify-between items-center text-xs font-extrabold text-rose-900 mb-1">
              <span>👑 PENJAGA ILMU (SULTAN HARUN)</span>
              <span className="tabular-nums">Nyawa Raja: {remainingHp} / 10</span>
            </div>
            <div className="w-full h-3.5 bg-rose-200 rounded-full overflow-hidden border border-rose-400">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-300"
                style={{ width: `${(remainingHp / 10) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white rounded-2xl p-5 text-center mb-4 border-2 border-amber-400 shadow-inner relative">
          <div className="text-xs text-amber-300 font-bold mb-2">
            {isBoss
              ? 'Sultan Harun menguji kebijaksanaan anda:'
              : stage3Item
              ? `Kenal pasti perkataan [ ${stage3Item.highlight} ] dalam ayat:`
              : 'Perhatikan perkataan Arab pada objek ini:'}
          </div>
          <div className="arabic-display text-3xl sm:text-5xl font-bold text-white mb-2">
            {targetItem.arabic}
          </div>
          <div className="text-xs sm:text-sm text-sky-300 font-semibold mb-3">
            {stage3Item ? stage3Item.translit : `(${targetItem.translit})`}
          </div>
          <button
            type="button"
            onClick={() => speakArabic(speechText, progress.muted)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/60 text-amber-200 text-xs font-bold cursor-pointer transition"
          >
            <span>🔊</span>
            <span>Dengar Sebutan Arab</span>
          </button>
        </div>

        <p className="text-slate-800 font-bold text-sm sm:text-base text-center mb-4">
          {stage3Item ? (
            <>
              Apakah jenis perkataan{' '}
              <strong className="arabic-text text-xl text-indigo-700">{stage3Item.highlight}</strong>{' '}
              di dalam ayat tersebut?
            </>
          ) : (
            <>
              Adakah perkataan ini tergolong dalam{' '}
              <span className="text-blue-600">Isim (Kata Nama)</span> atau{' '}
              <span className="text-rose-600">Fi‘il (Kata Kerja)</span>?
            </>
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            disabled={quiz.answered}
            onClick={() => onSubmitAnswer('ISIM')}
            className="btn-quest p-4 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 text-white font-extrabold border-2 border-blue-300 flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <span className="text-2xl">📘</span>
            <span className="text-base sm:text-lg">
              ISIM <span className="arabic-text">(الِاسْمُ)</span>
            </span>
            <span className="text-[11px] font-medium text-blue-100">
              Kata Nama (Benda / Orang / Tempat)
            </span>
          </button>
          <button
            type="button"
            disabled={quiz.answered}
            onClick={() => onSubmitAnswer('FIIL')}
            className="btn-quest p-4 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 text-white font-extrabold border-2 border-rose-300 flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <span className="text-2xl">⚡</span>
            <span className="text-base sm:text-lg">
              FI‘IL <span className="arabic-text">(الْفِعْلُ)</span>
            </span>
            <span className="text-[11px] font-medium text-rose-100">
              Kata Kerja (Perbuatan / Aksi)
            </span>
          </button>
        </div>

        {quiz.answered && (
          <div
            className={`rounded-2xl p-4 text-sm mb-4 border-2 ${
              quiz.lastChoiceCorrect
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                : 'bg-rose-50 border-rose-400 text-rose-950'
            }`}
          >
            <div
              className={`font-extrabold mb-1 ${
                quiz.lastChoiceCorrect ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {quiz.lastChoiceCorrect
                ? `✅ TEPAT SEKALI! (+${isBoss ? 150 : 100} Mata)`
                : '❌ KURANG TEPAT (0 Mata — Percubaan Tunggal)'}
            </div>
            <div>{stage1Item ? stage1Item.explanation : targetItem.explanation}</div>
          </div>
        )}

        {quiz.answered && (
          <button
            type="button"
            onClick={onNext}
            className="btn-quest w-full py-3.5 rounded-2xl bg-amber-400 text-slate-950 font-extrabold text-base sm:text-lg cursor-pointer"
          >
            {isBoss && quiz.bossIdx < 9 ? 'UJIAN SETERUSNYA ➔' : 'TERUSKAN ➔'}
          </button>
        )}
      </div>
    </div>
  );
};

interface SorterModalProps {
  open: boolean;
  cardIdx: number;
  progress: GameProgressState;
  onSort: (bucket: WordCategory) => void;
  onNext: () => void;
}

export const SorterModal: React.FC<SorterModalProps> = ({
  open,
  cardIdx,
  progress,
  onSort,
  onNext,
}) => {
  if (!open) return null;
  const card = STAGE2_CARDS[cardIdx];
  const answered = Object.prototype.hasOwnProperty.call(progress.s2Sorted, card.id);
  const isCorrect = progress.s2Sorted[card.id];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75">
      <div className="quest-panel max-w-xl w-full rounded-3xl p-5 sm:p-7 animate-pop max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
            TAHAP 2 • PENYUSUN KAD AJAIB
          </span>
          <span className="text-xs font-extrabold text-slate-600 bg-slate-100 px-3 py-1 rounded-full tabular-nums">
            Kad {cardIdx + 1} / 5
          </span>
        </div>

        <p className="text-center text-slate-700 text-xs sm:text-sm font-semibold mb-3">
          Masukkan kad hikmah yang anda temui di Hutan Ajaib ke dalam peti yang betul!
        </p>

        <div className="bg-gradient-to-br from-emerald-800 to-teal-950 text-white rounded-3xl p-6 text-center border-4 border-amber-400 shadow-xl mb-4">
          <div className="text-xs text-amber-300 font-bold mb-1">KAD HIKMAH HUTAN AJAIB</div>
          <div className="arabic-display text-4xl sm:text-5xl font-bold mb-1">{card.arabic}</div>
          <div className="text-sm text-emerald-200 font-semibold mb-3">({card.translit})</div>
          <button
            type="button"
            onClick={() => speakArabic(card.arabic, progress.muted)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-400/20 hover:bg-emerald-400/30 border border-emerald-300/60 text-emerald-100 text-xs font-bold cursor-pointer transition"
          >
            <span>🔊</span>
            <span>Dengar Sebutan</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            disabled={answered}
            onClick={() => onSort('ISIM')}
            className="btn-quest p-4 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-extrabold border-2 border-blue-300 flex flex-col items-center gap-1 cursor-pointer"
          >
            <span className="text-3xl">📦</span>
            <span className="text-sm sm:text-base">PETI ISIM</span>
            <span className="arabic-text text-base text-blue-200">الِاسْمُ</span>
          </button>
          <button
            type="button"
            disabled={answered}
            onClick={() => onSort('FIIL')}
            className="btn-quest p-4 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-700 text-white font-extrabold border-2 border-rose-300 flex flex-col items-center gap-1 cursor-pointer"
          >
            <span className="text-3xl">🧰</span>
            <span className="text-sm sm:text-base">PETI FI‘IL</span>
            <span className="arabic-text text-base text-rose-200">الْفِعْلُ</span>
          </button>
        </div>

        {answered && (
          <div
            className={`rounded-2xl p-3.5 text-xs sm:text-sm mb-3 border-2 ${
              isCorrect
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                : 'bg-rose-50 border-rose-400 text-rose-950'
            }`}
          >
            <strong>{isCorrect ? '✅ Betul! (+100 Mata)' : '❌ Salah Peti (0 Mata):'}</strong>{' '}
            {card.explanation}
          </div>
        )}

        {answered && (
          <button
            type="button"
            onClick={onNext}
            className="btn-quest w-full py-3.5 rounded-2xl bg-amber-400 text-slate-950 font-extrabold text-base cursor-pointer"
          >
            {cardIdx < 4 ? 'KAD SETERUSNYA ➔' : 'SELESAIKAN SUSUNAN ✨'}
          </button>
        )}
      </div>
    </div>
  );
};

interface WorldMapModalProps {
  open: boolean;
  unlockedStage: number;
  onClose: () => void;
  onTeleport: (x: number, z: number, name: string) => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  open,
  unlockedStage,
  onClose,
  onTeleport,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75">
      <div className="quest-panel max-w-2xl w-full rounded-3xl p-5 sm:p-7 animate-pop max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>🗺️</span> Peta Kerajaan Bahasa Arab
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 font-bold hover:bg-rose-200 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 mb-4">
          Klik pada kawasan yang telah dibuka untuk bergerak pantas atau lihat status misi setiap peringkat.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {ZONES_META.map((z) => {
            const unlocked = unlockedStage >= z.stage;
            return (
              <div
                key={z.stage}
                className={`p-4 rounded-2xl border-2 ${
                  unlocked ? 'bg-amber-50 border-amber-400' : 'bg-slate-100 border-slate-300 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                    {z.icon} {z.name}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      unlocked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {unlocked ? 'Dibuka' : '🔒 Terkunci'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">{z.desc}</p>
                {unlocked && (
                  <button
                    type="button"
                    onClick={() => onTeleport(z.coords.x, z.coords.z, z.name)}
                    className="btn-quest w-full py-2 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
                  >
                    Gerak Pantas ke Sini 🚀
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-quest w-full py-3 rounded-2xl bg-slate-800 text-white font-bold cursor-pointer"
        >
          Tutup Peta
        </button>
      </div>
    </div>
  );
};

interface BossRetryModalProps {
  bossCorrect: number | null;
  onRetry: () => void;
  onClose: () => void;
}

export const BossRetryModal: React.FC<BossRetryModalProps> = ({
  bossCorrect,
  onRetry,
  onClose,
}) => {
  if (bossCorrect === null) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75">
      <div className="quest-panel max-w-md w-full rounded-3xl p-6 text-center animate-pop">
        <div className="text-4xl mb-2">🛡️</div>
        <h3 className="text-xl font-extrabold text-slate-900 mb-1">
          Hampir Berjaya! ({bossCorrect} / 10 Betul)
        </h3>
        <p className="text-sm text-slate-600 mb-5">
          Sultan Harun memerlukan sekurang-kurangnya <strong>5/10 jawapan tepat</strong> untuk menewaskan Ujian Penjaga Ilmu. Cuba lagi!
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-quest flex-1 py-3 rounded-2xl bg-slate-200 text-slate-800 font-bold cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="btn-quest flex-1 py-3 rounded-2xl bg-rose-600 text-white font-extrabold cursor-pointer"
          >
            Cabar Semula ⚔️
          </button>
        </div>
      </div>
    </div>
  );
};

interface RestartModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const RestartModal: React.FC<RestartModalProps> = ({ open, onCancel, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75">
      <div className="quest-panel max-w-md w-full rounded-3xl p-6 text-center animate-pop">
        <div className="text-4xl mb-2">🔄</div>
        <h3 className="text-xl font-extrabold text-slate-900 mb-2">Mula Semula Kembara?</h3>
        <p className="text-sm text-slate-600 mb-5">
          Semua markah, lencana, dan kemajuan semasa akan ditetapkan semula ke permulaan.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-quest flex-1 py-3 rounded-2xl bg-slate-200 text-slate-800 font-bold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-quest flex-1 py-3 rounded-2xl bg-rose-600 text-white font-extrabold cursor-pointer"
          >
            Ya, Mula Semula
          </button>
        </div>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  open: boolean;
  score: number;
  stars: number;
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  open,
  score,
  stars,
  onRestart,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
      <div className="quest-panel max-w-xl w-full rounded-3xl p-6 sm:p-8 text-center animate-pop max-h-[94vh] overflow-y-auto">
        <div className="text-5xl sm:text-6xl mb-2">👑</div>
        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs">
          TAHNIAH! JUARA KERAJAAN ARAB
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 mt-2 mb-1">
          KEMBARA SELESAI!
        </h2>
        <div className="arabic-display text-2xl sm:text-3xl font-bold text-emerald-700 mb-4">
          أَحْسَنْتَ! أَنْتَ بَطَلُ اللُّغَةِ الْعَرَبِيَّةِ
        </div>
        <p className="text-slate-600 text-xs sm:text-sm mb-5">
          Anda telah berjaya menguasai perbezaan antara{' '}
          <strong className="text-blue-600">
            Isim (<span className="arabic-text">الِاسْمُ</span>)
          </strong>{' '}
          dan{' '}
          <strong className="text-rose-600">
            Fi‘il (<span className="arabic-text">الْفِعْلُ</span>)
          </strong>{' '}
          serta membebaskan Kerajaan Yang Hilang!
        </p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3">
            <div className="text-xs font-bold text-amber-800">JUMLAH MATA</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
              {score}
            </div>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-3">
            <div className="text-xs font-bold text-yellow-800">BINTANG HIKMAH</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 tabular-nums">
              {stars} / 12 ⭐
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="btn-quest w-full py-4 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-extrabold text-lg cursor-pointer"
        >
          MAIN SEMULA KEMBARA ⚔️
        </button>
      </div>
    </div>
  );
};
