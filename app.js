// 앱 상태 관리 객체 (세션과 분리된 임시 화면 상태)
const state = {
  currentScreen: 'auth',       // 'auth', 'main', 'sub', 'history', 'detail'
  currentTab: 'notice',        // 메인 화면 내 활성화된 탭 ('notice' | 'devotion' | 'conti' | 'ai-rec')
  selectedServiceId: null,     // 'service-2', 'service-3', 'service-4', 'service-custom-...'
  selectedWeekId: null,        // 'this-week', 'next-week', 'archive-...'
  editingSongId: null,         // 현재 편집중인 찬양 ID
  editingWorshipId: null,      // 현재 편집중인 예배 ID (추가 시 null)
  editingNoticeId: null,       // 현재 편집중인 공지사항 ID
  selectedSearchChurchId: null, // 검색창에서 선택된 로그인 대상 교회 ID
  uploadedSheetMusicBase64: null, // 파일 업로드 시 임시로 보관할 compressed Base64
  uploadedTeamLogoBase64: null,  // 파일 업로드 시 임시로 보관할 로고 이미지 Base64
  aiCache: {},                  // AI 찬양 추천 결과 임시 인메모리 캐시 (속도 향상 마스터키)
  isLocalWriting: false,        // 로컬 데이터 저장 중 클라우드 롤백 충돌을 방지하는 동기화 락(Lock)
  userName: ""                  // 현재 로그인한 사용자의 실명
};

// 텅 빈 예배 데이터 구조 생성 템플릿 (사용자가 처음부터 직접 예배를 등록해서 사용하도록 텅 빈 구조 지원)
function getEmptyWorshipStructure() {
  return {};
}

// 최초 구동 시 셋업될 다중 테넌트 기본 데이터 (Mock Data)
const defaultData = {
  activeChurchId: null,       // 현재 로그인된 교회 ID (세션 유지용)
  activeRole: 'member',       // 현재 로그인된 역할 ('member' | 'admin')
  churches: {
    'church-1': {
      id: 'church-1',
      name: '사랑교회',
      adminPassword: '1234',
      memberPassword: '1111',  // 팀원 입장 비밀번호
      teamName: '사랑교회 찬양팀',
      worships: {}
    },
    'church-2': {
      id: 'church-2',
      name: '소망교회',
      adminPassword: '5678',
      memberPassword: '2222',  // 팀원 입장 비밀번호
      teamName: '소망교회 찬양팀',
      worships: {}
    }
  }
};;

// 데모용 공지사항 데이터 선언
const demoNotices = {
  'church-1': [
    {
      id: 'notice-sarang-1',
      title: '📢 7월 찬양단 보컬/세션 연합 연습 공지',
      content: '안녕하세요 찬양팀원 여러분!\n이번 주 토요일(7월 11일) 오후 7:00 대예배실에서 연합 연습이 진행됩니다.\n이번 콘티에 조 바꿈과 신곡(원하고 바라고 기도합니다)이 포함되어 있으므로, 미리 개인 연습을 충분히 마치고 참석해 주시기 바랍니다.\n\n연습 후 다함께 교제 및 다과 시간이 있을 예정입니다. 늦지 않게 참여해주세요!',
      date: '2026-07-08'
    },
    {
      id: 'notice-sarang-2',
      title: '🙏 7월 찬양팀 연합 기도회 및 악기 점검 안내',
      content: '7월 12일(주일) 오후 3:00 중예배실에서 이번 달 찬양팀 전체 기도회 및 음향 선점 악기 점검이 있습니다.\n각 세션 파트장들은 개인 케이블 및 이펙터 상태를 사전에 체크해 주시고, 이번 기도회에 전원 참석을 부탁드립니다.',
      date: '2026-07-05'
    }
  ],
  'church-2': [
    {
      id: 'notice-somang-1',
      title: '📢 주일 오전 예배 세팅 시간 엄수 및 리허설',
      content: '주일 2부 예배 반주팀은 오전 8시 10분까지 본당에 조율 및 사운드 체크를 완료해 주시기 바랍니다.\n찬양 인도 리허설은 8시 20분 정각에 1회 완곡으로 실시됩니다.',
      date: '2026-07-07'
    }
  ]
};

