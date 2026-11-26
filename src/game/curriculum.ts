export type WordCategory = 'ISIM' | 'FIIL';
export type HeroId = 'boy' | 'girl';
export type CameraMode = 'TPP' | 'FPP';
export type DeviceMode = 'TELEFON' | 'TABLET' | 'LAPTOP' | 'PC';
export type ScreenPhase = 'MENU' | 'CHAR_SELECT' | 'PLAYING';
export type NpcId = 'ustaz' | 'ranger' | 'wazir' | 'king';

export interface HeroOption {
  id: HeroId;
  name: string;
  arabic: string;
  avatar: string;
  desc: string;
}

export interface Stage1Object {
  id: string;
  arabic: string;
  translit: string;
  type: WordCategory;
  icon: string;
  pos: { x: number; z: number };
  explanation: string;
}

export interface Stage2Card {
  id: string;
  arabic: string;
  translit: string;
  type: WordCategory;
  pos: { x: number; z: number };
  explanation: string;
}

export interface Stage3Sentence {
  id: string;
  arabic: string;
  highlight: string;
  translit: string;
  type: WordCategory;
  pos: { x: number; z: number };
  explanation: string;
}

export interface BossQuestion {
  arabic: string;
  translit: string;
  type: WordCategory;
  explanation: string;
}

export interface ZoneMeta {
  stage: number;
  name: string;
  icon: string;
  desc: string;
  coords: { x: number; z: number };
}

export interface InteractiveEntity {
  id: string;
  type: 'NPC' | 'STAGE1_OBJ' | 'STAGE2_CARD' | 'STAGE3_SENT';
  npcId?: NpcId;
  label: string;
  pos: { x: number; z: number };
  data?: Stage1Object | Stage2Card | Stage3Sentence;
}

export interface ActiveQuizState {
  mode: 'STAGE1' | 'STAGE3' | 'BOSS';
  item?: Stage1Object | Stage3Sentence;
  bossIdx: number;
  bossCorrect: number;
  answered: boolean;
  lastChoiceCorrect?: boolean;
}

export interface GameProgressState {
  heroId: HeroId;
  cameraMode: CameraMode;
  deviceMode: DeviceMode;
  muted: boolean;
  score: number;
  stars: number;
  unlockedStage: number;
  badges: [boolean, boolean, boolean, boolean];
  s1Answered: Record<string, boolean>;
  s1Passed: boolean;
  s2Collected: Record<string, boolean>;
  s2Sorted: Record<string, boolean>;
  s2Passed: boolean;
  s3Answered: Record<string, boolean>;
  s3Passed: boolean;
  s4Completed: boolean;
}

export const HERO_OPTIONS: HeroOption[] = [
  {
    id: 'boy',
    name: 'Lelaki (وَلَدٌ)',
    arabic: 'وَلَدٌ',
    avatar: '👦',
    desc: 'Kopiah biru, baju Melayu berbutang 5, seluar putih berlipat & sandal kulit.',
  },
  {
    id: 'girl',
    name: 'Perempuan (بِنْتٌ)',
    arabic: 'بِنْتٌ',
    avatar: '👧',
    desc: 'Tudung berlapis sopan, baju berbutang mutiara, seluar krim & sandal kulit.',
  },
];

export const STAGE1_OBJECTS: Stage1Object[] = [
  {
    id: 'obj_kitab',
    arabic: 'كِتَابٌ',
    translit: 'Kitābun — Buku',
    type: 'ISIM',
    icon: '📖',
    pos: { x: -11, z: 36 },
    explanation: 'كِتَابٌ (Buku) ialah ISIM (Kata Nama) kerana merujuk kepada nama suatu benda dan bertanwin (ـٌ).',
  },
  {
    id: 'obj_yashrabu',
    arabic: 'يَشْرَبُ',
    translit: 'Yashrabu — Dia sedang minum',
    type: 'FIIL',
    icon: '🥛',
    pos: { x: 11, z: 37 },
    explanation: 'يَشْرَبُ (Sedang minum) ialah FI‘IL (Kata Kerja) kerana menunjukkan perbuatan yang sedang berlaku.',
  },
  {
    id: 'obj_masjid',
    arabic: 'مَسْجِدٌ',
    translit: 'Masjidun — Masjid',
    type: 'ISIM',
    icon: '🕌',
    pos: { x: -13, z: 24 },
    explanation: 'مَسْجِدٌ (Masjid) ialah ISIM (Kata Nama) kerana merujuk kepada nama tempat beribadat.',
  },
  {
    id: 'obj_yaktubu',
    arabic: 'يَكْتُبُ',
    translit: 'Yaktubu — Dia sedang menulis',
    type: 'FIIL',
    icon: '✍️',
    pos: { x: 12, z: 25 },
    explanation: 'يَكْتُبُ (Sedang menulis) ialah FI‘IL (Kata Kerja) kerana menunjukkan tindakan menulis.',
  },
  {
    id: 'obj_shajarah',
    arabic: 'شَجَرَةٌ',
    translit: 'Shajaratun — Pokok',
    type: 'ISIM',
    icon: '🌳',
    pos: { x: 0, z: 20 },
    explanation: 'شَجَرَةٌ (Pokok) ialah ISIM (Kata Nama) kerana merujuk kepada tumbuhan dan berakhir dengan Ta Marbutah (ة).',
  },
];

