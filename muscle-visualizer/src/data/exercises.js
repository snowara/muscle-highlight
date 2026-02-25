// ============================================================
// exercises.js — 18종 핵심 + 보조 운동 데이터 (NSCA-CSCS 20년 경력 기준)
//
// 각 운동 데이터 구조:
//   name            : 표시명 (한국어)
//   koreanName      : 한국 헬스장에서 부르는 이름
//   variant         : 세부 변형 명칭
//   icon            : 카테고리 아이콘
//   category        : 분류 키
//   equipment       : 장비
//   difficulty      : 난이도 (1~5)
//   description     : 한줄설명
//   snsTags         : SNS 해시태그
//   isIsometric     : 등척성 운동 여부
//   primary         : 주동근 { muscle: activation(0~100) }
//   secondary       : 보조근 { muscle: activation(0~100) }
//   trainerTip      : 트레이너 코멘트
//   goodFormMessage  : 올바른 자세 격려 메시지
//   corrections     : 자세 교정 메시지 배열
//     - issue       : 잘못된 자세 설명
//     - bodyPart    : 관련 신체 부위 / 관절
//     - message     : 교정 안내 메시지
// ============================================================

export const CATEGORIES = {
  chest:     { label: "가슴",   icon: "🔥" },
  back:      { label: "등",     icon: "🔱" },
  shoulders: { label: "어깨",   icon: "⚡" },
  arms:      { label: "팔",     icon: "💪" },
  legs:      { label: "하체",   icon: "🦵" },
  core:      { label: "코어",   icon: "🧘" },
  fullBody:  { label: "전신",   icon: "🏋️" },
};