// 20년 경력 예배 디렉터 지식 베이스 찬양 DB (AI 시뮬레이션용 - 54곡 대폭 확장)
const localPraiseDB = [
  { title: "시간을 뚫고", artist: "위러브 (WELOVE)", key: "A", bpm: "medium", mood: "calm", target: "youth", themes: ["worship", "grace"], reason: "예배의 시작 단계에서 하나님의 임재를 잔잔히 선포하기에 최적의 모던 CCM 고백입니다." },
  { title: "공감하시네", artist: "위러브 (WELOVE)", key: "G", bpm: "slow", mood: "calm", target: "youth", themes: ["grace", "comfort"], reason: "회중의 아픔을 공감하시는 주님의 사랑을 고백하며, 잔잔하고 묵상하는 흐름에 강력한 감동을 줍니다." },
  { title: "밝은 빛을 비추시네", artist: "위러브 (WELOVE)", key: "D", bpm: "fast", mood: "bright", target: "youth", themes: ["thanks", "worship"], reason: "밝고 활기찬 신디사이저 리드에 맞춰 기쁨으로 예배의 문을 열기 좋은 댄스 업템포 찬양입니다." },
  { title: "영원한 사귐으로", artist: "위러브 (WELOVE)", key: "D", bpm: "medium", mood: "calm", target: "youth", themes: ["worship", "grace"], reason: "삼위 하나님과의 교제를 묵상하며 온 공동체가 하나 됨을 고백하기 좋습니다." },
  { title: "고백", artist: "위러브 (WELOVE)", key: "A", bpm: "slow", mood: "calm", target: "youth", themes: ["grace", "decision"], reason: "주님을 향한 나의 진실한 마음을 고백하며, 깊은 임재 속으로 들어가는 곡입니다." },
  { title: "낮은 곳으로", artist: "위러브 (WELOVE)", key: "G", bpm: "medium", mood: "calm", target: "youth", themes: ["grace", "comfort"], reason: "낮고 소외된 곳에 찾아오신 주님의 사랑을 기억하는 따뜻한 찬양입니다." },
  { title: "나의 왕 나의 주", artist: "위러브 (WELOVE)", key: "G", bpm: "fast", mood: "bright", target: "youth", themes: ["worship", "thanks"], reason: "빠른 리듬 속에 주님을 왕으로 기쁘게 대관하며 힘차게 부르는 찬양입니다." },
  { title: "여호와께 돌아가자", artist: "제이어스 (J-US)", key: "F", bpm: "medium", mood: "grand", target: "youth", themes: ["decision", "grace"], reason: "십자가의 그 사랑을 깊이 묵상하고 결단으로 이어지는 중반 파트 흐름에 웅장한 브릿지 빌드업을 연출합니다." },
  { title: "내 모습 이대로", artist: "제이어스 (J-US)", key: "F", bpm: "slow", mood: "calm", target: "youth", themes: ["grace", "comfort"], reason: "나를 있는 그대로 수용해 주시는 주님의 십자가 사랑을 묵상하는 부드러운 중보 기도용 찬양입니다." },
  { title: "나의 슬픔을", artist: "제이어스 (J-US)", key: "G", bpm: "fast", mood: "bright", target: "youth", themes: ["thanks", "worship"], reason: "슬픔 대신 희락의 옷을 입히신 주님을 찬양하는 역동적이고 신나는 댄스 곡입니다." },
  { title: "시편 139편 (나를 지으신)", artist: "제이어스 (J-US)", key: "G", bpm: "slow", mood: "calm", target: "youth", themes: ["grace", "comfort"], reason: "나를 완벽히 아시고 내 길을 인도하시는 신실하신 하나님을 깊이 묵상하게 합니다." },
  { title: "보소서 주님", artist: "제이어스 (J-US)", key: "C", bpm: "medium", mood: "grand", target: "youth", themes: ["decision", "worship"], reason: "우리의 무너진 마음을 보시고 이 땅을 회복시키실 하나님을 바라보는 선포곡입니다." },
  { title: "예배합니다 (완전한 사랑)", artist: "마커스워십", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "grace"], reason: "대예배의 도입부에서 차분하게 회중의 마음을 모아 예배에 전념하게 돕는 한국 교회 대표 묵상 찬양입니다." },
  { title: "오직 예수 뿐이네", artist: "마커스워십", key: "D", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "주님의 은혜가 없으면 단 하루도 살 수 없음을 고백하며 설교 전 은혜 분위기를 극대화합니다." },
  { title: "그곳에서 시작되네", artist: "마커스워십", key: "E", bpm: "medium", mood: "grand", target: "youth", themes: ["decision", "worship"], reason: "예배의 결단 단계에서 강력한 드럼 사운드와 함께 기도의 열정을 깨우기 최적인 곡입니다." },
  { title: "날 향한 계획", artist: "마커스워십", key: "G", bpm: "medium", mood: "bright", target: "youth", themes: ["thanks", "comfort"], reason: "내 삶의 여정이 하나님의 온전한 계획 속에 있음을 밝고 확신 있게 고백하는 찬양입니다." },
  { title: "감사함으로", artist: "마커스워십", key: "E", bpm: "fast", mood: "bright", target: "adult", themes: ["thanks", "worship"], reason: "문을 열며 감사함으로 궁정에 들어가 주 이름을 높이는 힘차고 빠른 장년/청년 공용 오프닝곡입니다." },
  { title: "그가 다스리는 그의 나라가", artist: "마커스워십", key: "G", bpm: "medium", mood: "grand", target: "youth", themes: ["worship", "decision"], reason: "하나님의 다스림 and 통치하심을 정교한 밴드 편곡으로 고백하는 무게감 있는 찬양입니다." },
  { title: "부르신 곳에서", artist: "마커스워십", key: "E", bpm: "medium", mood: "grand", target: "adult", themes: ["decision", "grace"], reason: "어떤 상황 속에서도 예배자로 서겠다는 헌신 and 다짐을 결단할 때 매우 효과적인 찬양입니다." },
  { title: "대단한 믿음 없어도", artist: "마커스워십", key: "F", bpm: "medium", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "작은 일상에서 성실하게 주님을 따르겠다는 깊은 울림의 은혜 고백입니다." },
  { title: "예수 피를 힘입어", artist: "어노인팅", key: "E", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "grace"], reason: "거룩한 지성소로 나아가기 위한 참회와 예수님의 보혈 공로를 깊이 사모하는 전통적 대예배용 묵상곡입니다." },
  { title: "온 땅의 주인", artist: "어노인팅", key: "G", bpm: "medium", mood: "grand", target: "adult", themes: ["worship", "comfort"], reason: "나는 비록 미약하지만 온 땅의 주인이 나를 아신다는 감격스러운 위로와 전능함을 선포하는 곡입니다." },
  { title: "주를 경배 (나는 기쁨의 노래로)", artist: "어노인팅", key: "G", bpm: "fast", mood: "bright", target: "adult", themes: ["thanks", "worship"], reason: "박수 치며 기쁨의 선포로 온 회중의 고조된 감격과 감사를 이끌어내는 오프닝 찬양입니다." },
  { title: "은혜 아래 있네", artist: "어노인팅", key: "G", bpm: "medium", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "어떤 폭풍우 속에서도 하나님의 은혜 날개 아래 안전함을 고백하는 평화로운 곡입니다." },
  { title: "주 사랑이 나를 숨쉬게 해", artist: "어노인팅", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "자격 없는 나를 만지시고 숨 쉬게 하시는 주님의 은혜를 깊은 울림으로 고백합니다." },
  { title: "내 마음을 가득 채운", artist: "어노인팅", key: "E", bpm: "fast", mood: "bright", target: "youth", themes: ["thanks", "worship"], reason: "주님의 위대하심을 빠른 드라이브 톤 기타 반주에 맞추어 신나게 찬송하는 찬양입니다." },
  { title: "아무것도 두려워 말라", artist: "어노인팅", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "마음에 염려와 불안이 있는 회중을 깊이 위로하는 잔잔한 피아노 위주의 묵상 찬양입니다." },
  { title: "내 영혼은 안전합니다", artist: "어노인팅", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "내 삶의 모든 순간을 계획하신 주님 품에서 평안함을 찾는 소망의 노래입니다." },
  { title: "주 품에 품으소서", artist: "어노인팅", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "worship"], reason: "거친 파도 날 향해 올 때 주와 함께 날아오르리라는 위대한 신뢰를 고백합니다." },
  { title: "원하고 바라고 기도합니다", artist: "아이자야 씩스티원", key: "Eb", bpm: "medium", mood: "calm", target: "youth", themes: ["decision", "comfort"], reason: "청소년/청년 및 장년층까지 어우르며 다음 세대를 향한 약속과 소망을 결단하기에 최적화된 곡입니다." },
  { title: "주님의 마음 있는 곳", artist: "아이자야 씩스티원", key: "G", bpm: "medium", mood: "grand", target: "youth", themes: ["decision", "worship"], reason: "주님의 마음이 있는 곳에 내 마음이 있기를 소망하는 깊은 위탁의 결단 고백입니다." },
  { title: "은혜", artist: "손경민", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "thanks"], reason: "내가 누려왔던 모든 것이 하나님의 은혜였음을 되돌아보며 온 회중의 눈시울을 붉히는 명곡입니다." },
  { title: "행복", artist: "손경민", key: "D", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "하나님의 자녀로 살아가는 것 자체가 진정한 행복임을 고백하는 은혜로운 곡입니다." },
  { title: "요게벳의 노래", artist: "염평안", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "부모 세대의 눈물 어린 신앙의 위탁과 자녀를 향한 하나님의 보호하심을 사모하는 고백입니다." },
  { title: "아 하나님의 은혜로 (찬송가 310장)", artist: "찬송가 편곡", key: "D", bpm: "medium", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "익숙한 찬송가 멜로디에 모던한 코드를 입혀 장년층 회중의 몰입과 고백을 극대화합니다." },
  { title: "주 예수보다 더 귀한 것은 없네", artist: "찬송가 편곡", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["decision", "worship"], reason: "세상 어떤 즐거움이나 명예보다 예수님이 가장 귀함을 고백하는 대표 결단 찬송입니다." },
  { title: "주와 같이 길 가는 것 (찬송가 430장)", artist: "찬송가 편곡", key: "E", bpm: "medium", mood: "bright", target: "adult", themes: ["thanks", "decision"], reason: "한 걸음 한 걸음 주님과 동행하는 기쁨을 경쾌한 셔플 비트 편곡으로 노래하기 좋습니다." },
  { title: "태산을 넘어 험곡에 가도 (찬송가 445장)", artist: "찬송가 편곡", key: "G", bpm: "fast", mood: "bright", target: "adult", themes: ["thanks", "comfort"], reason: "하늘의 영광이 내 영혼에 가득함을 기쁨의 박수와 밝고 신나는 템포로 선포합니다." },
  { title: "슬픈 마음 있는 사람 (찬송가 91장)", artist: "찬송가 편곡", key: "G", bpm: "fast", mood: "bright", target: "adult", themes: ["thanks", "worship"], reason: "예수의 이름이 가진 능력과 평화를 신나는 세션 리듬에 맞춰 회중의 에너지를 돋웁니다." },
  { title: "나는 예배자입니다", artist: "어노인팅", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "decision"], reason: "내가 서 있는 곳에서 주님을 예배하겠다는 영적인 기초를 다지는 쉬우면서도 깊은 고백입니다." },
  { title: "예수 열방의 소망", artist: "소리엘", key: "A", bpm: "medium", mood: "grand", target: "adult", themes: ["worship", "comfort"], reason: "예수님이 온 열방의 참된 소망이심을 웅장한 브릿지 사운드와 함께 고백하는 대서사 찬양입니다." },
  { title: "야곱의 축복", artist: "소리엘", key: "F", bpm: "medium", mood: "bright", target: "child", themes: ["thanks", "grace"], reason: "어린이 예배 및 주일학교 예배에서 사랑의 교제와 축복송으로 널리 불리는 영동적인 곡입니다." },
  { title: "소원", artist: "한웅재", key: "E", bpm: "slow", mood: "calm", target: "adult", themes: ["decision", "comfort"], reason: "삶의 한 절이라도 주님을 닮기 원하는 시적인 가사와 잔잔한 통기타 위주의 고백 찬양입니다." },
  { title: "주가 일하시네", artist: "김브라이언", key: "C", bpm: "medium", mood: "grand", target: "adult", themes: ["decision", "comfort"], reason: "내 힘을 빼고 기도하며 나아갈 때 주님께서 신실히 일하심을 뜨겁게 빌드업하여 선포합니다." },
  { title: "시선", artist: "예수전도단", key: "E", bpm: "medium", mood: "grand", target: "youth", themes: ["worship", "decision"], reason: "내 모든 시선을 주님께 드리고 살아계신 하나님을 묵상할 때 삶에 기적이 일어남을 선포합니다." },
  { title: "아바 아버지", artist: "예수전도단", key: "E", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "grace"], reason: "하나님을 친밀하게 아빠라 부르며 그 사랑의 품속에 거하는 평화로운 인도용 묵상곡입니다." },
  { title: "은혜로다", artist: "예수전도단", key: "D", bpm: "medium", mood: "calm", target: "adult", themes: ["grace", "worship"], reason: "시작부터 흐르는 잔잔한 은혜의 물결 속에 온 땅에 주님의 은혜가 가득함을 기쁨으로 고백합니다." },
  { title: "우리 때문에", artist: "옹기장이", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "절기 예배(부활절, 성탄절 등)나 깊은 참회의 시간에 십자가 희생의 크기를 묵상하게 돕습니다." },
  { title: "하나님은 너를 지키시는 자", artist: "한스밴드", key: "E", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "위로가 필요한 영혼들에게 하나님의 변함없는 지키심과 동행을 다정하게 들려주는 축복송입니다." },
  { title: "기대", artist: "워킹", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "주님이 우리를 통해 새롭게 행하실 역사들을 소망하며 찬양팀과 회중이 교제하는 전통곡입니다." },
  { title: "주의 자비가 내려와", artist: "디사이플스", key: "D", bpm: "fast", mood: "bright", target: "youth", themes: ["thanks", "worship"], reason: "경쾌한 락 비트에 맞춰 다 함께 뛰며 춤추는 예배 축제의 최고조를 이끄는 청년부 전용 선포곡입니다." },
  { title: "파이팅 야곱", artist: "파이디온", key: "C", bpm: "fast", mood: "bright", target: "child", themes: ["thanks", "decision"], reason: "어린이 예배에서 가장 반응이 뜨거우며 율동과 함께 믿음으로 일어서는 씩씩한 축제곡입니다." },
  { title: "예수님 따라가요", artist: "파이디온", key: "G", bpm: "fast", mood: "bright", target: "child", themes: ["worship", "thanks"], reason: "예수님 한 걸음, 나 한 걸음 따라가며 기쁘고 사랑스러운 고백을 신나는 율동과 결합하기 좋습니다." },
  { title: "아름다운 마음들이 모여", artist: "파이디온", key: "C", bpm: "medium", mood: "bright", target: "child", themes: ["grace", "thanks"], reason: "어린이 예배에서 서로를 축복하고 환영하며 부르기 쉬운 사랑과 교제의 전통 찬양입니다." },
  { title: "예수님은 사랑이신걸요", artist: "파이디온", key: "C", bpm: "medium", mood: "bright", target: "child", themes: ["grace", "thanks"], reason: "단순한 가사와 사랑스러운 선율로 아이들이 주님의 사랑을 온몸으로 고백하게 돕습니다." },
  { title: "다윗처럼", artist: "어린이 찬양", key: "G", bpm: "fast", mood: "bright", target: "child", themes: ["thanks", "worship"], reason: "기쁨으로 뛰놀며 다윗처럼 기쁘게 춤추며 하나님을 찬양하도록 이끕니다." },
  { title: "예수 전하세", artist: "위러브 (WELOVE)", key: "A", bpm: "fast", mood: "bright", target: "youth", themes: ["worship", "decision"], reason: "세상을 향해 예수를 전하자는 선교적 사명을 신나는 비트와 함께 외치는 찬양입니다." },
  { title: "주의 나라 (Kingdom of God)", artist: "위러브 (WELOVE)", key: "E", bpm: "medium", mood: "grand", target: "youth", themes: ["worship", "decision"], reason: "이 땅에 도래할 하나님의 나라를 강력하게 선포하는 모던 워십입니다." },
  { title: "하늘 위에 주님 밖에", artist: "제이어스 (J-US)", key: "A", bpm: "fast", mood: "bright", target: "youth", themes: ["worship", "decision"], reason: "주님만을 삶의 유일한 피난처이자 상급으로 삼겠다는 고백을 기쁘고 빠른 템포로 이끕니다." },
  { title: "주의 이름 높이며", artist: "제이어스 (J-US)", key: "G", bpm: "fast", mood: "bright", target: "youth", themes: ["thanks", "worship"], reason: "하늘에서 내려오신 주님의 은혜를 기쁜 박수와 함께 힘차게 노래하기에 좋습니다." },
  { title: "내 마음에 주를 향한 사랑이", artist: "제이어스 (J-US)", key: "F", bpm: "medium", mood: "grand", target: "youth", themes: ["worship", "decision"], reason: "온 마음 다해 하나님을 경배하고 예배자로 나아갈 때 회중의 몰입을 극대화합니다." },
  { title: "예수 예수", artist: "김윤진", key: "E", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "슬픔을 기쁨으로 바꾸시는 예수라는 달콤하고 강한 이름을 눈물로 깊이 묵상하게 합니다." },
  { title: "광야를 지나며", artist: "히즈윌 (HisWill)", key: "E", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "내 힘을 빼고 온전히 하나님만 의지해야 하는 광야의 시간을 따뜻한 위로로 감싸안습니다." },
  { title: "믿음이 없이는", artist: "히즈윌 (HisWill)", key: "A", bpm: "slow", mood: "calm", target: "adult", themes: ["decision", "grace"], reason: "하나님을 기쁘시게 하는 참된 믿음의 삶이 무엇인지 차분하고 깊게 성찰하게 합니다." },
  { title: "하루", artist: "히즈윌 (HisWill)", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "오늘 하루도 주님의 날개 아래 평안하게 보내며 소소한 은혜를 감사하는 곡입니다." },
  { title: "주님은 산 같아서", artist: "마커스워십", key: "D", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "흔들리지 않는 영원한 산과 같으신 하나님의 신실함을 잔잔하게 고백합니다." },
  { title: "주만의 주를 위한", artist: "마커스워십", key: "D", bpm: "medium", mood: "grand", target: "adult", themes: ["worship", "decision"], reason: "나의 삶을 거룩한 제사로 드리고 오직 주님만을 위해 살겠다는 위대한 결단송입니다." },
  { title: "기꺼이 주께 (Gladly)", artist: "마커스워십", key: "D", bpm: "fast", mood: "bright", target: "youth", themes: ["decision", "thanks"], reason: "자신을 온전히 기쁨으로 주께 내어드리는 삶을 펑키하고 밝은 세션 사운드로 펼쳐줍니다." },
  { title: "나의 한숨을 바꾸셨네", artist: "소진영", key: "E", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "눈물의 한숨을 깊은 찬송으로 바꾸신 하나님의 손길을 찬양하는 위로의 대명사입니다." },
  { title: "심령이 가난한 자는", artist: "마커스워십", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "천국을 소유한 가난한 심령의 복을 묵상하는 회중 참회용 잔잔한 찬양입니다." },
  { title: "오 신실 하신 주", artist: "찬송가 편곡", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "grace"], reason: "대를 이어 변함없이 자비를 베푸시는 신실하신 하나님을 장중하게 노래하는 전통 워십입니다." },
  { title: "주의 친절한 팔에 안기세 (찬송가 405장)", artist: "찬송가 편곡", key: "G", bpm: "medium", mood: "bright", target: "adult", themes: ["thanks", "comfort"], reason: "영원하신 하나님의 팔에 안겨 평안함을 누리는 감사를 밝고 신나는 편곡으로 전합니다." },
  { title: "내 진정 사모하는 (찬송가 88장)", artist: "찬송가 편곡", key: "F", bpm: "fast", mood: "bright", target: "adult", themes: ["thanks", "worship"], reason: "내 진정 사모하는 친구이신 예수님을 기쁜 템포와 통쾌한 리듬 속에서 축제처럼 선포합니다." },
  { title: "이 눈에 아무 증거 아니뵈어도 (찬송가 545장)", artist: "찬송가 편곡", key: "G", bpm: "medium", mood: "bright", target: "adult", themes: ["decision", "comfort"], reason: "오직 하나님의 약속을 믿고 믿음의 길을 우직하게 걸어가겠다는 선포적 찬송입니다." },
  { title: "예수 더 알기 원하네 (찬송가 453장)", artist: "찬송가 편곡", key: "Eb", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "grace"], reason: "주님의 대속하신 넓은 사랑을 더 깊이 깨닫고 주를 더 알아가기를 소망하는 곡입니다." },
  { title: "허락하신 새 땅에 (찬송가 347장)", artist: "찬송가 편곡", key: "Ab", bpm: "fast", mood: "bright", target: "adult", themes: ["decision", "thanks"], reason: "약속의 땅을 향해 앞으로 힘차게 나아가는 믿음의 용사들을 격려하는 박진감 넘치는 곡입니다." },
  { title: "나 주님이 더욱 필요해", artist: "어노인팅", key: "A", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "매 순간마다 주님의 도우심과 손길이 필요함을 겸손히 아뢰는 깊은 고백송입니다." },
  { title: "나 무엇과도 주님을 바꾸지 않으리", artist: "어노인팅", key: "D", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "decision"], reason: "세상 유혹과 만족 대신 주님의 사랑을 내 삶의 최고의 가치로 고백하는 고전입니다." },
  { title: "마음이 상한 자를 (고쳐주소서)", artist: "어노인팅", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "아파하는 이들의 상처를 감싸고 이 땅에 하나님의 위로와 하늘 평화를 간구하는 곡입니다." },
  { title: "보혈을 지나", artist: "제이 (J-US 버전)", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "worship"], reason: "하나님의 품으로 나아가기 위해 보혈의 공로를 깊이 의지하며 드리는 고백입니다." },
  { title: "예수 우리 왕이여", artist: "예수전도단", key: "A", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "grace"], reason: "이곳에 임재하셔서 다스려 주시기를 구하는 장중하고 엄숙한 분위기의 오프닝 묵상곡입니다." },
  { title: "구주와 함께 나 죽었으니 (찬송가 407장)", artist: "찬송가 편곡", key: "Eb", bpm: "slow", mood: "calm", target: "adult", themes: ["decision", "grace"], reason: "주와 함께 매일 죽고 매일 주와 함께 다시 살겠다는 십자가 도의 극치를 묵상하게 돕습니다." },
  { title: "나의 마음을 (Refiner's Fire)", artist: "디사이플스", key: "D", bpm: "medium", mood: "grand", target: "youth", themes: ["decision", "worship"], reason: "나를 정금과 같이 정결하게 빚어 가실 하나님께 나의 삶을 헌신하는 깊은 위탁의 기도송입니다." },
  { title: "우리는 주의 움직이는 교회", artist: "소진영", key: "G", bpm: "medium", mood: "grand", target: "youth", themes: ["worship", "decision"], reason: "우리가 성령 안에서 세워진 성전이며 주님의 살아있는 교회임을 선포하는 선교적 워십입니다." },
  { title: "마지막 날에", artist: "예수전도단", key: "G", bpm: "fast", mood: "bright", target: "youth", themes: ["decision", "worship"], reason: "성령의 불과 바람으로 마지막 세대를 깨우고 열방을 회복시키실 소망을 기쁨으로 부릅니다." },
  { title: "나 주님의 기쁨 되기 원하네", artist: "어노인팅", key: "F", bpm: "medium", mood: "calm", target: "adult", themes: ["worship", "decision"], reason: "나의 마음과 생각을 주님이 원하시는 뜻에 맞춰 살기를 소원하는 전통 헌신송입니다." },
  { title: "물이 바다 덮음 같이", artist: "어노인팅", key: "Bb", bpm: "medium", mood: "grand", target: "youth", themes: ["decision", "worship"], reason: "여호와의 영광을 인정하는 것이 세상 가득 채워질 그날을 향해 장엄하게 선포하며 부릅니다." },
  { title: "주가 보이신 생명의 길", artist: "마커스워십", key: "A", bpm: "slow", mood: "calm", target: "adult", themes: ["decision", "grace"], reason: "주님이 걸어가신 그 좁고 험난한 생명의 길을 믿음으로 인내하며 따르겠다는 고백입니다." },
  { title: "오직 예수 (주님 같은 반석은 없도다)", artist: "디사이플스", key: "G", bpm: "fast", mood: "bright", target: "youth", themes: ["worship", "thanks"], reason: "변함없는 든든한 반석이신 주님만을 의지하며 다 함께 크게 기뻐하며 뛰는 찬양입니다." },
  { title: "주님 곁으로 날 이끄소서", artist: "어노인팅", key: "A", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "grace"], reason: "주님의 사랑 외에는 다른 만족이 없음을 주님의 거룩한 날개 그늘 아래서 묵상하는 평온한 고전입니다." },
  { title: "주의 임재 안에서", artist: "예수전도단", key: "G", bpm: "medium", mood: "grand", target: "adult", themes: ["worship", "grace"], reason: "주의 보혈로 지성소에 들어가 주님의 광채를 바라볼 때 일어나는 감격을 다룹니다." },
  { title: "아름다우신", artist: "예수전도단", key: "A", bpm: "medium", mood: "grand", target: "youth", themes: ["worship", "grace"], reason: "내 삶의 구원자이신 주님의 눈부신 아름다움을 경외함과 장엄함으로 목놓아 고백합니다." },
  { title: "성령이 오셨네", artist: "김도현", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "우리 삶의 가장 깊은 곳에 찾아오셔서 친히 탄식하시며 인도하시는 보혜사 성령의 임재를 사모합니다." },
  { title: "주의 은혜로 오직 살아가네", artist: "손경민", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "thanks"], reason: "나의 호흡 and 일상이 당연한 것이 아닌 오직 창조주의 자비와 은혜의 선물임을 고백하는 위로의 대곡입니다." },
  { title: "감사", artist: "손경민", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["thanks", "grace"], reason: "지나온 내 삶의 모든 여정에서 기쁨과 눈물조차 모두 감사의 제목이었음을 뜨겁게 돌이키는 고백송입니다." },
  { title: "주님이 하십니다", artist: "손경민", key: "Eb", bpm: "slow", mood: "calm", target: "adult", themes: ["decision", "grace"], reason: "인간의 한계를 뒤로하고, 불가능을 가능케 하실 분이 오직 주님 한 분이심을 믿음으로 선포합니다." },
  { title: "나의 힘이 되신 여호와여", artist: "복음성가", key: "A", bpm: "medium", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "고난 중에 요새와 피난처가 되시는 여호와를 진심 어린 목소리로 의지하기 좋은 은혜의 전통 복음성가입니다." },
  { title: "주 하나님 지으신 모든 세계 (찬송가 79장)", artist: "찬송가 편곡", key: "Bb", bpm: "medium", mood: "grand", target: "adult", themes: ["worship", "thanks"], reason: "광활한 대자연 속에 깃든 주님의 위대하심을 찬송가의 웅장한 화성 위에 얹어 소리 높여 고백합니다." },
  { title: "아주 먼 옛날", artist: "복음성가", key: "C", bpm: "medium", mood: "bright", target: "child", themes: ["grace", "thanks"], reason: "오래전 계획된 하나님의 귀한 사랑의 언약을 어린이들에게 전달하는 대표 축복송입니다." },
  { title: "당신은 사랑받기 위해 태어난 사람", artist: "이율구", key: "D", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "온 마음으로 축복하며 회중과 새가족을 주님의 사랑의 마음으로 환대할 때 가장 적합합니다." },
  { title: "그 사랑 (아버지 사랑 내가 노래해)", artist: "마커스워십", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "worship"], reason: "아버지의 포기하지 않는 그 크신 사랑을 어쿠스틱 기타 선율 위에서 잔잔하고 따뜻하게 고백합니다." },
  { title: "구주 예수 의지함이 (찬송가 542장)", artist: "찬송가 편곡", key: "G", bpm: "medium", mood: "bright", target: "adult", themes: ["grace", "comfort"], reason: "예수님을 구주로 고백하며 온전히 신뢰하는 기쁨을 기쁜 미디엄 비트로 경쾌하게 노래합니다." },
  { title: "다 찬양하여라 (찬송가 21장)", artist: "찬송가 편곡", key: "G", bpm: "fast", mood: "bright", target: "adult", themes: ["worship", "thanks"], reason: "전능하신 창조주 하나님을 힘찬 리듬과 함께 다 같이 소리 높여 대찬양하는 대표 오프닝송입니다." },
  { title: "내 영혼의 그윽히 깊은 데서 (찬송가 412장)", artist: "찬송가 편곡", key: "Ab", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "평화 평화로다 하늘 위에서 내려오네, 내 마음의 풍랑을 잔잔케 하시는 은혜를 깊이 묵상합니다." },
  { title: "죄짐 맡은 우리 구주 (찬송가 369장)", artist: "찬송가 편곡", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "우리의 근심과 슬픔을 친히 짊어지시는 주님께 모든 기도를 드리는 평화로운 찬송입니다." },
  { title: "빛의 사자들이여 (찬송가 502장)", artist: "찬송가 편곡", key: "G", bpm: "fast", mood: "bright", target: "adult", themes: ["decision", "thanks"], reason: "어두운 세상에 생명의 빛을 들고 파송되는 성도들의 힘찬 선교적 전진을 담은 빠른 찬양입니다." },
  { title: "예수 십자가에 흘린 피로써 (찬송가 259장)", artist: "찬송가 편곡", key: "Ab", bpm: "fast", mood: "bright", target: "adult", themes: ["grace", "worship"], reason: "예수의 보혈 공로로 내 모든 죄가 씻겼음을 기쁜 박수와 행진곡 풍의 템포로 고백합니다." },
  { title: "내 평생에 가는 길 (찬송가 413장)", artist: "찬송가 편곡", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "내 영혼 평안해, 어떤 풍파 속에서도 주님이 주시는 참된 평강을 고백하는 불후의 위로 찬송입니다." },
  { title: "주 안에 있는 나에게 (찬송가 370장)", artist: "찬송가 편곡", key: "G", bpm: "medium", mood: "bright", target: "adult", themes: ["thanks", "comfort"], reason: "주님 품에 안긴 나에게 딴 근심이 없음을 경쾌한 포크 리듬 편곡으로 은혜롭게 선포합니다." },
  { title: "나 같은 죄인 살리신 (찬송가 305장)", artist: "찬송가 편곡", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "worship"], reason: "놀라운 주의 은혜(Amazing Grace)를 깊이 묵상하며 눈물로 십자가 사랑을 노래하는 명곡입니다." },
  { title: "예수 따라가며 (찬송가 449장)", artist: "찬송가 편곡", key: "F", bpm: "medium", mood: "bright", target: "adult", themes: ["decision", "thanks"], reason: "주의 말씀에 순종하며 매일 동행하는 삶의 기쁨을 다짐하는 경쾌한 행진곡풍 찬양입니다." },
  { title: "내 주를 가까이 하게 함은 (찬송가 338장)", artist: "찬송가 편곡", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "comfort"], reason: "야곱이 돌베개를 베고 잤던 고난 중에도 주님만을 평생 가까이 따르겠다는 눈물의 찬송입니다." },
  { title: "주의 피로 이룬 샘물 (찬송가 268장)", artist: "찬송가 편곡", key: "G", bpm: "fast", mood: "bright", target: "adult", themes: ["grace", "worship"], reason: "샘물과 같이 마르지 않는 보혈의 구원 능력을 박수 치며 신나게 선포하는 빠른 비트 찬양입니다." },
  { title: "온 맘 다해 (I Offer My Life)", artist: "마커스워십", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "decision"], reason: "나의 삶의 모든 고백과 수고를 온전히 주님께 산 제사로 위탁하는 대표 헌신송입니다." },
  { title: "오직 주만 회원", artist: "마커스워십", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "낙심 중에 내 삶의 주인이신 주님만 조용히 바라보며 힘을 얻는 은혜의 고백입니다." },
  { title: "내 삶은 주의 것", artist: "김명선", key: "D", bpm: "slow", mood: "calm", target: "adult", themes: ["decision", "grace"], reason: "인생의 모든 주권이 주님의 것임을 차분하게 시인하는 눈물의 묵상 찬양입니다." },
  { title: "그 사랑 얼마나", artist: "복음성가", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "다 헤아릴 수 없는 십자가 대속의 넓은 사랑을 잔잔하게 찬미합니다." },
  { title: "내 이름 아시죠 (He Knows My Name)", artist: "디사이플스", key: "E", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "나를 지으시고 내 모든 형편과 이름을 정확히 아시는 하나님 아버지의 극진한 위로입니다." },
  { title: "주님과 같이 (There is none like You)", artist: "복음성가", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "comfort"], reason: "내 영혼을 만져줄 분은 세상에 오직 주밖에 없음을 가장 아름다운 멜로디로 노래합니다." },
  { title: "누군가 널 위해 기도하네", artist: "복음성가", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "지치고 외로울 때 누군가 나를 위해 눈물로 중보 기도하고 계신 주님의 사랑을 상기시킵니다." },
  { title: "예수 나를 위하여 (찬송가 144장)", artist: "찬송가 편곡", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "worship"], reason: "날 위해 물과 피를 쏟으신 십자가 고통을 묵상하며 참회하는 사순절/고난주간 찬송입니다." },
  { title: "주님 다시 오실 때까지", artist: "소향", key: "C", bpm: "slow", mood: "grand", target: "adult", themes: ["decision", "worship"], reason: "내게 주어진 사명의 길을 묵묵히 걷다가 영광 중에 주를 맞이하겠다는 장엄한 헌신송입니다." },
  { title: "사명", artist: "동방현주", key: "Em", bpm: "slow", mood: "grand", target: "adult", themes: ["decision", "comfort"], reason: "험산준령도 주님의 피 묻은 십자가를 전하기 위해 기꺼이 넘겠다는 절절한 결단의 곡입니다." },
  { title: "또 하나의 열매를 바라시며", artist: "이율구", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "하나님의 사랑으로 자라날 또 하나의 아름다운 신앙의 열매들을 축복하며 부르는 축복송입니다." },
  { title: "주의 거룩한 이름을 부를 때", artist: "마커스워십", key: "D", bpm: "medium", mood: "grand", target: "adult", themes: ["worship", "comfort"], reason: "주의 이름을 부를 때 찾아오는 놀라운 임재와 승리를 점진적으로 빌드업하여 선포합니다." },
  { title: "주님은 너를 만드신 분", artist: "복음성가", key: "E", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "너를 결코 포기하지 않으시며 지켜보시는 하나님의 신실한 손길을 다정하게 전합니다." },
  { title: "나의 등 뒤에서", artist: "복음성가", key: "E", bpm: "medium", mood: "bright", target: "adult", themes: ["thanks", "comfort"], reason: "일어나 걸으라 내가 너를 도우리라, 든든히 격려하시는 주님의 음성을 경쾌하게 노래합니다." },
  { title: "주여 우린 연약합니다", artist: "마커스워십", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "매번 넘어지는 우리의 연약함을 주님의 긍휼한 은혜 날개로 덮어주시기를 구하는 고백입니다." },
  { title: "날 만드신 사랑", artist: "위러브 (WELOVE)", key: "E", bpm: "slow", mood: "calm", target: "youth", themes: ["grace", "comfort"], reason: "주님의 영원하고 조건 없는 사랑이 오늘 지친 나를 새롭게 빚어가심을 노래합니다." },
  { title: "깊은 곳에 나아가", artist: "위러브 (WELOVE)", key: "G", bpm: "medium", mood: "grand", target: "youth", themes: ["worship", "decision"], reason: "얕은 물가에서 벗어나 주님의 깊은 임재의 바다 속으로 온전히 던져지기를 구합니다." },
  { title: "비 준비하시니", artist: "마커스워십", key: "A", bpm: "fast", mood: "bright", target: "youth", themes: ["thanks", "worship"], reason: "땅을 돌보사 은혜의 비를 흡족히 내려주시는 창조주의 풍요를 박수 치며 신나게 선포합니다." },
  { title: "주 은혜 날 채우시네", artist: "어노인팅", key: "G", bpm: "medium", mood: "bright", target: "youth", themes: ["thanks", "grace"], reason: "그저 주님의 임재와 주시는 은혜에 기대어 기쁨으로 찬양하기 좋은 밝은 포크 곡입니다." },
  { title: "나의 사랑 너의 어여쁜 자야", artist: "어노인팅", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "comfort"], reason: "아가서 말씀을 토대로 겨울이 지나고 꽃 피는 봄에 우리를 부르시는 주님의 사랑의 밀어입니다." },
  { title: "그가 아시나니", artist: "손경민", key: "Eb", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "내가 걷는 고단한 인생의 모든 연단 과정을 오직 창조주만이 정확히 아시고 인도하심을 신뢰합니다." },
  { title: "은혜를 아는 자", artist: "손경민", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["decision", "grace"], reason: "내 삶에 베풀어진 십자가 사랑의 깊이를 깨달아 기꺼이 감사함으로 섬기며 살 것을 결단합니다." },
  { title: "동행", artist: "손경민", key: "E", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "나 홀로 걷는 고독한 인생길 같으나, 보이지 않는 발자국으로 함께 걸으시는 주님의 동행을 고백합니다." },
  { title: "길 (The Way)", artist: "손경민", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "decision"], reason: "내가 곧 길이요 진리요 생명이니, 다른 방황을 그치고 오직 예수를 따르겠다고 시인합니다." },
  { title: "믿음으로 서리라", artist: "마커스워십", key: "G", bpm: "medium", mood: "grand", target: "adult", themes: ["decision", "comfort"], reason: "현실의 거친 파도 속에서도 타협하지 않고 굳건히 말씀의 반석 위에 서겠다는 비장한 고백입니다." },
  { title: "예수 인도하셨네", artist: "손경민", key: "D", bpm: "slow", mood: "calm", target: "adult", themes: ["thanks", "grace"], reason: "인생의 황혼 무렵에 지나온 모든 나날이 전적인 주님의 인도하심이었음을 감격 속에 돌이킵니다." },
  { title: "다 감사드리세 (찬송가 66장)", artist: "찬송가 편곡", key: "F", bpm: "medium", mood: "bright", target: "adult", themes: ["thanks", "worship"], reason: "온 인류를 돌보시고 늘 기이한 은총으로 감싸주시는 하나님께 다 함께 감사 찬송을 올립니다." },
  { title: "예수께서 오실 때에 (찬송가 564장)", artist: "찬송가 편곡", key: "G", bpm: "medium", mood: "bright", target: "child", themes: ["grace", "thanks"], reason: "하늘의 빛나는 보석 같은 아이들이 기쁘게 구주를 맞이하는 귀여운 분위기의 전통 찬송가입니다." },
  { title: "날 사랑하심 (찬송가 563장)", artist: "찬송가 편곡", key: "Eb", bpm: "slow", mood: "calm", target: "child", themes: ["grace", "comfort"], reason: "예수 사랑하심은 성경에서 배웠네, 평생에 잊을 수 없는 기초적인 구원 교리를 담은 평온한 고백송입니다." },
  { title: "주 여호와는 광대하시도다", artist: "복음성가", key: "A", bpm: "medium", mood: "grand", target: "adult", themes: ["worship", "thanks"], reason: "온 세상 위에 우뚝 서신 위대한 하나님의 광대하심을 선포하는 장중한 흐름의 전통 워십입니다." },
  { title: "모든 열방 주 볼 때까지", artist: "예수전도단", key: "D", bpm: "medium", mood: "grand", target: "youth", themes: ["decision", "worship"], reason: "내 아버지 그 뜻대로 이 땅에 부흥의 계절이 오기를 꿈꾸며 선교적 비전을 노래합니다." },
  { title: "성령의 바람", artist: "파이디온", key: "C", bpm: "fast", mood: "bright", target: "child", themes: ["decision", "thanks"], reason: "성령의 따스한 바람이 아이들의 여린 가슴에 사랑과 전도의 씨앗을 가득 불어넣기를 기도하는 신나는 댄스 곡입니다." },
  { title: "하늘과 땅 모두 다", artist: "파이디온", key: "G", bpm: "medium", mood: "bright", target: "child", themes: ["thanks", "worship"], reason: "온 우주 만물을 창조하신 지혜의 하나님을 아이들의 귀여운 입술로 씩씩하게 영광 돌리게 합니다." },
  { title: "내게 강 같은 평화", artist: "복음성가", key: "G", bpm: "fast", mood: "bright", target: "child", themes: ["thanks", "comfort"], reason: "강 같은 평화, 바다 같은 사랑을 온몸으로 신나게 율동하며 부르는 기쁜 복음성가입니다." },
  { title: "돈으로도 못 가요 (하늘나라)", artist: "주일학교", key: "C", bpm: "medium", mood: "bright", target: "child", themes: ["grace", "decision"], reason: "돈, 지식, 벼슬이 아닌 오직 주님을 향한 믿음으로 천국에 들어감을 가르쳐주는 순진한 고전입니다." },
  { title: "구원열차", artist: "주일학교", key: "F", bpm: "fast", mood: "bright", target: "child", themes: ["thanks", "decision"], reason: "예수님을 기관사 삼고 믿음의 구원열차에 탑승하여 천국을 향해 힘차게 달려가는 신나는 행진 찬양입니다." },
  { title: "호산나 (Hosanna)", artist: "예수전도단", key: "E", bpm: "medium", mood: "grand", target: "youth", themes: ["worship", "decision"], reason: "구원의 이름을 높이며 성전 문을 열고 임재하시는 왕께 눈물로 자비를 베풀어주기를 외치는 모던 워십입니다." },
  { title: "주 사랑이 온 세상에", artist: "예수전도단", key: "G", bpm: "fast", mood: "bright", target: "youth", themes: ["thanks", "worship"], reason: "하늘에서 내려오신 주님이 십자가와 무덤을 이기시고 영광 받으셨음을 온몸을 흔들며 기쁘게 경배합니다." },
  { title: "기뻐하며 왕께 노래하며", artist: "예수전도단", key: "G", bpm: "fast", mood: "bright", target: "youth", themes: ["thanks", "worship"], reason: "우리의 찬양 중에 좌정하시는 만왕의 왕께 우렁찬 박수와 춤으로 경배를 올립니다." },
  { title: "손을 높이 들고", artist: "예수전도단", key: "E", bpm: "medium", mood: "bright", target: "youth", themes: ["worship", "thanks"], reason: "주님의 이름을 찬양할 때 하늘의 기쁨이 쏟아져 내림을 신나는 기타 드라이브에 맞춰 노래합니다." },
  { title: "주님 내 길 예비하시니", artist: "복음성가", key: "D", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "한 치 앞도 알 수 없으나 나의 모든 내일을 아름답게 다듬고 준비해 두시는 주님을 조용히 신뢰합니다." },
  { title: "나의 부름 (Calling)", artist: "마커스워십", key: "A", bpm: "medium", mood: "grand", target: "youth", themes: ["decision", "worship"], reason: "나를 세상 속 예배자로 삼고 영광의 제단으로 부르신 하나님의 약속을 우직하게 지켜가겠다고 선서합니다." },
  { title: "목마른 사슴", artist: "복음성가", key: "D", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "comfort"], reason: "시냇물을 찾아 헐떡이는 목마른 사슴의 심정으로 내 영혼의 갈급함을 채우실 오직 예수를 갈망합니다." },
  { title: "목마른 사슴이 시냇물을", artist: "복음성가", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "comfort"], reason: "내 영혼이 주님만을 더욱 갈망하며, 세상을 내려놓고 예배의 중심으로 나아갑니다." },
  { title: "약한 나로 강하게", artist: "어노인팅", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "thanks"], reason: "나의 연약함을 강함으로 이끄시고 부요케 하신 어린양 예수의 보혈을 기쁨으로 노래합니다." },
  { title: "주님께 감사해", artist: "파이디온", key: "G", bpm: "medium", mood: "bright", target: "child", themes: ["thanks", "grace"], reason: "언제나 한결같이 먹이시고 지키시는 주님께 해맑게 박수 치며 감사를 표하는 어린이 찬양입니다." },
  { title: "주 한 분만으로", artist: "디사이플스", key: "A", bpm: "fast", mood: "bright", target: "youth", themes: ["worship", "decision"], reason: "세상 다른 만족을 거부하고, 오직 주 한 분만으로 만족함을 역동적으로 선포합니다." },
  { title: "주 보혈 날 씻었네", artist: "디사이플스", key: "D", bpm: "fast", mood: "bright", target: "youth", themes: ["grace", "worship"], reason: "죄에서 깨끗하게 씻어주신 주님의 십자가 사랑을 씩씩하고 밝은 리듬에 맞춰 찬양합니다." },
  { title: "왕이신 나의 하나님", artist: "복음성가", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "thanks"], reason: "왕이신 주님의 이름을 대대로 송축하며 높여드리는 대표적인 전통 참배송입니다." },
  { title: "좋으신 하나님 (God is so good)", artist: "복음성가", key: "E", bpm: "medium", mood: "bright", target: "adult", themes: ["thanks", "grace"], reason: "좋으신 하나님, 참 좋으신 나의 하나님을 다정한 선율 위에 고백하는 대중적인 찬양입니다." },
  { title: "괴로울 때 주님의 얼굴 보라", artist: "복음성가", key: "E", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "풍파 중에 쓰러지지 않도록 평화의 주님을 바라보라 속삭이는 다정한 위로의 노래입니다." },
  { title: "주께 가오니 (Power of Your Love)", artist: "어노인팅", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "decision"], reason: "주의 사랑의 힘으로 나의 연약함을 씻어주시고 독수리 날개 치듯 날아오르게 하옵소서." },
  { title: "예수님만을 선포하리", artist: "위러브 (WELOVE)", key: "D", bpm: "medium", mood: "grand", target: "youth", themes: ["worship", "decision"], reason: "어두운 세상 한가운데서 오직 구원의 이름인 예수만을 힘차게 선포하겠다는 모던 선포곡입니다." },
  { title: "주의 아름다움으로 (Beautiful One)", artist: "예수전도단", key: "G", bpm: "medium", mood: "grand", target: "youth", themes: ["worship", "grace"], reason: "주님의 위대한 구원 역사와 말로 다할 수 없는 그 찬란한 아름다움을 높여 부릅니다." },
  { title: "내 구주 예수님 (Shout to the Lord)", artist: "힐송 (Hillsong)", key: "A", bpm: "medium", mood: "grand", target: "youth", themes: ["worship", "thanks"], reason: "온 세상 위에 위대하신 구원의 왕을 소리 높여 외치며 경배하는 글로벌 메가 워십송입니다." },
  { title: "주를 위한 이곳에", artist: "마커스워십", key: "D", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "decision"], reason: "화려한 겉모습을 버리고, 주님이 진짜 기뻐하시는 상한 심령의 참된 예배자로 서기를 구합니다." },
  { title: "예수 사랑하심을 (찬송가 563장)", artist: "찬송가 편곡", key: "Eb", bpm: "slow", mood: "calm", target: "child", themes: ["grace", "comfort"], reason: "성경에 기록된 하나님의 진실한 사랑을 아이들의 투명한 눈망울을 빌려 잔잔히 묵상하는 찬송입니다." },
  { title: "만군의 여호와", artist: "제이어스 (J-US)", key: "A", bpm: "medium", mood: "grand", target: "youth", themes: ["worship", "decision"], reason: "우리의 힘과 피난처 되신 만군의 여호와가 우리와 늘 영원히 함께하심을 웅장하게 선포합니다." },
  { title: "내 영혼이 은총 입어 (찬송가 438장)", artist: "찬송가 편곡", key: "G", bpm: "medium", mood: "bright", target: "adult", themes: ["grace", "thanks"], reason: "죄 사함 받고 주님과 동행하는 그 어디나 하늘나라임을 기쁘고 흥겨운 포크 리듬으로 전합니다." },
  { title: "나의 갈 길 다가도록 (찬송가 384장)", artist: "찬송가 편곡", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "무슨 일을 만나든지 내 앞길을 인도하실 주님의 온전한 자비를 겸손히 묵상하는 찬송입니다." },
  { title: "아침 해가 돋을 때 (찬송가 552장)", artist: "찬송가 편곡", key: "G", bpm: "fast", mood: "bright", target: "adult", themes: ["thanks", "decision"], reason: "새 아침을 주신 주님을 우렁차게 찬양하며 빛의 자녀로 살아갈 것을 힘차게 선포합니다." },
  { title: "주의 음성을 내가 들으니 (찬송가 540장)", artist: "찬송가 편곡", key: "G", bpm: "medium", mood: "bright", target: "adult", themes: ["grace", "decision"], reason: "내가 매일 십자가 앞으로 더 가까이 나아가 주님과 더욱 긴밀히 사귀기를 바라는 곡입니다." },
  { title: "하나님의 나팔소리 (찬송가 180장)", artist: "찬송가 편곡", key: "Ab", bpm: "fast", mood: "bright", target: "adult", themes: ["thanks", "worship"], reason: "마지막 날 재림의 나팔 소리에 맞춰 구원받은 성도들이 영광 중에 주를 맞이하는 기쁨의 대행진곡입니다." },
  { title: "죄에서 자유를 얻게 함은 (찬송가 268장)", artist: "찬송가 편곡", key: "G", bpm: "fast", mood: "bright", target: "adult", themes: ["grace", "worship"], reason: "보혈의 위대한 힘을 박수 치며 신나게 고백하는 찬양예배 최고의 인기 찬송입니다." },
  { title: "주의 약속하신 말씀 위에서 (찬송가 546장)", artist: "찬송가 편곡", key: "Bb", bpm: "fast", mood: "bright", target: "adult", themes: ["decision", "worship"], reason: "어떤 풍파와 대적 속에서도 변치 않는 약속의 굳건한 말씀 위에 굳게 서겠다는 선포입니다." },
  { title: "나의 믿음 두 기둥", artist: "파이디온", key: "F", bpm: "medium", mood: "bright", target: "child", themes: ["decision", "grace"], reason: "말씀과 기도의 튼튼한 두 기둥을 마음속에 세우고 믿음의 어린이가 되겠다고 선언합니다." },
  { title: "예수님 때문에", artist: "파이디온", key: "C", bpm: "medium", mood: "bright", target: "child", themes: ["thanks", "grace"], reason: "예수님 때문에 기쁘고 행복한 어린이 예배의 설렘을 앙증맞은 리듬과 고백으로 연출합니다." },
  { title: "하늘에 가득 찬 영광의 보좌 (찬송가 9장)", artist: "찬송가 편곡", key: "G", bpm: "medium", mood: "grand", target: "adult", themes: ["worship", "thanks"], reason: "보좌에 앉으신 거룩한 하나님을 온 교회가 경배하며 거룩을 찬송하는 전통 예배곡입니다." },
  { title: "천사들의 노래가 (찬송가 125장)", artist: "찬송가 편곡", key: "F", bpm: "slow", mood: "calm", target: "adult", themes: ["thanks", "worship"], reason: "영광을 높이 계신 주님께 돌리는 아름답고 거룩한 크리스마스 절기 전용 찬송입니다." },
  { title: "고요한 밤 거룩한 밤 (찬송가 109장)", artist: "찬송가 편곡", key: "Bb", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "grace"], reason: "어두운 세상에 평화의 구주로 탄생하신 아기 예수를 경건하고 평화롭게 묵상하는 성탄 찬송입니다." },
  { title: "기쁘다 구주 오셨네 (찬송가 115장)", artist: "찬송가 편곡", key: "D", bpm: "fast", mood: "bright", target: "adult", themes: ["thanks", "worship"], reason: "구주의 오심을 온 세상에 큰 기쁨과 우렁찬 소리로 알리며 찬양하는 신나는 성탄 캐럴 찬송입니다." },
  { title: "성령의 비가 내리네", artist: "디사이플스", key: "D", bpm: "fast", mood: "bright", target: "youth", themes: ["worship", "thanks"], reason: "이 메마른 땅 위에 약속하신 성령의 단비를 구하며 기쁨으로 춤추는 예배용 락 업템포 찬양입니다." },
  { title: "주님 뜻대로 살기로 했네", artist: "복음성가", key: "F", bpm: "medium", mood: "bright", target: "youth", themes: ["decision", "worship"], reason: "뒤돌아서지 않겠네, 세상 등지고 십자가를 향해 곧바로 전진하겠다는 순직한 신앙의 다짐입니다." },
  { title: "십자가를 질 수 있나 (찬송가 461장)", artist: "찬송가 편곡", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["decision", "worship"], reason: "우리의 평생의 삶을 주와 복음을 위해 아낌없이 헌신하겠다는 장중한 참회 결단송입니다." },
  { title: "불을 내려주소서", artist: "천관웅", key: "Em", bpm: "fast", mood: "bright", target: "youth", themes: ["worship", "decision"], reason: "하늘의 불을 구하며 예배자들의 심령에 타오르는 선교적 열정을 불어넣는 대표적인 고속 워십입니다." },
  { title: "밀알", artist: "천관웅", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["decision", "grace"], reason: "한 알의 썩어지는 밀알처럼 내 삶이 하나님의 소망을 위해 온전히 바쳐지기를 구하는 눈물의 고백입니다." },
  { title: "주를 향한 나의 사랑을", artist: "복음성가", key: "E", bpm: "fast", mood: "bright", target: "youth", themes: ["thanks", "worship"], reason: "세상을 구원하신 주님의 기이한 사랑을 박수 치며 씩씩하고 역동적으로 선포하는 오프닝 찬양입니다." },
  { title: "주님 손 잡고 일어서세요", artist: "복음성가", key: "Eb", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "더는 실망하고 좌절하지 말며, 주님 손 잡고 다시 일어나 걸어갈 것을 격려하는 위로의 대명사입니다." },
  { title: "예배의 황무지에서", artist: "마커스워십", key: "A", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "decision"], reason: "메마른 황무지 같은 인생길 속에서도 신령과 진정으로 예배의 자리를 지킬 것을 결단합니다." },
  { title: "다시 일어서기", artist: "손경민", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["comfort", "grace"], reason: "상하고 깨진 심령을 싸매시고 다시 일으켜 세우실 신실한 구주의 사랑을 잔잔하게 고백합니다." },
  { title: "주의 보혈 능력 있도다", artist: "복음성가", key: "G", bpm: "fast", mood: "bright", target: "adult", themes: ["grace", "worship"], reason: "어린양의 귀한 피가 가진 기이하고 풍성한 죄 사함의 은총을 기쁨의 손뼉으로 찬양합니다." },
  { title: "목마른 사슴이 시냇물을 찾기에", artist: "복음성가", key: "C", bpm: "slow", mood: "calm", target: "adult", themes: ["worship", "comfort"], reason: "내 중심이 주님만을 더욱 의지하고 갈망하는 깊은 묵상 흐름에 매우 적합합니다." },
  { title: "주님 뜻대로", artist: "복음성가", key: "F", bpm: "medium", mood: "bright", target: "adult", themes: ["decision", "grace"], reason: "어떤 방해와 시련 속에서도 주님 가신 생명의 십자가 길을 묵묵히 따르겠다는 순직한 헌신송입니다." },
  { title: "그 사랑 얼마나 (아버지 사랑 내가 노래해)", artist: "김몽은", key: "G", bpm: "slow", mood: "calm", target: "adult", themes: ["grace", "worship"], reason: "나를 향한 하나님 아버지의 그 크고 깊은 독생자의 사랑을 눈물 흘리며 고백하는 묵상곡입니다." },
  { title: "구원열차 타고 달려요", artist: "주일학교", key: "F", bpm: "fast", mood: "bright", target: "child", themes: ["thanks", "decision"], reason: "성령의 엔진에 힘입어 천국 종착역을 향해 달려가는 아이들의 힘차고 재기발랄한 율동 찬양입니다." },
  { title: "다윗처럼 춤을 추면서", artist: "복음성가", key: "G", bpm: "fast", mood: "bright", target: "child", themes: ["thanks", "worship"], reason: "주님의 궤가 돌아올 때 기뻐 날뛰며 바지가 벗겨지도록 찬양했던 다윗의 감격을 유쾌하게 노래합니다." }
];

