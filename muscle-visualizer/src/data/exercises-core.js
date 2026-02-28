// ============================================================
// exercises-core.js — 코어 + 전신 운동 데이터
// ============================================================

export const CORE_CATEGORIES = {
  core:     { label: "코어",   icon: "🧘" },
  fullBody: { label: "전신",   icon: "🏋️" },
};

export const CORE_EXERCISES = {

  // ================================================================
  // 코어 (core)
  // ================================================================

  plank: {
    name: "플랭크",
    koreanName: "프론트 플랭크",
    variant: "기본 프론트 플랭크 (팔꿈치 지지)",
    icon: "🧘",
    category: "core",
    equipment: "맨몸",
    difficulty: 1,
    description: "코어 안정성의 기본. 복근·어깨·둔근을 동시에 등척성으로 훈련.",
    snsTags: ["#플랭크", "#코어운동", "#복근", "#plank", "#코어강화"],
    isIsometric: true,
    primary: { core: 85 },
    secondary: { shoulders: 30, glutes: 35, quadriceps: 15 },
    trainerTip: "머리부터 발뒤꿈치까지 일직선! 엉덩이가 올라가거나 처지지 않게 거울로 확인!",
    goodFormMessage: "완벽한 플랭크 자세! 머리부터 발끝까지 일직선이에요. 코어가 단단하게 잡혔어요!",
    corrections: [
      {
        issue: "엉덩이 올라감 (Hips Piking Up)",
        bodyPart: "고관절 / 엉덩이",
        message: "엉덩이가 위로 솟아 있어요! 배꼽을 당기고 몸을 일직선으로 만드세요.",
      },
      {
        issue: "허리 처짐 (Hips Sagging)",
        bodyPart: "요추 / 골반",
        message: "허리가 아래로 처지고 있어요! 둔근과 복근에 힘을 줘서 골반을 들어올리세요.",
      },
      {
        issue: "목 과신전 (Head Looking Up)",
        bodyPart: "경추 / 목",
        message: "고개를 너무 들고 있어요. 바닥을 보며 목을 척추와 일직선으로 유지하세요.",
      },
    ],
  },

  crunch: {
    name: "크런치",
    koreanName: "크런치",
    variant: "바닥 크런치",
    icon: "🧘",
    category: "core",
    equipment: "맨몸",
    difficulty: 1,
    description: "복직근 상부를 자극하는 기본 복근 운동.",
    snsTags: ["#크런치", "#복근운동"],
    isIsometric: false,
    primary: { core: 78 },
    secondary: {},
    trainerTip: "허리를 바닥에 붙인 채로! 어깨만 들어올리고, 목은 당기지 마세요.",
    goodFormMessage: "크런치 자세 좋아요! 복직근에 집중되고 있어요!",
    corrections: [
      { issue: "목 당김", bodyPart: "경추", message: "손으로 머리를 당기지 마세요! 시선을 천장에 고정하고 배로 일어나세요." },
    ],
  },

  legRaise: {
    name: "레그 레이즈",
    koreanName: "라잉 레그 레이즈",
    variant: "바닥 레그 레이즈",
    icon: "🧘",
    category: "core",
    equipment: "맨몸",
    difficulty: 2,
    description: "하복부를 집중 자극. 다리를 올리고 내리며 코어 제어.",
    snsTags: ["#레그레이즈", "#하복부"],
    isIsometric: false,
    primary: { core: 82 },
    secondary: { quadriceps: 20 },
    trainerTip: "허리를 바닥에 밀착! 다리를 내릴 때 허리가 뜨면 범위를 줄이세요.",
    goodFormMessage: "하복부에 잘 집중되고 있어요! 허리 밀착이 좋아요!",
    corrections: [
      { issue: "허리 뜸", bodyPart: "요추", message: "다리를 내릴 때 허리가 바닥에서 뜨고 있어요! 범위를 줄이세요." },
    ],
  },

  russianTwist: {
    name: "러시안 트위스트",
    koreanName: "러시안 트위스트",
    variant: "시티드 러시안 트위스트",
    icon: "🧘",
    category: "core",
    equipment: "맨몸",
    difficulty: 2,
    description: "복사근(옆구리)을 자극하는 회전 코어 운동.",
    snsTags: ["#러시안트위스트", "#복사근"],
    isIsometric: false,
    primary: { core: 80 },
    secondary: { shoulders: 15 },
    trainerTip: "발을 살짝 들고, 배꼽 아래가 정면을 유지한 채 상체만 회전!",
    goodFormMessage: "복사근이 불타고 있어요! 회전 동작이 안정적!",
    corrections: [
      { issue: "하체 회전", bodyPart: "골반 / 하체", message: "하체가 같이 돌아가고 있어요. 골반은 고정하고 상체만 돌리세요." },
    ],
  },

  abWheelRollout: {
    name: "AB 휠 롤아웃",
    koreanName: "AB 휠 롤아웃",
    variant: "무릎 AB 휠 롤아웃",
    icon: "🧘",
    category: "core",
    equipment: "기구",
    difficulty: 4,
    description: "코어 전체와 광배근까지 동원하는 고강도 코어 운동.",
    snsTags: ["#AB휠", "#코어운동"],
    isIsometric: false,
    primary: { core: 92, lats: 35 },
    secondary: { shoulders: 30, triceps: 20 },
    trainerTip: "골반을 후방 틸트한 채로 밀어 나가세요. 허리가 꺾이면 즉시 멈추세요!",
    goodFormMessage: "AB 휠 폼이 안정적이에요! 코어 컨트롤이 대단해요!",
    corrections: [
      { issue: "허리 과신전", bodyPart: "요추", message: "허리가 꺾이고 있어요! 복근에 힘을 주고 골반을 말아 넣으세요." },
    ],
  },

  // ================================================================
  // 전신 (fullBody)
  // ================================================================

  deadlift: {
    name: "데드리프트",
    koreanName: "컨벤셔널 데드리프트",
    variant: "컨벤셔널 (어깨너비 스탠스)",
    icon: "🏋️",
    category: "fullBody",
    equipment: "바벨",
    difficulty: 5,
    description: "후면 사슬 전체를 동원하는 최강 복합운동. 등·둔근·햄스트링 총동원.",
    snsTags: ["#데드리프트", "#등운동", "#전신운동", "#deadlift", "#파워리프팅"],
    isIsometric: false,
    primary: { hamstrings: 80, glutes: 85, lowerBack: 75 },
    secondary: { quadriceps: 40, core: 65, traps: 55, forearms: 50 },
    trainerTip: "바벨은 항상 정강이에 붙여서! 가슴을 펴고 엉덩이와 어깨를 동시에 올리세요.",
    goodFormMessage: "훌륭한 데드리프트! 등이 곧고 바가 몸에 딱 붙어 있어요. 힘 전달 최고!",
    corrections: [
      {
        issue: "등 굴곡 (Rounded Back)",
        bodyPart: "흉추 / 요추",
        message: "등이 둥글어지고 있어요! 가슴을 펴고 바를 몸에 붙여서 끌어올리세요.",
      },
      {
        issue: "바 이탈 (Bar Drifting Away)",
        bodyPart: "팔 / 상체",
        message: "바가 몸에서 떨어져 있어요. 정강이를 스치듯이 당기세요.",
      },
      {
        issue: "요추 과신전 (Lumbar Hyperextension at Lockout)",
        bodyPart: "요추",
        message: "탑에서 허리를 과도하게 젖히지 마세요. 둔근을 쥐어짜며 직립하면 충분해요.",
      },
      {
        issue: "엉덩이 급상승 (Hips Rising Too Fast)",
        bodyPart: "고관절",
        message: "엉덩이가 먼저 올라가고 있어요! 가슴과 엉덩이를 동시에 들어올리세요.",
      },
    ],
  },

  romanianDeadlift: {
    name: "루마니안 데드리프트",
    koreanName: "루마니안 데드리프트",
    variant: "바벨 루마니안 데드리프트 (RDL)",
    icon: "🏋️",
    category: "fullBody",
    equipment: "바벨",
    difficulty: 3,
    description: "햄스트링·둔근 스트레치와 수축을 극대화하는 힌지 운동.",
    snsTags: ["#루마니안데드리프트", "#RDL", "#햄스트링", "#둔근", "#힌지운동"],
    isIsometric: false,
    primary: { hamstrings: 88, glutes: 78, lowerBack: 60 },
    secondary: { core: 45, traps: 25 },
    trainerTip: "무릎은 살짝 굽힌 채 고정! 엉덩이를 뒤로 빼면서 바를 허벅지에 밀착시켜 내리세요.",
    goodFormMessage: "RDL 폼이 교과서적이에요! 힌지 동작과 바 경로가 완벽해요!",
    corrections: [
      {
        issue: "무릎 과굴곡 (Too Much Knee Bend)",
        bodyPart: "무릎",
        message: "무릎이 너무 구부러지고 있어요. RDL은 힌지 운동! 무릎을 살짝만 구부리세요.",
      },
      {
        issue: "등 굴곡 (Rounding Back)",
        bodyPart: "흉추 / 요추",
        message: "등이 둥글어지고 있어요! 가슴을 펴고, 바를 몸에 붙인 상태로 내리세요.",
      },
      {
        issue: "바 이탈 (Bar Away from Body)",
        bodyPart: "팔 / 상체",
        message: "바가 다리에서 멀어지고 있어요. 허벅지를 따라 미끄러지듯 내리세요.",
      },
    ],
  },

  cleanAndPress: {
    name: "클린 앤 프레스",
    koreanName: "바벨 클린 앤 프레스",
    variant: "바벨 파워 클린 앤 프레스",
    icon: "🏋️",
    category: "fullBody",
    equipment: "바벨",
    difficulty: 5,
    description: "전신 파워 운동. 폭발적 고관절 신전 → 오버헤드 프레스.",
    snsTags: ["#클린앤프레스", "#전신운동", "#올림픽리프팅"],
    isIsometric: false,
    primary: { shoulders: 75, quadriceps: 70, glutes: 70 },
    secondary: { core: 55, traps: 50, triceps: 40, hamstrings: 45 },
    trainerTip: "클린은 팔이 아닌 고관절 폭발로! 프레스는 안정된 상태에서 밀어 올리세요.",
    goodFormMessage: "클린 앤 프레스가 유기적으로 연결되고 있어요! 파워풀!",
    corrections: [
      { issue: "팔로 클린", bodyPart: "팔 / 고관절", message: "바를 팔로 끌어올리고 있어요. 고관절 폭발로 올리세요!" },
    ],
  },

  kettlebellSwing: {
    name: "케틀벨 스윙",
    koreanName: "러시안 케틀벨 스윙",
    variant: "러시안 케틀벨 스윙 (눈높이까지)",
    icon: "🏋️",
    category: "fullBody",
    equipment: "케틀벨",
    difficulty: 2,
    description: "후면 사슬 폭발력 훈련. 유산소와 근력을 동시에.",
    snsTags: ["#케틀벨스윙", "#전신운동", "#HIIT"],
    isIsometric: false,
    primary: { glutes: 82, hamstrings: 70, core: 55 },
    secondary: { shoulders: 25, lats: 20, quadriceps: 20 },
    trainerTip: "스윙은 팔이 아닌 엉덩이 힌지! 둔근을 쥐어짜며 골반을 앞으로 밀어요.",
    goodFormMessage: "힌지 동작이 깔끔해요! 둔근이 제대로 쓰이고 있어요!",
    corrections: [
      { issue: "스쿼트 동작", bodyPart: "무릎 / 고관절", message: "스쿼트처럼 하고 있어요! 무릎이 아닌 엉덩이를 뒤로 빼는 힌지예요." },
    ],
  },

  burpee: {
    name: "버피",
    koreanName: "버피",
    variant: "풀 버피 (점프 포함)",
    icon: "🏋️",
    category: "fullBody",
    equipment: "맨몸",
    difficulty: 3,
    description: "전신 심폐·근력 복합 운동. 지방 연소 최강.",
    snsTags: ["#버피", "#전신운동", "#HIIT"],
    isIsometric: false,
    primary: { quadriceps: 60, chest: 55, core: 60 },
    secondary: { shoulders: 40, triceps: 35, glutes: 40 },
    trainerTip: "바닥에서 가슴까지 닿은 후 폭발적으로 일어나세요. 점프는 가볍게!",
    goodFormMessage: "버피 템포가 좋아요! 전신이 유기적으로 움직이고 있어요!",
    corrections: [
      { issue: "허리 처짐", bodyPart: "요추 / 코어", message: "바닥 자세에서 허리가 처지고 있어요. 코어를 단단히!" },
    ],
  },
};
