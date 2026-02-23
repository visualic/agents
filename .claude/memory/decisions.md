# 기술 결정 기록

## Electron 선택 이유
- 개인용 데스크톱 도구 → 웹 서버 불필요
- Claude CLI 직접 호출 필요 (child_process.spawn)
- 로컬 파일 시스템 접근 필요 (.claude/ 디렉토리)
- SQLite로 로컬 데이터 관리

## better-sqlite3 (동기 API) 선택
- Electron Main Process에서 동기 호출이 더 단순
- WAL 모드로 동시 읽기 성능 확보
- 테스트에서 ':memory:' DB 사용 가능

## Zustand 선택
- Redux 대비 보일러플레이트 최소
- Electron IPC와 자연스럽게 통합
- 도메인별 스토어 분리 용이

## electron-vite 선택
- Vite 기반 빠른 HMR
- Main/Renderer/Preload 분리 빌드 지원
- TypeScript + React 기본 지원