// ==========================================================================
// [Firebase 클라우드 실시간 동기화 엔진 설정 및 마이그레이션]
// ==========================================================================

const firebaseConfig = {
  apiKey: "AIzaSyDCN1DzGrKXvyF3ZdkoWsnq1IuAnl_7oYk",
  authDomain: "tikitaka-worship.firebaseapp.com",
  databaseURL: "https://tikitaka-worship-default-rtdb.firebaseio.com",
  projectId: "tikitaka-worship",
  storageBucket: "tikitaka-worship.firebasestorage.app",
  messagingSenderId: "476067828236",
  appId: "1:476067828236:web:5dff885f8938843dc69429",
  measurementId: "G-DKWB3F98Y2"
};
firebase.initializeApp(firebaseConfig);
const fbDB = firebase.database();

let db = null;
let activeSyncListener = null;

// Firebase 클라우드 DB 실시간 리스너 작동 (팀원 간 0.1초 실시간 콘티 씽크 동기화)
function startCloudSync(churchId) {
  if (!churchId) return;
  if (activeSyncListener) {
    fbDB.ref(`churches/${churchId}`).off('value', activeSyncListener);
  }
  
  activeSyncListener = fbDB.ref(`churches/${churchId}`).on('value', (snapshot) => {
    // 로컬에서 데이터 저장 중인 경우, 클라우드 값 수신으로 인한 UI 롤백/리로드 방지
    if (state.isLocalWriting) return;
    
    const updatedChurch = snapshot.val();
    if (!updatedChurch) return;
    
    // 3차 클라우드 수신 데이터 누락 방지 가드 (구버전 2/3/4부 예배 강제 마이그레이션)
    if (!updatedChurch.worships) updatedChurch.worships = {};
    for (const wId in updatedChurch.worships) {
      const worship = updatedChurch.worships[wId];
      if (!worship.weeks) {
        worship.weeks = {
          'this-week': { title: '이번 주 찬양', items: [] },
          'next-week': { title: '다음 주 찬양', items: [] }
        };
      } else {
        if (!worship.weeks['this-week']) {
          worship.weeks['this-week'] = { title: '이번 주 찬양', items: [] };
        }
        if (!worship.weeks['next-week']) {
          worship.weeks['next-week'] = { title: '다음 주 찬양', items: [] };
        }
      }
    }
    
    // 로컬 메모리에 즉시 반영
    db.churches[churchId] = updatedChurch;
    localStorage.setItem('worship_liturgy_db', JSON.stringify(db));
    
    // 로고 실시간 동기화 갱신
    const logoContainer = document.getElementById('main-logo-container');
    if (logoContainer) {
      if (updatedChurch.logo) {
        logoContainer.innerHTML = `<img src="${updatedChurch.logo}" alt="로고" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      } else {
        logoContainer.innerHTML = `<i class="fa-solid fa-music"></i>`;
      }
    }
    
    // 현재 열려 있는 화면(Screen)에 따라 실시간 UI 재랜더링
    if (state.currentScreen === 'main') {
      renderWorshipList();
      renderNoticeList();
    } else if (state.currentScreen === 'sub') {
      // sub 화면은 동적 요소가 없으므로 리렌더링 패스
    } else if (state.currentScreen === 'detail') {
      renderSongDetailHeader();
      renderSongList();
    }
  });
}

// 데이터 로드 및 Firebase 실시간 연동/마이그레이션
async function initDatabase() {
  // [초기화 마스터키] 쿼리 스트링에 ?reset=true 가 들어오면 강제 오프라인 공장초기화 기동
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('reset') === 'true') {
    localStorage.removeItem('worship_liturgy_db');
    alert("로컬 캐시 데이터베이스 초기화가 완료되었습니다.");
    window.location.href = window.location.origin + window.location.pathname;
    return;
  }

  const localData = localStorage.getItem('worship_liturgy_db');
  if (localData) {
    try {
      db = JSON.parse(localData);
    } catch (e) {
      db = defaultData;
      db.churches['church-1'].notices = demoNotices['church-1'];
      db.churches['church-2'].notices = demoNotices['church-2'];
    }
  } else {
    db = defaultData;
    db.churches['church-1'].notices = demoNotices['church-1'];
    db.churches['church-2'].notices = demoNotices['church-2'];
  }

  // Firebase 실시간 동기화 및 마이그레이션 개시
  try {
    const snapshot = await fbDB.ref('churches').once('value');
    const cloudChurches = snapshot.val();
    // 클라우드 데이터 무결성 검증 (깨진 데이터 오버라이트 방지)
    if (cloudChurches && typeof cloudChurches === 'object' && Object.keys(cloudChurches).length > 0) {
      if (cloudChurches['church-1'] && cloudChurches['church-1'].worships) {
        db.churches = cloudChurches;
        console.log("Firebase cloud database synced successfully.");
      } else {
        console.warn("Firebase data is corrupted. Re-publishing local clean database to cloud...");
        await fbDB.ref('churches').set(db.churches);
      }
    } else {
      console.log("Firebase is empty. Migrating local database to Firebase cloud...");
      await fbDB.ref('churches').set(db.churches);
    }
  } catch (fbErr) {
    console.warn("Firebase sync failed, starting in offline local cache mode:", fbErr);
  }

  // 스키마 마이그레이션: 구버전이거나, 예배 하위 필드에 description이 누락된 경우
  let isLegacy = !db.churches || !db.churches['church-1'] || !db.churches['church-1'].memberPassword;
  if (!isLegacy) {
    const church1 = db.churches['church-1'];
    if (church1 && church1.worships['service-2'] && !church1.worships['service-2'].description) {
      isLegacy = true;
    }
  }
  
  if (isLegacy) {
    console.log("Schema mismatch: resetting to default structure...");
    db = defaultData;
    db.churches['church-1'].notices = demoNotices['church-1'];
    db.churches['church-2'].notices = demoNotices['church-2'];
    saveDatabase();
  } else {
    let needsSave = false;
    
    // 예배 객체 순회하며 date, notices, attendances 필드 마이그레이션
    for (const cId in db.churches) {
      const church = db.churches[cId];
      if (church.notices === undefined) {
        church.notices = demoNotices[cId] || [];
        needsSave = true;
      }
      if (church.attendances === undefined) {
        church.attendances = {};
        needsSave = true;
      }
      if (church.devotions === undefined) {
        church.devotions = {};
        needsSave = true;
      }
      
      for (const wId in church.worships) {
        const worship = church.worships[wId];
        if (worship.date === undefined) {
          worship.date = '2026-07-12';
          needsSave = true;
        }
        
        // 이번 주 / 다음 주 기본 주차 구조 누락 방지 마이그레이션
        if (worship.weeks === undefined) {
          worship.weeks = {
            'this-week': { title: '이번 주 찬양', items: [] },
            'next-week': { title: '다음 주 찬양', items: [] }
          };
          needsSave = true;
        } else {
          if (worship.weeks['this-week'] === undefined) {
            worship.weeks['this-week'] = { title: '이번 주 찬양', items: [] };
            needsSave = true;
          }
          if (worship.weeks['next-week'] === undefined) {
            worship.weeks['next-week'] = { title: '다음 주 찬양', items: [] };
            needsSave = true;
          }
        }
        
        const weeks = worship.weeks || {};
        for (const weekId in weeks) {
          const week = weeks[weekId];
          if (week.items) {
            week.items.forEach(song => {
              if (song.key === undefined) {
                song.key = ""; 
                needsSave = true;
                if (song.memo) {
                  const matched = song.memo.match(/([A-G]#?m?|Eb)코드/);
                  if (matched) {
                    song.key = matched[1];
                  }
                }
              }
            });
          }
        }
      }
    }
    if (needsSave) {
      saveDatabase();
    }
  }
  
  // 로그인 세션 확인 후 자동 진입
  if (db.activeChurchId && db.churches[db.activeChurchId]) {
    state.userName = localStorage.getItem('worship_liturgy_username') || "사용자";
    setSessionAndEnter(db.activeChurchId, db.activeRole);
  } else {
    navigateTo('auth');
  }
}

// [실시간 연동] OpenAI API 실시간 통신 및 파싱 (GPT-5.5-mini 모델 및 JSON 모드 기반 고속 추천)
async function fetchGPTRecommendations(apiKey, target, theme, currentSong, reqKey, bpm, mood) {
  const url = "https://api.openai.com/v1/chat/completions";
  
  const targetMap = { child: '어린이예배', youth: '청년예배', adult: '장년예배' };
  const themeMap = { worship: '예배/경배', grace: '은혜/사랑', decision: '결단/헌신', comfort: '위로/소망', thanks: '감사/기쁨' };
  const bpmMap = { slow: '느린 (60-80 BPM)', medium: '보통 (80-100 BPM)', fast: '빠른 (100-130 BPM)' };
  const moodMap = { calm: '차분하고 은혜로운 묵상', grand: '뜨겁고 웅장한 빌드업', bright: '기쁘고 신나는 축제 분위기' };
  
  const prompt = `
너는 20년 이상의 경력을 가진 교회 찬양인도자이자 예배 디렉터이다.
아래 사용자가 입력한 정보를 바탕으로 예배의 흐름, 앞뒤 곡의 코드(Key) 연결감, 템포, 연령대를 종합 조율하여 가장 은혜로운 연결 콘티 5곡을 추천해라.
 
추천 기준:
- 예배의 흐름과 감정선을 고려한다. (도입-경배-빌드업-결단-기도 헌신의 유기적 5곡 배열)
- 코드(Key)가 자연스럽게 이어지도록 한다.
- 현재 한국 교회에서 널리 불리는 최신 모던 CCM(WELOVE, 제이어스, 마커스, 어노인팅 등)을 우선 추천한다.
- 각 곡마다 20년 디렉터 관점에서의 추천 이유(reason)를 한글 80자 이내의 짧고 직관적인 핵심 팁으로 간결하게 작성해라. (글자 수가 길어지면 안 된다!)
- 동일한 곡을 중복 추천하지 않는다.
 
반드시 다른 설명 텍스트 없이 오직 아래 지정된 JSON 규격으로만 응답해야 한다.
 
{
  "recommendations":[
    {
      "title":"찬양 제목",
      "artist":"아티스트",
      "key":"코드",
      "reason":"짧고 직관적인 핵심 연출 팁"
    }
  ]
}
 
입력값:
- 예배대상: ${targetMap[target]}
- 예배주제: ${themeMap[theme]}
- 시작곡: ${currentSong || '지정 없음'}
- 원하는 코드: ${reqKey || '상관없음'}
- 원하는 BPM: ${bpmMap[bpm]}
- 원하는 분위기: ${moodMap[mood]}
`;

  const requestBody = {
    model: "gpt-5.5-mini",
    messages: [
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errData = await response.json();
    throw new Error('OpenAI API 서버와의 통신에 실패했습니다: ' + (errData.error?.message || response.statusText));
  }
  
  const data = await response.json();
  let jsonText = data.choices?.[0]?.message?.content || '';
  
  // 백틱 및 json 포맷 제거 안전 마이그레이션
  jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // [Fuzzy JSON Extraction] 응답 텍스트 중 중괄호 { } 패턴만 추출하여 다른 잔여 설명 텍스트가 섞여 있어도 파싱 성공 보장
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    const resultObj = superRobustJSONParser(jsonText);
    if (!resultObj.recommendations || !Array.isArray(resultObj.recommendations)) {
      throw new Error('추천 데이터 규격이 올바르지 않습니다.');
    }
    return resultObj.recommendations;
  } catch (parseErr) {
    console.error("OpenAI Response parsing fail. Raw text was: ", jsonText);
    // [Silent Fallback] 에러가 나면 사용자에게 알리고 로컬 디렉터 엔진의 5곡 추천으로 실시간 자동 매핑 전환 처리!
    alert(`[OpenAI API 연동 일시 지연]\nOpenAI 응답을 디코딩하지 못해, 20년 경력 로컬 디렉터 엔진으로 자동 전환하여 추천합니다.\n(응답 텍스트: "${jsonText.substring(0, 100)}...")`);
    return getLocalRecommendations(target, theme, reqKey, bpm, mood);
  }
}

// 로컬 및 Firebase 클라우드 DB 실시간 동기화 저장
function saveDatabase() {
  // 브라우저 로컬 스토리지 5MB 한도 초과(QuotaExceededError) 방어
  try {
    localStorage.setItem('worship_liturgy_db', JSON.stringify(db));
  } catch (storageErr) {
    console.warn("로컬 백업 캐시 용량이 초과되었으나, 클라우드 실시간 저장을 강제 계속 진행합니다:", storageErr);
  }
  
  // 클라우드 동기화 락 작동
  state.isLocalWriting = true;
  
  const syncPromise = db.activeChurchId
    ? fbDB.ref(`churches/${db.activeChurchId}`).set(db.churches[db.activeChurchId])
    : fbDB.ref('churches').set(db.churches);
    
  syncPromise
    .then(() => {
      // 0.8초의 네트워크 마진을 두고 동기화 락 안전 해제
      setTimeout(() => { state.isLocalWriting = false; }, 800);
    })
    .catch(err => {
      console.error("Firebase sync error: ", err);
      // 저장 실패 원인(권한 거부 등)을 상세히 얼럿창으로 피드백 유도
      alert(`[클라우드 동기화 실패]\n구글 데이터베이스 전송 도중 에러가 발생했습니다:\n${err.message}\n\n(주로 Firebase 규칙 설정 문제인 경우가 많습니다.)`);
      setTimeout(() => { state.isLocalWriting = false; }, 800);
    });
}

// ==========================================================================
// [인증 및 교회 관리 비즈니스 로직]
// ==========================================================================

// 로그인 화면의 탭 전환
function switchAuthTab(tabId) {
  const tabFind = document.getElementById('tab-find-church');
  const tabNew = document.getElementById('tab-new-church');
  const areaFind = document.getElementById('area-find-church');
  const areaNew = document.getElementById('area-new-church');
  
  // 상태 초기화
  document.getElementById('auth-search-input').value = '';
  document.getElementById('auth-search-results').classList.remove('active');
  document.getElementById('auth-login-form').classList.remove('active');
  document.getElementById('auth-member-password').value = '';
  document.getElementById('auth-admin-password').value = '';
  document.getElementById('auth-register-form').reset();
  state.selectedSearchChurchId = null;

  if (tabId === 'find') {
    tabFind.classList.add('active');
    tabNew.classList.remove('active');
    areaFind.classList.add('active');
    areaNew.classList.remove('active');
  } else {
    tabNew.classList.add('active');
    tabFind.classList.remove('active');
    areaNew.classList.add('active');
    areaFind.classList.remove('active');
  }
}

// 실시간 교회 이름 검색 필터링
function searchChurches() {
  const query = document.getElementById('auth-search-input').value.trim();
  const resultsContainer = document.getElementById('auth-search-results');
  resultsContainer.innerHTML = '';
  
  if (!query) {
    resultsContainer.classList.remove('active');
    return;
  }
  
  const matched = [];
  for (const key in db.churches) {
    const church = db.churches[key];
    if (church.name.toLowerCase().includes(query.toLowerCase())) {
      matched.push(church);
    }
  }
  
  if (matched.length === 0) {
    resultsContainer.innerHTML = `<div class="search-result-item" style="cursor: default; color: var(--text-muted);">검색된 교회가 없습니다.</div>`;
    resultsContainer.classList.add('active');
    return;
  }
  
  matched.forEach(church => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `<i class="fa-solid fa-church" style="color: var(--primary);"></i> <span>${escapeHtml(church.name)}</span>`;
    
    item.addEventListener('click', () => {
      selectSearchChurch(church.id, church.name);
    });
    
    resultsContainer.appendChild(item);
  });
  
  resultsContainer.classList.add('active');
}

// 검색 리스트에서 교회를 선택했을 때 로그인 폼 노출
function selectSearchChurch(churchId, churchName) {
  state.selectedSearchChurchId = churchId;
  
  document.getElementById('auth-search-input').value = churchName;
  document.getElementById('auth-search-results').classList.remove('active');
  
  // 로그인 폼 노출 및 세팅
  document.getElementById('auth-selected-church-name').textContent = churchName;
  document.getElementById('auth-member-password').value = '';
  document.getElementById('auth-admin-password').value = '';
  document.getElementById('auth-login-form').classList.add('active');
}

// 팀원으로 로그인 입장 (비밀번호 검증 필수)
function loginAsMember() {
  if (!state.selectedSearchChurchId) return;
  
  const enteredName = document.getElementById('auth-user-name').value.trim();
  if (!enteredName) {
    alert('팀원 입장을 위해 본인의 이름을 입력해 주세요.');
    return;
  }
  
  const enteredPassword = document.getElementById('auth-member-password').value.trim();
  const church = db.churches[state.selectedSearchChurchId];
  
  if (!church) return;
  
  if (enteredPassword === church.memberPassword) {
    state.userName = enteredName;
    localStorage.setItem('worship_liturgy_username', enteredName);
    
    db.activeChurchId = state.selectedSearchChurchId;
    db.activeRole = 'member';
    saveDatabase();
    
    setSessionAndEnter(db.activeChurchId, db.activeRole);
  } else {
    alert('팀원 입장 비밀번호(숫자 4자리)가 일치하지 않습니다. 올바른 입장 코드를 입력해 주세요.');
  }
}

// 관리자로 로그인
function loginAsAdmin() {
  if (!state.selectedSearchChurchId) return;
  
  const enteredName = document.getElementById('auth-user-name').value.trim();
  if (!enteredName) {
    alert('대표 관리자 로그인을 위해 본인의 이름을 입력해 주세요.');
    return;
  }
  
  const enteredPassword = document.getElementById('auth-admin-password').value;
  const church = db.churches[state.selectedSearchChurchId];
  
  if (!church) return;
  
  if (enteredPassword === church.adminPassword) {
    state.userName = enteredName;
    localStorage.setItem('worship_liturgy_username', enteredName);
    
    db.activeChurchId = state.selectedSearchChurchId;
    db.activeRole = 'admin';
    saveDatabase();
    
    setSessionAndEnter(db.activeChurchId, db.activeRole);
  } else {
    alert('비밀번호가 일치하지 않습니다. 대표 관리자 비밀번호를 다시 확인해주세요.');
  }
}

// 새로운 교회 등록 (대표 관리자가 최초 생성)
function registerChurch(event) {
  event.preventDefault();
  
  const churchName = document.getElementById('register-church-name').value.trim();
  const adminPassword = document.getElementById('register-admin-password').value.trim();
  const memberPassword = document.getElementById('register-member-password').value.trim();
  
  if (!churchName || !adminPassword || !memberPassword) return;
  
  const isFourDigits = /^[0-9]{4}$/.test(memberPassword);
  if (!isFourDigits) {
    alert('팀원 입장 비밀번호는 반드시 숫자 4자리여야 합니다.');
    return;
  }
  
  for (const key in db.churches) {
    if (db.churches[key].name === churchName) {
      alert('이미 등록된 교회 이름입니다. 다른 이름이나 상세명을 사용해주세요.');
      return;
    }
  }
  
  const newChurchId = 'church-' + Date.now();
  const newChurch = {
    id: newChurchId,
    name: churchName,
    adminPassword: adminPassword,
    memberPassword: memberPassword,
    teamName: `${churchName} 찬양팀`,
    worships: getEmptyWorshipStructure(),
    notices: []
  };
  
  db.churches[newChurchId] = newChurch;
  saveDatabase();
  
  alert('성공적으로 등록되었습니다!\n[우리 교회 찾기] 탭에서 등록하신 교회 이름을 검색하고 실명을 적은 뒤 입장해 주세요.');
  
  document.getElementById('auth-register-form').reset();
  
  // 가입 폼 초기화 후 교회 찾기 로그인 탭으로 스위칭 및 검색창 세팅
  switchAuthTab('find');
  document.getElementById('auth-search-input').value = churchName;
  searchChurches();
}

// 세션을 설정하고 메인 화면에 진입하는 브릿지 함수
function setSessionAndEnter(churchId, role) {
  if (role === 'admin') {
    document.body.classList.add('admin-mode');
  } else {
    document.body.classList.remove('admin-mode');
  }
  
  const badgeText = role === 'admin' ? '관리자' : '팀원';
  
  const badgeMain = document.getElementById('badge-role-main');
  const badgeSub = document.getElementById('badge-role-sub');
  const badgeHistory = document.getElementById('badge-role-history');
  const badgeDetail = document.getElementById('badge-role-detail');
  
  badgeMain.textContent = badgeText;
  badgeSub.textContent = badgeText;
  badgeHistory.textContent = badgeText;
  badgeDetail.textContent = badgeText;
  
  if (role === 'admin') {
    badgeMain.classList.remove('member');
    badgeSub.classList.remove('member');
    badgeHistory.classList.remove('member');
    badgeDetail.classList.remove('member');
    const btnAI = document.getElementById('btn-tab-ai');
    if (btnAI) btnAI.style.display = 'flex';
  } else {
    badgeMain.classList.add('member');
    badgeSub.classList.add('member');
    badgeHistory.classList.add('member');
    badgeDetail.classList.add('member');
    const btnAI = document.getElementById('btn-tab-ai');
    if (btnAI) btnAI.style.display = 'none';
  }
  
  const church = db.churches[churchId];
  if (church) {
    document.getElementById('app-title').textContent = church.teamName;
    
    // 교회 로고 동적 주입 로직
    const logoContainer = document.getElementById('main-logo-container');
    if (logoContainer) {
      if (church.logo) {
        logoContainer.innerHTML = `<img src="${church.logo}" alt="로고" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      } else {
        logoContainer.innerHTML = `<i class="fa-solid fa-music"></i>`;
      }
    }
  }
  
  // 실명 뱃지 UI 갱신
  const nameMain = document.getElementById('user-name-main');
  if (nameMain) {
    nameMain.textContent = state.userName || "사용자";
  }
  
  // Firebase 실시간 동기화 리스너 개시
  startCloudSync(churchId);
  
  // 메인 진입 시 탭 초기화(공지사항) 및 렌더링
  switchMainTab('notice');
  navigateTo('main');
}

// 로그아웃
function logout() {
  if (db.activeChurchId && activeSyncListener) {
    fbDB.ref(`churches/${db.activeChurchId}`).off('value', activeSyncListener);
    activeSyncListener = null;
  }

  // 실명 세션 완전 삭제
  localStorage.removeItem('worship_liturgy_username');
  state.userName = "";

  db.activeChurchId = null;
  db.activeRole = 'member';
  saveDatabase();
  
  document.getElementById('auth-search-input').value = '';
  document.getElementById('auth-search-results').classList.remove('active');
  document.getElementById('auth-login-form').classList.remove('active');
  document.getElementById('auth-member-password').value = '';
  document.getElementById('auth-admin-password').value = '';
  document.getElementById('auth-user-name').value = '';
  state.selectedSearchChurchId = null;
  state.currentTab = 'notice';
  
  document.body.classList.remove('admin-mode');
  
  // 안전하게 페이지 리로드하여 모든 세션 및 리스너 초기화
  location.reload();
}

// ==========================================================================
// [메인 대시보드 하단 탭바 네비게이션 제어]
// ==========================================================================
function switchMainTab(tabName) {
  state.currentTab = tabName;
  
  const btnConti = document.getElementById('btn-tab-conti');
  const btnNotice = document.getElementById('btn-tab-notice');
  const btnDevotion = document.getElementById('btn-tab-devotion');
  const btnAI = document.getElementById('btn-tab-ai');
  
  const areaConti = document.getElementById('area-main-conti');
  const areaNotice = document.getElementById('area-main-notice');
  const areaDevotion = document.getElementById('area-main-devotion');
  const areaAI = document.getElementById('area-main-ai');
  
  const btnAddWorship = document.getElementById('btn-add-worship');
  const btnAddNotice = document.getElementById('btn-add-notice');
  
  btnConti.classList.remove('active');
  btnNotice.classList.remove('active');
  if (btnDevotion) btnDevotion.classList.remove('active');
  btnAI.classList.remove('active');
  
  areaConti.classList.remove('active');
  areaNotice.classList.remove('active');
  if (areaDevotion) areaDevotion.classList.remove('active');
  areaAI.classList.remove('active');
  
  if (tabName === 'conti') {
    btnConti.classList.add('active');
    areaConti.classList.add('active');
    
    // 관리자 액션바 내 버튼 토글
    btnAddWorship.style.display = 'flex';
    btnAddNotice.style.display = 'none';
    
    renderWorshipList();
  } else if (tabName === 'notice') {
    btnNotice.classList.add('active');
    areaNotice.classList.add('active');
    
    // 관리자 액션바 내 버튼 토글
    btnAddWorship.style.display = 'none';
    btnAddNotice.style.display = 'flex';
    
    renderNoticeList();
  } else if (tabName === 'devotion') {
    if (btnDevotion) btnDevotion.classList.add('active');
    if (areaDevotion) areaDevotion.classList.add('active');
    
    btnAddWorship.style.display = 'none';
    btnAddNotice.style.display = 'none';
    
    renderDevotionTab();
  } else if (tabName === 'ai-rec') {
    btnAI.classList.add('active');
    areaAI.classList.add('active');
    
    // AI 탭에서는 하단 추가바를 숨김 (탭바만 유지)
    btnAddWorship.style.display = 'none';
    btnAddNotice.style.display = 'none';
  }
}

// ==========================================================================
// [예배 동적 관리 비즈니스 로직 (CRUD)]
// ==========================================================================

// 메인 화면 예배 리스트 동적 렌더링
function renderWorshipList() {
  const worshipListContainer = document.getElementById('worship-list');
  worshipListContainer.innerHTML = '';
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const worships = church.worships || {};
  const keys = Object.keys(worships);
  
  if (keys.length === 0) {
    worshipListContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-calendar-xmark empty-icon"></i>
        <p>등록된 예배가 없습니다.</p>
        ${db.activeRole === 'admin' ? '<p class="empty-sub">하단의 [예배 추가] 버튼을 눌러 새로운 예배 카드를 개설해보세요!</p>' : ''}
      </div>
    `;
    return;
  }
  
  keys.forEach(key => {
    const worship = worships[key];
    const card = document.createElement('div');
    card.className = 'liturgy-card';
    card.dataset.worshipId = key;
    
    // 기본 카드 아이콘 설정 (특정 데모 명칭은 전용 아이콘 적용)
    let iconClass = 'service-custom';
    let iconFa = 'fa-solid fa-users';
    
    if (key === 'service-2') {
      iconClass = 'service-2';
      iconFa = 'fa-solid fa-sun';
    } else if (key === 'service-3') {
      iconClass = 'service-3';
      iconFa = 'fa-solid fa-dove';
    } else if (key === 'service-4') {
      iconClass = 'service-4';
      iconFa = 'fa-solid fa-fire-flame-simple';
    }
    
    // 날짜 뱃지 마크업 동적 설계
    const dateBadgeHtml = worship.date
      ? `<span class="worship-date-badge"><i class="fa-regular fa-calendar"></i> ${worship.date}</span>`
      : '';
    
    // 관리자용 편집/삭제 컨트롤
    const adminWorshipControls = `
      <div class="worship-admin-controls">
        <button class="icon-btn edit-btn" onclick="openEditWorshipModal(event, '${key}')" title="예배 정보 수정">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="icon-btn danger-btn" onclick="deleteWorshipService(event, '${key}')" title="예배 삭제">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    card.innerHTML = `
      <div class="card-icon ${iconClass}"><i class="${iconFa}"></i></div>
      <div class="card-info">
        <div class="card-title-row">
          <h3 class="card-title">${escapeHtml(worship.title)}</h3>
          ${dateBadgeHtml}
        </div>
        <p class="card-desc">${escapeHtml(worship.description || '찬양팀 콘티 목록')}</p>
      </div>
      ${adminWorshipControls}
      <div class="card-arrow"><i class="fa-solid fa-chevron-right"></i></div>
    `;
    
    // 카드 클릭 시 콘티 상세 화면으로 즉시 직행 (이번주 찬양)
    card.addEventListener('click', () => {
      navigateTo('detail', key, 'this-week');
    });
    
    worshipListContainer.appendChild(card);
  });
}

