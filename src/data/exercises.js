// 40+ exercises organized by category
// Each exercise: name (Korean), icon, primary/secondary muscles, category, equipment

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
  // ── CHEST (가슴) ──
  benchPress:       { name: "벤치프레스",       icon: "🔥", category: "chest", equipment: "바벨",   primary: ["chest", "triceps"],            secondary: ["shoulders", "core"] },
  inclineBench:     { name: "인클라인 벤치",     icon: "🔥", category: "chest", equipment: "바벨",   primary: ["chest", "shoulders"],          secondary: ["triceps", "core"] },
  declineBench:     { name: "디클라인 벤치",     icon: "🔥", category: "chest", equipment: "바벨",   primary: ["chest", "triceps"],            secondary: ["shoulders"] },
  dumbbellFly:      { name: "덤벨 플라이",       icon: "🦅", category: "chest", equipment: "덤벨",   primary: ["chest"],                       secondary: ["shoulders", "biceps"] },
  cableFly:         { name: "케이블 플라이",     icon: "🦅", category: "chest", equipment: "케이블",  primary: ["chest"],                       secondary: ["shoulders", "biceps"] },
  pushUp:           { name: "푸시업",           icon: "💥", category: "chest", equipment: "맨몸",   primary: ["chest", "triceps"],            secondary: ["shoulders", "core"] },
  chestPress:       { name: "체스트프레스 머신",  icon: "🔥", category: "chest", equipment: "머신",   primary: ["chest", "triceps"],            secondary: ["shoulders"] },
  dip:              { name: "딥스",             icon: "💥", category: "chest", equipment: "맨몸",   primary: ["chest", "triceps"],            secondary: ["shoulders", "core"] },

  // ── BACK (등) ──
  latPulldown:      { name: "랫풀다운",         icon: "🔱", category: "back", equipment: "케이블",  primary: ["lats", "biceps"],              secondary: ["traps", "shoulders", "forearms"] },
  pullUp:           { name: "풀업",             icon: "🔱", category: "back", equipment: "맨몸",   primary: ["lats", "biceps"],              secondary: ["traps", "forearms", "core"] },
  chinUp:           { name: "친업",             icon: "🔱", category: "back", equipment: "맨몸",   primary: ["lats", "biceps"],              secondary: ["traps", "forearms"] },
  seatedRow:        { name: "시티드 로우",       icon: "🔱", category: "back", equipment: "케이블",  primary: ["lats", "traps"],               secondary: ["biceps", "forearms", "shoulders"] },
  barbellRow:       { name: "바벨 로우",         icon: "🔱", category: "back", equipment: "바벨",   primary: ["lats", "traps"],               secondary: ["biceps", "lowerBack", "core"] },
  dumbbellRow:      { name: "덤벨 로우",         icon: "🔱", category: "back", equipment: "덤벨",   primary: ["lats", "traps"],               secondary: ["biceps", "forearms"] },
  facePull:         { name: "페이스 풀",         icon: "🔱", category: "back", equipment: "케이블",  primary: ["traps", "shoulders"],           secondary: ["biceps"] },
  backExtension:    { name: "백 익스텐션",       icon: "🔱", category: "back", equipment: "머신",   primary: ["lowerBack", "glutes"],          secondary: ["hamstrings"] },

  // ── SHOULDERS (어깨) ──
  shoulderPress:    { name: "숄더프레스",        icon: "⚡", category: "shoulders", equipment: "덤벨", primary: ["shoulders", "triceps"],         secondary: ["traps", "core"] },
  arnoldPress:      { name: "아놀드 프레스",     icon: "⚡", category: "shoulders", equipment: "덤벨", primary: ["shoulders", "triceps"],         secondary: ["traps"] },
  lateralRaise:     { name: "레터럴 레이즈",     icon: "🪽", category: "shoulders", equipment: "덤벨", primary: ["shoulders"],                    secondary: ["traps"] },
  frontRaise:       { name: "프론트 레이즈",     icon: "🪽", category: "shoulders", equipment: "덤벨", primary: ["shoulders"],                    secondary: ["chest", "traps"] },
  rearDeltFly:      { name: "리어 델트 플라이",   icon: "🪽", category: "shoulders", equipment: "덤벨", primary: ["shoulders", "traps"],           secondary: ["lats"] },
  uprightRow:       { name: "업라이트 로우",     icon: "⚡", category: "shoulders", equipment: "바벨", primary: ["shoulders", "traps"],           secondary: ["biceps", "forearms"] },
  shrug:            { name: "슈러그",           icon: "⚡", category: "shoulders", equipment: "덤벨", primary: ["traps"],                        secondary: ["shoulders", "forearms"] },

  // ── ARMS (팔) ──
  bicepCurl:        { name: "바이셉 컬",         icon: "💪", category: "arms", equipment: "덤벨",   primary: ["biceps"],                       secondary: ["forearms"] },
  hammerCurl:       { name: "해머 컬",           icon: "💪", category: "arms", equipment: "덤벨",   primary: ["biceps", "forearms"],            secondary: [] },
  preacherCurl:     { name: "프리처 컬",         icon: "💪", category: "arms", equipment: "바벨",   primary: ["biceps"],                       secondary: ["forearms"] },
  tricepPushdown:   { name: "트라이셉 푸시다운",  icon: "💪", category: "arms", equipment: "케이블",  primary: ["triceps"],                      secondary: [] },
  skullCrusher:     { name: "스컬 크러셔",       icon: "💪", category: "arms", equipment: "바벨",   primary: ["triceps"],                      secondary: ["shoulders"] },
  overheadExtension:{ name: "오버헤드 익스텐션",  icon: "💪", category: "arms", equipment: "덤벨",   primary: ["triceps"],                      secondary: ["shoulders"] },
  wristCurl:        { name: "리스트 컬",         icon: "💪", category: "arms", equipment: "덤벨",   primary: ["forearms"],                     secondary: [] },

  // ── LEGS (하체) ──
  squat:            { name: "스쿼트",            icon: "🏋️", category: "legs", equipment: "바벨",   primary: ["quadriceps", "glutes"],          secondary: ["hamstrings", "calves", "core"] },
  frontSquat:       { name: "프론트 스쿼트",     icon: "🏋️", category: "legs", equipment: "바벨",   primary: ["quadriceps", "core"],            secondary: ["glutes", "calves"] },
  lunge:            { name: "런지",              icon: "🦵", category: "legs", equipment: "덤벨",   primary: ["quadriceps", "glutes"],          secondary: ["hamstrings", "calves", "core"] },
  bulgarianSplit:   { name: "불가리안 스플릿",    icon: "🦵", category: "legs", equipment: "덤벨",   primary: ["quadriceps", "glutes"],          secondary: ["hamstrings", "core"] },
  legPress:         { name: "레그프레스",         icon: "🦿", category: "legs", equipment: "머신",   primary: ["quadriceps", "glutes"],          secondary: ["hamstrings", "calves"] },
  legExtension:     { name: "레그 익스텐션",     icon: "🦿", category: "legs", equipment: "머신",   primary: ["quadriceps"],                    secondary: [] },
  legCurl:          { name: "레그 컬",           icon: "🔄", category: "legs", equipment: "머신",   primary: ["hamstrings"],                    secondary: ["calves", "glutes"] },
  hipThrust:        { name: "힙 쓰러스트",       icon: "🍑", category: "legs", equipment: "바벨",   primary: ["glutes", "hamstrings"],          secondary: ["core", "quadriceps"] },
  calfRaise:        { name: "카프 레이즈",       icon: "🦵", category: "legs", equipment: "머신",   primary: ["calves"],                       secondary: [] },

  // ── CORE (코어) ──
  plank:            { name: "플랭크",            icon: "🧘", category: "core", equipment: "맨몸",   primary: ["core"],                         secondary: ["shoulders", "glutes", "quadriceps"] },
  crunch:           { name: "크런치",            icon: "🧘", category: "core", equipment: "맨몸",   primary: ["core"],                         secondary: [] },
  legRaise:         { name: "레그 레이즈",       icon: "🧘", category: "core", equipment: "맨몸",   primary: ["core"],                         secondary: ["quadriceps"] },
  russianTwist:     { name: "러시안 트위스트",    icon: "🧘", category: "core", equipment: "맨몸",   primary: ["core"],                         secondary: ["shoulders"] },
  abWheelRollout:   { name: "AB 휠 롤아웃",     icon: "🧘", category: "core", equipment: "기구",   primary: ["core", "lats"],                 secondary: ["shoulders", "triceps"] },

  // ── FULL BODY (전신) ──
  deadlift:         { name: "데드리프트",         icon: "🏋️", category: "fullBody", equipment: "바벨", primary: ["hamstrings", "glutes", "lowerBack"], secondary: ["quadriceps", "core", "traps", "forearms"] },
  romanianDeadlift: { name: "루마니안 데드리프트", icon: "🏋️", category: "fullBody", equipment: "바벨", primary: ["hamstrings", "glutes", "lowerBack"], secondary: ["core", "traps"] },
  cleanAndPress:    { name: "클린 앤 프레스",     icon: "🏋️", category: "fullBody", equipment: "바벨", primary: ["shoulders", "quadriceps", "glutes"], secondary: ["core", "traps", "triceps", "hamstrings"] },
  kettlebellSwing:  { name: "케틀벨 스윙",       icon: "🏋️", category: "fullBody", equipment: "케틀벨", primary: ["glutes", "hamstrings", "core"],    secondary: ["shoulders", "lats", "quadriceps"] },
  burpee:           { name: "버피",              icon: "🏋️", category: "fullBody", equipment: "맨몸", primary: ["quadriceps", "chest", "core"],     secondary: ["shoulders", "triceps", "glutes"] },
};
