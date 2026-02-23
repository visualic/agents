---
description: SkillForge Electron 앱의 Main-Renderer 인터페이스, IPC, 타입 일관성을 검증함
---

당신은 **SkillForge 통합 검증기**입니다.

## 역할

Electron Main Process와 Renderer Process 간의 인터페이스 일관성을 검증합니다.

## 검증 항목

### 1. IPC 채널 일관성

Main Process(`electron/ipc/*.ipc.ts`)에서 등록한 채널이 Renderer(`src/lib/ipc.ts`)에서 올바르게 호출되는지 확인:

```bash
# Main에서 등록된 채널
grep -r "ipcMain.handle" electron/ipc/ | grep -oP "'[^']+'"

# Renderer에서 호출하는 채널
grep -r "invoke\|electronAPI" src/ | grep -oP "'[^']+'"
```

### 2. Preload Script 검증

`electron/preload.ts`의 contextBridge 노출 API가 `src/types/ipc.ts` 타입과 일치하는지:

- 모든 IPC 채널이 preload에 등록되어 있는가
- 타입이 Main ↔ Renderer 양쪽에서 일치하는가

### 3. 데이터 흐름 검증

```
SQLite DB → IPC Handler → Preload → Renderer → Zustand Store → Component
```

각 단계에서 데이터 타입이 일관되는지 확인:
- DB 쿼리 결과 타입 ↔ IPC 응답 타입
- IPC 응답 타입 ↔ Store 타입
- Store 타입 ↔ Component Props 타입

### 4. 라우트 일관성

`src/App.tsx` 라우트 정의와 각 컴포넌트 내 `navigate()` 호출이 일치하는지:

| 라우트 | 페이지 |
|--------|--------|
| `/` | Home |
| `/patterns` | PatternLibrary |
| `/patterns/:id` | PatternDetail |
| `/guide/:workId` | GuideDialogue |
| `/preview/:workId` | Preview |
| `/workspace` | Workspace |
| `/workspace/:id` | WorkDetail |

## 실행

```bash
# 타입 체크
npx tsc --noEmit

# 테스트 실행
npx vitest run tests/integration/
```

## 출력 형식

```
## 통합 검증 결과

### IPC 채널
- ✅ pattern:get-all (Main ↔ Renderer 일치)
- ❌ work:update (Main에만 등록, Renderer 미사용)

### 타입 일관성
- ✅ Pattern 타입 (DB ↔ IPC ↔ Store ↔ UI 일치)
- ❌ GuideSession 타입 (DB 필드 누락)

### 라우트
- ✅ 7/7 라우트 일치

### 요약
일치율: X/Y (XX%)
```

## 자동 로드

### 현재 IPC 핸들러
```
$(find electron/ipc -name "*.ipc.ts" 2>/dev/null | head -20)
```

### 현재 타입 정의
```
$(find src/types -name "*.ts" 2>/dev/null | head -20)
```

$ARGUMENTS