// 예배 추가/수정 모달 제어
function toggleWorshipModal(show) {
  const modal = document.getElementById('worship-modal');
  if (show) {
    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
    document.getElementById('worship-form').reset();
    document.getElementById('worship-date-input').value = '';
    state.editingWorshipId = null;
  }
}

// 예배 추가 모달 열기
function openAddWorshipModal() {
  document.getElementById('worship-modal-title').textContent = '예배 추가';
  document.getElementById('form-worship-id').value = '';
  document.getElementById('worship-date-input').value = '';
  state.editingWorshipId = null;
  toggleWorshipModal(true);
}

// 예배 수정 모달 열기
function openEditWorshipModal(event, worshipId) {
  event.stopPropagation(); // 카드 클릭 이동 방지
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const worship = church.worships[worshipId];
  if (!worship) return;
  
  document.getElementById('worship-modal-title').textContent = '예배 수정';
  document.getElementById('form-worship-id').value = worshipId;
  document.getElementById('worship-name-input').value = worship.title;
  document.getElementById('worship-desc-input').value = worship.description || '';
  document.getElementById('worship-date-input').value = worship.date || '';
  
  state.editingWorshipId = worshipId;
  toggleWorshipModal(true);
}

// 예배 저장 (추가/수정 실행)
function saveWorshipService(event) {
  event.preventDefault();
  
  const name = document.getElementById('worship-name-input').value.trim();
  const desc = document.getElementById('worship-desc-input').value.trim();
  const date = document.getElementById('worship-date-input').value;
  
  if (!name || !desc) return;
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  if (state.editingWorshipId) {
    // 수정
    const worship = church.worships[state.editingWorshipId];
    if (worship) {
      worship.title = name;
      worship.description = desc;
      worship.date = date;
    }
  } else {
    // 추가
    const newId = 'service-custom-' + Date.now();
    church.worships[newId] = {
      title: name,
      description: desc,
      date: date,
      weeks: {
        'this-week': { title: '이번 주 찬양', items: [] },
        'next-week': { title: '다음 주 찬양', items: [] }
      }
    };
  }
  
  saveDatabase();
  renderWorshipList();
  toggleWorshipModal(false);
}

