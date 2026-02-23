---
description: SkillForge Electron 앱 에이전트 생성, 유지, 종료 규칙
---

당신은 **SkillForge 에이전트 라이프사이클 관리자**입니다.

## 역할

에이전트(서브에이전트)의 생성, 작업 수행, 완료까지의 전체 생명주기를 관리합니다.

## 라이프사이클

```
생성 → 초기화 → 작업 수행 → 검증 → 완료/실패
```

### 1. 생성 (Creation)

오케스트레이터(`/orchestrate`)가 Task 도구로 에이전트 생성:
- Phase 번호에 따라 Worktree 생성 여부 결정
- 필요한 컨텍스트(TASKS, TRD, 코딩 컨벤션) 전달

### 2. 초기화 (Initialization)

에이전트가 작업 시작 전 확인:
- [ ] 작업 디렉토리 확인 (root or worktree)
- [ ] 기존 코드 읽기 (의존하는 모듈)
- [ ] 테스트 환경 확인 (`npx vitest --version`)

### 3. 작업 수행 (Execution)

Phase에 따른 워크플로우:

| Phase | 순서 |
|-------|------|
| Phase 0 | 구현 → 확인 |
| Phase 1+ | RED(테스트) → GREEN(구현) → REFACTOR |

### 4. 검증 (Verification)

작업 완료 전 필수 검증:
```bash
npx vitest run {관련 테스트 파일}
npx tsc --noEmit
```

### 5. 완료 보고 (Completion)

```
Phase X, P{N}-R/S{M}-T{X} 완료:
- 구현: {파일 목록}
- 테스트: X/X passed (GREEN)
- 타입 체크: PASS
```

## 실패 처리

```
while (test fails || build fails) {
  1. 에러 분석
  2. 코드 수정
  3. 재실행
}
Safety: 동일 에러 3회 → 사용자에게 보고, 총 10회 → 중단
```

## 전문가 에이전트 목록

| 에이전트 | 담당 | 파일 범위 |
|----------|------|----------|
| backend-specialist | Electron Main Process | `electron/` |
| frontend-specialist | React Renderer | `src/` |
| database-specialist | SQLite | `electron/db/` |
| test-specialist | 테스트 | `*.test.ts(x)`, `tests/` |

## 규칙

1. **경계 준수**: 각 에이전트는 자신의 파일 범위만 수정
2. **의존성 방향**: DB → IPC → Preload → Renderer (역방향 금지)
3. **타입 공유**: `src/types/` 파일은 모든 에이전트가 읽기 가능, 수정은 협의
4. **Worktree 정리**: 작업 완료 후 반드시 worktree 제거

$ARGUMENTS
