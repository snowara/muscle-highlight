// ============================================================
// muscles.js — 19개 주요 근육 데이터 (NSCA-CSCS 기준 보강)
// 회원 눈높이 설명 + 해부학 정보 + 시각화 컬러
// ============================================================

export const MUSCLE_REGIONS = {
  // ── 가슴 (2개 분리) ──
  chestMajor: {
    label: "대흉근",
    simpleLabel: "대흉근",
    detail: "가슴의 큰 근육. 벤치프레스, 푸시업 때 주로 쓰여요.",
    color: "#FF3B5C",
    bodyPart: "상체 앞",
    englishName: "Pectoralis Major",
  },
  chestMinor: {
    label: "소흉근",
    simpleLabel: "소흉근",
    detail: "대흉근 아래 작은 근육. 어깨뼈를 아래로 당기고 안정시키는 역할이에요.",
    color: "#FF5C7C",
    bodyPart: "상체 앞",
    englishName: "Pectoralis Minor",
  },

  // ── 어깨 (3개 분리) ──
  shoulderFront: {
    label: "전면삼각근",
    simpleLabel: "어깨 전면",
    detail: "어깨 앞쪽 근육. 프론트레이즈, 숄더프레스 때 주로 쓰여요.",
    color: "#FF6B35",
    bodyPart: "상체 앞",
    englishName: "Anterior Deltoid",
  },
  shoulderLateral: {
    label: "측면삼각근",
    simpleLabel: "어깨 측면",
    detail: "어깨 옆쪽 근육. 사이드 레터럴 레이즈의 주인공이에요.",
    color: "#FF8535",
    bodyPart: "상체",
    englishName: "Lateral Deltoid",
  },
  shoulderRear: {
    label: "후면삼각근",
    simpleLabel: "어깨 후면",
    detail: "어깨 뒤쪽 근육. 리어 델트 플라이, 페이스풀 때 쓰여요.",
    color: "#FF9B55",
    bodyPart: "상체 뒤",
    englishName: "Posterior Deltoid",
  },

  // ── 팔 ──
  biceps: {
    label: "상완이두근",
    simpleLabel: "이두",
    detail: "팔 구부릴 때 볼록 올라오는 알통. 컬 운동의 주인공이에요.",
    color: "#FF8C42",
    bodyPart: "팔 앞쪽",
    englishName: "Biceps Brachii",
  },
  triceps: {
    label: "상완삼두근",
    simpleLabel: "삼두",
    detail: "팔 뒤쪽의 말발굽 모양 근육. 팔을 펼 때 쓰이고, 팔뚝 둘레의 2/3를 차지해요.",
    color: "#FFA726",
    bodyPart: "팔 뒤쪽",
    englishName: "Triceps Brachii",
  },

  // ── 등 ──
  rhomboids: {
    label: "능형근",
    simpleLabel: "능형근",
    detail: "견갑골 사이 안쪽에 위치한 근육. 어깨뼈를 모아주고 바른 자세를 유지하는 데 핵심이에요.",
    color: "#9C27B0",
    bodyPart: "등 중부",
    englishName: "Rhomboid Major / Minor",
  },
  lats: {
    label: "광배근",
    simpleLabel: "광배근",
    detail: "등에서 가장 넓은 근육. 풀업할 때 V자 등을 만들어주는 핵심이에요.",
    color: "#7C4DFF",
    bodyPart: "등",
    englishName: "Latissimus Dorsi",
  },

  // ── 승모근 (3개 분리) ──
  trapsUpper: {
    label: "상부승모근",
    simpleLabel: "상부 승모근",
    detail: "목에서 어깨까지. 슈러그할 때 주로 쓰이는 부분이에요.",
    color: "#E040FB",
    bodyPart: "등 상부",
    englishName: "Upper Trapezius",
  },
  trapsMid: {
    label: "중부승모근",
    simpleLabel: "중부 승모근",
    detail: "견갑골 사이. 로우 운동에서 어깨뼈를 모을 때 쓰여요.",
    color: "#CE40EB",
    bodyPart: "등 중부",
    englishName: "Middle Trapezius",
  },
  trapsLower: {
    label: "하부승모근",
    simpleLabel: "하부 승모근",
    detail: "등 중간 아래. 어깨뼈를 아래로 내리고 안정시키는 역할이에요.",
    color: "#BC40DB",
    bodyPart: "등 하부",
    englishName: "Lower Trapezius",
  },

  // ── 몸통 ──
  core: {
    label: "복근 / 코어",
    simpleLabel: "배 (복부)",
    detail: "식스팩이 있는 곳. 복직근뿐 아니라 옆구리(복사근), 깊은 층(복횡근)까지 포함해요.",
    color: "#00E5FF",
    bodyPart: "몸통 앞",
    englishName: "Rectus Abdominis / Obliques / Transverse Abdominis",
  },
  lowerBack: {
    label: "척추기립근",
    simpleLabel: "척추기립근",
    detail: "척추 양옆으로 길게 뻗은 근육. 몸을 세우고 허리를 보호하는 역할이에요.",
    color: "#1DE9B6",
    bodyPart: "등 하부",
    englishName: "Erector Spinae",
  },

  // ── 하체 ──
  glutes: {
    label: "둔근",
    simpleLabel: "둔근",
    detail: "몸에서 가장 크고 강한 근육. 스쿼트·힙쓰러스트 때 힘의 원천이에요.",
    color: "#69F0AE",
    bodyPart: "하체",
    englishName: "Gluteus Maximus / Medius / Minimus",
  },
  quadriceps: {
    label: "대퇴사두근",
    simpleLabel: "대퇴사두",
    detail: "허벅지 앞쪽 4개의 근육 묶음. 무릎을 펴는 동작의 주력이에요.",
    color: "#00E676",
    bodyPart: "하체 앞",
    englishName: "Quadriceps Femoris",
  },
  hamstrings: {
    label: "대퇴이두근",
    simpleLabel: "대퇴이두",
    detail: "허벅지 뒤쪽 3개 근육. 무릎을 굽히고 엉덩이를 펴는 데 쓰여요.",
    color: "#76FF03",
    bodyPart: "하체 뒤",
    englishName: "Biceps Femoris / Semitendinosus / Semimembranosus",
  },
  calves: {
    label: "비복근 / 가자미근",
    simpleLabel: "종아리",
    detail: "발뒤꿈치를 들어올리는 근육. 비복근(바깥)과 가자미근(안쪽) 두 층이에요.",
    color: "#C6FF00",
    bodyPart: "하체 하부",
    englishName: "Gastrocnemius / Soleus",
  },
  adductors: {
    label: "내전근",
    simpleLabel: "허벅지 안쪽",
    detail: "허벅지 안쪽에서 다리를 모아주는 근육군. 스쿼트·런지 시 안정성을 잡아줘요.",
    color: "#B2FF59",
    bodyPart: "하체",
    englishName: "Adductor Magnus / Longus / Brevis",
  },
  tibialis: {
    label: "전경골근",
    simpleLabel: "정강이",
    detail: "정강이 앞쪽 근육. 발을 들어올리고 걸을 때 착지 충격을 흡수해요.",
    color: "#EEFF41",
    bodyPart: "하체 하부",
    englishName: "Tibialis Anterior",
  },
};