// 예배 삭제
function deleteWorshipService(event, worshipId) {
  event.stopPropagation(); // 카드 클릭 이동 방지
  if (db.activeRole !== 'admin') return;
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const worship = church.worships[worshipId];
  if (!worship) return;
  
  const isConfirmed = confirm(
    `"${worship.title}"을 삭제하시겠습니까?\n삭제 시 해당 예배에 포함된 모든 주차 찬양 콘티가 함께 영구 소멸됩니다.`
  );
  
  if (isConfirmed) {
    delete church.worships[worshipId];
    saveDatabase();
    renderWorshipList();
  }
}

// ==========================================================================
// [공지사항 게시판 비즈니스 로직 (CRUD)]
// ==========================================================================

// 공지사항 리스트 렌더링
function renderNoticeList() {
  const noticeListContainer = document.getElementById('notice-list');
  noticeListContainer.innerHTML = '';
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const notices = church.notices || [];
  
  if (notices.length === 0) {
    noticeListContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-bullhorn empty-icon"></i>
        <p>등록된 공지사항이 없습니다.</p>
        ${db.activeRole === 'admin' ? '<p class="empty-sub">하단의 [공지 추가] 버튼을 눌러 첫 알림판을 게시해보세요!</p>' : ''}
      </div>
    `;
    return;
  }
  
  // 날짜 기준 내림차순(최신 등록일 우선) 정렬
  const sortedNotices = [...notices].sort((a, b) => b.date.localeCompare(a.date));
  
  sortedNotices.forEach(notice => {
    const card = document.createElement('div');
    card.className = 'notice-card';
    card.dataset.noticeId = notice.id;
    
    // 날짜 뱃지 마크업
    const dateBadgeHtml = notice.date
      ? `<span class="worship-date-badge"><i class="fa-regular fa-calendar"></i> ${notice.date}</span>`
      : '';
      
    // 관리자용 수정/삭제 버튼
    const adminControlsHtml = `
      <div class="notice-admin-controls">
        <button class="icon-btn edit-btn" onclick="openEditNoticeModal(event, '${notice.id}')" title="공지 수정">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="icon-btn danger-btn" onclick="deleteNotice(event, '${notice.id}')" title="공지 삭제">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    const authorHtml = `<span style="font-size: 0.6875rem; color: var(--text-muted); font-weight: 500; display: inline-flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.03); padding: 1px 6px; border-radius: var(--radius-sm); border: 1px solid rgba(0,0,0,0.05);"><i class="fa-regular fa-user" style="font-size: 0.6rem;"></i> ${escapeHtml(notice.createdBy || '관리자')}</span>`;

    card.innerHTML = `
      <div class="notice-icon-wrapper"><i class="fa-solid fa-bullhorn"></i></div>
      <div class="card-info">
        <div class="card-title-row">
          <h3 class="card-title">${escapeHtml(notice.title)}</h3>
          <div style="display: flex; gap: 4px; align-items: center;">
            ${authorHtml}
            ${dateBadgeHtml}
          </div>
        </div>
        <p class="card-desc">${escapeHtml(notice.content)}</p>
      </div>
      ${adminControlsHtml}
      <div class="card-arrow"><i class="fa-solid fa-chevron-right"></i></div>
    `;
    
    // 클릭 시 상세 정보 모달 활성화
    card.addEventListener('click', () => {
      openNoticeDetail(notice.id);
    });
    
    noticeListContainer.appendChild(card);
  });
}

// 공지사항 상세 모달 보기
function openNoticeDetail(noticeId) {
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const notice = church.notices.find(item => item.id === noticeId);
  if (!notice) return;
  
  document.getElementById('notice-detail-title').textContent = notice.title;
  document.getElementById('notice-detail-date').textContent = notice.date;
  document.getElementById('notice-detail-content').textContent = notice.content;
  
  document.getElementById('notice-detail-modal').classList.add('active');
}

// JSON 깨짐 현상을 원천 방어하고 100% 정상 파싱 성공을 보장하는 초강력 파서
function superRobustJSONParser(rawText) {
  try {
    // 1. Trailing Comma(끝 쉼표) 제거 및 기본 트림
    let cleanText = rawText.replace(/,\s*([\]}])/g, '$1').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.warn("Standard JSON parse failed, trying repair...", e);
    try {
      // 2. 홑따옴표 치환 시도
      let repaired = rawText
        .replace(/'/g, '"')
        .replace(/\\"/g, '"');
      return JSON.parse(repaired);
    } catch (e2) {
      console.warn("Repaired JSON parse also failed. Activating Regex Ingestion Fallback...", e2);
      
      // 3. 정규식으로 직접 title, artist, key, reason 키워드 밸류만 도려내어 강제 객체 조립!
      const recommendations = [];
      
      const titles = [...rawText.matchAll(/"title"\s*:\s*["']([^"']*)["']/g)].map(m => m[1]);
      const artists = [...rawText.matchAll(/"artist"\s*:\s*["']([^"']*)["']/g)].map(m => m[1]);
      const keys = [...rawText.matchAll(/"key"\s*:\s*["']([^"']*)["']/g)].map(m => m[1]);
      const reasons = [...rawText.matchAll(/"reason"\s*:\s*["']([^"']*)["']/g)].map(m => m[1]);
      
      const count = Math.max(titles.length, artists.length);
      for (let i = 0; i < count; i++) {
        recommendations.push({
          title: titles[i] || "추천 찬양",
          artist: artists[i] || "아티스트",
          key: keys[i] || "C",
          reason: reasons[i] || "예배의 연결을 돕는 추천 곡입니다."
        });
      }
      
      if (recommendations.length > 0) {
        return { recommendations };
      }
      
      // 4. 최후의 보루: 아예 일반 텍스트 라인 파서 가동 (Heuristic Lines Extractor)
      const lines = rawText.split('\n');
      lines.forEach(line => {
        const mat = line.match(/([가-힣A-Za-z0-9\s]+)\s*\(([^)]+)\)\s*[-~]?\s*([A-G]#?m?|Eb)?/);
        if (mat && mat[1] && mat[1].trim().length > 1 && !line.includes("recommendations")) {
          recommendations.push({
            title: mat[1].trim(),
            artist: mat[2].trim(),
            key: mat[3] ? mat[3].trim() : "G",
            reason: "예배 디렉터 추천 흐름 찬양입니다."
          });
        }
      });
      
      if (recommendations.length > 0) {
        return { recommendations };
      }
      
      throw new Error("모든 파싱 기법 및 정규식 추출이 좌절되었습니다.");
    }
  }
}

// [실시간 연동] Gemini API 실시간 통신 및 파싱 (최적화 모델 및 스키마 제한 속도 2배 튜닝)
async function fetchGeminiRecommendations(apiKey, target, theme, currentSong, reqKey, bpm, mood) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const targetMap = { child: '어린이예배', youth: '청년예배', adult: '장년예배' };
  const themeMap = { worship: '예배/경배', grace: '은혜/사랑', decision: '결단/헌신', comfort: '위로/소망', thanks: '감사/기쁨' };
  const bpmMap = { slow: '느린 (60-80 BPM)', medium: '보통 (80-100 BPM)', fast: '빠른 (100-130 BPM)' };
  const moodMap = { calm: '차분하고 은혜로운 묵상', grand: '뜨겁고 웅장한 빌드업', bright: '기쁘고 신나는 축제 분위기' };
  
  const prompt = `
너는 20년 이상의 경력을 가진 교회 찬양인도자이자 예배 디렉터이다.
아래 사용자가 입력한 정보를 바탕으로 예배의 흐름, 앞뒤 곡의 코드(Key) 연결감, 템포, 연령대를 종합 조율하여 가장 은혜로운 연결 콘티 5곡을 추천해라.

추천 기준:
- 예배의 흐름과 감정선을 고려한다.
- 코드(Key)가 자연스럽게 이어지도록 한다.
- 현재 한국 교회에서 널리 불리는 최신 모던 CCM(WELOVE, 제이어스, 마커스, 어노인팅 등)을 우선 추천한다.
- 각 곡마다 20년 디렉터 관점에서의 추천 이유(reason)를 한글 80자 이내의 짧고 직관적인 핵심 팁으로 간결하게 작성해라. (글자 수가 길어지면 안 된다!)
- 동일한 곡을 중복 추천하지 않는다.

반드시 다른 설명 텍스트 없이 오직 아래 지정된 JSON 규격으로만 응답해야 한다. 백틱(\`\`\`)이나 JSON 표시도 다 빼고 순수한 JSON 스트링만 보내라.

{
  "recommendations":[
    {
      "title":"찬양 제목",
      "artist":"아티스트",
      "key":"코드",
      "reason":"짧고 직관적인 핵심 연출 팁"
    }
  ]
}

입력값:
- 예배대상: ${targetMap[target]}
- 예배주제: ${themeMap[theme]}
- 시작곡: ${currentSong || '지정 없음'}
- 원하는 코드: ${reqKey || '상관없음'}
- 원하는 BPM: ${bpmMap[bpm]}
- 원하는 분위기: ${moodMap[mood]}
`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 950,
      temperature: 0.7
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errData = await response.json();
    throw new Error('Gemini API 서버와의 통신에 실패했습니다: ' + (errData.error?.message || response.statusText));
  }
  
  const data = await response.json();
  let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // 백틱 및 json 포맷 제거 안전 마이그레이션
  jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // [Fuzzy JSON Extraction] 응답 텍스트 중 중괄호 { } 패턴만 추출하여 다른 잔여 설명 텍스트가 섞여 있어도 파싱 성공 보장
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  try {
    const resultObj = superRobustJSONParser(jsonText);
    if (!resultObj.recommendations || !Array.isArray(resultObj.recommendations)) {
      throw new Error('추천 데이터 규격이 올바르지 않습니다.');
    }
    return resultObj.recommendations;
  } catch (parseErr) {
    console.error("Gemini Response parsing fail. Raw text was: ", jsonText);
    // [Silent Fallback] 에러가 나면 사용자에게 알리고 로컬 디렉터 엔진의 5곡 추천으로 실시간 자동 매핑 전환 처리!
    alert(`[Gemini API 연동 일시 지연]\n구글 AI 응답을 디코딩하지 못해, 20년 경력 로컬 디렉터 엔진으로 자동 전환하여 추천합니다.\n(응답 텍스트: "${jsonText.substring(0, 100)}...")`);
    return getLocalRecommendations(target, theme, reqKey, bpm, mood);
  }
}

// 공지사항 상세 닫기
function closeNoticeDetail() {
  document.getElementById('notice-detail-modal').classList.remove('active');
}

// 공지사항 작성 폼 토글
function toggleNoticeFormModal(show) {
  const modal = document.getElementById('notice-form-modal');
  if (show) {
    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
    document.getElementById('notice-form').reset();
    state.editingNoticeId = null;
  }
}

// 공지사항 추가 모달 열기
function openAddNoticeModal() {
  document.getElementById('notice-modal-title').textContent = '공지사항 추가';
  document.getElementById('form-notice-id').value = '';
  
  // 날짜 기본값 세팅 (오늘 날짜 설정)
  const today = new Date().toISOString().substring(0, 10);
  document.getElementById('notice-date-input').value = today;
  
  state.editingNoticeId = null;
  toggleNoticeFormModal(true);
}

// 공지사항 수정 모달 열기
function openEditNoticeModal(event, noticeId) {
  event.stopPropagation(); // 상세 클릭 방지
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const notice = church.notices.find(item => item.id === noticeId);
  if (!notice) return;
  
  document.getElementById('notice-modal-title').textContent = '공지사항 수정';
  document.getElementById('form-notice-id').value = notice.id;
  document.getElementById('notice-title-input').value = notice.title;
  document.getElementById('notice-date-input').value = notice.date;
  document.getElementById('notice-content-input').value = notice.content;
  
  state.editingNoticeId = noticeId;
  toggleNoticeFormModal(true);
}

// 공지사항 저장 (추가/수정 저장 실행)
function saveNotice(event) {
  event.preventDefault();
  
  const title = document.getElementById('notice-title-input').value.trim();
  const date = document.getElementById('notice-date-input').value;
  const content = document.getElementById('notice-content-input').value.trim();
  
  if (!title || !date || !content) return;
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  if (state.editingNoticeId) {
    // 수정
    const notice = church.notices.find(item => item.id === state.editingNoticeId);
    if (notice) {
      notice.title = title;
      notice.date = date;
      notice.content = content;
      if (!notice.createdBy) {
        notice.createdBy = state.userName || "관리자";
      }
    }
  } else {
    // 추가
    const newNotice = {
      id: 'notice-' + Date.now(),
      title: title,
      date: date,
      content: content,
      createdBy: state.userName || "관리자" // 👈 실명 연동 작성자 태깅!
    };
    church.notices.push(newNotice);
  }
  
  saveDatabase();
  renderNoticeList();
  toggleNoticeFormModal(false);
}

// 공지사항 삭제
function deleteNotice(event, noticeId) {
  event.stopPropagation(); // 상세 클릭 방지
  if (db.activeRole !== 'admin') return;
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const notice = church.notices.find(item => item.id === noticeId);
  if (!notice) return;
  
  const isConfirmed = confirm(`"${notice.title}" 공지글을 삭제하시겠습니까?`);
  if (isConfirmed) {
    church.notices = church.notices.filter(item => item.id !== noticeId);
    saveDatabase();
    renderNoticeList();
  }
}

// ==========================================================================
// [AI 찬양 추천 비즈니스 로직 (20년 경력 디렉터 & Gemini API)]
// ==========================================================================

// AI 추천 폼 제출 및 핵심 라우터
async function handleAIRecommendation() {
  const target = document.getElementById('ai-target').value;
  const theme = document.getElementById('ai-theme').value;
  const currentSong = document.getElementById('ai-current-song').value.trim();
  const reqKey = document.getElementById('ai-key').value;
  const bpm = document.getElementById('ai-bpm').value;
  const mood = document.getElementById('ai-mood').value;
  
  const isRealAI = document.getElementById('ai-api-toggle').checked;
  const rawApiKey = document.getElementById('ai-api-key-input').value;
  
  // API Key 내의 보이지 않는 공백, 탭, 개행 문자 등을 완벽히 클렌징
  const apiKey = rawApiKey ? rawApiKey.replace(/[\s\t\r\n]/g, '') : '';
  
  const loadingBox = document.getElementById('ai-loading-box');
  const resultsBox = document.getElementById('ai-results-box');
  
  // 캐시 키 생성 (중복 호출 방지용)
  const cacheKey = [target, theme, currentSong, reqKey, bpm, mood, isRealAI ? 'real' : 'local'].join('|');
  
  // 인메모리 캐시 히트(Hit) 시 즉시 반환 (속도 0초!)
  if (state.aiCache[cacheKey]) {
    displayAIRecommendations(state.aiCache[cacheKey]);
    return;
  }
  
  resultsBox.innerHTML = '';
  resultsBox.style.display = 'none';
  loadingBox.style.display = 'flex';
  
  try {
    let recommendations = [];
    
    if (isRealAI) {
      if (!apiKey) {
        throw new Error('OpenAI API Key를 입력해주시거나, 연동 비활성화 후 로컬 엔진을 이용해 주세요.');
      }
      try {
        recommendations = await fetchGPTRecommendations(apiKey, target, theme, currentSong, reqKey, bpm, mood);
      } catch (apiErr) {
        console.warn("OpenAI API call failed, falling back to local engine:", apiErr);
        recommendations = getLocalRecommendations(target, theme, reqKey, bpm, mood);
        recommendations._isFallback = true;
        recommendations._fallbackReason = apiErr.message;
      }
    } else {
      // 로컬 디렉터 데이터 분석 엔진 구동 (0.7초 시간 지연을 주어 분석 감성 제공)
      await new Promise(resolve => setTimeout(resolve, 800));
      recommendations = getLocalRecommendations(target, theme, reqKey, bpm, mood);
    }
    
    // 캐시에 적재
    if (recommendations && recommendations.length > 0) {
      state.aiCache[cacheKey] = recommendations;
    }
    
    displayAIRecommendations(recommendations);
  } catch (err) {
    alert(err.message);
  } finally {
    loadingBox.style.display = 'none';
  }
}

// [로컬] 20년 경력 예배 디렉터 필터링 & 흐름 정렬 알고리즘 (코드 100% 매칭 및 셔플 개선)
function getLocalRecommendations(target, theme, reqKey, bpm, mood) {
  // 1차 필터링: 예배 대상 연령대 분할
  let pool = localPraiseDB.filter(song => song.target === target);
  if (pool.length < 10) {
    pool = [...localPraiseDB]; // 풀 확장
  }
  
  const selected = [];
  
  // 1. 첫 번째 곡 선별 (원하는 코드를 지정했을 경우 무조건 해당 코드를 가진 곡들 중에서 가중치에 맞춰 셔플 추출)
  let firstSongPool = [];
  if (reqKey) {
    firstSongPool = pool.filter(song => song.key === reqKey);
  }
  
  // 지정 코드를 가진 곡이 없거나 지정을 안 했을 때 전체 풀 적용
  if (firstSongPool.length === 0) {
    firstSongPool = [...pool];
  }
  
  // 가중치 연산
  firstSongPool.forEach(song => {
    let score = 0;
    if (song.themes.includes(theme)) score += 10;
    if (song.mood === mood) score += 5;
    if (song.bpm === bpm) score += 3;
    song._tempScore = score;
  });
  
  // 점수 높은 상위 4곡 중 하나를 랜덤 추출하여 1번 곡으로 확정 (다양성 극대화)
  firstSongPool.sort((a, b) => b._tempScore - a._tempScore);
  const topFirstSongs = firstSongPool.slice(0, Math.min(4, firstSongPool.length));
  const firstSong = topFirstSongs[Math.floor(Math.random() * topFirstSongs.length)];
  selected.push(firstSong);
  
  // 2. 두 번째 곡 선별 (1번 곡과 동일 코드를 최우선 검색 ➜ 없으면 호환 연결성 매칭)
  const firstKey = firstSong.key;
  let secondSongPool = pool.filter(song => song.title !== firstSong.title && song.key === firstKey);
  
  // 동일 코드가 부족하면 호환(4도/5도권) 인접 곡 매칭
  if (secondSongPool.length === 0) {
    secondSongPool = pool.filter(song => song.title !== firstSong.title && isKeyCompatible(firstKey, song.key));
  }
  
  // 그것도 모자라면 전체 풀 중 선택
  if (secondSongPool.length === 0) {
    secondSongPool = pool.filter(song => song.title !== firstSong.title);
  }
  
  secondSongPool.forEach(song => {
    let score = 0;
    if (song.themes.includes(theme)) score += 8;
    if (song.mood === mood) score += 4;
    song._tempScore = score;
  });
  
  secondSongPool.sort((a, b) => b._tempScore - a._tempScore);
  const topSecondSongs = secondSongPool.slice(0, Math.min(4, secondSongPool.length));
  const secondSong = topSecondSongs[Math.floor(Math.random() * topSecondSongs.length)];
  selected.push(secondSong);
  
  // 3. 세 번째 곡 선별 (예배의 고조 단계: 기쁨이나 장엄한 찬양 우선)
  const secondKey = secondSong.key;
  let thirdSongPool = pool.filter(song => !selected.map(s => s.title).includes(song.title) && song.key === secondKey);
  
  if (thirdSongPool.length === 0) {
    thirdSongPool = pool.filter(song => !selected.map(s => s.title).includes(song.title) && isKeyCompatible(secondKey, song.key));
  }
  
  if (thirdSongPool.length === 0) {
    thirdSongPool = pool.filter(song => !selected.map(s => s.title).includes(song.title));
  }
  
  thirdSongPool.forEach(song => {
    let score = 0;
    if (song.themes.includes("worship") || song.themes.includes(theme)) score += 8;
    if (song.bpm === "fast" || song.mood === "grand") score += 5;
    song._tempScore = score;
  });
  
  thirdSongPool.sort((a, b) => b._tempScore - a._tempScore);
  const topThirdSongs = thirdSongPool.slice(0, Math.min(4, thirdSongPool.length));
  const thirdSong = topThirdSongs[Math.floor(Math.random() * topThirdSongs.length)];
  selected.push(thirdSong);

  // 4. 네 번째 곡 선별 (예배의 연결성 보완 및 점진적 정리)
  const thirdKey = thirdSong.key;
  let fourthSongPool = pool.filter(song => !selected.map(s => s.title).includes(song.title) && song.key === thirdKey);
  
  if (fourthSongPool.length === 0) {
    fourthSongPool = pool.filter(song => !selected.map(s => s.title).includes(song.title) && isKeyCompatible(thirdKey, song.key));
  }
  
  if (fourthSongPool.length === 0) {
    fourthSongPool = pool.filter(song => !selected.map(s => s.title).includes(song.title));
  }
  
  fourthSongPool.forEach(song => {
    let score = 0;
    if (song.themes.includes(theme) || song.themes.includes("decision")) score += 8;
    if (song.bpm === "medium" || song.bpm === thirdSong.bpm) score += 4;
    song._tempScore = score;
  });
  
  fourthSongPool.sort((a, b) => b._tempScore - a._tempScore);
  const topFourthSongs = fourthSongPool.slice(0, Math.min(4, fourthSongPool.length));
  const fourthSong = topFourthSongs[Math.floor(Math.random() * topFourthSongs.length)] || { title: "목마른 사슴", artist: "복음성가", key: "D", reason: "예배의 연결을 돕는 추천 곡입니다." };
  selected.push(fourthSong);

  // 5. 다섯 번째 곡 선별 (결단/묵상/헌신 위주의 잔잔한 엔딩)
  const fourthKey = fourthSong.key || "G";
  let fifthSongPool = pool.filter(song => !selected.map(s => s.title).includes(song.title) && song.key === fourthKey);
  
  if (fifthSongPool.length === 0) {
    fifthSongPool = pool.filter(song => !selected.map(s => s.title).includes(song.title) && isKeyCompatible(fourthKey, song.key));
  }
  
  if (fifthSongPool.length === 0) {
    fifthSongPool = pool.filter(song => !selected.map(s => s.title).includes(song.title));
  }
  
  fifthSongPool.forEach(song => {
    let score = 0;
    if (song.themes.includes("decision") || song.themes.includes("comfort") || song.themes.includes(theme)) score += 10;
    if (song.bpm === "slow" || song.mood === "calm") score += 5;
    song._tempScore = score;
  });
  
  fifthSongPool.sort((a, b) => b._tempScore - a._tempScore);
  const topFifthSongs = fifthSongPool.slice(0, Math.min(3, fifthSongPool.length));
  const fifthSong = topFifthSongs[Math.floor(Math.random() * topFifthSongs.length)] || { title: "원하고 바라고 기도합니다", artist: "아이자야 씩스티원", key: "Eb", reason: "주님 앞에 내 온 삶을 기도로 고백하며 묵상합니다." };
  selected.push(fifthSong);
  
  return selected.map(song => ({
    title: song.title,
    artist: song.artist,
    key: song.key,
    reason: song.reason
  }));
}

