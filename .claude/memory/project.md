# SkillForge 프로젝트

## 개요
Claude Code의 스킬, 에이전트, 오케스트레이션 패턴을 수집/분석/생성하는 개인용 Electron 데스크톱 도구

## 기술 스택
- Electron + React 18 + TypeScript (strict)
- electron-vite (빌드)
- Tailwind CSS (다크 테마)
- Zustand (상태관리)
- SQLite (better-sqlite3, WAL 모드)
- Claude CLI (child_process.spawn 스트리밍)
- Vitest + RTL + Playwright (Electron 모드)

## 핵심 화면 (7개)
1. Home - 대시보드, 통계, 최근 작업물
2. Pattern Library - 패턴 목록, 검색/필터
3. Pattern Detail - 패턴 상세, 분석, 내보내기
4. Guide Dialogue - 5단계 가이드 대화, Claude 연동
5. Preview & Generate - 파일 트리, 에디터, 내보내기
6. Workspace - 작업물 관리
7. Work Detail - 작업물 상세, 파일 편집

## DB 테이블 (6개)
patterns, tags, pattern_tags, works, work_files, guide_sessions

## IPC 채널 형식
`domain:action` (예: pattern:get-all, claude:send-message)
