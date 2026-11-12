# my-context

Git의 일반 Markdown 지식을 기존 Context Hub 로컬 소스와 MCP로 제공한다. 사용자 요청이 있을 때 Codex가 필요한 지식을 찾아 읽는다. 현재 구현·차단·검증 상태의 정본은 `tasks/state.json`이다.

## 현재 구성

- `content/personal/lookup-<name>/knowledge.md`: 사람이 편집하는 지식 원본. 필요하면 보조 Markdown 파일을 같은 디렉터리에 추가한다.
- 같은 디렉터리의 `SKILL.md`: 검색 메타데이터와 본문 조회를 위한 짧은 진입 절차. 지식 본문을 복제하지 않는다. Context Hub는 이 항목을 `skill`로 표시하지만 개인 철학을 실행 정책으로 변환한 것이 아니다. Codex의 사용자 Skill 경로에 이 콘텐츠를 설치하지 않는다.
- `skills/manage-dev-knowledge/`: 명시적 요청에 대한 조회·변경안·승인·반영 절차만 담당하는 Codex Skill.
- `.generated/context-hub/`: `registry.json`, `search-index.json`, 콘텐츠 사본. 재생성 가능하며 Git에서 제외한다.
- `.local/`: 컴퓨터별 Node 경로와 격리된 Context Hub 설정, 임시 검증 결과. Git에서 제외한다.
- `tasks/state.json`: 이번 구축 진행 상태. 지식이나 검색 대상이 아니다.

검색은 ID·이름·설명·태그 중심이다. 한국어 본문은 보존되지만 `테스트` 직접 검색은 이번 검증에서 0건이었다. Codex가 요청을 `testing` 같은 관련 영문 검색어로 바꿔 조회한다. 본문 의미 검색과 문단 단위 검색은 제공하지 않는다. 필요한 파일만 `file`로 읽는다.

## 설치 및 다른 컴퓨터에서 재현

Node 18 이상과 로컬 Codex가 필요하다. 이 저장소를 Private 원격에서 clone/pull한 다음 저장소 루트에서 실행한다.

```sh
npm ci
npm run setup
npm run build
npm run install:user
```

`setup`은 현재 Node 실행 파일의 절대경로와 로컬 소스 경로를 `.local/`에 기록한다. Node 또는 저장소 위치를 바꾸면 다시 실행한다. 사용자 전체 `~/.chub` 설정은 건드리지 않는다. 로컬 소스만 설정하며 텔레메트리와 피드백을 비활성화한다. 공개 CDN에 업로드하거나 공개 배포하지 않는다.

`install:user`는 다음 두 항목만 추가한다.

1. `${CODEX_HOME:-~/.codex}/config.toml`의 `[mcp_servers.personal-knowledge]`: 기존 `chub-mcp` 실행 파일을 호출하는 로컬 launcher. 노출 도구는 `chub_search`, `chub_get`, `chub_list`로 제한한다.
2. `~/.agents/skills/manage-dev-knowledge`: 이 저장소의 관리 Skill을 가리키는 링크.

기존 서버 설정이나 같은 이름의 다른 Skill은 덮어쓰지 않고 중단한다. 권한이 필요하면 권한이 허용된 로컬 세션에서 이 설치 단계를 재개한다. 위험한 sandbox 해제 옵션을 사용하지 않는다. 원격 Git 동기화만으로 다른 컴퓨터의 Node·MCP·Skill이 설치되지는 않는다.

`npm run install:user -- --check`는 쓰기 없이 두 대상의 충돌과 추가 예정 항목을 확인한다. 설치는 두 대상을 먼저 확인하고, 이미 동일하게 설치된 항목은 유지한다. 권한 문제로 일부만 설치됐다면 같은 명령으로 나머지부터 재개한다.

설치 후 새 로컬 Codex 세션에서 연결 및 Skill 발견 여부를 확인한다. CLI라면 `codex mcp list`, 세션에서는 `/mcp`로 연결 정보를 보고, 실제 요청으로 도구가 호출되는지 확인한다. 목록 표시만으로 조회 성공이라고 판단하지 않는다. 현재 대화의 도구 목록에 새 연결이 즉시 나타난다고 가정하지 않는다.

## 사용

```text
Context Hub에서 내 테스트 관련 지식을 찾아서 참고해 줘.
이 내용을 내 개발 지식에 등록해 줘.
기존 테스트 관련 지식을 수정해 줘.
```

