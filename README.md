# my-context

my-context는 여러 프로젝트에서 쓸 개발 원칙과 에이전트 작업 절차를 모아 둔 저장소예요. 자산 원본은 GitHub에서 관리하고, **MCP에서 필요한 내용을 조회하거나** 자주 쓰는 Skill을 로컬에 설치할 수 있어요.

> **공개 범위:** 이 GitHub 저장소는 현재 공개(`public`) 상태예요. 커밋된 개인 지식은 GitHub에서 누구나 읽을 수 있고, Cloudflare Access 인증은 **운영 MCP 접속**에 적용돼요. 비공개 정보는 원본에 커밋하기 전에 공개 범위를 확인해 주세요.

## 포함된 항목

| 항목 | 언제 쓰나요? | 사용 경로 |
| --- | --- | --- |
| [`development-workflow`](skills/development-workflow/SKILL.md) | 요구사항을 정리하고 작업을 나눌 때. 변경을 검증하거나 작업을 인계할 때. | [MCP로 사용](#개발-workflow-사용하기) · [선택적 설치](#자주-사용한다면-설치하기) |
| [`domain-storytelling`](skills/domain-storytelling/SKILL.md) | 인터뷰로 현재 업무를 파악하고 개선 범위와 요구사항을 정리할 때. | [워크숍 양식](skills/domain-storytelling/templates/workshop-documents.md) · MCP 배포 대상 |
| [`extract-development-insights`](skills/extract-development-insights/SKILL.md) | 개발 대화의 사용자 발언·결정·대안을 분석해 재사용할 원칙 후보를 찾을 때. | MCP 배포 대상 · 읽기 전용 |
| [Implementation Strategy](content/personal/lookup-implementation-strategy/knowledge.md) | 기존 코드·책임·인터페이스를 검토해 구현 방향을 결정할 때 | 독립 지식 · MCP 조회 |
| [Execution Strategy](content/personal/lookup-execution-strategy/knowledge.md) | 작업·맥락 의존성, 실행 방식과 정보 공유의 적합성을 판단할 때 | 독립 지식 · MCP 조회 |
| [Roadmap Planning](content/personal/lookup-roadmap-planning/knowledge.md) | 단기 구현과 이후 확장 조건을 구분할 때 | 독립 지식 · MCP 조회 |
| [Context-aware Reasoning](content/personal/lookup-context-aware-reasoning/knowledge.md) | 요구사항·설계·계획 등 질문에 적절한 판단 기준을 선택할 때 | 독립 지식 · MCP 조회 |
| [Risk Management](content/personal/lookup-risk-management/knowledge.md) | 계획의 실패 가능성과 위험 대응을 검토할 때 | 독립 지식 · MCP 조회 |
| [Preventive Engineering](content/personal/lookup-preventive-engineering/knowledge.md) | 장기적인 재발 방지와 구조적 통제의 필요성을 검토할 때 | 독립 지식 · MCP 조회 |
| [테스트 작성 원칙](content/personal/lookup-testing-principles/knowledge.md) | 무엇을 테스트할지 정하고 테스트 결과가 실제 동작을 보여주는지 검토할 때. | GitHub에서 읽기 · MCP 배포 대상 |
| [`manage-dev-knowledge`](skills/manage-dev-knowledge/SKILL.md) | 이 저장소에 지식을 추가하거나 수정할 때. | 저장소 내 관리 Skill |

## 시작하기

| 목적 | 사용 경로 |
| --- | --- |
| 개인 원칙·게시된 공통 Skill 조회 | 원격 `my-context` MCP |
| development-workflow 네이티브 호출 | [선택적 로컬 설치](#자주-사용한다면-설치하기) |
| 관련 개인 원칙·공통 Skill의 선택적 자동 활용 | MCP + [사용자 범위 정책](docs/LOCAL-SETUP.md#선택적-조회-정책) |
| 개인 지식 관리 | 저장소 원본 + [관리 Skill](#개인-개발-지식-관리) |

원격 MCP는 게시된 개인 지식과 공통 Skill을 제공해요. 로컬 관리 MCP(`personal-knowledge`)는 현재 작업 디렉터리의 `content/`만 빌드하며, 원격 Worker의 한국어 보완 검색과 배포 리비전 응답을 보장하지 않아요.

### my-context MCP 연결하기

원격 MCP만 사용한다면 Skill 설치나 저장소 클론은 필요 없어요. 운영자가 허용한 이메일로 로그인해야 해요. [사용자 추가](docs/DEPLOYMENT.md#운영-사용자-추가)

1. Codex에서 연결해 주세요.

   ```bash
   codex mcp add my-context --url https://minylee.my-context.workers.dev/mcp
   ```

2. 브라우저에서 로그인해 주세요. 로그인 안내가 없다면 `codex mcp login my-context`를 실행해 주세요.
3. 새 세션에서 "my-context의 `chub_list`를 호출해줘"라고 요청해 연결을 확인해 주세요.

Pi나 Claude Code는 해당 버전의 연결·인증 절차를 따르고 실제 도구 호출로 확인해 주세요. [환경별 검증](test/workflow-evaluation.md)

### 작업에 맞는 자산 활용하기

```text
my-context 사용해서 구현 방향을 검토해줘.
# 특정 자산을 지정해도 돼요.
my-context에서 Implementation Strategy 원칙을 찾아 적용해줘.
```

자산 이름을 모르더라도 관련 원칙과 Skill을 찾아 필요한 내용만 읽도록 안내해요. 개인 원칙은 Workflow 없이도 요구사항 분석·설계·로드맵 검토 등에 사용할 수 있어요. 기본적으로 명시적 요청 시에만 읽어요. 관련 지식과 공통 Skill의 자동 활용을 원하면 [선택적 조회 정책](docs/LOCAL-SETUP.md#선택적-조회-정책)을 직접 활성화해 주세요. 기존 정책 사용자는 변경된 범위를 확인하고 다시 활성화해 주세요. 간단하거나 관련 없는 작업에서는 조회하지 않도록 안내하며 실제 자동 호출은 Host에 따라 달라요.

이 정책은 에이전트의 행동 지침이며 서버의 접근 제어와는 달라요. 조회는 지식 변경·설치·배포를 승인하지 않으며 현재 프로젝트의 규칙과 사용자 지시를 우선해요.

### 개발 Workflow 사용하기

```text
my-context에서 development-workflow를 찾아 이번 프로젝트에 적용해줘.
필요한 참조만 읽고 새 Skill은 설치하지 마.
```

MCP에서 읽은 지침을 현재 작업에 적용하는 것과 로컬 Skill 설치는 달라요.

### 자주 사용한다면 설치하기

네이티브 호출이 필요하다면 `development-workflow`를 사용자 범위에 설치할 수 있어요. 저장소를 클론하고 [지원 환경 및 설치 안내](docs/LOCAL-SETUP.md#workflow-skill)에 따라 설치해 주세요. 다른 공통 Skill에는 전용 설치기가 없으며 관리 Skill은 별도 설치 경로를 사용해요. 로컬 Skill 설치가 MCP를 자동 연결하지는 않아요.

### 다른 자산 사용하기

```text
my-context의 domain-storytelling을 사용해 현재 업무 흐름을 정리해줘.
```

```text
my-context의 extract-development-insights로 이번 개발 대화의
내 발언·대안·실제 결정을 구분하고 원칙 후보를 찾아줘. 저장하지 마.
```

인사이트 추출은 해당 분석을 명시적으로 요청했을 때만 수행해요. 일반적인 my-context 활용 요청이나 자동 활용 설정만으로는 인사이트 추출을 시작하지 않아요. 지식 변경은 별도 관리 절차를 따라요.

## 개인 개발 지식 관리

원격 MCP는 읽기 전용이에요. 지식을 등록·수정·삭제하려면 저장소 원본과 [관리 Skill](skills/manage-dev-knowledge/SKILL.md)의 승인 절차를 사용해 주세요. 이 Skill은 원격 게시 대상이 아니에요. Codex의 로컬 관리 MCP와 관리 Skill은 [로컬 관리 환경](docs/LOCAL-SETUP.md#로컬-관리-환경)에서 준비할 수 있어요.

## 조회와 배포

원격 MCP의 `chub_search`·`chub_list`는 자산을 찾고 역할(`role`)과 배포 `revision`을 반환해요. 조회에 해당 `revision`을 전달하면 배포 불일치를 감지할 수 있어요. `chub_get`은 기본 진입 파일만 읽으므로 개인 원칙 본문은 `file: knowledge.md`, 추가 참조는 해당 자산 내 파일 경로로 조회해요. `full: true`는 모든 첨부가 필요할 때만 사용해 주세요. 한국어 검색 결과가 없다면 영문 키워드도 시도해 보세요.

로컬 Skill은 작업 디렉터리의 내용을 사용하고 원격 MCP는 배포된 Git 커밋을 사용해요. 검색·조회가 실패하면 연결, 인증, 게시 여부를 확인하고 사용에 성공했다고 가정하지 마세요. [운영 배포 및 리비전 확인](docs/DEPLOYMENT.md#배포-확인)