export const EXERCISE_DB = {

  // ================================================================
  // 1. 스쿼트 — 백스쿼트 패러렐
  // ================================================================
  squat: {
    name: "스쿼트",
    koreanName: "백스쿼트",
    variant: "백스쿼트 패러렐 (하이바 / 로우바)",
    icon: "🏋️",
    category: "legs",
    equipment: "바벨",
    difficulty: 4,
    description: "하체 근력의 왕. 대퇴사두·둔근·코어를 동시에 단련하는 복합운동.",
    snsTags: ["#스쿼트", "#백스쿼트", "#하체운동", "#레그데이", "#squat"],
    isIsometric: false,
    primary: { quadriceps: 85, glutes: 80 },
    secondary: { hamstrings: 45, calves: 20, core: 60, lowerBack: 40 },
    trainerTip: "무릎보다 엉덩이를 먼저 빼세요. 발바닥 전체로 바닥을 밀어내는 느낌!",
    goodFormMessage: "완벽한 스쿼트 폼! 깊이와 척추 중립이 잘 유지되고 있어요. 이대로 쭉!",
    corrections: [
      {
        issue: "무릎 내측 붕괴 (Knee Valgus)",
        bodyPart: "무릎",
        message: "무릎이 안으로 모이고 있어요! 발끝 방향으로 밀어내세요.",
      },
      {
        issue: "과도한 전방 경사 (Excessive Forward Lean)",
        bodyPart: "상체 / 몸통",
        message: "상체가 너무 앞으로 숙여졌어요. 가슴을 펴고 시선을 정면으로!",
      },
      {
        issue: "깊이 부족 (Insufficient Depth)",
        bodyPart: "고관절 / 대퇴부",
        message: "더 깊이 앉아주세요. 대퇴부가 바닥과 평행할 때까지!",
      },
      {
        issue: "허리 굴곡 (Lumbar Flexion / Butt Wink)",
        bodyPart: "요추 / 골반",
        message: "허리가 둥글어지고 있어요! 코어에 힘을 주고 중립 척추를 유지하세요.",
      },
    ],
  },

  // ================================================================
  // 2. 데드리프트 — 컨벤셔널
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

  // ================================================================
  // 3. 벤치프레스 — 플랫 미디엄그립
  // ================================================================
  benchPress: {
    name: "벤치프레스",
    koreanName: "플랫 벤치프레스",
    variant: "플랫 바벨 미디엄그립 (어깨너비 1.5배)",
    icon: "🔥",
    category: "chest",
    equipment: "바벨",
    difficulty: 3,
    description: "가슴 근력의 기본. 대흉근·삼두·전면 삼각근을 동시에 자극.",
    snsTags: ["#벤치프레스", "#가슴운동", "#대흉근", "#benchpress", "#체스트데이"],
    isIsometric: false,
    primary: { chest: 90, triceps: 60 },
    secondary: { shoulders: 45, core: 25 },
    trainerTip: "견갑골을 모아 등에 '선반'을 만들어요. 바는 유두 라인으로 내리고, 발은 바닥을 밀어요!",
    goodFormMessage: "교과서적 벤치프레스! 견갑골 고정, 바 경로, 팔꿈치 각도 모두 퍼펙트!",
    corrections: [
      {
        issue: "팔꿈치 과도 외전 (Elbow Flaring)",
        bodyPart: "팔꿈치 / 어깨",
        message: "팔꿈치가 너무 벌어졌어요. 몸통과 45도 각도로 유지하세요.",
      },
      {
        issue: "바 위치 이탈 (Bar Too High)",
        bodyPart: "손목 / 바 궤도",
        message: "바가 너무 위로 가고 있어요. 가슴 하단(유두 라인)으로 내리세요.",
      },
      {
        issue: "견갑골 미고정 (Scapula Not Retracted)",
        bodyPart: "견갑골 / 등 상부",
        message: "견갑골을 모아주세요. 자연스러운 등 아치가 어깨를 보호해요.",
      },
      {
        issue: "엉덩이 들림 (Hips Lifting Off Bench)",
        bodyPart: "골반 / 허리",
        message: "엉덩이가 벤치에서 뜨고 있어요! 발로 바닥을 밀되, 둔근은 벤치에 붙이세요.",
      },
    ],
  },

  // ================================================================
  // 4. 숄더프레스 — 시티드 덤벨
  // ================================================================
  shoulderPress: {
    name: "숄더프레스",
    koreanName: "시티드 덤벨 숄더프레스",
    variant: "시티드 덤벨 (80~85도 벤치)",
    icon: "⚡",
    category: "shoulders",
    equipment: "덤벨",
    difficulty: 3,
    description: "어깨 전체 볼륨을 키우는 핵심. 전면·측면 삼각근 집중 자극.",
    snsTags: ["#숄더프레스", "#어깨운동", "#삼각근", "#shoulderpress", "#어깨데이"],
    isIsometric: false,
    primary: { shoulders: 88, triceps: 50 },
    secondary: { traps: 35, core: 30 },
    trainerTip: "덤벨을 귀 옆에서 시작해 머리 위로 살짝 모으며 올려요. 팔꿈치가 손목 바로 아래!",
    goodFormMessage: "깔끔한 숄더프레스! 팔꿈치 정렬이 좋고 코어도 잘 잡혀 있어요!",
    corrections: [
      {
        issue: "허리 과신전 (Excessive Arch)",
        bodyPart: "요추",
        message: "허리가 과도하게 젖혀지고 있어요! 복근에 힘을 주고 등받이에 붙이세요.",
      },
      {
        issue: "팔꿈치 전방 이동 (Elbows Drifting Forward)",
        bodyPart: "팔꿈치",
        message: "팔꿈치가 앞으로 나가고 있어요. 옆으로 벌린 상태에서 수직으로 밀어올리세요.",
      },
      {
        issue: "승모근 과사용 (Shrugging Up)",
        bodyPart: "승모근 / 어깨",
        message: "어깨가 귀까지 올라가고 있어요! 승모근은 내리고, 삼각근으로만 밀어올리세요.",
      },
    ],
  },

  // ================================================================
  // 5. 바이셉 컬 — 스탠딩 덤벨
  // ================================================================
  bicepCurl: {
    name: "바이셉 컬",
    koreanName: "스탠딩 덤벨 컬",
    variant: "스탠딩 덤벨 얼터네이트 / 동시",
    icon: "💪",
    category: "arms",
    equipment: "덤벨",
    difficulty: 1,
    description: "이두근 고립 운동의 정석. 알통 만들기의 기본.",
    snsTags: ["#바이셉컬", "#이두운동", "#팔운동", "#bicepcurl", "#덤벨컬"],
    isIsometric: false,
    primary: { biceps: 92 },
    secondary: { forearms: 35 },
    trainerTip: "팔꿈치를 옆구리에 고정! 반동 쓰지 말고 이두근만으로 조여 올리세요.",
    goodFormMessage: "이두근에 정확히 집중되고 있어요! 팔꿈치 고정 완벽, 반동 제로!",
    corrections: [
      {
        issue: "반동 사용 (Swinging / Momentum)",
        bodyPart: "몸통 / 허리",
        message: "몸을 흔들어 올리고 있어요! 상체를 고정하고 이두근만으로 컬하세요.",
      },
      {
        issue: "팔꿈치 이탈 (Elbow Drifting)",
        bodyPart: "팔꿈치",
        message: "팔꿈치가 앞뒤로 움직이고 있어요. 옆구리에 고정하고 전완만 움직이세요.",
      },
      {
        issue: "손목 꺾임 (Wrist Curling)",
        bodyPart: "손목",
        message: "손목이 뒤로 꺾이고 있어요. 손목을 중립으로 유지하세요.",
      },
    ],
  },

  // ================================================================
  // 6. 랫풀다운 — 와이드그립
  // ================================================================
  latPulldown: {
    name: "랫풀다운",
    koreanName: "와이드그립 랫풀다운",
    variant: "와이드그립 (어깨너비 1.5배) 앞으로 당기기",
    icon: "🔱",
    category: "back",
    equipment: "케이블",
    difficulty: 2,
    description: "광배근을 넓히는 기본 등 운동. 풀업의 머신 버전.",
    snsTags: ["#랫풀다운", "#등운동", "#광배근", "#latpulldown", "#등데이"],
    isIsometric: false,
    primary: { lats: 85, biceps: 50 },
    secondary: { traps: 30, shoulders: 20, forearms: 25 },
    trainerTip: "바를 쇄골 쪽으로 당기면서 가슴을 활짝 펴세요. 팔꿈치를 뒤로 모으는 느낌!",
    goodFormMessage: "광배근이 확실히 수축되고 있어요! 당기는 궤도와 상체 각도 모두 좋아요!",
    corrections: [
      {
        issue: "뒤로 과도하게 젖힘 (Excessive Leaning Back)",
        bodyPart: "몸통 / 요추",
        message: "상체를 너무 뒤로 젖히고 있어요. 약간만 뒤로 기울이고 광배근으로 당기세요.",
      },
      {
        issue: "팔로만 당김 (Pulling with Arms)",
        bodyPart: "팔 / 이두근",
        message: "팔로만 당기고 있어요! 팔꿈치를 갈비뼈 옆으로 모은다는 느낌으로 등을 쓰세요.",
      },
      {
        issue: "바를 목 뒤로 당김 (Behind-Neck Pull)",
        bodyPart: "어깨 / 경추",
        message: "바를 목 뒤가 아닌 쇄골(가슴 상단) 쪽으로 당기세요. 어깨 부상 위험!",
      },
    ],
  },

  // ================================================================
  // 7. 런지 — 스테이셔너리
  // ================================================================
  lunge: {
    name: "런지",
    koreanName: "스테이셔너리 런지",
    variant: "제자리 런지 (앞뒤 고정 스탠스)",
    icon: "🦵",
    category: "legs",
    equipment: "덤벨",
    difficulty: 2,
    description: "한쪽 다리씩 훈련하는 하체 운동. 균형감각과 둔근 활성화에 탁월.",
    snsTags: ["#런지", "#하체운동", "#힙업", "#lunge", "#레그데이"],
    isIsometric: false,
    primary: { quadriceps: 78, glutes: 75 },
    secondary: { hamstrings: 40, calves: 15, core: 35 },
    trainerTip: "앞 무릎이 발끝을 넘지 않게! 뒷다리 무릎이 바닥에 거의 닿을 때까지 내려가세요.",
    goodFormMessage: "안정적인 런지! 무릎 정렬과 깊이가 딱 좋아요. 균형감도 훌륭!",
    corrections: [
      {
        issue: "무릎 내측 붕괴 (Knee Valgus)",
        bodyPart: "앞 무릎",
        message: "앞 무릎이 안쪽으로 들어가고 있어요! 발끝 방향과 일치시키세요.",
      },
      {
        issue: "상체 앞쏠림 (Forward Lean)",
        bodyPart: "몸통",
        message: "상체가 앞으로 기울고 있어요. 몸통을 세우고 코어에 힘을 주세요.",
      },
      {
        issue: "보폭 부족 (Stride Too Short)",
        bodyPart: "고관절 / 스탠스",
        message: "보폭이 너무 좁아요. 앞 허벅지가 수평이 될 만큼 충분히 벌려주세요.",
      },
    ],
  },

  // ================================================================
  // 8. 플랭크 — 기본 프론트
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

  // ================================================================
  // 9. 레그프레스 — 45도
  // ================================================================
  legPress: {
    name: "레그프레스",
    koreanName: "45도 레그프레스",
    variant: "45도 앵글 레그프레스 머신",
    icon: "🦿",
    category: "legs",
    equipment: "머신",
    difficulty: 2,
    description: "스쿼트 대안. 허리 부담 없이 대퇴사두·둔근을 안전하게 고중량 훈련.",
    snsTags: ["#레그프레스", "#하체운동", "#허벅지", "#legpress", "#레그데이"],
    isIsometric: false,
    primary: { quadriceps: 82, glutes: 60 },
    secondary: { hamstrings: 30, calves: 15 },
    trainerTip: "발을 플랫폼 중앙~상단에 어깨너비로! 무릎이 가슴 쪽에 올 때까지 내리고, 무릎을 완전히 잠그지 마세요.",
    goodFormMessage: "레그프레스 폼 좋아요! 발 위치와 가동 범위가 적절해요!",
    corrections: [
      {
        issue: "무릎 잠금 (Locking Knees at Top)",
        bodyPart: "무릎",
        message: "무릎을 끝까지 펴서 잠그지 마세요! 살짝 구부린 상태에서 멈추세요.",
      },
      {
        issue: "엉덩이 들림 (Butt Lifting Off Seat)",
        bodyPart: "골반 / 허리",
        message: "엉덩이가 시트에서 뜨고 있어요. 허리 부상 위험! 내리는 범위를 조절하세요.",
      },
      {
        issue: "무릎 내측 붕괴 (Knee Valgus)",
        bodyPart: "무릎",
        message: "무릎이 안으로 모이고 있어요! 발끝과 같은 방향으로 밀어내세요.",
      },
    ],
  },

  // ================================================================
  // 10. 케이블 플라이 — 미드 (중앙)
  // ================================================================
  cableFly: {
    name: "케이블 플라이",
    koreanName: "미드 케이블 플라이",
    variant: "케이블 크로스오버 미드(중앙) 높이",
    icon: "🦅",
    category: "chest",
    equipment: "케이블",
    difficulty: 2,
    description: "가슴 안쪽 라인을 잡아주는 고립 운동. 수축 시 최대 자극.",
    snsTags: ["#케이블플라이", "#가슴운동", "#가슴안쪽", "#cablefly", "#체스트"],
    isIsometric: false,
    primary: { chest: 82 },
    secondary: { shoulders: 25, biceps: 15 },
    trainerTip: "팔꿈치를 살짝 구부린 채 유지하고, 양손이 만날 때 1초 쥐어짜세요!",
    goodFormMessage: "가슴 수축이 확실해요! 케이블 궤도와 팔꿈치 각도가 안정적이에요!",
    corrections: [
      {
        issue: "팔꿈치 과굴곡 (Bending Elbows Too Much)",
        bodyPart: "팔꿈치",
        message: "팔꿈치가 너무 구부러졌어요. 살짝 굽힌 상태를 고정하고 어깨에서 움직이세요.",
      },
      {
        issue: "상체 과도한 전경 (Leaning Forward)",
        bodyPart: "몸통",
        message: "상체를 너무 앞으로 숙이고 있어요. 몸통을 세우고 가슴으로 모으세요.",
      },
      {
        issue: "어깨 전방 회전 (Shoulders Rolling Forward)",
        bodyPart: "어깨 / 견갑골",
        message: "어깨가 앞으로 말리고 있어요! 견갑골을 뒤로 모은 상태에서 진행하세요.",
      },
    ],
  },

  // ================================================================
  // 11. 사이드 레터럴 레이즈
  // ================================================================
  lateralRaise: {
    name: "사이드 레터럴 레이즈",
    koreanName: "사이드 레터럴 레이즈",
    variant: "스탠딩 덤벨 사이드 레터럴 레이즈",
    icon: "🪽",
    category: "shoulders",
    equipment: "덤벨",
    difficulty: 2,
    description: "측면 삼각근 고립. 어깨 넓이를 만드는 핵심 운동.",
    snsTags: ["#사이드레터럴레이즈", "#어깨운동", "#측면삼각근", "#lateralraise", "#어깨볼륨"],
    isIsometric: false,
    primary: { shoulders: 90 },
    secondary: { traps: 30 },
    trainerTip: "새끼손가락이 위를 향하게 살짝 틀어 올려요. 어깨 높이까지만, 그 이상은 승모근!",
    goodFormMessage: "측면 삼각근에 정확히 타겟팅되고 있어요! 높이와 속도 조절이 좋아요!",
    corrections: [
      {
        issue: "반동 사용 (Swinging)",
        bodyPart: "몸통 / 허리",
        message: "몸을 흔들어 올리고 있어요! 무게를 낮추고 삼각근만으로 천천히 올리세요.",
      },
      {
        issue: "승모근 개입 (Shrugging)",
        bodyPart: "승모근 / 어깨",
        message: "어깨를 으쓱하고 있어요! 어깨를 내리고, 어깨 높이 이상 올리지 마세요.",
      },
      {
        issue: "팔꿈치 아래로 처짐 (Elbows Dropping)",
        bodyPart: "팔꿈치",
        message: "팔꿈치가 손목보다 아래에 있어요. 팔꿈치를 살짝 높게 유지하세요.",
      },
    ],
  },

  // ================================================================
  // 12. 레그 컬 — 라잉
  // ================================================================
  legCurl: {
    name: "레그 컬",
    koreanName: "라잉 레그 컬",
    variant: "라잉 레그 컬 머신 (엎드려서)",
    icon: "🔄",
    category: "legs",
    equipment: "머신",
    difficulty: 1,
    description: "햄스트링 고립 운동. 무릎 굴곡을 통해 허벅지 뒤를 집중 자극.",
    snsTags: ["#레그컬", "#햄스트링", "#하체운동", "#legcurl", "#허벅지뒤"],
    isIsometric: false,
    primary: { hamstrings: 90 },
    secondary: { calves: 20, glutes: 15 },
    trainerTip: "골반을 패드에 밀착! 발목을 당기듯 끝까지 컬하고, 내릴 때 천천히 버티세요.",
    goodFormMessage: "햄스트링 수축이 제대로 되고 있어요! 골반 고정과 가동 범위 모두 훌륭!",
    corrections: [
      {
        issue: "골반 들림 (Hips Lifting)",
        bodyPart: "골반 / 허리",
        message: "골반이 패드에서 뜨고 있어요! 엉덩이를 눌러 고정하고 햄스트링만 쓰세요.",
      },
      {
        issue: "가동범위 부족 (Partial Range)",
        bodyPart: "무릎",
        message: "무릎을 더 굽혀주세요. 발뒤꿈치가 엉덩이에 닿을 듯이 끝까지!",
      },
      {
        issue: "빠른 네거티브 (Fast Eccentric)",
        bodyPart: "햄스트링",
        message: "내리는 동작이 너무 빨라요! 3초 이상 천천히 내려 근육에 텐션을 유지하세요.",
      },
    ],
  },

  // ================================================================
  // 13. 풀업 — 오버핸드
  // ================================================================
  pullUp: {
    name: "풀업",
    koreanName: "오버핸드 풀업",
    variant: "오버핸드(순수) 그립 풀업",
    icon: "🔱",
    category: "back",
    equipment: "맨몸",
    difficulty: 4,
    description: "맨몸 등 운동의 왕. 광배근·이두·코어를 동시에 키우는 상체 복합운동.",
    snsTags: ["#풀업", "#턱걸이", "#등운동", "#pullup", "#맨몸운동"],
    isIsometric: false,
    primary: { lats: 90, biceps: 55 },
    secondary: { traps: 35, forearms: 40, core: 30 },
    trainerTip: "데드행에서 시작! 견갑골을 먼저 내려 모은 뒤, 팔꿈치를 허리 쪽으로 당기세요.",
    goodFormMessage: "풀업 자세 훌륭해요! 반동 없이 깨끗하게 올라가고 있어요. 등이 잘 쓰이고 있어요!",
    corrections: [
      {
        issue: "키핑/반동 (Kipping / Swinging)",
        bodyPart: "몸통 / 하체",
        message: "몸을 흔들어 올라가고 있어요! 하체를 고정하고 등 근육으로만 당기세요.",
      },
      {
        issue: "턱만 걸치기 (Chin Barely Over Bar)",
        bodyPart: "팔 / 등",
        message: "턱만 겨우 넘기지 말고, 가슴 상단이 바에 닿을 때까지 당기세요.",
      },
      {
        issue: "어깨 올림 (Shrugging at Bottom)",
        bodyPart: "견갑골 / 어깨",
        message: "매달릴 때 어깨가 귀까지 올라가 있어요! 견갑골을 아래로 당겨 세팅하세요.",
      },
    ],
  },

  // ================================================================
  // 14. 딥스 — 패러렐바
  // ================================================================
  dip: {
    name: "딥스",
    koreanName: "패러렐바 딥스",
    variant: "패러렐바(평행봉) 딥스",
    icon: "💥",
    category: "chest",
    equipment: "맨몸",
    difficulty: 3,
    description: "가슴 하부와 삼두를 동시에 공략. 상체 전방 경사로 가슴 비중 조절.",
    snsTags: ["#딥스", "#가슴운동", "#삼두운동", "#dips", "#맨몸운동"],
    isIsometric: false,
    primary: { chest: 75, triceps: 80 },
    secondary: { shoulders: 40, core: 25 },
    trainerTip: "상체를 약간 앞으로 기울이면 가슴, 세우면 삼두 타겟! 팔꿈치 90도까지 내려가세요.",
    goodFormMessage: "딥스 폼이 안정적이에요! 깊이와 상체 각도 조절이 잘 되고 있어요!",
    corrections: [
      {
        issue: "깊이 부족 (Not Going Deep Enough)",
        bodyPart: "팔꿈치",
        message: "더 깊이 내려가세요! 팔꿈치가 최소 90도가 될 때까지 내려야 효과적이에요.",
      },
      {
        issue: "어깨 전방 돌출 (Shoulders Rolling Forward)",
        bodyPart: "어깨",
        message: "어깨가 앞으로 말리고 있어요! 견갑골을 뒤로 모으고, 가슴을 펴세요.",
      },
      {
        issue: "다리 흔들림 (Legs Swinging)",
        bodyPart: "하체 / 코어",
        message: "다리가 흔들리고 있어요. 하체를 고정하고 코어에 힘을 주세요.",
      },
    ],
  },

  // ================================================================
  // 15. 힙 쓰러스트 — 바벨
  // ================================================================
  hipThrust: {
    name: "힙 쓰러스트",
    koreanName: "바벨 힙 쓰러스트",
    variant: "바벨 힙 쓰러스트 (벤치 지지)",
    icon: "🍑",
    category: "legs",
    equipment: "바벨",
    difficulty: 2,
    description: "대둔근 활성화 최강 운동. 힙업과 둔근 근력 향상의 핵심.",
    snsTags: ["#힙쓰러스트", "#힙업", "#둔근운동", "#hipthrust", "#엉덩이운동"],
    isIsometric: false,
    primary: { glutes: 98, hamstrings: 45 },
    secondary: { core: 30, quadriceps: 20 },
    trainerTip: "견갑골 아래를 벤치에 걸치고, 탑에서 둔근을 2초간 쥐어짜세요. 턱은 살짝 당기고!",
    goodFormMessage: "힙 쓰러스트 퍼펙트! 둔근 수축이 최대치에요. 골반 정렬도 안정적!",
    corrections: [
      {
        issue: "요추 과신전 (Hyperextending Lower Back)",
        bodyPart: "요추",
        message: "허리가 과도하게 젖혀지고 있어요! 골반을 후방 틸트하고 둔근으로만 밀어올리세요.",
      },
      {
        issue: "발 위치 부적절 (Feet Too Far / Too Close)",
        bodyPart: "발 / 무릎",
        message: "탑에서 정강이가 수직이 되게 발 위치를 조정하세요. 무릎 각도 90도!",
      },
      {
        issue: "불균형 골반 (Uneven Hips)",
        bodyPart: "골반",
        message: "골반이 한쪽으로 기울어져 있어요! 양발에 균등하게 힘을 주세요.",
      },
    ],
  },

  // ================================================================
  // 16. 루마니안 데드리프트
  // ================================================================
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

  // ================================================================
  // 17. 인클라인 벤치프레스 — 30도
  // ================================================================
  inclineBench: {
    name: "인클라인 벤치프레스",
    koreanName: "인클라인 벤치프레스",
    variant: "인클라인 30도 바벨 벤치프레스",
    icon: "🔥",
    category: "chest",
    equipment: "바벨",
    difficulty: 3,
    description: "상부 대흉근과 전면 삼각근을 강하게 자극. 가슴 상부 라인 완성.",
    snsTags: ["#인클라인벤치", "#가슴상부", "#벤치프레스", "#inclinebench", "#체스트데이"],
    isIsometric: false,
    primary: { chest: 82, shoulders: 55 },
    secondary: { triceps: 45, core: 20 },
    trainerTip: "벤치 각도 30도! 바를 쇄골 아래(가슴 상부)로 내리고, 45도 팔꿈치를 유지하세요.",
    goodFormMessage: "인클라인 벤치 자세 좋아요! 상부 대흉근에 정확히 자극이 가고 있어요!",
    corrections: [
      {
        issue: "벤치 각도 과도 (Bench Too Steep)",
        bodyPart: "벤치 / 어깨",
        message: "벤치 각도가 너무 높아요. 30도면 충분! 45도 이상은 어깨 운동이 됩니다.",
      },
      {
        issue: "바 경로 이탈 (Bar Path Drifting)",
        bodyPart: "손목 / 팔",
        message: "바가 목 쪽으로 가고 있어요. 쇄골 아래(가슴 상단)로 내리세요.",
      },
      {
        issue: "엉덩이 들림 (Hips Lifting)",
        bodyPart: "골반 / 허리",
        message: "엉덩이가 벤치에서 뜨고 있어요. 둔근을 벤치에 고정하세요.",
      },
    ],
  },

  // ================================================================
  // 18. 페이스 풀 — 케이블 로프
  // ================================================================
  facePull: {
    name: "페이스 풀",
    koreanName: "케이블 로프 페이스 풀",
    variant: "케이블 로프 페이스 풀 (하이 앵커)",
    icon: "🔱",
    category: "back",
    equipment: "케이블",
    difficulty: 2,
    description: "후면 삼각근·승모근 중하부 자극. 어깨 건강과 자세 교정의 필수 운동.",
    snsTags: ["#페이스풀", "#어깨건강", "#후면삼각근", "#facepull", "#자세교정"],
    isIsometric: false,
    primary: { traps: 65, shoulders: 60 },
    secondary: { biceps: 20 },
    trainerTip: "로프를 이마 양옆으로 당기면서 외회전! 당긴 상태에서 1초 멈추세요.",
    goodFormMessage: "페이스 풀 동작이 깔끔해요! 외회전과 견갑골 후인이 잘 이루어지고 있어요!",
    corrections: [
      {
        issue: "당기는 높이 부족 (Pulling Too Low)",
        bodyPart: "팔 / 어깨",
        message: "너무 낮게 당기고 있어요! 이마~눈 높이로 당기세요.",
      },
      {
        issue: "외회전 부족 (No External Rotation)",
        bodyPart: "어깨 / 회전근개",
        message: "당긴 상태에서 손을 귀 옆으로 외회전하세요. 이게 핵심이에요!",
      },
      {
        issue: "몸통 뒤로 젖힘 (Leaning Back)",
        bodyPart: "몸통 / 요추",
        message: "상체를 뒤로 젖히며 당기고 있어요. 몸을 세운 상태에서 어깨로만 당기세요.",
      },
    ],
  },

  // ================================================================
  // 보조 운동 (기존 데이터 유지 + 일부 보강)
  // ================================================================
  declineBench: {
    name: "디클라인 벤치",
    koreanName: "디클라인 벤치프레스",
    variant: "디클라인 바벨 벤치프레스 (-15도)",
    icon: "🔥",
    category: "chest",
    equipment: "바벨",
    difficulty: 3,
    description: "가슴 하부를 집중 자극하는 프레스 변형.",
    snsTags: ["#디클라인벤치", "#가슴하부", "#벤치프레스"],
    isIsometric: false,
    primary: { chest: 85, triceps: 55 },
    secondary: { shoulders: 30 },
    trainerTip: "다리를 단단히 고정하고, 유두 아래 라인으로 바를 내리세요.",
    goodFormMessage: "가슴 하부에 정확히 타겟팅되고 있어요!",
    corrections: [
      { issue: "바 위치 이탈", bodyPart: "손목 / 바 궤도", message: "바를 유두 아래 라인으로 내리세요." },
      { issue: "다리 불안정", bodyPart: "하체", message: "다리를 패드에 단단히 고정하세요." },
    ],
  },

  dumbbellFly: {
    name: "덤벨 플라이",
    koreanName: "플랫 덤벨 플라이",
    variant: "플랫 벤치 덤벨 플라이",
    icon: "🦅",
    category: "chest",
    equipment: "덤벨",
    difficulty: 2,
    description: "가슴 근육의 스트레치와 수축을 극대화하는 고립 운동.",
    snsTags: ["#덤벨플라이", "#가슴운동", "#고립운동"],
    isIsometric: false,
    primary: { chest: 80 },
    secondary: { shoulders: 25, biceps: 10 },
    trainerTip: "팔꿈치를 살짝 구부린 채 고정! 가슴이 열리는 느낌까지 내리고 쥐어짜세요.",
    goodFormMessage: "가슴 스트레치와 수축이 잘 이루어지고 있어요!",
    corrections: [
      { issue: "팔꿈치 과도 펴짐", bodyPart: "팔꿈치", message: "팔꿈치를 약간 구부린 상태를 유지하세요. 관절 보호!" },
      { issue: "너무 무거운 중량", bodyPart: "어깨", message: "컨트롤할 수 있는 중량을 사용하세요. 플라이는 고립이 핵심!" },
    ],
  },

  pushUp: {
    name: "푸시업",
    koreanName: "스탠다드 푸시업",
    variant: "일반 푸시업 (맨몸)",
    icon: "💥",
    category: "chest",
    equipment: "맨몸",
    difficulty: 2,
    description: "어디서든 할 수 있는 가슴·삼두·코어 복합운동.",
    snsTags: ["#푸시업", "#맨몸운동", "#가슴운동"],
    isIsometric: false,
    primary: { chest: 75, triceps: 60 },
    secondary: { shoulders: 40, core: 45 },
    trainerTip: "손은 어깨너비보다 약간 넓게, 몸은 플랭크처럼 일직선! 가슴이 바닥에 거의 닿을 때까지.",
    goodFormMessage: "푸시업 폼이 단단해요! 전신 긴장이 잘 유지되고 있어요!",
    corrections: [
      { issue: "허리 처짐", bodyPart: "요추 / 코어", message: "허리가 처지고 있어요! 코어에 힘을 줘서 몸을 일직선으로!" },
      { issue: "엉덩이 올라감", bodyPart: "고관절", message: "엉덩이가 너무 높아요. 머리~발끝까지 일직선을 유지하세요." },
    ],
  },

  chestPress: {
    name: "체스트프레스 머신",
    koreanName: "시티드 체스트프레스",
    variant: "시티드 체스트프레스 머신",
    icon: "🔥",
    category: "chest",
    equipment: "머신",
    difficulty: 1,
    description: "초보자에게 안전한 가슴 프레스. 고정 궤도로 부상 위험 최소화.",
    snsTags: ["#체스트프레스", "#가슴운동", "#머신운동"],
    isIsometric: false,
    primary: { chest: 78, triceps: 50 },
    secondary: { shoulders: 30 },
    trainerTip: "등을 시트에 밀착하고 견갑골을 모아요. 팔을 완전히 펴지 말고 살짝 남기세요.",
    goodFormMessage: "체스트프레스 잘 되고 있어요! 궤도가 안정적이에요!",
    corrections: [
      { issue: "등 떨어짐", bodyPart: "견갑골", message: "등을 시트에 밀착하세요. 견갑골을 모으면 가슴에 더 집중돼요." },
    ],
  },

  chinUp: {
    name: "친업",
    koreanName: "언더그립 친업",
    variant: "언더핸드(역수) 그립 친업",
    icon: "🔱",
    category: "back",
    equipment: "맨몸",
    difficulty: 3,
    description: "풀업의 역수 버전. 이두근 참여가 높아 초보자가 더 쉽게 느낌.",
    snsTags: ["#친업", "#턱걸이", "#이두운동"],
    isIsometric: false,
    primary: { lats: 82, biceps: 65 },
    secondary: { traps: 30, forearms: 35 },
    trainerTip: "손바닥이 나를 향하게! 풀업보다 이두 개입이 크니, 등을 의식적으로 쓰세요.",
    goodFormMessage: "친업 잘 되고 있어요! 등과 이두가 고르게 쓰이고 있어요!",
    corrections: [
      { issue: "반동 사용", bodyPart: "몸통", message: "몸을 흔들지 마세요. 매달린 상태에서 등으로 시작하세요." },
    ],
  },

  seatedRow: {
    name: "시티드 로우",
    koreanName: "시티드 케이블 로우",
    variant: "시티드 케이블 로우 (V-바 / 와이드)",
    icon: "🔱",
    category: "back",
    equipment: "케이블",
    difficulty: 2,
    description: "등 중앙부 두께를 만드는 기본 로우 운동.",
    snsTags: ["#시티드로우", "#등운동", "#등두께"],
    isIsometric: false,
    primary: { lats: 78, traps: 55 },
    secondary: { biceps: 40, forearms: 30, shoulders: 20 },
    trainerTip: "가슴을 펴고 배꼽 쪽으로 당기세요. 뒤로 젖히지 말고 견갑골을 모으는 느낌!",
    goodFormMessage: "등 중앙이 확실히 수축되고 있어요! 자세가 안정적이에요!",
    corrections: [
      { issue: "상체 과도한 후방 경사", bodyPart: "몸통", message: "뒤로 너무 젖히지 마세요. 등이 아닌 관성으로 당기게 됩니다." },
    ],
  },

  barbellRow: {
    name: "바벨 로우",
    koreanName: "벤트오버 바벨 로우",
    variant: "벤트오버 바벨 로우 (오버핸드)",
    icon: "🔱",
    category: "back",
    equipment: "바벨",
    difficulty: 3,
    description: "등 전체 두께와 넓이를 동시에. 코어 안정성도 필수.",
    snsTags: ["#바벨로우", "#등운동", "#벤트오버"],
    isIsometric: false,
    primary: { lats: 82, traps: 60 },
    secondary: { biceps: 45, lowerBack: 50, core: 40 },
    trainerTip: "상체를 45도로 숙이고 바를 배꼽 쪽으로! 팔꿈치를 뒤로 당기세요.",
    goodFormMessage: "바벨 로우 폼이 탄탄해요! 등이 곧고 당기는 궤도가 좋아요!",
    corrections: [
      { issue: "등 굴곡", bodyPart: "요추", message: "등이 둥글어지고 있어요. 코어에 힘을 주고 가슴을 펴세요." },
      { issue: "상체 세움", bodyPart: "몸통", message: "상체가 너무 일어서고 있어요. 45도 각도를 유지하세요." },
    ],
  },

  dumbbellRow: {
    name: "덤벨 로우",
    koreanName: "원암 덤벨 로우",
    variant: "원암 덤벨 로우 (벤치 지지)",
    icon: "🔱",
    category: "back",
    equipment: "덤벨",
    difficulty: 2,
    description: "한 쪽씩 광배근을 고립하는 로우. 좌우 불균형 교정에 효과적.",
    snsTags: ["#덤벨로우", "#원암로우", "#등운동"],
    isIsometric: false,
    primary: { lats: 80, traps: 50 },
    secondary: { biceps: 40, forearms: 30 },
    trainerTip: "벤치에 한 손과 무릎을 올리고, 덤벨을 골반 쪽으로 당기세요.",
    goodFormMessage: "원암 로우 잘 되고 있어요! 광배근 수축이 확실해요!",
    corrections: [
      { issue: "회전 동작", bodyPart: "몸통", message: "몸통이 회전하고 있어요. 골반을 고정하고 등으로만 당기세요." },
    ],
  },

  backExtension: {
    name: "백 익스텐션",
    koreanName: "45도 백 익스텐션",
    variant: "45도 백 익스텐션 머신",
    icon: "🔱",
    category: "back",
    equipment: "머신",
    difficulty: 1,
    description: "척추기립근과 둔근을 강화하는 허리 운동.",
    snsTags: ["#백익스텐션", "#허리운동", "#척추기립근"],
    isIsometric: false,
    primary: { lowerBack: 80, glutes: 55 },
    secondary: { hamstrings: 35 },
    trainerTip: "몸을 수평까지만 올리세요. 과신전 금지! 둔근을 쥐어짜며 올라오세요.",
    goodFormMessage: "백 익스텐션 잘 하고 있어요! 과신전 없이 딱 좋은 범위에요!",
    corrections: [
      { issue: "과신전", bodyPart: "요추", message: "몸을 수평 이상으로 올리지 마세요. 허리 부상 위험!" },
    ],
  },

  arnoldPress: {
    name: "아놀드 프레스",
    koreanName: "아놀드 프레스",
    variant: "시티드 덤벨 아놀드 프레스",
    icon: "⚡",
    category: "shoulders",
    equipment: "덤벨",
    difficulty: 3,
    description: "삼각근 전체를 회전하며 자극. 가동범위가 넓은 프레스 변형.",
    snsTags: ["#아놀드프레스", "#어깨운동"],
    isIsometric: false,
    primary: { shoulders: 85, triceps: 45 },
    secondary: { traps: 30 },
    trainerTip: "컬 자세에서 시작해 회전하며 올려요. 전면·측면 삼각근을 동시에!",
    goodFormMessage: "아놀드 프레스 회전이 부드럽고 좋아요!",
    corrections: [
      { issue: "회전 불완전", bodyPart: "어깨", message: "손바닥이 완전히 전방에서 출발해 머리 위에서 전방을 향하게 회전하세요." },
    ],
  },

  frontRaise: {
    name: "프론트 레이즈",
    koreanName: "덤벨 프론트 레이즈",
    variant: "스탠딩 덤벨 프론트 레이즈",
    icon: "🪽",
    category: "shoulders",
    equipment: "덤벨",
    difficulty: 1,
    description: "전면 삼각근을 고립하는 레이즈 운동.",
    snsTags: ["#프론트레이즈", "#전면삼각근"],
    isIsometric: false,
    primary: { shoulders: 78 },
    secondary: { chest: 15, traps: 20 },
    trainerTip: "어깨 높이까지만 올리고, 내릴 때 천천히! 반동을 쓰면 효과 반감.",
    goodFormMessage: "프론트 레이즈 깔끔해요! 전면 삼각근에 집중되고 있어요!",
    corrections: [
      { issue: "반동 사용", bodyPart: "몸통", message: "상체를 흔들지 마세요. 무게를 줄이고 삼각근만으로 올리세요." },
    ],
  },

  rearDeltFly: {
    name: "리어 델트 플라이",
    koreanName: "리어 델트 플라이",
    variant: "벤트오버 덤벨 리어 델트 플라이",
    icon: "🪽",
    category: "shoulders",
    equipment: "덤벨",
    difficulty: 2,
    description: "후면 삼각근 고립. 둥근 어깨 교정과 어깨 균형에 필수.",
    snsTags: ["#리어델트", "#후면삼각근"],
    isIsometric: false,
    primary: { shoulders: 72, traps: 40 },
    secondary: { lats: 15 },
    trainerTip: "상체를 90도 숙이고 팔을 옆으로 벌려요. 새끼손가락을 천장으로!",
    goodFormMessage: "후면 삼각근이 불타고 있어요! 폼이 안정적이에요!",
    corrections: [
      { issue: "승모근 개입", bodyPart: "승모근", message: "어깨를 으쓱하지 마세요. 후면 삼각근에 집중!" },
    ],
  },

  uprightRow: {
    name: "업라이트 로우",
    koreanName: "바벨 업라이트 로우",
    variant: "바벨 업라이트 로우 (와이드그립 권장)",
    icon: "⚡",
    category: "shoulders",
    equipment: "바벨",
    difficulty: 2,
    description: "측면 삼각근과 승모근을 동시에. 와이드 그립이 어깨에 안전.",
    snsTags: ["#업라이트로우", "#어깨운동"],
    isIsometric: false,
    primary: { shoulders: 75, traps: 60 },
    secondary: { biceps: 30, forearms: 20 },
    trainerTip: "와이드 그립으로! 팔꿈치를 바 위로 올린다는 느낌. 어깨 높이까지만.",
    goodFormMessage: "업라이트 로우 동작이 안정적이에요!",
    corrections: [
      { issue: "그립 너무 좁음", bodyPart: "손목 / 어깨", message: "그립이 좁으면 어깨 충돌 위험! 어깨너비 이상으로 잡으세요." },
    ],
  },

  shrug: {
    name: "슈러그",
    koreanName: "덤벨 슈러그",
    variant: "스탠딩 덤벨 슈러그",
    icon: "⚡",
    category: "shoulders",
    equipment: "덤벨",
    difficulty: 1,
    description: "승모근 상부를 집중 자극. 목 양옆 볼륨 업.",
    snsTags: ["#슈러그", "#승모근"],
    isIsometric: false,
    primary: { traps: 90 },
    secondary: { shoulders: 15, forearms: 25 },
    trainerTip: "어깨를 귀까지 끌어올리고 2초 유지! 회전하지 말고 수직으로만.",
    goodFormMessage: "승모근이 확실히 수축되고 있어요! 좋은 범위!",
    corrections: [
      { issue: "어깨 회전", bodyPart: "어깨", message: "어깨를 돌리지 마세요. 수직으로 올리고 내리기만 하세요." },
    ],
  },

  hammerCurl: {
    name: "해머 컬",
    koreanName: "해머 컬",
    variant: "스탠딩 덤벨 해머 컬",
    icon: "💪",
    category: "arms",
    equipment: "덤벨",
    difficulty: 1,
    description: "상완근과 전완근을 함께 자극. 팔 전체 두께에 기여.",
    snsTags: ["#해머컬", "#팔운동"],
    isIsometric: false,
    primary: { biceps: 70, forearms: 55 },
    secondary: {},
    trainerTip: "손바닥이 서로 마주보게! 팔꿈치 고정, 천천히 올리고 내리세요.",
    goodFormMessage: "해머 컬 잘 되고 있어요! 전완근까지 불타고 있을 거예요!",
    corrections: [
      { issue: "반동 사용", bodyPart: "몸통", message: "상체를 고정하세요. 팔뚝만으로 올리세요." },
    ],
  },

  preacherCurl: {
    name: "프리처 컬",
    koreanName: "프리처 컬",
    variant: "EZ바 프리처 컬",
    icon: "💪",
    category: "arms",
    equipment: "바벨",
    difficulty: 2,
    description: "이두근 장두를 집중 고립. 패드가 반동을 완전히 차단.",
    snsTags: ["#프리처컬", "#이두운동"],
    isIsometric: false,
    primary: { biceps: 88 },
    secondary: { forearms: 30 },
    trainerTip: "겨드랑이를 패드 상단에 밀착! 완전히 펴지 말고 약간 남기세요.",
    goodFormMessage: "이두근 고립이 완벽해요! 패드 사용이 좋아요!",
    corrections: [
      { issue: "완전 신전", bodyPart: "팔꿈치", message: "팔을 완전히 펴면 건에 무리! 약간 구부린 상태에서 멈추세요." },
    ],
  },

  tricepPushdown: {
    name: "트라이셉 푸시다운",
    koreanName: "케이블 트라이셉 푸시다운",
    variant: "케이블 스트레이트바 / 로프 푸시다운",
    icon: "💪",
    category: "arms",
    equipment: "케이블",
    difficulty: 1,
    description: "삼두근 고립의 기본. 케이블로 전 가동범위 텐션 유지.",
    snsTags: ["#트라이셉푸시다운", "#삼두운동"],
    isIsometric: false,
    primary: { triceps: 88 },
    secondary: {},
    trainerTip: "팔꿈치를 옆구리에 고정! 전완만 움직여 바를 아래로 밀어 펴세요.",
    goodFormMessage: "삼두근 수축이 확실해요! 팔꿈치 고정이 잘 되고 있어요!",
    corrections: [
      { issue: "팔꿈치 이탈", bodyPart: "팔꿈치", message: "팔꿈치가 앞뒤로 움직여요. 옆구리에 붙이세요." },
    ],
  },

  skullCrusher: {
    name: "스컬 크러셔",
    koreanName: "라잉 트라이셉 익스텐션",
    variant: "라잉 EZ바 스컬 크러셔",
    icon: "💪",
    category: "arms",
    equipment: "바벨",
    difficulty: 3,
    description: "삼두근 장두를 집중. 이마 방향으로 내려 강한 스트레치.",
    snsTags: ["#스컬크러셔", "#삼두운동"],
    isIsometric: false,
    primary: { triceps: 90 },
    secondary: { shoulders: 15 },
    trainerTip: "팔꿈치를 고정하고 이마 위~뒤쪽으로 바를 내리세요. 절대 이마에 떨어뜨리지 않게!",
    goodFormMessage: "스컬 크러셔 궤도가 안정적이에요! 삼두 장두에 잘 타겟팅!",
    corrections: [
      { issue: "팔꿈치 벌어짐", bodyPart: "팔꿈치", message: "팔꿈치가 벌어지고 있어요. 어깨너비로 고정하세요." },
    ],
  },

  overheadExtension: {
    name: "오버헤드 익스텐션",
    koreanName: "오버헤드 덤벨 익스텐션",
    variant: "시티드 / 스탠딩 덤벨 오버헤드 익스텐션",
    icon: "💪",
    category: "arms",
    equipment: "덤벨",
    difficulty: 2,
    description: "삼두근 장두를 머리 뒤에서 최대한 스트레치하는 운동.",
    snsTags: ["#오버헤드익스텐션", "#삼두운동"],
    isIsometric: false,
    primary: { triceps: 85 },
    secondary: { shoulders: 15 },
    trainerTip: "팔꿈치를 귀 옆에 고정! 덤벨을 머리 뒤로 천천히 내렸다가 올리세요.",
    goodFormMessage: "삼두 장두 스트레치가 잘 되고 있어요!",
    corrections: [
      { issue: "팔꿈치 벌어짐", bodyPart: "팔꿈치", message: "팔꿈치를 귀 옆에 고정하세요. 벌어지면 어깨에 무리!" },
    ],
  },

  wristCurl: {
    name: "리스트 컬",
    koreanName: "리스트 컬",
    variant: "시티드 바벨 리스트 컬",
    icon: "💪",
    category: "arms",
    equipment: "덤벨",
    difficulty: 1,
    description: "전완근(악력) 강화 운동. 그립 약한 사람에게 필수.",
    snsTags: ["#리스트컬", "#악력운동"],
    isIsometric: false,
    primary: { forearms: 85 },
    secondary: {},
    trainerTip: "전완을 무릎 위에 올리고, 손목만 움직이세요. 가볍게 고반복!",
    goodFormMessage: "전완근이 빵빵해지고 있어요! 좋은 범위!",
    corrections: [
      { issue: "전완 이탈", bodyPart: "전완", message: "전완을 무릎에 고정하세요. 손목만 움직여야 해요." },
    ],
  },

  frontSquat: {
    name: "프론트 스쿼트",
    koreanName: "프론트 스쿼트",
    variant: "바벨 프론트 스쿼트 (클린그립)",
    icon: "🏋️",
    category: "legs",
    equipment: "바벨",
    difficulty: 4,
    description: "대퇴사두와 코어를 더 강하게 자극하는 스쿼트 변형.",
    snsTags: ["#프론트스쿼트", "#하체운동"],
    isIsometric: false,
    primary: { quadriceps: 90, core: 65 },
    secondary: { glutes: 55, calves: 20 },
    trainerTip: "팔꿈치를 최대한 높이! 상체가 세워질수록 대퇴사두에 집중돼요.",
    goodFormMessage: "프론트 스쿼트 자세 훌륭해요! 상체가 잘 세워져 있어요!",
    corrections: [
      { issue: "팔꿈치 떨어짐", bodyPart: "팔꿈치 / 어깨", message: "팔꿈치가 떨어지면 바가 앞으로 굴러요! 팔꿈치를 높이!" },
      { issue: "상체 숙임", bodyPart: "몸통", message: "상체가 앞으로 숙여지고 있어요. 가슴을 펴세요." },
    ],
  },

  bulgarianSplit: {
    name: "불가리안 스플릿",
    koreanName: "불가리안 스플릿 스쿼트",
    variant: "벤치 위 뒷발 불가리안 스플릿 스쿼트",
    icon: "🦵",
    category: "legs",
    equipment: "덤벨",
    difficulty: 3,
    description: "한 다리 하체 운동의 끝판왕. 균형·안정성·근력 동시 훈련.",
    snsTags: ["#불가리안스플릿", "#하체운동"],
    isIsometric: false,
    primary: { quadriceps: 82, glutes: 78 },
    secondary: { hamstrings: 35, core: 40 },
    trainerTip: "뒷발은 벤치에 가볍게만! 체중은 앞다리에 90% 실으세요.",
    goodFormMessage: "불가리안 스플릿 균형이 훌륭해요! 한쪽 다리에 잘 집중되고 있어요!",
    corrections: [
      { issue: "무릎 내측 붕괴", bodyPart: "앞 무릎", message: "앞 무릎이 안으로 들어가지 않게! 발끝 방향으로!" },
      { issue: "뒷발 의존", bodyPart: "뒷다리", message: "뒷발에 체중이 실리고 있어요. 앞다리로 체중을 옮기세요." },
    ],
  },

  legExtension: {
    name: "레그 익스텐션",
    koreanName: "레그 익스텐션",
    variant: "시티드 레그 익스텐션 머신",
    icon: "🦿",
    category: "legs",
    equipment: "머신",
    difficulty: 1,
    description: "대퇴사두 고립 운동. 무릎 재활에도 활용.",
    snsTags: ["#레그익스텐션", "#대퇴사두"],
    isIsometric: false,
    primary: { quadriceps: 92 },
    secondary: {},
    trainerTip: "무릎을 완전히 펴고 1초 유지! 내릴 때 90도 이하로 내리지 마세요.",
    goodFormMessage: "대퇴사두 수축이 확실해요! 좋은 가동범위!",
    corrections: [
      { issue: "빠른 동작", bodyPart: "무릎", message: "너무 빨리 움직이고 있어요. 올릴 때 2초, 내릴 때 3초!" },
    ],
  },

  calfRaise: {
    name: "카프 레이즈",
    koreanName: "스탠딩 카프 레이즈",
    variant: "스탠딩 카프 레이즈 머신",
    icon: "🦵",
    category: "legs",
    equipment: "머신",
    difficulty: 1,
    description: "종아리(비복근) 고립 운동. 발뒤꿈치를 최대한 올리고 내리기.",
    snsTags: ["#카프레이즈", "#종아리운동"],
    isIsometric: false,
    primary: { calves: 92 },
    secondary: {},
    trainerTip: "최대한 높이 올라갔다 최대한 깊이 스트레치! 반동 없이 천천히.",
    goodFormMessage: "종아리 수축이 좋아요! 전 가동범위 활용이 훌륭!",
    corrections: [
      { issue: "가동범위 부족", bodyPart: "발목", message: "발뒤꿈치를 더 내려 스트레치하고, 더 높이 올라가세요!" },
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