export const STAGE2_CARDS: Stage2Card[] = [
  {
    id: 'card_qalam',
    arabic: 'قَلَمٌ',
    translit: 'Qalamun — Pen',
    type: 'ISIM',
    pos: { x: -12, z: 3 },
    explanation: 'قَلَمٌ (Pen) ialah ISIM (Kata Nama) bagi alat tulis dan menerima tanwin (ـٌ).',
  },
  {
    id: 'card_yajri',
    arabic: 'يَجْرِي',
    translit: 'Yajrī — Dia sedang berlari',
    type: 'FIIL',
    pos: { x: 12, z: 2 },
    explanation: 'يَجْرِي (Sedang berlari) ialah FI‘IL (Kata Kerja) yang menunjukkan pergerakan.',
  },
  {
    id: 'card_asad',
    arabic: 'أَسَدٌ',
    translit: 'Asadun — Singa',
    type: 'ISIM',
    pos: { x: -11, z: -11 },
    explanation: 'أَسَدٌ (Singa) ialah ISIM (Kata Nama) yang merujuk kepada nama haiwan.',
  },
  {
    id: 'card_yakulu',
    arabic: 'يَأْكُلُ',
    translit: 'Ya’kulu — Dia sedang makan',
    type: 'FIIL',
    pos: { x: 11, z: -12 },
    explanation: 'يَأْكُلُ (Sedang makan) ialah FI‘IL (Kata Kerja) kerana menunjukkan perbuatan makan.',
  },
  {
    id: 'card_zahrah',
    arabic: 'زَهْرَةٌ',
    translit: 'Zahratun — Bunga',
    type: 'ISIM',
    pos: { x: 0, z: -15 },
    explanation: 'زَهْرَةٌ (Bunga) ialah ISIM (Kata Nama) bagi tumbuhan dan mempunyai tanda tanwin.',
  },
];

export const STAGE3_SENTENCES: Stage3Sentence[] = [
  {
    id: 'sent_1',
    arabic: 'يَقْرَأُ التِّلْمِيذُ الْكِتَابَ',
    highlight: 'يَقْرَأُ',
    translit: 'Murid itu sedang membaca buku · Perkataan diuji: يَقْرَأُ (Membaca)',
    type: 'FIIL',
    pos: { x: -10, z: -34 },
    explanation: 'يَقْرَأُ (Sedang membaca) ialah FI‘IL Mudhari‘ kerana menunjukkan perbuatan membaca.',
  },
  {
    id: 'sent_2',
    arabic: 'الطَّالِبُ مُجْتَهِدٌ فِي الصَّفِّ',
    highlight: 'الطَّالِبُ',
    translit: 'Pelajar itu rajin di dalam kelas · Perkataan diuji: الطَّالِبُ (Pelajar)',
    type: 'ISIM',
    pos: { x: 10, z: -34 },
    explanation: 'الطَّالِبُ (Pelajar) ialah ISIM kerana merujuk kepada manusia dan bermula dengan Alif Lam (ال).',
  },
  {
    id: 'sent_3',
    arabic: 'تَذْهَبُ فَاطِمَةُ إِلَى الْمَدْرَسَةِ',
    highlight: 'تَذْهَبُ',
    translit: 'Fatimah pergi ke sekolah · Perkataan diuji: تَذْهَبُ (Pergi)',
    type: 'FIIL',
    pos: { x: -11, z: -47 },
    explanation: 'تَذْهَبُ (Sedang pergi) ialah FI‘IL kerana menunjukkan perbuatan bergerak ke sekolah.',
  },
  {
    id: 'sent_4',
    arabic: 'الْحَدِيقَةُ جَمِيلَةٌ وَوَاسِعَةٌ',
    highlight: 'الْحَدِيقَةُ',
    translit: 'Taman itu cantik dan luas · Perkataan diuji: الْحَدِيقَةُ (Taman)',
    type: 'ISIM',
    pos: { x: 11, z: -47 },
    explanation: 'الْحَدِيقَةُ (Taman) ialah ISIM kerana merujuk kepada tempat serta memiliki (ال) dan (ة).',
  },
  {
    id: 'sent_5',
    arabic: 'يَلْعَبُ الْوَلَدُ بِالْكُرَةِ',
    highlight: 'يَلْعَبُ',
    translit: 'Budak lelaki itu bermain bola · Perkataan diuji: يَلْعَبُ (Bermain)',
    type: 'FIIL',
    pos: { x: 0, z: -53 },
    explanation: 'يَلْعَبُ (Sedang bermain) ialah FI‘IL kerana menunjukkan aksi permainan.',
  },
];

