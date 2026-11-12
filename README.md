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

## 검증과 현재 한계

2026-11-12 KST 기준 실제 확인:

- Context Hub 0.1.4 설치·빌드·영문 검색 및 한국어 본문 조회 성공.
- 기존 MCP 서버에 SDK 클라이언트로 연결하여 검색·진입 파일·지식 파일 조회 성공.
- 임시 표식 V1 → V2 수정·재빌드 후 이전 표식 없이 최신 본문 조회 성공.
- `/tmp` 작업 디렉터리에서 절대경로 launcher로 동일 MCP 지식 조회 성공.
- 관리 Skill은 공식 validator 통과. 임시 검증 지식은 검증 후 원본과 빌드 출력에서 제거.

아직 확인되지 않은 필수 완료 조건:

- Private 원격 `https://github.com/SEONGMINY/my-context` 생성은 사용자 승인 후 완료했다. 같은 승인 범위의 초기 Commit·Push는 `.git/index.lock` 쓰기 EPERM으로 미실행 상태다. 원격에 파일이 보존됐다고 간주하지 않는다.
- 사용자 MCP 설정 및 Skill 설치: 이 세션의 사용자 디렉터리 쓰기 권한 제한.
- 실제 Codex 에이전트의 MCP 호출 및 새 세션 Skill 사용: 이 세션 안에서 실행한 앱 내 CLI와 독립 CLI가 app-server 초기화에서 EPERM. 중첩 실행 실패이며 사용자가 정상적으로 연 최상위 Codex 세션의 실패로 해석하지 않는다. 최상위 세션은 아직 미검증이다. SDK 조회는 이를 대신하는 완료 근거가 아니다.

현재 세션은 프로젝트 일반 파일 쓰기와 `.git`·사용자 설정 경로 쓰기의 권한이 다르다. Git은 실제 index.lock이 존재하지 않는 상태에서도 생성이 거부됐다. 추가 권한 요청도 현재 승인 정책에서 거부됐다. 이는 npm 패키지나 지식 파일 형식의 오류와 별개다.

Git 쓰기가 허용된 로컬 터미널 또는 세션에서 아래 명령으로 승인된 초기 반영을 재개할 수 있다. 실행 직전에 `git status`와 기존 원격을 확인하고, 다른 변경이 생겼다면 무조건 실행하지 않는다. 초기 master 브랜치와 원격 연결이 없는 현재 상태 기준이다. 실제 개인 지식·생성물·로그를 추가하지 않는다.

```sh
(
set -eu
cd /Users/leesm/work/side/my-context
npm run install:user
git add .gitignore AGENTS.md README.md content/.gitkeep package.json package-lock.json \
  scripts/build.mjs scripts/context-hub-mcp.sh scripts/install-user.mjs scripts/setup-local.mjs \
  skills/manage-dev-knowledge/SKILL.md skills/manage-dev-knowledge/agents/openai.yaml tasks/state.json
git diff --cached --stat
git commit -m "feat: set up private Context Hub knowledge system"
git remote add origin https://github.com/SEONGMINY/my-context.git
git push -u origin master
)
```

Push 성공 후 원격 Private 여부·commit SHA·파일 목록과 로컬 HEAD를 비교한다. 현재 승인 범위는 위 13개 파일의 초기 Commit·Push이며 다시 승인받을 필요는 없다. 이 절차는 현재 세션에서 실행 완료된 결과가 아니다.

위 블록은 Codex 도구 안에서 재시도하기 위한 명령이 아니라, 현재 정책이 해제되지 않을 때 Mac의 일반 터미널에서 한 번 실행하는 절차다. 실패하면 그 지점에서 중단하며 전체 블록을 무조건 반복하지 않는다. 출력 결과로 부분 성공 상태를 확인한 후 실패한 단계부터 이어간다. 설치 이후 실제 도구를 인식하는 최상위 Codex 세션에서 Task 상태를 읽고 남은 MCP·Skill 검증을 수행한다. 새로운 대화라고 권한이 정상화됐다고 가정하지 않는다.

기존 사용자 설정과 인증정보는 저장소에 복제하지 않았다. 조회 지식이 Codex 모델 컨텍스트로 전달되는 것은 공개 콘텐츠 배포와 별개다.

## 작업 재개 및 후속 범위

새 세션은 `AGENTS.md`, `tasks/state.json`, 현재 Git 상태를 읽고 차단된 단계부터 재개한다. Task 상태를 초기화하지 않는다. MCP 등록·Skill 설치 후 임시 지식으로 Codex에서 등록·수정 두 시나리오를 확인하고 정리한다.

초기 구축 이후에는 개인 지식과 현재 프로젝트를 함께 분석해 기존 CLI·Skill·템플릿으로 스캐폴딩·TypeScript·Formatter·테스트 환경을 구성하는 작은 사례 하나부터 진행한다. 별도 Runner·검색 엔진·동기화 서버는 추가하지 않는다.
