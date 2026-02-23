# SkillForge 디자인 시스템

## 1. 색상 팔레트

### Primary (개발 도구 톤)
- Primary: `#6366F1` (Indigo 500) - 주요 액션, 버튼
- Primary Light: `#818CF8` (Indigo 400) - 호버 상태
- Primary Dark: `#4F46E5` (Indigo 600) - 활성 상태

### Semantic
- Success: `#22C55E` (Green 500) - 완료, 성공
- Warning: `#F59E0B` (Amber 500) - 경고
- Error: `#EF4444` (Red 500) - 에러
- Info: `#3B82F6` (Blue 500) - 정보

### Background
- Background: `#0F172A` (Slate 900) - 앱 배경 (다크)
- Surface: `#1E293B` (Slate 800) - 카드, 패널
- Surface Light: `#334155` (Slate 700) - 호버 배경

### Text
- Text Primary: `#F8FAFC` (Slate 50) - 주요 텍스트
- Text Secondary: `#94A3B8` (Slate 400) - 보조 텍스트
- Text Muted: `#64748B` (Slate 500) - 비활성 텍스트

### Type Badge Colors
- Skill: `#8B5CF6` (Violet 500)
- Agent: `#06B6D4` (Cyan 500)
- Orchestration: `#F97316` (Orange 500)

---

## 2. 타이포그래피

- **Font Family**: `"JetBrains Mono", "Fira Code", monospace` (코드), `"Inter", system-ui, sans-serif` (UI)
- **Heading 1**: 24px / 700 / Inter
- **Heading 2**: 20px / 600 / Inter
- **Heading 3**: 16px / 600 / Inter
- **Body**: 14px / 400 / Inter
- **Caption**: 12px / 400 / Inter
- **Code**: 13px / 400 / JetBrains Mono

---

## 3. 컴포넌트

### Pattern Card
- 배경: Surface (`#1E293B`)
- 보더: 1px solid `#334155`
- 보더 radius: 12px
- 패딩: 16px
- 호버: border-color Primary
- 내부 구성:
  - 상단: 타입 뱃지 + 이름
  - 중단: 구조 미리보기 (다이어그램)
  - 하단: 태그 칩들 + 설명 한 줄

### Button
- Primary: bg Primary, text white, border-radius 8px
- Secondary: bg transparent, border Primary, text Primary
- Ghost: bg transparent, text Secondary

### Input
- Default: bg Surface, border `#334155`, border-radius 8px
- Focus: border Primary
- Placeholder: text Muted

### Search Bar
- bg Surface Light
- border-radius 12px
- 아이콘 + 텍스트 입력 + 필터 버튼

### Chat Bubble (가이드 대화)
- AI: bg Surface, 왼쪽 정렬
- User: bg Primary/20%, 오른쪽 정렬
- border-radius 12px

### Step Indicator (5단계 가이드)
- 완료: Primary filled circle
- 현재: Primary outline circle + pulse
- 미래: Muted outline circle
- 연결선: Muted dashed line

### Tag Chip
- bg Surface Light
- border-radius 16px
- 패딩: 4px 12px
- text Caption size

---

## 4. 간격 시스템

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

---

## 5. 레이아웃

### 데스크톱 (Electron)
- 최소 너비: 1024px
- 최소 높이: 768px
- 사이드바: 240px (접기 가능)
- 메인 콘텐츠: 나머지

### 레이아웃 구조
```
┌──────┬────────────────────────┐
│      │                        │
│ Side │    Main Content         │
│ bar  │                        │
│      │                        │
│ 240px│                        │
│      │                        │
└──────┴────────────────────────┘
```

---

## 6. 다크 모드

기본 다크 모드 (개발 도구 특성상 다크가 기본). 라이트 모드는 MVP에서 제외.