export const STAGE4_BOSS_QUESTIONS: BossQuestion[] = [
  { arabic: 'مُعَلِّمٌ', translit: 'Mu‘allimun — Guru', type: 'ISIM', explanation: 'مُعَلِّمٌ (Guru) ialah ISIM kerana merujuk kepada pekerjaan/manusia.' },
  { arabic: 'يَجْلِسُ', translit: 'Yajlisu — Dia sedang duduk', type: 'FIIL', explanation: 'يَجْلِسُ (Duduk) ialah FI‘IL kerana menunjukkan perbuatan duduk.' },
  { arabic: 'الْبَيْتُ', translit: 'Al-Baytu — Rumah itu', type: 'ISIM', explanation: 'الْبَيْتُ (Rumah) ialah ISIM kerana nama tempat dan bermula dengan Alif Lam (ال).' },
  { arabic: 'فَتَحَ', translit: 'Fataḥa — Dia telah membuka', type: 'FIIL', explanation: 'فَتَحَ (Telah membuka) ialah FI‘IL Madhi (kata kerja lampau).' },
  { arabic: 'سَيَّارَةٌ', translit: 'Sayyāratun — Kereta', type: 'ISIM', explanation: 'سَيَّارَةٌ (Kereta) ialah ISIM bagi kenderaan.' },
  { arabic: 'يَسْمَعُ', translit: 'Yasma‘u — Dia sedang mendengar', type: 'FIIL', explanation: 'يَسْمَعُ (Mendengar) ialah FI‘IL kerana perbuatan mendengar.' },
  { arabic: 'قِطٌّ', translit: 'Qiṭṭun — Kucing', type: 'ISIM', explanation: 'قِطٌّ (Kucing) ialah ISIM bagi haiwan.' },
  { arabic: 'نَامَ', translit: 'Nāma — Dia telah tidur', type: 'FIIL', explanation: 'نَامَ (Telah tidur) ialah FI‘IL kerana menunjukkan perbuatan tidur.' },
  { arabic: 'الْمَاءُ', translit: 'Al-Mā’u — Air itu', type: 'ISIM', explanation: 'الْمَاءُ (Air) ialah ISIM kerana kata nama benda dan bermula dengan (ال).' },
  { arabic: 'يَرْسُمُ', translit: 'Yarsumu — Dia sedang melukis', type: 'FIIL', explanation: 'يَرْسُمُ (Melukis) ialah FI‘IL kerana menunjukkan perbuatan melukis.' },
];

export const ZONES_META: ZoneMeta[] = [
  { stage: 1, name: '1. Kampung Permulaan', icon: '🏡', desc: '5 Objek Asas Isim & Fi‘il', coords: { x: 0, z: 40 } },
  { stage: 2, name: '2. Hutan Ajaib', icon: '🌲', desc: '5 Kad Hikmah & Peti Penyusun', coords: { x: 0, z: 12 } },
  { stage: 3, name: '3. Istana Misteri', icon: '🏰', desc: '5 Teka-Teki Detektif Ayat', coords: { x: 0, z: -26 } },
  { stage: 4, name: '4. Singgahsana Raja', icon: '👑', desc: 'Pertarungan Akhir 10 Soalan', coords: { x: 0, z: -66 } },
];

export const NPC_LOCATIONS: Record<NpcId, { x: number; z: number; label: string }> = {
  ustaz: { x: -3.8, z: 38.5, label: 'Berbual dengan Ustaz Hakim' },
  ranger: { x: -3.8, z: 11.5, label: 'Berbual dengan Penjaga Safiyyah' },
  wazir: { x: -3.8, z: -26.5, label: 'Berbual dengan Wazir Faris' },
  king: { x: 0, z: -79, label: 'Cabar Sultan Harun (Penjaga Ilmu)' },
};

export function createInitialGameProgress(
  heroId: HeroId = 'boy',
  cameraMode: CameraMode = 'TPP',
  deviceMode: DeviceMode = 'PC',
  muted = false
): GameProgressState {
  return {
    heroId,
    cameraMode,
    deviceMode,
    muted,
    score: 0,
    stars: 0,
    unlockedStage: 1,
    badges: [false, false, false, false],
    s1Answered: {},
    s1Passed: false,
    s2Collected: {},
    s2Sorted: {},
    s2Passed: false,
    s3Answered: {},
    s3Passed: false,
    s4Completed: false,
  };
}
