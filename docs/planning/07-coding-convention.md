# SkillForge 코딩 컨벤션

## 1. 파일 구조

```
skillforge/
├── electron/
│   ├── main.ts                    # Electron main process
│   ├── preload.ts                 # Preload script
│   └── ipc/
│       ├── pattern.ipc.ts         # 패턴 관련 IPC 핸들러
│       ├── work.ipc.ts            # 작업물 관련 IPC 핸들러
│       ├── claude.ipc.ts          # Claude CLI 연동
│       └── file.ipc.ts            # 파일 시스템 연동
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── ui/                    # 공통 UI 컴포넌트
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── ...
│   │   ├── patterns/              # 패턴 관련 컴포넌트
│   │   │   ├── PatternCard.tsx
│   │   │   ├── PatternGrid.tsx
│   │   │   └── PatternDetail.tsx
│   │   ├── guide/                 # 가이드 대화 컴포넌트
│   │   │   ├── GuideChat.tsx
│   │   │   ├── StepIndicator.tsx
│   │   │   └── ChatBubble.tsx
│   │   ├── workspace/             # 작업실 컴포넌트
│   │   │   ├── WorkCard.tsx
│   │   │   └── WorkList.tsx
│   │   └── editor/                # 코드 에디터 컴포넌트
│   │       ├── MarkdownEditor.tsx
│   │       └── FileTree.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── PatternLibrary.tsx
│   │   ├── PatternDetail.tsx
│   │   ├── GuideDialogue.tsx
│   │   ├── Preview.tsx
│   │   ├── Workspace.tsx
│   │   └── WorkDetail.tsx
│   ├── hooks/
│   │   ├── usePatterns.ts
│   │   ├── useWorks.ts
│   │   ├── useGuide.ts
│   │   └── useClaude.ts
│   ├── stores/
│   │   ├── patternStore.ts
│   │   ├── workStore.ts
│   │   └── guideStore.ts
│   ├── types/
│   │   ├── pattern.ts
│   │   ├── work.ts
│   │   └── guide.ts
│   └── lib/
│       ├── db.ts                  # SQLite 클라이언트 (IPC 래퍼)
│       ├── claude.ts              # Claude CLI 래퍼 (IPC 래퍼)
│       └── export.ts              # 내보내기 유틸리티
├── data/
│   └── patterns/                  # 초기 패턴 데이터
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.yml
└── tailwind.config.ts
```

## 2. 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 변수 | camelCase | `patternList`, `currentStep` |
| 함수 | camelCase | `getPatterns`, `exportToClaudeCode` |
| 컴포넌트 | PascalCase | `PatternCard`, `GuideChat` |
| 타입/인터페이스 | PascalCase | `Pattern`, `GuideSession` |
| 상수 | UPPER_SNAKE_CASE | `MAX_STEP_COUNT`, `DEFAULT_EXPORT_PATH` |
| 파일 (컴포넌트) | PascalCase.tsx | `PatternCard.tsx` |
| 파일 (유틸) | camelCase.ts | `claude.ts`, `export.ts` |
| IPC 채널 | kebab-case | `pattern:get-all`, `claude:send-message` |

## 3. 코드 스타일

### React 컴포넌트
- 함수 컴포넌트 + hooks만 사용 (class 컴포넌트 금지)
- Props 타입은 컴포넌트 파일 내 정의
- 컴포넌트 당 하나의 파일

### 상태 관리
- Zustand 사용 (경량, Electron 친화적)
- 스토어는 도메인별 분리 (pattern, work, guide)

### IPC 통신
- Main → Renderer: `ipcMain.handle` / `ipcRenderer.invoke`
- 채널명: `도메인:액션` 형식 (예: `pattern:get-all`)
- 타입 안전한 IPC 래퍼 사용

## 4. Lint/Formatter

- **ESLint**: `@typescript-eslint/recommended`
- **Prettier**: 기본 설정 + `singleQuote: true`, `semi: false`
- **Import 정렬**: `eslint-plugin-import`

## 5. Git 커밋 메시지

```
feat: 새 기능
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 리팩토링
test: 테스트 추가/수정
chore: 빌드/설정 변경
```

## 6. 테스트

- **단위 테스트**: Vitest
- **컴포넌트 테스트**: React Testing Library
- **E2E**: Playwright (Electron 모드)
- 테스트 파일 위치: 소스 파일 옆에 `*.test.ts(x)`
