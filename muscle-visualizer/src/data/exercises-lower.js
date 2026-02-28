// ============================================================
// exercises-lower.js — 하체 운동 데이터 (다리, 둔근, 종아리)
// ============================================================

export const LOWER_CATEGORIES = {
  legs: { label: "하체", icon: "🦵" },
};

export const LOWER_EXERCISES = {

  // ================================================================
  // 스쿼트 — 백스쿼트 패러렐
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
  // 런지 — 스테이셔너리
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
  // 레그프레스 — 45도
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
  // 레그 컬 — 라잉
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
  // 힙 쓰러스트 — 바벨
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
  // 프론트 스쿼트
  // ================================================================
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

  // ================================================================
  // 불가리안 스플릿 스쿼트
  // ================================================================
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

  // ================================================================
  // 레그 익스텐션
  // ================================================================
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

  // ================================================================
  // 카프 레이즈
  // ================================================================
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
};