확실하게 절차를 지정하려면 Codex에서 `$manage-dev-knowledge`를 언급한다. 관리 Skill의 이름·설명만 발견 시 제공되고 상세 절차는 필요할 때 읽는다. 사용자 범위 AGENTS.md에 긴 개인 지식이나 같은 절차를 복제하지 않는다. 일반 개발 작업에서 개인 지식을 자동 조회하지 않는다.

실제 등록·수정은 기존 지식 확인 → 중복·충돌 검토 → diff와 Git 범위 제시 → 승인 → 승인 파일 반영 → Commit/Push → build → MCP 최신 조회 순서다. 개인 지식과 기존 프로젝트 규칙이 충돌하면 프로젝트 계약을 우선한다.

## 콘텐츠 예시

아래는 형식 설명이며 실제 개인 취향이 아니다. 새 지식은 사용자 승인을 받은 후 작성한다.

`content/personal/lookup-<name>/SKILL.md`:

```markdown
---
name: lookup-<name>
description: Retrieve reference knowledge about <English search keywords>.
metadata:
  source: community
  tags: "<English keyword>,<English keyword>"
---

이 항목은 참고 자료 조회 진입점이다. 실제 지식 본문은 knowledge.md에 있다.
chub_get에 이 ID와 file: "knowledge.md"를 지정해 조회한다.
```

같은 디렉터리의 `knowledge.md`에 승인된 일반 Markdown 본문을 작성한다. 이름은 고유하게 선택하고 `description`과 태그에 실제 검색에 필요한 영문 키워드만 둔다. 지식 내용은 거대한 JSON 정책으로 바꾸지 않는다. 메타데이터 `community`는 도구의 출처 분류이고 공개 배포 여부와 관계없다.

## 검색 및 갱신

저장소 루트에서 CLI로 확인할 수 있다.

```sh
npm run build
npm run search -- testing --json
npm run get -- personal/lookup-<name> --file knowledge.md
```

빌드는 이 프로젝트가 생성한 `.generated/context-hub`만 비운 뒤 재생성한다. 실패 시 원본과 Git 상태는 보존되며 빌드를 수정해 재실행해야 한다. `content/` 밖의 Task·설정·관리 Skill은 포함하지 않는다. 콘텐츠 폴더 안에는 지식으로 제공할 파일만 둔다. Context Hub는 콘텐츠 디렉터리의 모든 파일을 사본에 포함하므로 비밀키나 인증 파일을 넣지 않는다.

MCP는 레지스트리를 메모리에 유지하므로 항목 추가·삭제·검색 메타데이터 변경 뒤에는 서버 연결을 재시작하거나 새 Codex 세션으로 확인한다. 동일 파일 본문 수정은 이번 검증에서 같은 서버 연결의 재조회에도 최신 내용이 반영됐다. 운영 절차는 빌드 후 연결을 새로 열고 검색·본문을 모두 확인하는 것으로 통일한다. `chub update`를 로컬 원본 재빌드 명령으로 쓰지 않는다.

작업 결과는 `로컬 수정 / Commit / Push / build / MCP 최신 조회` 다섯 단계로 구분한다. 일부 실패 시 그 단계부터 재개한다. Push 실패를 전체 완료로 보고하지 않는다. 생성물은 커밋하지 않고 승인받은 원본·설정 파일만 명시적으로 stage한다. Force Push와 hard reset은 사용하지 않는다.

## 검증 결과 및 남은 확인

2026-11-12 KST 기준. 상세 근거와 완료 판정의 정본은 `tasks/state.json`이다.