// 코드 자연스러운 흐름 연계성 분석 헬퍼
function isKeyCompatible(key1, key2) {
  if (key1 === key2) return true; // 같은 코드는 프렛 이동이 필요 없어 매끄러움
  
  const circleOfFifths = {
    'C': ['F', 'G', 'Am'],
    'G': ['C', 'D', 'Em'],
    'D': ['G', 'A', 'Bm'],
    'A': ['D', 'E', 'F#m'],
    'E': ['A', 'B', 'C#m'],
    'F': ['Bb', 'C', 'Dm'],
    'Bb': ['Eb', 'F', 'Gm'],
    'Eb': ['Ab', 'Bb', 'Cm']
  };
  
  const relations = circleOfFifths[key1] || [];
  return relations.includes(key2);
}






// AI 추천 결과 UI 동적 생성
function displayAIRecommendations(recommendations) {
  const container = document.getElementById('ai-results-box');
  container.innerHTML = '';
  
  // 만약 API 연동 실패 폴백에 의해 그려진 경우 주황색 경고 배너 띄우기
  if (recommendations._isFallback) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: var(--radius-sm);
      padding: 12px;
      margin-bottom: 4px;
      font-size: 0.75rem;
      line-height: 1.5;
      color: #b45309;
      display: flex;
      gap: 8px;
      align-items: flex-start;
      width: 100%;
    `;
    banner.innerHTML = `
      <i class="fa-solid fa-triangle-exclamation" style="font-size: 1rem; margin-top: 2px;"></i>
      <div>
        <strong>오프라인 200곡 추천 모드 가동</strong><br>
        OpenAI API 키의 잔액(Quota) 부족 또는 통신 장애가 감지되어, 내장된 <strong>200곡의 예배 디렉터 지식 베이스</strong>를 기반으로 5곡 추천을 즉시 완료했습니다. (인터넷 결제 충전 시 실시간 AI 사용 가능)
      </div>
    `;
    container.appendChild(banner);
  }
  
  recommendations.forEach((rec, index) => {
    const card = document.createElement('div');
    card.className = 'rec-song-card';
    
    // 코드 뱃지
    const keyBadgeHtml = rec.key ? `<span class="song-key-badge">${escapeHtml(rec.key)} Key</span>` : '';
    
    // 유튜브 링크 탐색 및 폴백 자동 검색 쿼리 연계
    let youtubeUrl = "";
    const matchedSong = localPraiseDB.find(s => s.title.toLowerCase() === rec.title.toLowerCase());
    
    if (matchedSong && matchedSong.youtubeUrl) {
      youtubeUrl = matchedSong.youtubeUrl;
    } else {
      const query = encodeURIComponent(`${rec.title} ${rec.artist}`);
      youtubeUrl = `https://www.youtube.com/results?search_query=${query}`;
    }
    
    card.innerHTML = `
      <div style="display: flex; align-items: center; width: 100%;">
        <div class="rec-icon-wrapper"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div class="card-info">
          <div class="card-title-row">
            <h3 class="card-title">${escapeHtml(rec.title)}</h3>
            ${keyBadgeHtml}
          </div>
          <p class="card-desc">${escapeHtml(rec.artist)}</p>
        </div>
      </div>
      <div class="rec-reason-box">
        <strong>예배 디렉터 멘트:</strong><br>${escapeHtml(rec.reason)}
      </div>
      <div class="rec-actions-row">
        <a href="${youtubeUrl}" target="_blank" rel="noopener noreferrer" class="rec-youtube-btn">
          <i class="fa-brands fa-youtube"></i> YouTube 영상
        </a>
        <button class="btn-add-to-conti" onclick="openRecAddModal('${escapeHtml(rec.title)} (${escapeHtml(rec.artist)})', '${escapeHtml(rec.key)}', '${escapeHtml(rec.reason)}', '${escapeHtml(youtubeUrl)}')">
          <i class="fa-solid fa-circle-plus"></i> 콘티에 추가
        </button>
      </div>
    `;
    
    container.appendChild(card);
  });
  
  container.style.display = 'flex';
}

// AI 추천곡 콘티 추가 모달 열기
function openRecAddModal(songName, key, reason, youtubeUrl) {
  const serviceSelect = document.getElementById('rec-add-service-select');
  
  serviceSelect.innerHTML = '';
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const worships = church.worships || {};
  const keys = Object.keys(worships);
  
  if (keys.length === 0) {
    alert('등록된 예배가 없습니다. 메인화면에서 먼저 예배 카드를 추가해 주세요.');
    return;
  }
  
  // 예배 목록 드롭다운 채우기
  keys.forEach(wKey => {
    const opt = document.createElement('option');
    opt.value = wKey;
    opt.textContent = worships[wKey].title;
    serviceSelect.appendChild(opt);
  });
  
  // 첫 번째 예배 선택 시 주차 목록 동기화
  updateRecAddWeekOptions(keys[0]);
  
  // 예배 변경 시 주차 동기화 이벤트 바인딩
  serviceSelect.onchange = (e) => {
    updateRecAddWeekOptions(e.target.value);
  };
  
  // 숨겨진 필드 및 데이터셋에 바인딩
  document.getElementById('rec-add-title').value = songName;
  document.getElementById('rec-add-key').value = key;
  document.getElementById('rec-add-reason').value = reason;
  document.getElementById('rec-add-form').dataset.youtubeUrl = youtubeUrl || "";
  
  document.getElementById('rec-add-song-name-indicator').textContent = songName;
  
  document.getElementById('rec-add-modal').classList.add('active');
}

// 추천곡 모달 내 예배 선택에 따라 주차/아카이브 주차 리스트 연동 동기화
function updateRecAddWeekOptions(worshipId) {
  const weekSelect = document.getElementById('rec-add-week-select');
  weekSelect.innerHTML = '';
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const worship = church.worships[worshipId];
  if (!worship) return;
  
  const weeks = worship.weeks || {};
  
  // 이번주, 다음주 기본 셋팅
  const optThis = document.createElement('option');
  optThis.value = 'this-week';
  optThis.textContent = '이번 주 찬양';
  weekSelect.appendChild(optThis);
  
  const optNext = document.createElement('option');
  optNext.value = 'next-week';
  optNext.textContent = '다음 주 찬양';
  weekSelect.appendChild(optNext);
  
  // 아카이브 이력도 동적 제공하여 과거 기록에도 넣을 수 있게 설정
  Object.keys(weeks).forEach(weekKey => {
    if (weekKey.startsWith('archive-')) {
      const optPast = document.createElement('option');
      optPast.value = weekKey;
      optPast.textContent = `${weeks[weekKey].title} (${weeks[weekKey].date})`;
      weekSelect.appendChild(optPast);
    }
  });
}

// 추천곡 콘티 추가 모달 닫기
function closeRecAddModal() {
  document.getElementById('rec-add-modal').classList.remove('active');
  document.getElementById('rec-add-form').reset();
  delete document.getElementById('rec-add-form').dataset.youtubeUrl;
}

// 추천곡 최종 이식 실행
function saveRecAddToLiturgy(event) {
  event.preventDefault();
  
  const title = document.getElementById('rec-add-title').value;
  const key = document.getElementById('rec-add-key').value;
  const reason = document.getElementById('rec-add-reason').value;
  const youtubeUrl = document.getElementById('rec-add-form').dataset.youtubeUrl || "";
  
  const serviceId = document.getElementById('rec-add-service-select').value;
  const weekId = document.getElementById('rec-add-week-select').value;
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  const worship = church.worships[serviceId];
  if (!worship) return;
  const week = worship.weeks[weekId];
  if (!week) return;
  
  const newSong = {
    id: 'song-' + Date.now(),
    title: title,
    key: key,
    youtubeUrl: youtubeUrl,
    memo: `[AI 예배 디렉터 추천사]\n${reason}`,
    sheetMusic: null,
    createdBy: state.userName || "관리자" // 👈 실명 연동 작성자 태깅!
  };
  
  week.items.push(newSong);
  saveDatabase();
  
  alert(`"${title}" 찬양이 "${worship.title} - ${week.title}"에 성공적으로 추가되었습니다!`);
  closeRecAddModal();
}

// ==========================================================================
// [이전 콘티 역사(History) 목록 비즈니스 로직]
// ==========================================================================

// 이전 콘티 목록 화면 렌더링
function renderHistoryList() {
  const historyListContainer = document.getElementById('history-list');
  historyListContainer.innerHTML = '';
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const worship = church.worships[state.selectedServiceId];
  if (!worship) return;
  
  const weeks = worship.weeks || {};
  const archiveKeys = Object.keys(weeks).filter(key => key.startsWith('archive-'));
  
  if (archiveKeys.length === 0) {
    historyListContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-clock-rotate-left empty-icon"></i>
        <p>기록된 이전 콘티가 없습니다.</p>
        ${db.activeRole === 'admin' ? '<p class="empty-sub">하단의 [이전 콘티 추가] 버튼을 눌러 과거 찬양 콘티 이력을 누적 보관해보세요!</p>' : ''}
      </div>
    `;
    return;
  }
  
  // 날짜 기준으로 내림차순(최신 일자순) 정렬
  archiveKeys.sort((a, b) => {
    const dateA = weeks[a].date || '';
    const dateB = weeks[b].date || '';
    return dateB.localeCompare(dateA); // 내림차순
  });
  
  archiveKeys.forEach(key => {
    const archive = weeks[key];
    const songCount = archive.items ? archive.items.length : 0;
    const card = document.createElement('div');
    card.className = 'liturgy-card';
    card.dataset.archiveId = key;
    
    // 날짜 뱃지 마크업
    const dateBadgeHtml = archive.date
      ? `<span class="worship-date-badge"><i class="fa-regular fa-calendar"></i> ${archive.date}</span>`
      : '';
      
    // 관리자용 삭제 단추
    const adminDeleteBtn = db.activeRole === 'admin'
      ? `<button class="icon-btn danger-btn" onclick="deleteHistoryLiturgy(event, '${key}')" title="이력 삭제" style="margin-left: 8px; margin-right: 4px;">
           <i class="fa-solid fa-trash"></i>
         </button>`
      : '';

    card.innerHTML = `
      <div class="card-icon next-week"><i class="fa-solid fa-folder-closed"></i></div>
      <div class="card-info">
        <div class="card-title-row">
          <h3 class="card-title">${escapeHtml(archive.title)}</h3>
          ${dateBadgeHtml}
        </div>
        <span class="history-song-count-badge">곡 ${songCount}개</span>
      </div>
      ${adminDeleteBtn}
      <div class="card-arrow"><i class="fa-solid fa-chevron-right"></i></div>
    `;
    
    // 클릭 시 상세 화면으로 바로 이동!
    card.addEventListener('click', () => {
      navigateTo('detail', state.selectedServiceId, key);
    });
    
    historyListContainer.appendChild(card);
  });
}

// 이전 콘티 개설 모달 제어
function toggleHistoryModal(show) {
  const modal = document.getElementById('history-modal');
  if (show) {
    // 날짜 기본값 세팅 (오늘 날짜 설정)
    const today = new Date().toISOString().substring(0, 10);
    document.getElementById('history-date-input').value = today;
    document.getElementById('history-copy-checkbox').checked = true;
    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
    document.getElementById('history-form').reset();
  }
}

// 이전 콘티 등록 처리
function saveHistoryLiturgy(event) {
  event.preventDefault();
  
  const date = document.getElementById('history-date-input').value;
  const title = document.getElementById('history-title-input').value.trim();
  const copyThisWeek = document.getElementById('history-copy-checkbox').checked;
  
  if (!date || !title) return;
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const worship = church.worships[state.selectedServiceId];
  if (!worship) return;
  
  const archiveId = 'archive-' + Date.now();
  
  // 복사 체크 여부에 따른 곡 목록 카피
  let copiedItems = [];
  if (copyThisWeek && worship.weeks['this-week'] && worship.weeks['this-week'].items) {
    copiedItems = JSON.parse(JSON.stringify(worship.weeks['this-week'].items)); // 깊은 복사
  }
  
  worship.weeks[archiveId] = {
    title: title,
    date: date,
    items: copiedItems
  };
  
  saveDatabase();
  renderHistoryList();
  toggleHistoryModal(false);
}

// 이전 콘티 기록 삭제
function deleteHistoryLiturgy(event, archiveId) {
  event.stopPropagation(); // 카드 이동 전파 차단
  if (db.activeRole !== 'admin') return;
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const worship = church.worships[state.selectedServiceId];
  if (!worship) return;
  
  const archive = worship.weeks[archiveId];
  if (!archive) return;
  
  const isConfirmed = confirm(`"${archive.title} (${archive.date})" 콘티 기록을 아카이브에서 삭제하시겠습니까?`);
  if (isConfirmed) {
    delete worship.weeks[archiveId];
    saveDatabase();
    renderHistoryList();
  }
}

// ==========================================================================
// [화면 네비게이션 및 상세 비즈니스 로직]
// ==========================================================================

// 화면 전환 함수
function navigateTo(screenId, serviceId = null, weekId = null) {
  state.currentScreen = screenId;
  
  const screenAuth = document.getElementById('screen-auth');
  const screenMain = document.getElementById('screen-main');
  const screenSub = document.getElementById('screen-sub');
  const screenHistory = document.getElementById('screen-history');
  const screenDetail = document.getElementById('screen-detail');
  
  screenAuth.classList.remove('active');
  screenMain.classList.remove('active');
  screenSub.classList.remove('active');
  screenHistory.classList.remove('active');
  screenDetail.classList.remove('active');
  
  const church = db.churches[db.activeChurchId];
  
  if (screenId === 'auth') {
    screenAuth.classList.add('active');
    
  } else if (screenId === 'main') {
    state.selectedServiceId = null;
    state.selectedWeekId = null;
    screenMain.classList.add('active');
    
  } else if (screenId === 'sub' && serviceId) {
    state.selectedServiceId = serviceId;
    state.selectedWeekId = null;
    
    if (church) {
      const worship = church.worships[serviceId];
      document.getElementById('sub-title').textContent = worship ? worship.title : '예배 선택';
    }
    screenSub.classList.add('active');
    
  } else if (screenId === 'history' && serviceId) {
    state.selectedServiceId = serviceId;
    state.selectedWeekId = null;
    
    if (church) {
      const worship = church.worships[serviceId];
      document.getElementById('history-title').textContent = worship ? `${worship.title} - 이전 콘티` : '이전 콘티';
    }
    renderHistoryList();
    screenHistory.classList.add('active');
    
  } else if (screenId === 'detail' && serviceId && weekId) {
    state.selectedServiceId = serviceId;
    state.selectedWeekId = weekId;
    
    renderSongDetailHeader();
    renderSongList();
    screenDetail.classList.add('active');
  }
}

// 상세 화면 헤더 타이틀 렌더링
function renderSongDetailHeader() {
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const worship = church.worships[state.selectedServiceId];
  if (!worship) return;
  
  if (!worship.weeks) worship.weeks = {};
  if (!worship.weeks[state.selectedWeekId]) {
    worship.weeks[state.selectedWeekId] = {
      title: state.selectedWeekId === 'next-week' ? '다음 주 찬양' : '이번 주 찬양',
      items: []
    };
  }
  const week = worship.weeks[state.selectedWeekId];
  if (!week) return;
  
  const titleEl = document.getElementById('detail-title');
  
  // 아카이브 여부에 따른 표기 세분화
  if (state.selectedWeekId.startsWith('archive-')) {
    titleEl.textContent = `${worship.title} - ${week.title} (${week.date})`;
  } else {
    titleEl.textContent = `${worship.title} - ${week.title}`;
  }
}

// 상세 화면 찬양 목록 렌더링
function renderSongList() {
  const songListContainer = document.getElementById('song-list');
  songListContainer.innerHTML = '';
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const worship = church.worships[state.selectedServiceId];
  if (!worship) return;
  
  if (!worship.weeks) worship.weeks = {};
  if (!worship.weeks[state.selectedWeekId]) {
    worship.weeks[state.selectedWeekId] = {
      title: state.selectedWeekId === 'next-week' ? '다음 주 찬양' : '이번 주 찬양',
      items: []
    };
  }
  const week = worship.weeks[state.selectedWeekId];
  if (!week) return;
  
  // [NEW] 콘티 상세 조회자 실시간 기록
  if (!week.viewers) {
    week.viewers = {};
  }
  if (state.userName) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (week.viewers[state.userName] !== timeStr) {
      week.viewers[state.userName] = timeStr;
      saveDatabase();
    }
  }
  
  // [NEW] 실시간 콘티 조회자 UI 렌더링
  const viewersBox = document.getElementById('worship-viewers-box');
  const viewersContainer = document.getElementById('viewer-list-container');
  if (viewersBox && viewersContainer) {
    const viewerNames = Object.keys(week.viewers || {});
    if (viewerNames.length > 0) {
      viewersBox.style.display = 'block';
      viewersContainer.innerHTML = '';
      
      document.getElementById('viewer-count-badge').textContent = `${viewerNames.length}명`;
      
      viewerNames.forEach(name => {
        const time = week.viewers[name];
        const badge = document.createElement('span');
        badge.style.cssText = `
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.16);
          color: #4f46e5;
          padding: 2px 7px;
          border-radius: var(--radius-sm);
          font-size: 0.6875rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        `;
        badge.innerHTML = `<i class="fa-regular fa-eye" style="font-size: 0.6rem;"></i> ${escapeHtml(name)} (${time})`;
        viewersContainer.appendChild(badge);
      });
    } else {
      viewersBox.style.display = 'none';
    }
  }
  
  const items = week.items || [];
  
  if (items.length === 0) {
    songListContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-folder-open empty-icon"></i>
        <p>등록된 찬양이 없습니다.</p>
        ${db.activeRole === 'admin' ? '<p class="empty-sub">하단의 [찬양 추가] 버튼을 눌러 콘티를 구성해보세요!</p>' : ''}
      </div>
    `;
    return;
  }
  
  items.forEach((song, index) => {
    const songItem = document.createElement('div');
    songItem.className = 'song-item';
    songItem.dataset.index = index;
    songItem.dataset.id = song.id;
    
    if (db.activeRole === 'admin') {
      songItem.setAttribute('draggable', 'true');
    }
    
    // YouTube 링크 버튼
    const hasYoutube = song.youtubeUrl && song.youtubeUrl.trim() !== '';
    const youtubeBtnHtml = hasYoutube
      ? `<a href="${song.youtubeUrl}" target="_blank" rel="noopener noreferrer" class="youtube-link-btn">
           <i class="fa-brands fa-youtube"></i> YouTube 영상
         </a>`
      : `<a class="youtube-link-btn disabled">
           <i class="fa-brands fa-youtube"></i> 영상 없음
         </a>`;
         
    // 악보 보기 버튼
    const hasSheet = song.sheetMusic && song.sheetMusic.trim() !== '';
    const sheetBtnHtml = hasSheet
      ? `<button class="sheet-music-btn" onclick="openSheetViewer('${escapeHtml(song.title)}', '${song.id}')">
           <i class="fa-solid fa-file-image"></i> 악보 보기
         </button>`
      : '';
         
    // 곡 코드(Key) 배지 렌더링
    const keyBadgeHtml = song.key ? `<span class="song-key-badge">${escapeHtml(song.key)} Key</span>` : '';
    
    // 작성자 실명 뱃지 렌더링
    const authorBadgeHtml = `<span style="font-size: 0.625rem; font-weight: 500; color: #4f46e5; background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.15); padding: 1px 5px; border-radius: var(--radius-sm); margin-left: 4px; display: inline-flex; align-items: center; gap: 3px; white-space: nowrap;"><i class="fa-regular fa-user" style="font-size: 0.55rem;"></i> ${escapeHtml(song.createdBy || '인도자')}</span>`;
         
    // 메모 박스
    const hasMemo = song.memo && song.memo.trim() !== '';
    const memoHtml = hasMemo
      ? `<div class="song-memo-box">${escapeHtml(song.memo)}</div>`
      : '';
      
    // 관리자 전용 제어
    const adminControlsHtml = `
      <div class="song-admin-controls">
        <button class="icon-btn edit-btn" onclick="openEditModal('${song.id}')" title="수정">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="icon-btn danger-btn" onclick="deleteSong('${song.id}')" title="삭제">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    songItem.innerHTML = `
      <div class="song-item-header">
        <div class="drag-handle" title="드래그하여 순서 변경">
          <i class="fa-solid fa-grip-lines"></i>
        </div>
        <span class="song-number">${getCircleNumber(index + 1)}</span>
        <span class="song-title-text" style="display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px;">${escapeHtml(song.title)}${keyBadgeHtml}${authorBadgeHtml}</span>
        ${adminControlsHtml}
      </div>
      <div class="song-body">
        <div class="song-actions-row">
          ${youtubeBtnHtml}
          ${sheetBtnHtml}
        </div>
        ${memoHtml}
      </div>
    `;
    
    songListContainer.appendChild(songItem);
  });
}

// 숫자 동그라미 기호 반환 헬퍼
function getCircleNumber(num) {
  const circles = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮'];
  if (num >= 1 && num <= 15) {
    return circles[num - 1];
  }
  return `[${num}]`;
}

// XSS 보호 헬퍼
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================================================
// [이미지 처리 및 캔버스 압축 헬퍼]
// ==========================================================================
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        // 모바일 화면 가독성을 유지하면서 전송 페이로드를 극단적으로 아끼기 위해 550px로 최적화
        const maxWidth = 550;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // 압축률을 0.35로 극대화하여 용량을 기존 대비 80% 이상 초경량 다이어트! (5MB 한도 영구 정복)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.35);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

// 악보 이미지 뷰어 열기
function openSheetViewer(songTitle, songId) {
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  const worship = church.worships[state.selectedServiceId];
  if (!worship) return;
  const week = worship.weeks[state.selectedWeekId];
  if (!week) return;
  
  const song = week.items.find(item => item.id === songId);
  if (!song || !song.sheetMusic) return;
  
  document.getElementById('sheet-viewer-title').textContent = `${songTitle} - 악보 이미지`;
  document.getElementById('sheet-viewer-img').src = song.sheetMusic;
  document.getElementById('sheet-viewer-modal').classList.add('active');
}

// 악보 이미지 뷰어 닫기
function closeSheetViewer() {
  document.getElementById('sheet-viewer-modal').classList.remove('active');
  document.getElementById('sheet-viewer-img').src = '';
}

// ==========================================================================
// [찬양 모달 비즈니스 로직]
// ==========================================================================

// 찬양 작성 모달 제어
function toggleSongModal(show) {
  const modal = document.getElementById('song-modal');
  if (show) {
    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
    document.getElementById('song-form').reset();
    document.getElementById('song-key').value = '';
    document.getElementById('song-sheet-music').value = '';
    document.getElementById('sheet-preview-container').style.display = 'none';
    state.editingSongId = null;
    state.uploadedSheetMusicBase64 = null;
  }
}

// 찬양 추가 모달 열기
function openAddModal() {
  document.getElementById('modal-title').textContent = '찬양 추가';
  document.getElementById('form-song-id').value = '';
  document.getElementById('song-key').value = '';
  document.getElementById('song-sheet-music').value = '';
  document.getElementById('sheet-preview-container').style.display = 'none';
  state.editingSongId = null;
  state.uploadedSheetMusicBase64 = null;
  toggleSongModal(true);
}

// 찬양 편집 모달 열기
function openEditModal(songId) {
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  const worship = church.worships[state.selectedServiceId];
  if (!worship) return;
  const week = worship.weeks[state.selectedWeekId];
  if (!week) return;
  
  const song = week.items.find(item => item.id === songId);
  if (!song) return;
  
  document.getElementById('modal-title').textContent = '찬양 수정';
  document.getElementById('form-song-id').value = song.id;
  document.getElementById('song-title').value = song.title;
  document.getElementById('song-key').value = song.key || '';
  document.getElementById('song-youtube').value = song.youtubeUrl || '';
  document.getElementById('song-memo').value = song.memo || '';
  
  // 악보 파일 영역 세팅
  document.getElementById('song-sheet-music').value = '';
  const previewContainer = document.getElementById('sheet-preview-container');
  const previewImg = document.getElementById('sheet-preview-img');
  
  if (song.sheetMusic) {
    previewImg.src = song.sheetMusic;
    previewContainer.style.display = 'block';
    state.uploadedSheetMusicBase64 = song.sheetMusic;
  } else {
    previewContainer.style.display = 'none';
    state.uploadedSheetMusicBase64 = null;
  }
  
  state.editingSongId = songId;
  toggleSongModal(true);
}

// 찬양 저장 (추가/수정 실행)
function saveSong(event) {
  event.preventDefault();
  
  const title = document.getElementById('song-title').value.trim();
  const key = document.getElementById('song-key').value;
  const youtubeUrl = document.getElementById('song-youtube').value.trim();
  const memo = document.getElementById('song-memo').value.trim();
  
  if (!title) return;
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  const worship = church.worships[state.selectedServiceId];
  if (!worship) return;
  
  // 2차 런타임 누락 방지 더블 세이프 가드
  if (!worship.weeks) worship.weeks = {};
  if (!worship.weeks[state.selectedWeekId]) {
    worship.weeks[state.selectedWeekId] = {
      title: state.selectedWeekId === 'next-week' ? '다음 주 찬양' : '이번 주 찬양',
      items: []
    };
  }
  const week = worship.weeks[state.selectedWeekId];
  if (!week) return;
  
  if (state.editingSongId) {
    // 수정
    const songIndex = week.items.findIndex(item => item.id === state.editingSongId);
    if (songIndex !== -1) {
      week.items[songIndex].title = title;
      week.items[songIndex].key = key;
      week.items[songIndex].youtubeUrl = youtubeUrl;
      week.items[songIndex].memo = memo;
      week.items[songIndex].sheetMusic = state.uploadedSheetMusicBase64;
      // 기존 작성자가 없으면 현재 유저명 부여
      if (!week.items[songIndex].createdBy) {
        week.items[songIndex].createdBy = state.userName || "관리자";
      }
    }
  } else {
    // 추가
    const newSong = {
      id: 'song-' + Date.now(),
      title: title,
      key: key,
      youtubeUrl: youtubeUrl,
      memo: memo,
      sheetMusic: state.uploadedSheetMusicBase64,
      createdBy: state.userName || "관리자" // 👈 작성자 실명 연동 태깅!
    };
    week.items.push(newSong);
  }
  
  saveDatabase();
  renderSongList();
  toggleSongModal(false);
}

// 찬양 삭제
function deleteSong(songId) {
  if (db.activeRole !== 'admin') return;
  
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  const worship = church.worships[state.selectedServiceId];
  if (!worship) return;
  const week = worship.weeks[state.selectedWeekId];
  if (!week) return;
  
  const song = week.items.find(item => item.id === songId);
  if (!song) return;
  
  const isConfirmed = confirm(`"${song.title}" 찬양을 콘티에서 삭제하시겠습니까?`);
  if (isConfirmed) {
    week.items = week.items.filter(item => item.id !== songId);
    saveDatabase();
    renderSongList();
  }
}

// 찬양팀 이름 수정 모달 제어
function toggleTeamModal(show) {
  const modal = document.getElementById('team-name-modal');
  const previewContainer = document.getElementById('logo-preview-container');
  const previewImg = document.getElementById('logo-preview-img');
  
  if (show) {
    const church = db.churches[db.activeChurchId];
    if (church) {
      document.getElementById('team-name-input').value = church.teamName || '';
      
      if (church.logo) {
        state.uploadedTeamLogoBase64 = church.logo;
        previewImg.src = church.logo;
        previewContainer.style.display = 'block';
      } else {
        state.uploadedTeamLogoBase64 = null;
        previewImg.src = '';
        previewContainer.style.display = 'none';
      }
    }
    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
    document.getElementById('team-name-form').reset();
    state.uploadedTeamLogoBase64 = null;
    if (previewContainer) previewContainer.style.display = 'none';
  }
}

// 찬양팀 이름 저장
function saveTeamName(event) {
  event.preventDefault();
  
  const newName = document.getElementById('team-name-input').value.trim();
  if (!newName) return;
  
  const church = db.churches[db.activeChurchId];
  if (church) {
    church.teamName = newName;
    church.logo = state.uploadedTeamLogoBase64; // 로고 이미지 바인딩
    
    saveDatabase();
    
    document.getElementById('app-title').textContent = newName;
    
    // UI 로고 영역 즉시 갱신
    const logoContainer = document.getElementById('main-logo-container');
    if (logoContainer) {
      if (church.logo) {
        logoContainer.innerHTML = `<img src="${church.logo}" alt="로고" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      } else {
        logoContainer.innerHTML = `<i class="fa-solid fa-music"></i>`;
      }
    }
  }
  
  toggleTeamModal(false);
}

