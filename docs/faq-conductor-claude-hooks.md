# Conductor + Claude Code Hook FAQ

작성일: 2026-02-24  
대상: 비개발자/운영자 관점에서 Conductor 오케스트레이션, 스킬, 에이전트, 훅 이해

## Q0. 오케스트레이션은 실제로 어떻게 하나요?
A. Conductor에서는 "2레벨 오케스트레이션"으로 이해하면 가장 쉽습니다.

Level 1: 사람이 워크스페이스를 조율(수동)
- 기능별로 워크스페이스를 나눕니다. 예: 로그인, 대시보드, 결제
- 각 워크스페이스는 독립 브랜치/독립 에이전트로 병렬 작업합니다.
- 사람은 Diff Viewer와 PR로 결과를 확인/머지합니다.

Level 2: 에이전트가 서브에이전트를 조율(자동)
- 한 워크스페이스 안에서 메인 에이전트가 "감독" 역할을 맡습니다.
- `.claude/commands/orchestrate.md` 같은 슬래시 커맨드(스킬)로 작업을 분해하고 전문가를 호출합니다.
- 예: DB → Backend/Frontend 병렬 → Test 순서로 진행

핵심 원칙:
- 오케스트레이터는 코드를 직접 쓰기보다 `분해(Decompose) → 배정(Dispatch) → 검증(Verify)`에 집중
- 독립 작업은 병렬, 의존 작업은 순차로 배치

## Q0-1. 오케스트레이터는 어떻게 만들고 쓰나요?
A. 최소 구성은 아래 3단계입니다.

1. 오케스트레이터 커맨드 파일 생성
- 위치: `.claude/commands/orchestrate.md`
- 내용: 작업 분석, 계획(Plan), 실행(Task), 검증 흐름 정의

2. 전문가 에이전트 준비
- 위치: `.claude/agents/*.md`
- 예: `frontend-specialist`, `backend-specialist`, `database-specialist`, `test-specialist`

3. 채팅에서 실행
- `/orchestrate 사용자 프로필 페이지 구현`
- 메인 에이전트가 작업을 쪼개어 전문가에게 자동 위임

## Q0-2. 서브에이전트에게 일을 잘 시키려면?
A. 지시문 품질이 결과 품질을 좌우합니다.

좋은 지시문에 포함할 것:
- 정확한 파일 경로
- 참고할 기존 파일/패턴
- 입출력 스펙(API 응답 형태 등)
- 스타일/컴포넌트 재사용 규칙
- 라우팅/테스트/검증 조건

한 줄 요약:
- "프로필 만들어줘"보다
- "어느 파일에, 어떤 패턴으로, 무엇을 검증해 완료할지"를 명확히 전달해야 합니다.

## Q0-3. 가장 강력한 운영 패턴은?
A. Level 1 + Level 2를 함께 쓰는 방식입니다.

- 워크스페이스 단위로 큰 기능을 분리(Conductor 레벨)
- 각 워크스페이스 내부에서 `/orchestrate`로 전문가 병렬 분업(Claude Code 레벨)

결과:
- 기능 간 충돌은 줄고
- 기능 내부 개발 속도는 빨라지며
- 검증 루프까지 자동화하기 쉬워집니다.

## Q1. Conductor에 최적화된 하네스를 만들 때, hook 기능도 쓸 수 있나요?
A. 네, 가능합니다. 다만 구분이 필요합니다.

- Conductor 자체 문서 기준으로는 별도의 "Conductor Hook API"보다는 `setup/run/archive` 스크립트와 워크스페이스 오케스트레이션이 중심입니다.
- 사용자가 말한 hook이 **Claude Code hooks**라면, Conductor에서 Claude Code를 실행할 때 그대로 활용할 수 있습니다.

정리하면:
- Conductor 바깥 오케스트레이션: 워크스페이스/브랜치/병렬 실행 관리
- Claude Code 내부 제어: hooks로 이벤트 기반 정책/검수 자동화

## Q2. "내가 말한 hook은 클로드 코드 hook"이라면 답이 달라지나요?
A. 네. 이 경우 답은 "사용 가능"이 명확합니다.

- hook 설정 파일(`~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`)을 통해 동작시킬 수 있습니다.
- `/hooks` 관련 설정 흐름도 Claude Code 환경에서 동일하게 적용됩니다.
- Conductor의 Codex 탭과는 별개 기능입니다. 즉, **Claude Code를 쓸 때의 hook**입니다.