| 항목 | 상태·근거 |
| --- | --- |
| T03 Private Git | 완료. 초기 Commit `2e6758fbe7b9f5c77c5d34a52d3a0f9447db910f`와 승인된 13개 파일 보존. |
| T05 실제 Codex MCP·최신화 | 완료. 기존 list/search/get, V1→V2 및 다른 프로젝트 조회 성공 근거 보존. |
| 사용자 범위 Skill 발견·명시 호출 | 완료. 현재 로컬 Codex host 목록에 사용자 Skill 노출, 선택 attachment의 본문 로드 및 정상 선택 후 본문 읽기·실제 MCP 조회 확인. |
| 자연어 자동 적용 | 완료. `pair`의 별도 새 대화에서 이름 없는 개인 지식 요청 → Skill 선택 선언 → 사용자 경로의 본문 읽기 → 실제 MCP 검색·조회 확인. |
| 일반 개발 비적용 | 완료. 별도 새 대화의 TypeScript 배열 질문에 답변. 관리 Skill 로드·MCP 호출 없음. |
| 다른 프로젝트 Skill 재사용 | 완료. `pair`에서 사용자 Skill 경로의 명시 호출·본문 읽기·MCP 조회 확인. 해당 프로젝트에 Skill 복제 없음. |
| 신규 등록·기존 수정 승인 경계 | 각각 통과. 임시 자료 검색·중복 검토·별도 Markdown diff·승인 요청 확인. 신규 파일 미생성, 기존 V2 두 파일 SHA-256 불변. |
| 승인 후 로컬 반영·최신화 | 완료. 지연 도착한 명시 승인 후 신규 등록·기존 수정 각각 반영 → build 0 docs/2 skills → 새 실제 MCP 검색·진입·본문 확인. 임시 파일 Commit/Push는 승인 범위에서 제외. |
| T07 임시 정리 | 완료. 기존 V2 및 승인된 신규 임시 자료 총 네 파일 정리·build 0 docs/0 skills. 최종 새 실제 MCP 목록·두 검색 0건 및 두 ID 진입·본문 Entry not found 확인. content/.gitkeep 보존. |
| 최종 Git | README·상태 파일만 로컬 Commit. 새로운 원격 Push는 별도 승인 대기. |

### 실행 환경과 발견 근거

기존 ChatGPT Work executor/cloud의 `skill package is not available`은 해당 provider의 결과였다. 현재 로컬 Codex에서는 host가 제공한 사용자 Skill 목록과 선택된 본문이 모두 확인됐다. 설치·링크·메타데이터를 바꾸지 않고 동작했다. 따라서 과거 provider 오류를 로컬 설치 실패로 보지 않는다. 과거 노출 차이의 제품 내부 원인은 확정하지 않았다.

사용자 검색 위치와 심볼릭 링크에 대한 [공식 Skill 문서](https://developers.openai.com/codex/skills)를 참고할 수 있다. 실제 검증은 문서상의 지원 여부와 별도로 도구 기록으로 확인했다. 저장소 파일을 목록 발견 없이 직접 읽은 과거 진단과 정상 선택 후 본문을 읽은 현재 검증을 구분한다.

독립 검증은 `/Users/leesm/work/side/pair`에서 수행했다. 자연어 요청은 “내 개인 개발 지식에서 테스트 관련 방법론을 찾아서 참고해 줘.”, 비적용 요청은 “TypeScript에서 배열 중복을 제거하는 함수를 설명해 줘.”였다. 각 대화 ID와 실제 본문 읽기·MCP 호출 근거는 상태 파일의 `verification_pending.fresh_local_threads`에 있다. 임시 검증 자료를 실제 방법론으로 채택하지 않은 응답도 확인했다.

### 정리 및 Git 범위

검증에는 `content/personal/lookup-validation/`과 `content/personal/lookup-approval-validation/`의 `SKILL.md`, `knowledge.md` 네 파일만 사용했다. 최초 정리 후 지연 도착한 승인에 따라 기존 V2 기준본을 이전 해시와 일치하게 복원하고 두 제안을 반영했다. V2 표식 보존·승인 설명 추가·신규 본문을 새 실제 MCP에서 확인했다. 이후 네 임시 파일만 제거하고 재빌드했다. 또 다른 새 실제 MCP에서 두 항목의 검색·목록·진입·본문 부재를 확인했다. 실제 개인 지식은 변경하지 않았다.

최종 Commit 대상은 `README.md`, `tasks/state.json` 두 경로다. 임시 자료·생성물·인증정보·무관한 사용자 변경은 포함하지 않는다. 과거 stage EPERM은 이전 실행 정책의 기록이다. 현재 로컬 실행 정책에서는 최종 diff 검토 후 두 파일만 Commit한다. 원격 Push는 별도 승인 대기다.

## 작업 재개 및 후속 범위

새 세션은 `AGENTS.md`, `tasks/state.json`, 현재 Git 상태를 읽고 남은 단계부터 재개한다. T01~T06 완료 근거와 사용자 변경을 보존한다. 설치·Git 초기 보존·MCP·Skill 검증을 반복하지 않는다. T07 정리는 완료됐다. `final_git`에서 새 원격 Push 승인과 원격 일치 확인부터 이어간다.

초기 구축 이후에는 개인 지식과 현재 프로젝트를 함께 분석해 기존 CLI·Skill·템플릿으로 스캐폴딩·TypeScript·Formatter·테스트 환경을 구성하는 작은 사례 하나부터 진행한다. 별도 Runner·검색 엔진·동기화 서버는 추가하지 않는다.