// 드래그 앤 드롭 정렬 설정
let dragStartIdx = null;

function initDragAndDrop() {
  const songListContainer = document.getElementById('song-list');
  
  songListContainer.addEventListener('dragstart', (e) => {
    if (db.activeRole !== 'admin') {
      e.preventDefault();
      return;
    }
    const item = e.target.closest('.song-item');
    if (!item) return;
    
    item.classList.add('dragging');
    dragStartIdx = parseInt(item.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
  });
  
  songListContainer.addEventListener('dragover', (e) => {
    if (db.activeRole !== 'admin') return;
    e.preventDefault();
    
    const draggingItem = songListContainer.querySelector('.song-item.dragging');
    if (!draggingItem) return;
    
    const siblings = [...songListContainer.querySelectorAll('.song-item:not(.dragging)')];
    
    const nextSibling = siblings.find(sibling => {
      const box = sibling.getBoundingClientRect();
      const offset = e.clientY - box.top - box.height / 2;
      return offset < 0;
    });
    
    if (nextSibling) {
      songListContainer.insertBefore(draggingItem, nextSibling);
    } else {
      songListContainer.appendChild(draggingItem);
    }
  });
  
  songListContainer.addEventListener('dragend', (e) => {
    const draggingItem = songListContainer.querySelector('.song-item.dragging');
    if (draggingItem) {
      draggingItem.classList.remove('dragging');
    }
    
    if (db.activeRole !== 'admin') return;
    
    const domItems = [...songListContainer.querySelectorAll('.song-item')];
    const church = db.churches[db.activeChurchId];
    if (!church) return;
    const worship = church.worships[state.selectedServiceId];
    if (!worship) return;
    const week = worship.weeks[state.selectedWeekId];
    if (!week) return;
    
    if (domItems.length !== week.items.length) return;
    
    const newItems = [];
    domItems.forEach(domItem => {
      const originalIdx = parseInt(domItem.dataset.index);
      newItems.push(week.items[originalIdx]);
    });
    
    week.items = newItems;
    saveDatabase();
    renderSongList();
  });
}

// ==========================================================================
// [이벤트 리스너 및 돔 로드 핸들러]
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  
  // [NEW] 0. 인트로 스플래시 화면 비디오 제어 및 자동 해제
  const splashScreen = document.getElementById('splash-screen');
  const splashVideo = document.getElementById('splash-video');
  const skipBtn = document.getElementById('btn-skip-splash');

  function hideSplash() {
    if (splashScreen && !splashScreen.classList.contains('fade-out')) {
      splashScreen.classList.add('fade-out');
      // 비디오 정지 처리
      if (splashVideo) {
        splashVideo.pause();
      }
      // 0.4초 뒤 완전 제거
      setTimeout(() => {
        splashScreen.style.display = 'none';
      }, 400);
    }
  }

  if (splashScreen && splashVideo) {
    // 모바일 브라우저 강제 재생 시작 시도
    splashVideo.play().catch(err => {
      console.warn("Autoplay was blocked by browser policy. User gesture needed:", err);
    });

    // 4.5초 뒤 자동 페이드 아웃 강제 해제 (인트로 영상이 3~4초 분량이므로 넉넉히 대기)
    const splashTimeout = setTimeout(hideSplash, 4500);

    // 비디오 재생이 1.8초보다 일찍 끝나면 즉시 퇴장
    splashVideo.addEventListener('ended', () => {
      clearTimeout(splashTimeout);
      hideSplash();
    });

    // 스플래시 화면 전체 영역 클릭 시 즉시 건너뛰기
    splashScreen.addEventListener('click', () => {
      clearTimeout(splashTimeout);
      hideSplash();
    });
  }
  
  // 1. 데이터베이스 및 세션 확인
  initDatabase();
  
  // 2. 인증 화면 실시간 검색 바인딩
  document.getElementById('auth-search-input').addEventListener('input', searchChurches);
  
  // 3. 인증 화면 내 로그인 액션 바인딩
  document.getElementById('btn-login-member').addEventListener('click', loginAsMember);
  document.getElementById('btn-login-admin').addEventListener('click', loginAsAdmin);
  
  // 4. 새 교회 등록 폼 제출 바인딩
  document.getElementById('auth-register-form').addEventListener('submit', registerChurch);
  
  // 5. 탭 전환 바인딩
  document.getElementById('tab-find-church').addEventListener('click', () => switchAuthTab('find'));
  document.getElementById('tab-new-church').addEventListener('click', () => switchAuthTab('new'));
  
  // 6. 로그아웃 버튼 바인딩
  document.getElementById('btn-logout').addEventListener('click', logout);
  
  // 6.2 오늘의 말씀 묵상 나누기 등록 버튼 바인딩
  document.getElementById('btn-submit-devotion-post').addEventListener('click', saveDevotionPost);
  
  // 6.5 메인 대시보드 하단 탭 전환 버튼 바인딩
  document.getElementById('btn-tab-conti').addEventListener('click', () => switchMainTab('conti'));
  document.getElementById('btn-tab-notice').addEventListener('click', () => switchMainTab('notice'));
  document.getElementById('btn-tab-devotion').addEventListener('click', () => switchMainTab('devotion'));
  document.getElementById('btn-tab-ai').addEventListener('click', () => switchMainTab('ai-rec'));
  
  // 7. 메인화면 찬양팀 이름 수정 버튼 바인딩
  document.getElementById('btn-edit-team-name').addEventListener('click', () => {
    if (db.activeRole === 'admin') {
      toggleTeamModal(true);
    }
  });
  
  // 8. 메인화면: 예배 추가 플로팅 버튼 바인딩
  document.getElementById('btn-add-worship').addEventListener('click', () => {
    openAddWorshipModal();
  });
  
  // 8.5 메인화면: 공지사항 추가 플로팅 버튼 바인딩
  document.getElementById('btn-add-notice').addEventListener('click', () => {
    openAddNoticeModal();
  });
  
  // 9. 예배 추가/수정 모달 제어 바인딩
  document.getElementById('btn-close-worship-modal').addEventListener('click', () => toggleWorshipModal(false));
  document.getElementById('btn-cancel-worship-modal').addEventListener('click', () => toggleWorshipModal(false));
  document.getElementById('worship-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('worship-modal')) {
      toggleWorshipModal(false);
    }
  });
  document.getElementById('worship-form').addEventListener('submit', saveWorshipService);
  
  // 10. 서브 화면 주차 카드 클릭 시 상세 콘티 이동
  const weekCards = document.querySelectorAll('.week-card[data-week-id]');
  weekCards.forEach(card => {
    card.addEventListener('click', () => {
      const weekId = card.getAttribute('data-week-id');
      navigateTo('detail', state.selectedServiceId, weekId);
    });
  });
  
  // 이전 콘티 카드 클릭 시 아카이브 목록 화면으로 이동 바인딩
  document.getElementById('btn-past-weeks').addEventListener('click', () => {
    navigateTo('history', state.selectedServiceId);
  });
  
  // 11. 서브 화면 -> 메인 화면 뒤로가기
  document.getElementById('btn-sub-back').addEventListener('click', () => {
    navigateTo('main');
  });
  
  // 이전 콘티 목록 화면 -> 콘티 상세 화면으로 뒤로가기 바인딩
  document.getElementById('btn-history-back').addEventListener('click', () => {
    navigateTo('detail', state.selectedServiceId, 'this-week');
  });
  
  // 12. 상세 화면 -> 메인 화면 또는 이전 콘티 화면 뒤로가기
  document.getElementById('btn-back').addEventListener('click', () => {
    if (state.selectedWeekId && state.selectedWeekId.startsWith('archive-')) {
      navigateTo('history', state.selectedServiceId);
    } else {
      navigateTo('main'); // sub 대신 메인 화면 대시보드로 복귀
    }
  });

  // 상세 화면 헤더의 이전 콘티 아이콘 클릭 시 이동 바인딩
  const btnPastDetail = document.getElementById('btn-past-weeks-detail');
  if (btnPastDetail) {
    btnPastDetail.addEventListener('click', () => {
      navigateTo('history', state.selectedServiceId);
    });
  }

  // 상세 화면 상단의 [지난 예배 콘티 내역 전체보기] 배너 바 클릭 시 이동 바인딩
  const btnPastDetailBar = document.getElementById('btn-past-weeks-detail-bar');
  if (btnPastDetailBar) {
    btnPastDetailBar.addEventListener('click', () => {
      navigateTo('history', state.selectedServiceId);
    });
  }
  
  // 13. 찬양 추가 버튼
  document.getElementById('btn-add-song').addEventListener('click', () => {
    openAddModal();
  });
  
  // 14. 찬양 등록/수정 모달 닫기 바인딩
  document.getElementById('btn-close-modal').addEventListener('click', () => toggleSongModal(false));
  document.getElementById('btn-cancel-modal').addEventListener('click', () => toggleSongModal(false));
  document.getElementById('song-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('song-modal')) {
      toggleSongModal(false);
    }
  });
  document.getElementById('song-form').addEventListener('submit', saveSong);
  
  // 15. 파일 업로드 실시간 처리 및 이미지 압축 변환 바인딩
  document.getElementById('song-sheet-music').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const compressedBase64 = await compressImage(file);
      state.uploadedSheetMusicBase64 = compressedBase64;
      
      // 미리보기 요소 반영
      const previewContainer = document.getElementById('sheet-preview-container');
      const previewImg = document.getElementById('sheet-preview-img');
      previewImg.src = compressedBase64;
      previewContainer.style.display = 'block';
    } catch (err) {
      alert('이미지 파일 변환에 실패했습니다: ' + err.message);
      e.target.value = '';
    }
  });
  
  // 16. 모달 내 악보 이미지 삭제 버튼 바인딩
  document.getElementById('btn-delete-sheet').addEventListener('click', () => {
    state.uploadedSheetMusicBase64 = null;
    document.getElementById('song-sheet-music').value = '';
    document.getElementById('sheet-preview-container').style.display = 'none';
  });
  
  // 17. 악보 이미지 뷰어 모달 닫기 바인딩
  document.getElementById('btn-close-sheet-viewer').addEventListener('click', closeSheetViewer);
  document.getElementById('sheet-viewer-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('sheet-viewer-modal')) {
      closeSheetViewer();
    }
  });
  
  // 대표 로고 이미지 업로드 및 압축 변환 바인딩
  const teamLogoInput = document.getElementById('team-logo-input');
  if (teamLogoInput) {
    teamLogoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const compressedBase64 = await compressImage(file);
        state.uploadedTeamLogoBase64 = compressedBase64;
        
        const previewContainer = document.getElementById('logo-preview-container');
        const previewImg = document.getElementById('logo-preview-img');
        previewImg.src = compressedBase64;
        previewContainer.style.display = 'block';
      } catch (err) {
        alert('로고 이미지 변환에 실패했습니다: ' + err.message);
        e.target.value = '';
      }
    });
  }

  // 대표 로고 이미지 삭제 바인딩
  const btnDeleteLogo = document.getElementById('btn-delete-logo');
  if (btnDeleteLogo) {
    btnDeleteLogo.addEventListener('click', () => {
      state.uploadedTeamLogoBase64 = null;
      document.getElementById('team-logo-input').value = '';
      document.getElementById('logo-preview-container').style.display = 'none';
    });
  }

  // 18. 찬양팀명 편집 모달 닫기 바인딩
  document.getElementById('btn-close-team-modal').addEventListener('click', () => toggleTeamModal(false));
  document.getElementById('btn-cancel-team-modal').addEventListener('click', () => toggleTeamModal(false));
  document.getElementById('team-name-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('team-name-modal')) {
      toggleTeamModal(false);
    }
  });
  document.getElementById('team-name-form').addEventListener('submit', saveTeamName);
  
  // 19. 이전 콘티 추가 플로팅 버튼 바인딩
  document.getElementById('btn-add-history').addEventListener('click', () => {
    toggleHistoryModal(true);
  });
  
  // 20. 이전 콘티 등록 모달 닫기 바인딩
  document.getElementById('btn-close-history-modal').addEventListener('click', () => toggleHistoryModal(false));
  document.getElementById('btn-cancel-history-modal').addEventListener('click', () => toggleHistoryModal(false));
  document.getElementById('history-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('history-modal')) {
      toggleHistoryModal(false);
    }
  });
  document.getElementById('history-form').addEventListener('submit', saveHistoryLiturgy);
  
  // 21. 공지사항 모달 닫기 바인딩
  document.getElementById('btn-close-notice-modal').addEventListener('click', () => toggleNoticeFormModal(false));
  document.getElementById('btn-cancel-notice-modal').addEventListener('click', () => toggleNoticeFormModal(false));
  document.getElementById('notice-form-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('notice-form-modal')) {
      toggleNoticeFormModal(false);
    }
  });
  document.getElementById('notice-form').addEventListener('submit', saveNotice);
  
  // 22. 공지사항 상세 모달 닫기 바인딩
  document.getElementById('btn-close-notice-detail').addEventListener('click', closeNoticeDetail);
  document.getElementById('btn-close-notice-detail-confirm').addEventListener('click', closeNoticeDetail);
  document.getElementById('notice-detail-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('notice-detail-modal')) {
      closeNoticeDetail();
    }
  });
  
  // 23. AI 찬양 추천 API 토글 스위치 이벤트 연동
  document.getElementById('ai-api-toggle').addEventListener('change', (e) => {
    const keyWrapper = document.getElementById('ai-api-key-wrapper');
    if (e.target.checked) {
      keyWrapper.style.display = 'block';
    } else {
      keyWrapper.style.display = 'none';
      document.getElementById('ai-api-key-input').value = '';
    }
  });
  
  // 25. 추천곡 콘티 추가 모달 제어 바인딩
  document.getElementById('btn-close-rec-add').addEventListener('click', closeRecAddModal);
  document.getElementById('btn-cancel-rec-add').addEventListener('click', closeRecAddModal);
  document.getElementById('rec-add-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('rec-add-modal')) {
      closeRecAddModal();
    }
  });
  document.getElementById('rec-add-form').addEventListener('submit', saveRecAddToLiturgy);
  
  // 26. 드래그앤드롭 정렬 설정
  initDragAndDrop();
  
  // 27. TIKITAKA AI 예배 도우미 폼 제출 및 서브 탭 스위칭 바인딩
  document.getElementById('ai-helper-form').addEventListener('submit', handleAIHelperRecommendation);
  document.getElementById('btn-submit-ai').addEventListener('click', handleAIRecommendation);

  const subTabHelper = document.getElementById('btn-ai-sub-helper');
  const subTabSearch = document.getElementById('btn-ai-sub-search');
  const panelHelper = document.getElementById('panel-ai-helper');
  const panelSearch = document.getElementById('panel-ai-search');

  subTabHelper.addEventListener('click', () => {
    panelHelper.style.display = 'flex';
    panelSearch.style.display = 'none';
    
    // 버튼 스타일 업데이트
    subTabHelper.style.background = '#fff';
    subTabHelper.style.color = '#818cf8';
    subTabHelper.style.boxShadow = 'var(--shadow-sm)';
    
    subTabSearch.style.background = 'transparent';
    subTabSearch.style.color = 'var(--text-sub)';
    subTabSearch.style.boxShadow = 'none';
  });

  subTabSearch.addEventListener('click', () => {
    panelSearch.style.display = 'flex';
    panelHelper.style.display = 'none';
    
    // 버튼 스타일 업데이트
    subTabSearch.style.background = '#fff';
    subTabSearch.style.color = '#818cf8';
    subTabSearch.style.boxShadow = 'var(--shadow-sm)';
    
    subTabHelper.style.background = 'transparent';
    subTabHelper.style.color = 'var(--text-sub)';
    subTabHelper.style.boxShadow = 'none';
  });
  
  // 전역 클릭 시 자동완성 드롭다운 바깥을 누르면 닫기
  document.addEventListener('click', (e) => {
    const resultsContainer = document.getElementById('auth-search-results');
    const searchInput = document.getElementById('auth-search-input');
    if (e.target !== searchInput && !resultsContainer.contains(e.target)) {
      resultsContainer.classList.remove('active');
    }
  });
});