## Q3. hook을 비개발자 눈높이로 한 문장으로 설명하면?
A. "에이전트가 특정 순간마다 반드시 통과해야 하는 자동 심사 규칙"입니다.

비유:
- 오케스트레이션: 지휘자
- 서브에이전트: 연주자
- 훅: 무대 안전요원/품질감독

## Q4. 오케스트레이션, 서브에이전트, hook은 서로 어떻게 상호작용하나요?
A. 역할 분리가 핵심입니다.

- 오케스트레이션: 누가 어떤 일을 언제 할지 배분
- 서브에이전트: 배정된 일을 실제 수행
- hook: 수행 과정과 완료 시점을 자동 검사/차단/승인

실제 상호작용:
- `PreToolUse`: 위험 명령 사전 차단
- `PostToolUse`: 변경 직후 빠른 품질 점검
- `TaskCompleted`: 완료 처리 직전 품질 게이트
- `TeammateIdle`: 팀원이 쉬기 직전 미완료/품질 미달 확인

## Q5. 인간 개입 없이 자율적으로 팀이 일하게 만들 수 있나요?
A. 가능합니다. 다만 "완전 무인화"는 품질/안전 정책 설계가 먼저입니다.

필수 조건:
- 위험 작업 차단 규칙(안전 훅)
- 완료 기준(Definition of Done) 명문화
- 완료 직전 강제 검수(품질 훅)
- 팀 유휴 전 잔여 작업 확인(팀 훅)

## Q6. 비개발자용 3단계 무인 하네스 템플릿은 무엇인가요?
A. 아래 3개를 순서대로 깔면 됩니다.

1. 안전 훅(Safety Gate)
- 목적: 사고 예방
- 대표 이벤트: `PreToolUse`, `PermissionRequest`
- 기능: 위험 명령/민감 경로 수정 차단

2. 품질 훅(Quality Gate)
- 목적: 동작하는 결과만 통과
- 대표 이벤트: `PostToolUse`, `Stop`
- 기능: 테스트/린트/체크리스트 검증

3. 팀 훅(Team Gate)
- 목적: 팀 단위 완료 기준 강제
- 대표 이벤트: `TaskCompleted`, `TeammateIdle`
- 기능: 품질 미달이면 완료/idle 차단

## Q7. 자율화된 에이전트 팀의 "작업 결과 품질 검수 로직"은 어떻게 설계하나요?
A. 아래 5단계 파이프라인이 실무적으로 가장 안정적입니다.

1. Task별 완료 기준(DoD) 정의
- 테스트 통과
- 린트 통과
- 변경 요약
- 리스크/롤백 포인트 기록

2. 작업 중간 자동 검사
- 코드 변경 이벤트에서 빠른 검사 실행
- 결과를 공용 상태 파일(예: `.context/quality/*.json`)에 저장

3. `TaskCompleted` 강제 게이트
- 완료 직전에 테스트/린트/문서화 상태 재확인
- 실패 시 구체적 피드백 후 `exit 2`로 완료 차단

4. `TeammateIdle` 강제 게이트
- 유휴 전, 본인 미해결 작업/품질 실패 여부 점검
- 미충족 시 `exit 2`로 idle 차단

5. 리드 에이전트 재지시 루프
- "무엇이 실패했고, 다음에 무엇을 할지 1개 액션"만 명확히 재할당
- 반복하여 사람 개입 없이 품질 루프를 닫음

## Q8. 운영 시 주의할 점은?
A. 아래 4가지는 꼭 지켜야 합니다.

- 훅 스크립트는 짧고 재실행 안전(idempotent)하게 작성
- `Stop` 훅은 무한 루프 방지 조건 포함
- `async` 훅은 차단이 아니라 알림/비동기 검사 용도
- 훅은 사용자 권한으로 실행되므로 보안 규칙을 먼저 설계

## Q9. 지금 바로 적용할 최소 체크리스트는?
A. 다음 6개만 먼저 하세요.

- `.claude/settings.json`에 hook 기본 골격 추가
- `PreToolUse` 안전 차단 스크립트 1개
- `TaskCompleted` 품질 게이트 스크립트 1개
- `TeammateIdle` 잔여 작업 점검 스크립트 1개
- `.context/quality/` 상태 파일 규약 정의
- 실패 메시지 포맷 통일(누가 봐도 다음 액션이 보이게)

---

## 참고 링크
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/hooks-guide
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/agent-teams
- https://code.claude.com/docs/en/skills
- https://docs.conductor.build/core/checkpoints
