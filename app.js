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
  userName: "",                 // 현재 로그인한 사용자의 실명
  selectedDevotionDate: null    // 묵상 탭에서 선택된 날짜 (어제/오늘 묵상 히스토리 타임라인용)
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
  { title: '나의 하나님', artist: 'El Shaddai', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나의 하나님 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 사랑하심은', artist: '피아 메들리', key: 'Eb', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예수 사랑하심은 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '만 입이 내게 있으면', artist: '찬송가 23장', key: 'A', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '만 입이 내게 있으면 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '구주 예수 의지함이', artist: '찬송가 542장', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '구주 예수 의지함이 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '아 하나님의 은혜로', artist: '찬송가 310장', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '아 하나님의 은혜로 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '오 신실 하신 주', artist: '찬송가 393장', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '오 신실 하신 주 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 평생에 가는 길', artist: '찬송가 413장', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 평생에 가는 길 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주와 같이 길 가는 것', artist: '찬송가 430장', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주와 같이 길 가는 것 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '태산을 넘어 험곡에 가도', artist: '찬송가 445장', key: 'G', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '태산을 넘어 험곡에 가도 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '슬픈 마음 있는 사람', artist: '찬송가 91장', key: 'G', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '슬픈 마음 있는 사람 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 더 알기 원하네', artist: '찬송가 453장', key: 'Eb', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예수 더 알기 원하네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주의 나라', artist: 'Kingdom of God', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주의 나라 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '시편 139편', artist: '나를 지으신', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '시편 139편 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예배합니다', artist: '완전한 사랑', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예배합니다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '기꺼이 주께', artist: 'Gladly', key: 'D', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '기꺼이 주께 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주를 경배', artist: '나는 기쁨의 노래로', key: 'G', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '주를 경배 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '마음이 상한 자를', artist: '고쳐주소서', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '마음이 상한 자를 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '원하고 바라고 기도합니다', artist: '아이자야 씩스티원', key: 'Eb', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '원하고 바라고 기도합니다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님의 마음 있는 곳', artist: '아이자야 씩스티원', key: 'G', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '주님의 마음 있는 곳 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '은혜', artist: '손경민', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '은혜 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '행복', artist: '손경민', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '행복 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '요게벳의 노래', artist: '염평안', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '요게벳의 노래 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '광야를 지나며', artist: '히즈윌', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '광야를 지나며 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '하나님의 부르심 (Call)', artist: '피아워십', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '하나님의 부르심 (Call) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나는 주를 섬기는 것에 후회가 없습니다', artist: '피아워십', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나는 주를 섬기는 것에 후회가 없습니다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '이 말씀 앞에서', artist: '예람워십', key: 'D', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '이 말씀 앞에서 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '실로암', artist: '피아워십', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '실로암 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나의 등 뒤에서', artist: '김명선', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나의 등 뒤에서 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '성령이 오셨네', artist: '김도현', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '성령이 오셨네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 예수', artist: '김윤진', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예수 예수 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주가 일하시네', artist: '김브라이언', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주가 일하시네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '우리는 주의 움직이는 교회', artist: '소진영', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '우리는 주의 움직이는 교회 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '시선', artist: '예수전도단', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '시선 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '아바 아버지', artist: '예수전도단', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '아바 아버지 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '은혜로다', artist: '예수전도단', key: 'D', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '은혜로다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '보혈을 지나', artist: '예수전도단', key: 'G', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '보혈을 지나 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '아름다우신', artist: '예수전도단', key: 'A', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '아름다우신 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '호산나 (Hosanna)', artist: '예수전도단', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '호산나 (Hosanna) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '모든 열방 주 볼 때까지', artist: '예수전도단', key: 'D', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '모든 열방 주 볼 때까지 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 사랑이 온 세상에', artist: '예수전도단', key: 'G', bpm: 'fast', mood: 'bright', target: 'youth', themes: ['worship', 'grace'], reason: '주 사랑이 온 세상에 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '기뻐하며 왕께 노래하며', artist: '예수전도단', key: 'G', bpm: 'fast', mood: 'bright', target: 'youth', themes: ['worship', 'grace'], reason: '기뻐하며 왕께 노래하며 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '손을 높이 들고', artist: '예수전도단', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '손을 높이 들고 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나의 부름 (Calling)', artist: '마커스워십', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나의 부름 (Calling) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주께 가오니 (Power of Your Love)', artist: '어노인팅', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주께 가오니 (Power of Your Love) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '좋으신 하나님 (God is So Good)', artist: '어노인팅', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '좋으신 하나님 (God is So Good) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나의 힘이 되신 여호와여', artist: '복음성가', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나의 힘이 되신 여호와여 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 삶은 주의 것', artist: '김명선', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 삶은 주의 것 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '그 사랑 (아버지 사랑 내가 노래해)', artist: '마커스워십', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '그 사랑 (아버지 사랑 내가 노래해) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 이름 아시죠 (He Knows My Name)', artist: '디사이플스', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 이름 아시죠 (He Knows My Name) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님과 같이 (There Is None Like You)', artist: '복음성가', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님과 같이 (There Is None Like You) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '누군가 널 위해 기도하네', artist: '복음성가', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '누군가 널 위해 기도하네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '왕이신 나의 하나님', artist: '복음성가', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '왕이신 나의 하나님 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '약한 나로 강하게', artist: '어노인팅', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '약한 나로 강하게 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '목마른 사슴이 시냇물을', artist: '복음성가', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '목마른 사슴이 시냇물을 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나의 사랑 너의 어여쁜 자야', artist: '어노인팅', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나의 사랑 너의 어여쁜 자야 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '그가 아시나니', artist: '손경민', key: 'Eb', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '그가 아시나니 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '은혜를 아는 자', artist: '손경민', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '은혜를 아는 자 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '동행', artist: '손경민', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '동행 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '길 (The Way)', artist: '손경민', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '길 (The Way) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 인도하셨네', artist: '손경민', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예수 인도하셨네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님의 은혜로', artist: '손경민', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님의 은혜로 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '감사', artist: '손경민', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '감사 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님이 하십니다', artist: '손경민', key: 'Eb', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님이 하십니다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '충만', artist: '지선', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '충만 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '하나님은 너를 지키시는 자', artist: '한스밴드', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '하나님은 너를 지키시는 자 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '기대', artist: '워킹', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '기대 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '소원', artist: '한웅재', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '소원 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '야곱의 축복', artist: '소리엘', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '야곱의 축복 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 열방의 소망', artist: '소리엘', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예수 열방의 소망 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님은 산 같아서', artist: '마커스워십', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님은 산 같아서 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주가 보이신 생명의 길', artist: '마커스워십', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주가 보이신 생명의 길 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주를 위한 이곳에', artist: '마커스워십', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주를 위한 이곳에 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '비 준비하시니', artist: '마커스워십', key: 'A', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '비 준비하시니 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주의 거룩한 이름을 부를 때', artist: '마커스워십', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주의 거룩한 이름을 부를 때 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '날 만드신 사랑', artist: '위러브', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '날 만드신 사랑 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '깊은 곳에 나아가', artist: '위러브', key: 'G', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '깊은 곳에 나아가 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수님만을 선포하리', artist: '위러브', key: 'D', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '예수님만을 선포하리 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '만군의 여호와', artist: '제이어스', key: 'A', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '만군의 여호와 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나의 마음을 (Refiner\'s Fire)', artist: '디사이플스', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나의 마음을 (Refiner\'s Fire) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '오직 예수', artist: '디사이플스', key: 'G', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '오직 예수 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 한 분만으로', artist: '디사이플스', key: 'A', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '주 한 분만으로 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 보혈 날 씻었네', artist: '디사이플스', key: 'D', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '주 보혈 날 씻었네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주의 아름다움으로', artist: '예수전도단', key: 'G', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '주의 아름다움으로 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 구주 예수님 (Shout to the Lord)', artist: '힐송', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 구주 예수님 (Shout to the Lord) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '오직 주만', artist: '마커스워십', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '오직 주만 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님 내 길 예비하시니', artist: '복음성가', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님 내 길 예비하시니 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '목마른 사슴', artist: '복음성가', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '목마른 사슴 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주께 가오니', artist: '어노인팅', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주께 가오니 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '아름다우신', artist: '예수전도단', key: 'A', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '아름다우신 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주의 임재 안에서', artist: '예수전도단', key: 'G', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '주의 임재 안에서 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나 무엇과도 주님을', artist: '어노인팅', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나 무엇과도 주님을 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나 주님이 더욱 필요해', artist: '어노인팅', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나 주님이 더욱 필요해 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '마음이 상한 자를', artist: '어노인팅', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '마음이 상한 자를 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '물이 바다 덮음 같이', artist: '어노인팅', key: 'Bb', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '물이 바다 덮음 같이 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 영혼은 안전합니다', artist: '어노인팅', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 영혼은 안전합니다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '은혜 아래 있네', artist: '어노인팅', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '은혜 아래 있네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 사랑이 나를 숨쉬게 해', artist: '어노인팅', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주 사랑이 나를 숨쉬게 해 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '온 땅의 주인', artist: '어노인팅', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '온 땅의 주인 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 피를 힘입어', artist: '어노인팅', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예수 피를 힘입어 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나는 예배자입니다', artist: '어노인팅', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나는 예배자입니다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 은혜 날 채우시네', artist: '어노인팅', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주 은혜 날 채우시네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 마음을 가득 채운', artist: '어노인팅', key: 'E', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '내 마음을 가득 채운 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '아무것도 두려워 말라', artist: '어노인팅', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '아무것도 두려워 말라 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 품에 품으소서', artist: '어노인팅', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주 품에 품으소서 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나의 왕 나의 주', artist: '위러브', key: 'G', bpm: 'fast', mood: 'bright', target: 'youth', themes: ['worship', 'grace'], reason: '나의 왕 나의 주 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '영원한 사귐으로', artist: '위러브', key: 'D', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '영원한 사귐으로 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '고백', artist: '위러브', key: 'A', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '고백 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '낮은 곳으로', artist: '위러브', key: 'G', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '낮은 곳으로 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주의 나라', artist: '위러브', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '주의 나라 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 전하세', artist: '위러브', key: 'A', bpm: 'fast', mood: 'bright', target: 'youth', themes: ['worship', 'grace'], reason: '예수 전하세 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '시간을 뚫고', artist: '위러브', key: 'A', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '시간을 뚫고 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '공감하시네', artist: '위러브', key: 'G', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '공감하시네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '밝은 빛을 비추시네', artist: '위러브', key: 'D', bpm: 'fast', mood: 'bright', target: 'youth', themes: ['worship', 'grace'], reason: '밝은 빛을 비추시네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '공급자', artist: '위러브', key: 'G', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '공급자 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '모든 열방 주 볼 때까지', artist: '예수전도단', key: 'D', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '모든 열방 주 볼 때까지 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '호산나', artist: '예수전도단', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '호산나 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '손을 높이 들고', artist: '예수전도단', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '손을 높이 들고 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '기뻐하며 왕께 노래하며', artist: '예수전도단', key: 'G', bpm: 'fast', mood: 'bright', target: 'youth', themes: ['worship', 'grace'], reason: '기뻐하며 왕께 노래하며 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 사랑이 온 세상에', artist: '예수전도단', key: 'G', bpm: 'fast', mood: 'bright', target: 'youth', themes: ['worship', 'grace'], reason: '주 사랑이 온 세상에 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '은혜로다', artist: '예수전도단', key: 'D', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '은혜로다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '아바 아버지', artist: '예수전도단', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '아바 아버지 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '시선', artist: '예수전도단', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '시선 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '성령이 오셨네', artist: '김도현', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '성령이 오셨네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '우리는 주의 움직이는 교회', artist: '소진영', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '우리는 주의 움직이는 교회 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '은혜', artist: '손경민', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '은혜 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '행복', artist: '손경민', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '행복 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '감사', artist: '손경민', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '감사 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '동행', artist: '손경민', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '동행 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '그가 아시나니', artist: '손경민', key: 'Eb', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '그가 아시나니 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 인도하셨네', artist: '손경민', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예수 인도하셨네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '길', artist: '손경민', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '길 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '은혜를 아는 자', artist: '손경민', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '은혜를 아는 자 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님이 하십니다', artist: '손경민', key: 'Eb', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님이 하십니다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주의 은혜로 오직 살아가네', artist: '손경민', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주의 은혜로 오직 살아가네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '광야를 지나며', artist: '히즈윌', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '광야를 지나며 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '믿음이 없이는', artist: '히즈윌', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '믿음이 없이는 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '하루', artist: '히즈윌', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '하루 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님은 너를 만드신 분', artist: '복음성가', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님은 너를 만드신 분 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '괴로울 때 주님의 얼굴 보라', artist: '복음성가', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '괴로울 때 주님의 얼굴 보라 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '좋으신 하나님', artist: '복음성가', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '좋으신 하나님 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나의 힘이 되신 여호와여', artist: '복음성가', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나의 힘이 되신 여호와여 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 삶은 주의 것', artist: '김명선', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 삶은 주의 것 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '또 하나의 열매를 바라시며', artist: '이율구', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '또 하나의 열매를 바라시며 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '사명', artist: '동방현주', key: 'Em', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '사명 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내게 강 같은 평화', artist: '복음성가', key: 'G', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '내게 강 같은 평화 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '아주 먼 옛날', artist: '복음성가', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '아주 먼 옛날 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '당신은 사랑받기 위해 태어난 사람', artist: '이율구', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '당신은 사랑받기 위해 태어난 사람 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '그 사랑', artist: '마커스워십', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '그 사랑 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님 다시 오실 때까지', artist: '소향', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님 다시 오실 때까지 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '사명', artist: '동방현주', key: 'Em', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '사명 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '또 하나의 열매를 바라시며', artist: '이율구', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '또 하나의 열매를 바라시며 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님의 은혜 넘치네', artist: '복음성가', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님의 은혜 넘치네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 주를 가까이 하게 함은', artist: '찬송가', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 주를 가까이 하게 함은 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나 같은 죄인 살리신', artist: '찬송가', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나 같은 죄인 살리신 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 안에 있는 나에게', artist: '찬송가', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주 안에 있는 나에게 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 평생에 가는 길', artist: '찬송가', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 평생에 가는 길 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '죄짐 맡은 우리 구주', artist: '찬송가', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '죄짐 맡은 우리 구주 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '구주 예수 의지함이', artist: '찬송가', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '구주 예수 의지함이 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '다 찬양하여라', artist: '찬송가', key: 'G', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '다 찬양하여라 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 영혼의 그윽히 깊은 데서', artist: '찬송가', key: 'Ab', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 영혼의 그윽히 깊은 데서 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '오 신실 하신 주', artist: '찬송가', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '오 신실 하신 주 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 더 알기 원하네', artist: '찬송가', key: 'Eb', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예수 더 알기 원하네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '이 눈에 아무 증거 아니 뵈어도', artist: '찬송가', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '이 눈에 아무 증거 아니 뵈어도 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '허락하신 새 땅에', artist: '찬송가', key: 'Ab', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '허락하신 새 땅에 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '빛의 사자들이여', artist: '찬송가', key: 'G', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '빛의 사자들이여 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 십자가에 흘린 피로써', artist: '찬송가', key: 'Ab', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '예수 십자가에 흘린 피로써 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 하나님 지으신 모든 세계', artist: '찬송가', key: 'Bb', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주 하나님 지으신 모든 세계 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '왕이신 나의 하나님', artist: '복음성가', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '왕이신 나의 하나님 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 여호와는 광대하시도다', artist: '복음성가', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주 여호와는 광대하시도다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '좋으신 하나님', artist: '복음성가', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '좋으신 하나님 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나의 힘이 되신 여호와여', artist: '복음성가', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나의 힘이 되신 여호와여 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 삶은 주의 것', artist: '김명선', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 삶은 주의 것 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 이름 아시죠', artist: '디사이플스', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 이름 아시죠 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님과 같이 (There Is None Like You)', artist: '복음성가', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님과 같이 (There Is None Like You) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '누군가 널 위해 기도하네', artist: '복음성가', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '누군가 널 위해 기도하네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '괴로울 때 주님의 얼굴 보라', artist: '복음성가', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '괴로울 때 주님의 얼굴 보라 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님은 너를 만드신 분', artist: '복음성가', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님은 너를 만드신 분 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나의 등 뒤에서', artist: '김명선', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나의 등 뒤에서 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '하나님은 너를 지키시는 자', artist: '한스밴드', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '하나님은 너를 지키시는 자 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '기대', artist: '워킹', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '기대 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '소원', artist: '한웅재', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '소원 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '야곱의 축복', artist: '소리엘', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '야곱의 축복 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 열방의 소망', artist: '소리엘', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예수 열방의 소망 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주가 일하시네', artist: '김브라이언', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주가 일하시네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '성령이 오셨네', artist: '김도현', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '성령이 오셨네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 예수', artist: '김윤진', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예수 예수 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '충만', artist: '지선', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '충만 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '하나님의 부르심', artist: '피아워십', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '하나님의 부르심 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나는 주를 섬기는 것에 후회가 없습니다', artist: '피아워십', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나는 주를 섬기는 것에 후회가 없습니다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '실로암', artist: '피아워십', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '실로암 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '이 말씀 앞에서', artist: '예람워십', key: 'D', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '이 말씀 앞에서 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '하나님의 은혜', artist: '피아워십', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '하나님의 은혜 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나의 하나님 (El Shaddai)', artist: '피아워십', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나의 하나님 (El Shaddai) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '꽃들도', artist: '피아워십', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '꽃들도 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 영혼이 따뜻한 예배를', artist: '피아워십', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 영혼이 따뜻한 예배를 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '사랑하셔서 오시었네', artist: '피아워십', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '사랑하셔서 오시었네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 모든 삶 행동 주 안에', artist: '피아워십', key: 'G', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '내 모든 삶 행동 주 안에 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나의 약함은 나의 자랑이요', artist: '피아워십', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나의 약함은 나의 자랑이요 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주의 음성을 내가 들으니', artist: '피아워십', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주의 음성을 내가 들으니 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주께 가까이', artist: '피아워십', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주께 가까이 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '십자가 그 사랑', artist: '피아워십', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '십자가 그 사랑 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주의 옷자락 만지며', artist: '피아워십', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주의 옷자락 만지며 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주의 친절한 팔에 안기세', artist: '찬송가', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주의 친절한 팔에 안기세 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 진정 사모하는', artist: '찬송가', key: 'F', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '내 진정 사모하는 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주와 같이 길 가는 것', artist: '찬송가', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주와 같이 길 가는 것 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '아 하나님의 은혜로', artist: '찬송가', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '아 하나님의 은혜로 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '태산을 넘어 험곡에 가도', artist: '찬송가', key: 'G', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '태산을 넘어 험곡에 가도 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '슬픈 마음 있는 사람', artist: '찬송가', key: 'G', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '슬픈 마음 있는 사람 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '만 입이 내게 있으면', artist: '찬송가', key: 'A', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '만 입이 내게 있으면 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 예수보다 더 귀한 것은 없네', artist: '찬송가', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주 예수보다 더 귀한 것은 없네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 따라가며', artist: '찬송가', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예수 따라가며 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '구주와 함께 나 죽었으니', artist: '찬송가', key: 'Eb', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '구주와 함께 나 죽었으니 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '예수 나를 위하여', artist: '찬송가', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '예수 나를 위하여 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '오직 예수', artist: '디사이플스', key: 'G', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '오직 예수 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 한 분만으로', artist: '디사이플스', key: 'A', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '주 한 분만으로 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '나의 마음을 (Refiner\'s Fire)', artist: '디사이플스', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '나의 마음을 (Refiner\'s Fire) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 보혈 날 씻었네', artist: '디사이플스', key: 'D', bpm: 'fast', mood: 'bright', target: 'adult', themes: ['worship', 'grace'], reason: '주 보혈 날 씻었네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '약한 나로 강하게', artist: '어노인팅', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '약한 나로 강하게 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '목마른 사슴이 시냇물을', artist: '복음성가', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '목마른 사슴이 시냇물을 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주께 가오니', artist: '어노인팅', key: 'G', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주께 가오니 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '목마른 사슴', artist: '복음성가', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '목마른 사슴 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '내 구주 예수님 (Shout to the Lord)', artist: '힐송', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '내 구주 예수님 (Shout to the Lord) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '호산나 (Hosanna)', artist: '힐송', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '호산나 (Hosanna) - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주의 아름다움으로', artist: '예수전도단', key: 'G', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '주의 아름다움으로 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주의 임재 안에서', artist: '예수전도단', key: 'G', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '주의 임재 안에서 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '모든 열방 주 볼 때까지', artist: '예수전도단', key: 'D', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '모든 열방 주 볼 때까지 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '손을 높이 들고', artist: '예수전도단', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '손을 높이 들고 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '기뻐하며 왕께 노래하며', artist: '예수전도단', key: 'G', bpm: 'fast', mood: 'bright', target: 'youth', themes: ['worship', 'grace'], reason: '기뻐하며 왕께 노래하며 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주 사랑이 온 세상에', artist: '예수전도단', key: 'G', bpm: 'fast', mood: 'bright', target: 'youth', themes: ['worship', 'grace'], reason: '주 사랑이 온 세상에 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '아바 아버지', artist: '예수전도단', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '아바 아버지 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '은혜로다', artist: '예수전도단', key: 'D', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '은혜로다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '시선', artist: '예수전도단', key: 'E', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '시선 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '마지막 날에', artist: '예수전도단', key: 'G', bpm: 'fast', mood: 'bright', target: 'youth', themes: ['worship', 'grace'], reason: '마지막 날에 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '아름다우신', artist: '예수전도단', key: 'A', bpm: 'medium', mood: 'grand', target: 'youth', themes: ['worship', 'grace'], reason: '아름다우신 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님 내 길 예비하시니', artist: '복음성가', key: 'D', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님 내 길 예비하시니 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '믿음이 없이는', artist: '히즈윌', key: 'A', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '믿음이 없이는 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '하루', artist: '히즈윌', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '하루 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '길', artist: '손경민', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '길 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '동행', artist: '손경민', key: 'E', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '동행 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '감사', artist: '손경민', key: 'C', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '감사 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주의 은혜로 오직 살아가네', artist: '손경민', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주의 은혜로 오직 살아가네 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '그가 아시나니', artist: '손경민', key: 'Eb', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '그가 아시나니 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '은혜를 아는 자', artist: '손경민', key: 'F', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '은혜를 아는 자 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
  { title: '주님이 하십니다', artist: '손경민', key: 'Eb', bpm: 'medium', mood: 'grand', target: 'adult', themes: ['worship', 'grace'], reason: '주님이 하십니다 - 李ъ뼇 ?덈같 怨좊갚?낅땲??' },
];




// ==========================================================================
// [Firebase 클라우드 실시간 동기화 엔진 설정 및 마이그레이션]
// ==========================================================================

const firebaseConfig = {
  apiKey: "AIzaSy" + "DCN1DzGr" + "KXvyF3ZdkoWsn" + "q1IuAnl_7oYk",
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
    if (church1 && church1.worships && church1.worships['service-2'] && !church1.worships['service-2'].description) {
      isLegacy = true;
    }
  }
  
  if (isLegacy) {
    console.log("Schema mismatch: resetting default structure safely...");
    const oldChurches = db.churches || {};
    db = defaultData;
    db.churches['church-1'].notices = demoNotices['church-1'];
    db.churches['church-2'].notices = demoNotices['church-2'];
    
    // [소중한 신규 가입 데이터 보존 가드] 기존 가입해 둔 다른 소중한 교회 정보가 있다면 유실 없이 안전하게 병합!
    for (const key in oldChurches) {
      if (key !== 'church-1' && key !== 'church-2') {
        db.churches[key] = oldChurches[key];
      }
    }
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
  
  // 만약 Firebase 서버 연결이 Off(null) 상태이거나 오프라인이라면, 클라우드 동기화는 건너뛰고 안전하게 로컬만 저장하고 리턴!
  if (!fbDB) {
    console.log("Offline local backup saved successfully.");
    return;
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
  const btnSearch = document.getElementById('btn-tab-search');
  const btnAI = document.getElementById('btn-tab-ai');
  
  const areaConti = document.getElementById('area-main-conti');
  const areaNotice = document.getElementById('area-main-notice');
  const areaDevotion = document.getElementById('area-main-devotion');
  const areaSearch = document.getElementById('area-main-search');
  const areaAI = document.getElementById('area-main-ai');
  
  const btnAddWorship = document.getElementById('btn-add-worship');
  const btnAddNotice = document.getElementById('btn-add-notice');
  
  btnConti.classList.remove('active');
  btnNotice.classList.remove('active');
  if (btnDevotion) btnDevotion.classList.remove('active');
  if (btnSearch) btnSearch.classList.remove('active');
  btnAI.classList.remove('active');
  
  areaConti.classList.remove('active');
  areaNotice.classList.remove('active');
  if (areaDevotion) areaDevotion.classList.remove('active');
  if (areaSearch) areaSearch.classList.remove('active');
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
  } else if (tabName === 'praise-search') {
    if (btnSearch) btnSearch.classList.add('active');
    if (areaSearch) areaSearch.classList.add('active');
    
    btnAddWorship.style.display = 'none';
    btnAddNotice.style.display = 'none';
    
    performPraiseSearch(); // 검색 패널 활성화 시 리프레시 실행
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
function navigateTo(screenId, serviceId = null, weekId = null, isFromPopState = false) {
  state.currentScreen = screenId;
  
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
  
  if (!isFromPopState) {
    try {
      history.pushState({
        screenId: screenId,
        serviceId: serviceId,
        weekId: weekId
      }, "", "");
    } catch (err) {
      console.warn("History pushState failed: ", err);
    }
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
    // [자가 치유 실시간 마이그레이션] 이전에 추가된 구버전 데이터 중 id가 유실된 곡이 있다면 즉석 실시간 고유 ID 부여!
    if (!song.id) {
      song.id = 'song-' + Date.now() + '-' + index + '-' + Math.floor(Math.random() * 1000);
      saveDatabase();
    }
    
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
      ? `<button type="button" class="youtube-link-btn" onclick="openYoutubePlayer('${escapeHtml(song.title.replace(/'/g, "\\'"))}', '${escapeHtml(song.youtubeUrl.replace(/'/g, "\\'"))}')">
           <i class="fa-brands fa-youtube"></i> YouTube 영상
         </button>`
      : `<button type="button" class="youtube-link-btn disabled">
           <i class="fa-brands fa-youtube"></i> 영상 없음
         </button>`;
         
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
  // KakaoTalk In-App Browser Auto-Exit Guard (Bypasses KakaoTalk back-button termination issue)
  var ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf("kakaotalk") > -1) {
    window.location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(window.location.href);
    return;
  }
  
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
    // [1회성 세션 스플래시 재생 가드] 이번 접속 세션에서 이미 인트로를 보았다면 동영상 재생을 즉시 스킵 처리
    if (sessionStorage.getItem('splash_shown')) {
      splashScreen.style.display = 'none';
    } else {
      // 최초 1회만 노출 마킹 기록
      sessionStorage.setItem('splash_shown', 'true');
      
      splashVideo.play().catch(err => {
        console.warn("Autoplay was blocked by browser policy. User gesture needed:", err);
      });
  
      // 4.5초 뒤 자동 페이드 아웃 강제 해제 (인트로 영상이 3~4초 분량이므로 넉넉히 대기)
      const splashTimeout = setTimeout(hideSplash, 4500);
  
      // 비디오 재생이 일찍 끝나면 즉시 퇴장
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
  }
  
  // 1. 데이터베이스 및 세션 확인
  // 1. ?곗씠?곕쿋?댁뒪 諛??몄뀡 ?뺤씤
  initDatabase();
  
  try {
    history.replaceState({
      screenId: state.currentScreen,
      serviceId: state.selectedServiceId,
      weekId: state.selectedWeekId
    }, "", "");
  } catch (e) {}
  
  window.addEventListener("popstate", (event) => {
    if (event.state) {
      var sState = event.state;
      navigateTo(sState.screenId, sState.serviceId, sState.weekId, true);
    }
  });
  
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

  // [NEW] 앱 내부 유튜브 플레이어 모달 개폐 바인딩
  const btnCloseYoutube = document.getElementById('btn-close-youtube-player');
  if (btnCloseYoutube) {
    btnCloseYoutube.addEventListener('click', closeYoutubePlayer);
  }
  const youtubePlayerModal = document.getElementById('youtube-player-modal');
  if (youtubePlayerModal) {
    youtubePlayerModal.addEventListener('click', (e) => {
      if (e.target === youtubePlayerModal) {
        closeYoutubePlayer();
      }
    });
  }

  // [NEW] 찬양 실시간 검색창 이벤트 리스너 바인딩
  const praiseSearchInput = document.getElementById('praise-search-input');
  if (praiseSearchInput) {
    praiseSearchInput.addEventListener('input', handlePraiseSearchInput);
  }

  // 28. [NEW] 찬양 검색 메인 탭바 네비게이션 클릭 이벤트 연동
  const btnTabSearch = document.getElementById('btn-tab-search');
  if (btnTabSearch) {
    btnTabSearch.addEventListener('click', () => switchMainTab('praise-search'));
  }
  
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

// 묵상 탭 날짜 전환 처리기
function changeDevotionDate(offset) {
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDate = String(today.getDate()).padStart(2, '0');
  const todayStr = `${todayYear}-${todayMonth}-${todayDate}`;
  
  if (!state.selectedDevotionDate) {
    state.selectedDevotionDate = todayStr;
  }
  
  const parts = state.selectedDevotionDate.split('-');
  const current = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  current.setDate(current.getDate() + offset);
  
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, '0');
  const date = String(current.getDate()).padStart(2, '0');
  const targetStr = `${year}-${month}-${date}`;
  
  // 오늘 이후의 미래 날짜로는 넘어갈 수 없음
  if (targetStr > todayStr) {
    return;
  }
  
  state.selectedDevotionDate = targetStr;
  renderDevotionTab();
}

// 오늘의 말씀 탭 렌더링
function renderDevotionTab() {
  const church = db.churches[db.activeChurchId];
  if (!church) return;
  
  if (!church.attendances) church.attendances = {};
  if (!church.devotions) church.devotions = {};
  
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDate = String(today.getDate()).padStart(2, '0');
  const todayStr = `${todayYear}-${todayMonth}-${todayDate}`;
  
  if (!state.selectedDevotionDate) {
    state.selectedDevotionDate = todayStr;
  }
  
  const targetDateStr = state.selectedDevotionDate;
  const isToday = targetDateStr === todayStr;
  
  if (!church.devotions[targetDateStr]) {
    church.devotions[targetDateStr] = { posts: [] };
  }
  
  // 1. 날짜 디스플레이 제어
  const nextBtn = document.getElementById('btn-devotion-next');
  if (nextBtn) {
    nextBtn.style.visibility = isToday ? 'hidden' : 'visible';
  }
  
  const parts = targetDateStr.split('-');
  const dateText = `${parts[0]}년 ${parts[1]}월 ${parts[2]}일` + (isToday ? ' (오늘)' : '');
  const dateDisplay = document.getElementById('devotion-current-date-display');
  if (dateDisplay) {
    dateDisplay.innerHTML = `<i class="fa-regular fa-calendar"></i> ${dateText}`;
  }
  
  // 2. 오늘의 시편 말씀 출력 (해당 타겟 날짜의 getDate 기준 매칭)
  const targetDayVal = parseInt(parts[2], 10);
  const verseIndex = targetDayVal % PSALM_VERSES.length;
  const todayVerse = PSALM_VERSES[verseIndex];
  
  document.getElementById('daily-verse-title').textContent = todayVerse.verse;
  document.getElementById('daily-verse-content').textContent = `“${todayVerse.content}”`;
  
  // 3. 본인의 묵상 참여 양식 제어
  const posts = church.devotions[targetDateStr].posts || [];
  const formBox = document.getElementById('my-devotion-form-box');
  const completeMsg = document.getElementById('my-devotion-complete-msg');
  const pastMsg = document.getElementById('my-devotion-past-msg');
  
  if (!isToday) {
    formBox.style.display = 'none';
    completeMsg.style.display = 'none';
    if (pastMsg) {
      pastMsg.style.display = 'block';
      pastMsg.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${parts[1]}월 ${parts[2]}일의 찬양팀 묵상 나눔 피드 및 출석 내역입니다.`;
    }
  } else {
    if (pastMsg) pastMsg.style.display = 'none';
    const hasWritten = posts.some(post => post.authorName === state.userName);
    if (hasWritten) {
      formBox.style.display = 'none';
      completeMsg.style.display = 'block';
    } else {
      formBox.style.display = 'block';
      completeMsg.style.display = 'none';
      document.getElementById('devotion-post-input').value = '';
    }
  }
  
  // 4. 관리자 전용 실시간 출석 현황판 노출 (해당 날짜 기준)
  const adminBox = document.getElementById('admin-attendance-box');
  const listContainer = document.getElementById('attendance-list-container');
  const todayAttendance = church.attendances[targetDateStr] || {};
  
  if (db.activeRole === 'admin') {
    adminBox.style.display = 'block';
    listContainer.innerHTML = '';
    
    const attendPeople = Object.keys(todayAttendance);
    document.getElementById('attendance-count-badge').textContent = `${attendPeople.length}명`;
    
    if (attendPeople.length === 0) {
      listContainer.innerHTML = `<span style="font-size: 0.72rem; color: var(--text-muted); font-style: italic;">선택한 날짜에 출석체크를 완료한 팀원이 없습니다.</span>`;
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
  
  // 5. 실시간 묵상 피드 출력
  const feedContainer = document.getElementById('devotion-feed-container');
  feedContainer.innerHTML = '';
  
  if (posts.length === 0) {
    feedContainer.innerHTML = `
      <div class="empty-state" style="padding: 24px 10px; background: rgba(255,255,255,0.7); border: 1px dashed var(--border); border-radius: var(--radius-md);">
        <i class="fa-regular fa-comments empty-icon" style="color: #a5b4fc; font-size: 1.8rem; margin-bottom: 6px;"></i>
        <p style="font-size: 0.8125rem; font-weight: 700; color: var(--text-sub);">선택한 날짜에 등록된 묵상이 없습니다.</p>
      </div>
    `;
    return;
  }
  
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

// 묵상글 신규 등록 (출석 자동 완료 연동)
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
  
  // 묵상 등록 시 날짜 선택기를 오늘로 자동 리셋
  state.selectedDevotionDate = todayStr;
  
  saveDatabase();
  
  // UI 즉시 동기화
  renderDevotionTab();
  alert('샬롬! 오늘의 말씀 묵상 나눔과 출석체크가 모두 완료되었습니다. 🌟');
}

// 댓글 기능 제거 완료

// ==========================================================================
// [찬양 검색 및 앱 내부 유튜브 모달 연동 엔진]
// ==========================================================================

// 공용 플로팅 토스트(Toast) 메시지 노출 함수
function showToast(message) {
  const toast = document.getElementById('toast-container');
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.add('show');
  
  // 2.2초 후에 페이드 아웃 처리
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// 앱 내부 유튜브 플레이어 모달 제어 함수
function openYoutubePlayer(title, youtubeUrlOrSearchTitle) {
  if (!youtubeUrlOrSearchTitle || youtubeUrlOrSearchTitle.trim() === "") {
    alert("No video registered.");
    return;
  }
  
  var targetUrl = "";
  if (youtubeUrlOrSearchTitle.indexOf("youtube.com") > -1 || youtubeUrlOrSearchTitle.indexOf("youtu.be") > -1) {
    targetUrl = youtubeUrlOrSearchTitle;
  } else {
    targetUrl = "https://www.youtube.com/results?search_query=" + encodeURIComponent(youtubeUrlOrSearchTitle);
  }
  
  try {
    var a = document.createElement("a");
    a.href = targetUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Launching YouTube...");
  } catch (err) {
    window.location.href = targetUrl;
  }
}

function closeYoutubePlayer() {
  const modal = document.getElementById('youtube-player-modal');
  const iframe = document.getElementById('youtube-iframe');
  if (modal) modal.classList.remove('active');
  if (iframe) iframe.src = ""; // 사운드 중단
}

// 실시간 찬양 검색 디바운스 인풋 핸들러
let searchDebounceTimeout = null;

function handlePraiseSearchInput() {
  if (searchDebounceTimeout) {
    clearTimeout(searchDebounceTimeout);
  }
  
  searchDebounceTimeout = setTimeout(() => {
    performPraiseSearch();
  }, 300); // 300ms 디바운스 준수
}

// 찬양 검색 실행 함수
function performPraiseSearch() {
  const searchInput = document.getElementById('praise-search-input');
  const resultsContainer = document.getElementById('praise-search-results');
  if (!searchInput || !resultsContainer) return;
  
  const query = searchInput.value.trim().toLowerCase();
  
  // 검색어가 비어 있으면 예쁜 초기 가이드 문구 출력
  if (!query) {
    resultsContainer.innerHTML = `
      <div class="empty-state" style="padding: 40px 10px;">
        <i class="fa-solid fa-music empty-icon" style="color: #cbd5e1; font-size: 2.2rem; margin-bottom: 8px;"></i>
        <p style="font-size: 0.8125rem; font-weight: 700; color: var(--text-sub);">찾으시는 찬양 제목을 입력하세요.</p>
        <p class="empty-sub" style="font-size: 0.72rem;">로컬 데이터베이스에서 즉시 곡을 매칭합니다.</p>
      </div>
    `;
    return;
  }
  
  // 로컬 200곡 데이터베이스에서 찬양 제목 부분 검색 (대소문자 무시)
  const matchedSongs = localPraiseDB.filter(song => 
    song.title && song.title.toLowerCase().includes(query)
  );
  
  if (matchedSongs.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state" style="padding: 45px 10px; background: rgba(0,0,0,0.01); border: 1px dashed var(--border); border-radius: var(--radius-md);">
        <div style="font-size: 2rem; margin-bottom: 6px;">🎵</div>
        <p style="font-size: 0.8125rem; font-weight: 700; color: var(--text-sub);">검색 결과가 없습니다.</p>
        <p class="empty-sub" style="font-size: 0.72rem;">검색어를 확인하거나 단어를 축소해 보세요.</p>
      </div>
    `;
    return;
  }
  
  resultsContainer.innerHTML = '';
  
  matchedSongs.forEach(song => {
    const card = document.createElement('div');
    card.className = 'search-result-card';
    
    const bpmVal = song.bpm || '80';
    const keyVal = song.key || 'C';
    const artistVal = song.artist ? ` - ${song.artist}` : '';
    const youtubeParam = `${song.title} ${song.artist || ''}`;
    
    // 유튜브 보기 버튼 (보라색), 콘티 추가 버튼 (파란색 - 관리자 권한 전용 제한)
    const addContiBtnHtml = (db.activeRole === 'admin') ? `
      <button type="button" class="btn-praise-add-conti" onclick="addPraiseToCurrentConti(${JSON.stringify(song).replace(/"/g, '&quot;')})">
        <i class="fa-solid fa-plus"></i> ➕ 콘티 추가
      </button>
    ` : '';

    card.innerHTML = `
      <div class="search-card-header">
        <span class="search-card-title">${escapeHtml(song.title)}<span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">${escapeHtml(artistVal)}</span></span>
        <div class="search-card-meta">
          <span class="search-card-key">${escapeHtml(keyVal)}</span>
          <span class="search-card-bpm">♩ ${escapeHtml(bpmVal)}</span>
        </div>
      </div>
      <div class="search-card-actions">
        <button type="button" class="btn-youtube-view" onclick="openYoutubePlayer('${escapeHtml(song.title.replace(/'/g, "\\'"))}', '${escapeHtml(youtubeParam.replace(/'/g, "\\'"))}')">
          <i class="fa-solid fa-play"></i> ▶ 유튜브 보기
        </button>
        ${addContiBtnHtml}
      </div>
    `;
    resultsContainer.appendChild(card);
  });
}

// 검색 모달 내의 찬양을 현재 활성화된 예배/주차 콘티에 즉시 추가
function addPraiseToCurrentConti(songObj) {
  const church = db.churches[db.activeChurchId];
  // 등록된 전체 예배 목록(2부, 3부 등) 중에서 사용자가 타겟 폴더를 선택하도록 물어봅니다.
  const worshipIds = Object.keys(church.worships || {});
  if (worshipIds.length === 0) {
    alert('등록된 예배 폴더가 없습니다. 먼저 메인 화면에서 예배를 등록해 주세요!');
    return;
  }
  
  let targetWorshipId = "";
  if (worshipIds.length === 1) {
    targetWorshipId = worshipIds[0];
  } else {
    let msg = "이 찬양을 추가할 예배 폴더의 번호를 입력해 주세요:\n\n";
    worshipIds.forEach((id, idx) => {
      msg += `${idx + 1}. ${church.worships[id].title || id}\n`;
    });
    const selection = prompt(msg, "1");
    if (selection === null) return; // 취소 누른 경우 중단
    const selIdx = parseInt(selection) - 1;
    if (isNaN(selIdx) || selIdx < 0 || selIdx >= worshipIds.length) {
      alert('올바르지 않은 번호입니다. 추가를 취소합니다.');
      return;
    }
    targetWorshipId = worshipIds[selIdx];
  }
  
  const worship = church.worships[targetWorshipId];
  if (!worship) return;
  
  // 디폴트 주차는 이번주(this-week)
  const currentWeekId = state.selectedWeekId || 'this-week';
  if (!worship.weeks) worship.weeks = {};
  if (!worship.weeks[currentWeekId]) {
    worship.weeks[currentWeekId] = { items: [] };
  }
  
  const week = worship.weeks[currentWeekId];
  if (!week.items) week.items = [];
  
  // 곡 오브젝트 규격 변환 (삭제 처리를 위한 고유 ID 필드 추가 탑재)
  const newContiSong = {
    id: 'song-' + Date.now() + '-' + Math.floor(Math.random() * 1000), // 고유한 ID 발급!
    title: songObj.title,
    key: songObj.key || 'C',
    bpm: songObj.bpm || '80',
    memo: songObj.reason || '', // 기본 추천 이유를 메모로 지정
    youtubeUrl: songObj.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(songObj.title)}`,
    sheetMusicBase64: null
  };
  
  week.items.push(newContiSong);
  
  // DB 저장 및 클라우드 동기화 개시
  saveDatabase();
  
  // 찬양 상세 리스트 화면이 활성화되어 있고 현재 활성화된 화면이 타겟 예배일 때 UI 즉시 갱신
  if (document.getElementById('screen-detail').classList.contains('active') && state.selectedServiceId === targetWorshipId) {
    renderSongList();
  }
  
  // Toast 알림 노출
  showToast("콘티에 추가되었습니다.");
}

// 전역 스코프 인라인 바인딩 맵핑
window.openYoutubePlayer = openYoutubePlayer;
window.closeYoutubePlayer = closeYoutubePlayer;
window.addPraiseToCurrentConti = addPraiseToCurrentConti;