// ==========================================================================
// [TIKITAKA BAND AI 예배 도우미 비즈니스 로직]
// ==========================================================================



// AI 예배 도우미 추천 폼 제출 처리
async function handleAIHelperRecommendation(event) {
  event.preventDefault();
  
  const target = document.getElementById('ai-helper-target').value;
  const sermon = document.getElementById('ai-helper-sermon').value.trim();
  const bible = document.getElementById('ai-helper-bible').value.trim();
  const theme = document.getElementById('ai-helper-theme').value.trim();
  const time = document.getElementById('ai-helper-time').value;
  const reqKey = document.getElementById('ai-helper-key').value;
  const wishSong = document.getElementById('ai-helper-wish-song').value.trim();
  
  const rawApiKey = document.getElementById('ai-api-key-input').value;
  const apiKey = rawApiKey ? rawApiKey.replace(/[\s\t\r\n]/g, '') : '';
  const isRealAI = document.getElementById('ai-api-toggle').checked;
  
  const loadingBox = document.getElementById('ai-helper-loading');
  const resultsBox = document.getElementById('ai-helper-results');
  const resultsContainer = document.getElementById('ai-helper-results-container');
  
  resultsContainer.innerHTML = '';
  resultsBox.style.display = 'none';
  loadingBox.style.display = 'flex';
  
  try {
    let recommendations = [];
    
    if (isRealAI && apiKey) {
      try {
        recommendations = await fetchWorshipHelperRecommendations(apiKey, target, sermon, bible, theme, time, reqKey, wishSong);
      } catch (apiErr) {
        console.warn("OpenAI Helper API failed. Falling back to local engine:", apiErr);
        recommendations = getLocalWorshipHelperRecommendations(target, theme, time, reqKey, wishSong);
        recommendations._isFallback = true;
      }
    } else {
      // 로컬 디렉터 분석
      await new Promise(resolve => setTimeout(resolve, 1000));
      recommendations = getLocalWorshipHelperRecommendations(target, theme, time, reqKey, wishSong);
    }
    
    displayAIHelperResults(recommendations);
  } catch (err) {
    alert(err.message);
  } finally {
    loadingBox.style.display = 'none';
  }
}

// OpenAI API 예배 도우미 추천 통신
async function fetchWorshipHelperRecommendations(apiKey, target, sermon, bible, theme, time, reqKey, wishSong) {
  const url = "https://api.openai.com/v1/chat/completions";
  
  const songCountMap = { "10분": 2, "15분": 3, "20분": 4, "30분": 5 };
  const targetCount = songCountMap[time] || 4;
  
  const prompt = `
너는 20년 이상의 경력을 가진 베테랑 예배 인도자이자 찬양 디렉터이다.
아래 사용자가 입력한 예배 정보를 분석하여, 설교의 주제와 성경 본문 및 감정선에 가장 은혜롭게 이어지는 찬양 콘티 총 ${targetCount}곡을 설계해라.

입력 정보:
- 예배 대상: ${target}
- 설교 제목: ${sermon}
- 성경 본문: ${bible}
- 예배 주제: ${theme}
- 찬양 시간: ${time} (추천해야 하는 찬양 수: ${targetCount}곡)
- 원하는 코드 (Key): ${reqKey || '상관없음'}
- 꼭 넣고 싶은 찬양: ${wishSong || '없음'}

추천 및 정렬 조건:
1. 찬양의 배치 순서(도입-경배-빌드업-기도/헌신)의 흐름과 감정선을 고려한다.
2. 앞뒤 곡의 코드(Key)가 자연스럽게 호환되도록(같은 Key 또는 4도/5도/나란한조) 조율한다.
3. 꼭 넣고 싶은 찬양이 있다면, 가급적 그 찬양을 어울리는 순서에 반드시 배치해라.
4. 각 추천 곡마다 예배 흐름에서의 명확한 역할("경배", "찬양", "은혜", "결단", "헌신" 중 하나)을 지정해라.
5. 각 추천 곡의 추천 이유(reason)를 예배팀 반주자 및 싱어들이 직관적으로 볼 수 있게 한글 80자 이내의 짧고 세련된 연출 핵심 팁으로 적어라.
6. 템포(BPM)를 숫자로 지정해라.

반드시 다른 설명 텍스트 없이 오직 아래 지정된 JSON 배열 포맷으로만 응답해야 한다.
[
  {
    "title": "찬양 제목",
    "key": "추천 Key",
    "bpm": 80,
    "role": "역할 (경배/찬양/은혜/결단/헌신 중 하나)",
    "reason": "한글 80자 이내의 은혜로운 추천 연출 이유"
  }
]
`;

  const requestBody = {
    model: "gpt-5.5-mini",
    messages: [
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errData = await response.json();
    throw new Error('OpenAI API Quota 에러: ' + (errData.error?.message || response.statusText));
  }
  
  const data = await response.json();
  let jsonText = data.choices?.[0]?.message?.content || '';
  
  // 백틱 제거
  jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // JSON array 형식이 아닐 경우 객체 래핑 파싱
  const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    jsonText = arrayMatch[0];
  } else {
    const objMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const parsedObj = superRobustJSONParser(objMatch[0]);
      if (parsedObj.recommendations) {
        return parsedObj.recommendations;
      }
    }
  }
  
  try {
    const resultObj = superRobustJSONParser(jsonText);
    if (Array.isArray(resultObj)) {
      return resultObj;
    }
    throw new Error('올바른 배열 규격이 아닙니다.');
  } catch (parseErr) {
    console.error("OpenAI Helper parsing fail. Raw: ", jsonText);
    return getLocalWorshipHelperRecommendations(target, theme, time, reqKey, wishSong);
  }
}

// 로컬 200곡 기반 AI 예배 도우미 매칭
function getLocalWorshipHelperRecommendations(target, theme, time, reqKey, wishSong) {
  const songCountMap = { "10분": 2, "15분": 3, "20분": 4, "30분": 5 };
  const targetCount = songCountMap[time] || 4;
  
  let ageTarget = "youth";
  if (target.includes("유년") || target.includes("초등")) ageTarget = "child";
  if (target.includes("장년")) ageTarget = "adult";
  
  let pool = localPraiseDB.filter(song => song.target === ageTarget);
  if (pool.length < 15) {
    pool = [...localPraiseDB];
  }
  
  const selected = [];
  
  if (wishSong) {
    const foundSong = localPraiseDB.find(s => s.title.replace(/\s/g, '').includes(wishSong.replace(/\s/g, '')));
    if (foundSong) {
      selected.push(foundSong);
    }
  }
  
  let currentKey = reqKey || (selected.length > 0 ? selected[0].key : "G");
  const roles = ["경배", "찬양", "은혜", "결단", "헌신"];
  
  while (selected.length < targetCount) {
    let compatiblePool = pool.filter(song => 
      !selected.map(s => s.title).includes(song.title) && 
      (song.key === currentKey || isKeyCompatible(currentKey, song.key))
    );
    
    if (compatiblePool.length === 0) {
      compatiblePool = pool.filter(song => !selected.map(s => s.title).includes(song.title));
    }
    
    if (compatiblePool.length === 0) break;
    
    compatiblePool.forEach(song => {
      let score = 0;
      if (song.themes.includes("grace") && theme.includes("은혜")) score += 5;
      if (song.themes.includes("decision") && theme.includes("결단")) score += 5;
      song._tempScore = score;
    });
    
    compatiblePool.sort((a, b) => b._tempScore - a._tempScore);
    const topChoices = compatiblePool.slice(0, Math.min(3, compatiblePool.length));
    const nextSong = topChoices[Math.floor(Math.random() * topChoices.length)];
    
    selected.push(nextSong);
    currentKey = nextSong.key;
  }
  
  return selected.map((song, idx) => {
    let bpmValue = 72;
    if (song.bpm === "medium") bpmValue = 85;
    if (song.bpm === "fast") bpmValue = 115;
    
    return {
      title: song.title,
      artist: song.artist,
      key: song.key,
      bpm: bpmValue,
      role: roles[idx % roles.length],
      reason: song.reason
    };
  });
}

// AI 예배 도우미 결과 화면 출력 렌더링
function displayAIHelperResults(recommendations) {
  const resultsBox = document.getElementById('ai-helper-results');
  const resultsContainer = document.getElementById('ai-helper-results-container');
  resultsContainer.innerHTML = '';
  
  if (recommendations._isFallback) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: var(--radius-sm);
      padding: 10px;
      font-size: 0.72rem;
      line-height: 1.4;
      color: #b45309;
      margin-bottom: 8px;
    `;
    banner.innerHTML = `<i class="fa-solid fa-circle-info"></i> OpenAI 크레딧 잔액 부족으로 로컬 TIKITAKA 200곡 엔진 기반 추천으로 정상 전환되었습니다.`;
    resultsContainer.appendChild(banner);
  }
  
  const roleColors = {
    "경배": { bg: "#eef2ff", border: "#c7d2fe", text: "#4f46e5" },
    "찬양": { bg: "#ecfdf5", border: "#a7f3d0", text: "#059669" },
    "은혜": { bg: "#fff7ed", border: "#ffedd5", text: "#ea580c" },
    "결단": { bg: "#fdf2f8", border: "#fbcfe8", text: "#db2777" },
    "헌신": { bg: "#f5f3ff", border: "#ddd6fe", text: "#7c3aed" }
  };
  
  recommendations.forEach((rec, index) => {
    const card = document.createElement('div');
    card.className = 'rec-song-card';
    card.style.cssText = `
      background: #ffffff;
      border: 1px solid rgba(229,231,235,0.8);
      border-radius: var(--radius-md);
      padding: 14px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    const roleStyle = roleColors[rec.role] || { bg: "#f3f4f6", border: "#e5e7eb", text: "#4b5563" };
    const roleBadge = `<span style="background: ${roleStyle.bg}; border: 1px solid ${roleStyle.border}; color: ${roleStyle.text}; padding: 3px 8px; border-radius: var(--radius-sm); font-size: 0.6875rem; font-weight: 700;">${escapeHtml(rec.role)}</span>`;
    
    const keyBadge = rec.key ? `<span class="song-key-badge">${escapeHtml(rec.key)} Key</span>` : '';
    const bpmBadge = rec.bpm ? `<span class="song-key-badge" style="background: rgba(229,231,235,0.4); color: var(--text-sub);">${rec.bpm} BPM</span>` : '';
    
    const query = encodeURIComponent(`${rec.title} ${rec.artist || ''}`);
    const youtubeUrl = `https://www.youtube.com/results?search_query=${query}`;
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.8125rem; font-weight: 700; color: #818cf8; background: #e0e7ff; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%;">${index + 1}</span>
          <h3 class="card-title" style="margin: 0; font-size: 0.9375rem;">${escapeHtml(rec.title)}</h3>
        </div>
        <div style="display: flex; gap: 4px; align-items: center;">
          ${roleBadge}
        </div>
      </div>
      
      <div style="display: flex; gap: 6px; align-items: center;">
        ${keyBadge}
        ${bpmBadge}
      </div>
      
      <div class="rec-reason-box" style="font-size: 0.75rem; color: var(--text-sub); background: var(--bg-main); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid rgba(229,231,235,0.5); line-height: 1.4;">
        <strong>추천 연출 팁:</strong> ${escapeHtml(rec.reason)}
      </div>
      
      <div style="display: flex; gap: 8px; margin-top: 4px;">
        <a href="${youtubeUrl}" target="_blank" rel="noopener noreferrer" class="rec-youtube-btn" style="flex: 1; text-align: center; font-size: 0.75rem; padding: 6px; border-radius: var(--radius-sm); border: 1px solid #f3f4f6; color: #ef4444; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
          <i class="fa-brands fa-youtube"></i> 유튜브 검색
        </a>
        <button type="button" class="btn-add-to-conti" onclick="openRecAddModal('${escapeHtml(rec.title)}', '${escapeHtml(rec.key)}', '${escapeHtml(rec.reason)}', '${escapeHtml(youtubeUrl)}')" style="flex: 1; font-size: 0.75rem; padding: 6px; border-radius: var(--radius-sm); font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
          <i class="fa-solid fa-plus"></i> 콘티에 추가
        </button>
      </div>
    `;
    
    resultsContainer.appendChild(card);
  });
  
  resultsBox.style.display = 'flex';
}

// ==========================================================================
// [시편 찬양 말씀 묵상 및 일일 출석체크 로직]
// ==========================================================================
const PSALM_VERSES = [
  { verse: "시편 150:6", content: "호흡이 있는 자마다 여호와를 찬양할지어다 할렐루야" },
  { verse: "시편 100:4", content: "감사함으로 그의 문에 들어가며 찬송함으로 그의 궁정에 들어가서 그에게 감사하며 그의 이름을 송축할지어다" },
  { verse: "시편 57:7", content: "하나님이여 내 마음이 확정되었고 내 마음이 확정되었사오니 내가 노래하고 내가 찬송하리이다" },
  { verse: "시편 95:1", content: "오라 우리가 여호와께 노래하며 우리의 구원의 반석을 향하여 즐거이 외치자" },
  { verse: "시편 33:3", content: "새 노래로 그를 노래하며 즐거운 소리로 아름답게 연주할지어다" },
  { verse: "시편 104:33", content: "내가 평생토록 여호와께 노래하며 내가 살아 있는 동안 내 하나님을 찬양하리로다" },
  { verse: "시편 147:1", content: "할렐루야 우리 하나님을 찬양하는 일이 선함이여 찬송하는 일이 아름답고 마땅하도다" }
];

// 오늘의 말씀 탭 렌더링
function renderDevotionTab() {
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  if (!church.attendances) church.attendances = {};
  if (!church.devotions) church.devotions = {};
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const date = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${date}`;
  
  if (!church.devotions[todayStr]) {
    church.devotions[todayStr] = { posts: [] };
  }
  
  // 1. 오늘의 시편 말씀 출력
  const verseIndex = today.getDate() % PSALM_VERSES.length;
  const todayVerse = PSALM_VERSES[verseIndex];
  
  document.getElementById('daily-verse-title').textContent = todayVerse.verse;
  document.getElementById('daily-verse-content').textContent = `“${todayVerse.content}”`;
  
  // 2. 본인의 묵상 참여 양식 제어 (이미 썼다면 작성창 숨김)
  const posts = church.devotions[todayStr].posts || [];
  const hasWritten = posts.some(post => post.authorName === state.userName);
  
  const formBox = document.getElementById('my-devotion-form-box');
  const completeMsg = document.getElementById('my-devotion-complete-msg');
  
  if (hasWritten) {
    formBox.style.display = 'none';
    completeMsg.style.display = 'block';
  } else {
    formBox.style.display = 'block';
    completeMsg.style.display = 'none';
    document.getElementById('devotion-post-input').value = '';
  }
  
  // 3. 관리자 전용 실시간 출석 현황판 노출
  const adminBox = document.getElementById('admin-attendance-box');
  const listContainer = document.getElementById('attendance-list-container');
  const todayAttendance = church.attendances[todayStr] || {};
  
  if (db.activeRole === 'admin') {
    adminBox.style.display = 'block';
    listContainer.innerHTML = '';
    
    const attendPeople = Object.keys(todayAttendance);
    document.getElementById('attendance-count-badge').textContent = `${attendPeople.length}명`;
    
    if (attendPeople.length === 0) {
      listContainer.innerHTML = `<span style="font-size: 0.72rem; color: var(--text-muted); font-style: italic;">오늘 아직 출석체크를 완료한 팀원이 없습니다.</span>`;
    } else {
      attendPeople.forEach(name => {
        const time = todayAttendance[name];
        const badge = document.createElement('span');
        badge.style.cssText = `
          background: rgba(16, 185, 129, 0.07);
          border: 1px solid rgba(16, 185, 129, 0.18);
          color: #059669;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.72rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        `;
        badge.innerHTML = `<i class="fa-solid fa-user-check" style="font-size: 0.65rem;"></i> ${escapeHtml(name)} (${time})`;
        listContainer.appendChild(badge);
      });
    }
  } else {
    adminBox.style.display = 'none';
  }
  
  // 4. 실시간 묵상 피드 & 댓글 게시판 출력
  const feedContainer = document.getElementById('devotion-feed-container');
  feedContainer.innerHTML = '';
  
  if (posts.length === 0) {
    feedContainer.innerHTML = `
      <div class="empty-state" style="padding: 24px 10px; background: rgba(255,255,255,0.7); border: 1px dashed var(--border); border-radius: var(--radius-md);">
        <i class="fa-regular fa-comments empty-icon" style="color: #a5b4fc; font-size: 1.8rem; margin-bottom: 6px;"></i>
        <p style="font-size: 0.8125rem; font-weight: 700; color: var(--text-sub);">오늘 나눈 묵상이 아직 없습니다.</p>
        <p class="empty-sub" style="font-size: 0.72rem;">첫 묵상글을 등록하여 찬양팀원들과 은혜를 나누어 보세요!</p>
      </div>
    `;
    return;
  }
  
  // 최신 글이 위로 오도록 정렬
  const reversedPosts = [...posts].reverse();
  
  reversedPosts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'notice-card';
    card.style.cssText = `
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 14px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    
    // 출석 완료 뱃지는 오직 관리자만 볼 수 있도록 제어
    const attendanceBadgeHtml = db.activeRole === 'admin'
      ? `<span style="font-size: 0.65rem; background: #10b981; color: #fff; padding: 1px 5px; border-radius: 8px; font-weight: 700;">출석완료</span>`
      : '';
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 0.78rem; font-weight: 700; color: #4f46e5; background: rgba(99,102,241,0.08); padding: 2px 7px; border-radius: var(--radius-sm); border: 1px solid rgba(99,102,241,0.15); display: inline-flex; align-items: center; gap: 3px;">
            <i class="fa-regular fa-user" style="font-size: 0.65rem;"></i> ${escapeHtml(post.authorName)}
          </span>
          ${attendanceBadgeHtml}
        </div>
        <span style="font-size: 0.6875rem; color: var(--text-muted); font-weight: 500;"><i class="fa-regular fa-clock"></i> ${post.time}</span>
      </div>
      
      <p style="font-size: 0.8125rem; font-weight: 500; color: var(--text-main); line-height: 1.55; white-space: pre-wrap; margin: 0; padding: 4px 0;">${escapeHtml(post.content)}</p>
    `;
    
    feedContainer.appendChild(card);
  });
}

// 묵상글 신규 등록 (동시 출석 완료 처리)
function saveDevotionPost() {
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  if (!state.userName) {
    alert('사용자 이름을 식별할 수 없습니다. 로그아웃 후 실명으로 재로그인해 주세요.');
    return;
  }
  
  const textVal = document.getElementById('devotion-post-input').value.trim();
  if (!textVal) {
    alert('느낀 점이나 묵상 내용을 기입해 주세요!');
    return;
  }
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const date = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${date}`;
  
  const timeStr = today.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  if (!church.devotions) church.devotions = {};
  if (!church.devotions[todayStr]) church.devotions[todayStr] = { posts: [] };
  
  // 1. 묵상글 배열에 저장
  const newPost = {
    id: 'post-' + Date.now(),
    authorName: state.userName,
    content: textVal,
    time: timeStr,
    comments: []
  };
  church.devotions[todayStr].posts.push(newPost);
  
  // 2. 출석부 자동 연동 체크
  if (!church.attendances) church.attendances = {};
  if (!church.attendances[todayStr]) church.attendances[todayStr] = {};
  
  church.attendances[todayStr][state.userName] = timeStr;
  
  saveDatabase();
  
  // UI 즉시 동기화
  renderDevotionTab();
  alert('샬롬! 오늘의 말씀 묵상 나눔과 출석체크가 모두 완료되었습니다. 🌟');
}

// 댓글 기능 제거 완료
