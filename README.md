# my-context

my-context는 여러 프로젝트에서 쓸 개발 원칙과 AI 에이전트의 공통 작업 절차를 관리하는 저장소예요. 원본은 GitHub에 두고, 필요한 자산은 MCP로 찾아 읽거나 일부 Skill을 로컬에 설치해 활용할 수 있어요.

프로젝트나 에이전트가 바뀔 때마다 같은 판단 기준을 다시 설명하지 않고, **필요한 순간에 관련 원칙과 절차를 꺼내 쓸 수 있도록** 만들었어요. 실제 구현과 검증은 각 프로젝트에서 수행해요.

> **공개 범위:** 이 저장소는 현재 공개(`public`) 상태예요. GitHub에 커밋한 개인 지식은 누구나 볼 수 있어요. Cloudflare Access는 운영 MCP 접속만 제한하므로 비공개 정보는 커밋 전에 확인해 주세요.

## 이런 상황에서 사용해요

| 상황 | 활용 예시 |
| --- | --- |
| 구현 방향을 결정할 때 | 기존 코드와 계약을 확인하고 구현 대안을 비교 |
| 작업이 복잡할 때 | 요구사항·의존성·병렬화·검증·인계 방식 검토 |
| 코드 품질을 점검할 때 | 책임 배치, 이름, 입출력과 테스트 기준 검토 |
| 경험을 다음 작업에도 활용할 때 | 개발 대화에서 재사용할 원칙 후보 추출 |

예를 들어 이렇게 요청할 수 있어요.

```text
my-context를 사용해서 현재 구현 방향을 검토해줘.
```

에이전트는 허용된 범위에서 관련 자산을 찾고 필요한 내용을 읽은 다음, **현재 프로젝트의 요구사항과 코드를 우선해** 판단해요. 모든 원칙이나 Workflow를 매번 적용하지는 않아요.

## 시작하기

원격 MCP로 조회하려면 저장소를 클론하거나 Skill을 설치할 필요는 없어요. 운영자가 허용한 이메일로 로그인해야 해요.

1. Codex에 MCP를 연결해 주세요.

   ```bash
   codex mcp add my-context --url https://minylee.my-context.workers.dev/mcp
   ```

2. 브라우저에서 로그인해 주세요. 로그인 안내가 없다면 `codex mcp login my-context`를 실행해 주세요.
3. 새 세션에서 `my-context의 chub_list를 호출해줘`라고 요청해 실제 연결을 확인해 주세요.
4. 작업에 맞게 요청해 주세요.

   ```text
   my-context에서 Implementation Strategy 원칙을 찾아 적용해줘.
   my-context의 domain-storytelling으로 현재 업무 흐름을 정리해줘.
   my-context의 extract-development-insights로 이번 대화에서 원칙 후보를 찾아줘. 저장하지 마.
   ```

Pi나 Claude Code는 사용하는 버전에 맞게 MCP를 연결·인증하고 실제 조회로 확인해 주세요. [환경별 검증 안내](test/workflow-evaluation.md)

**기본적으로 개인 자산은 명시적으로 요청했을 때 조회해요.** 관련 원칙과 공통 Skill을 AI가 선택적으로 자동 활용하길 원하면 [선택적 조회 정책](docs/LOCAL-SETUP.md#선택적-조회-정책)을 직접 활성화해 주세요. MCP 연결이나 로컬 Skill 설치만으로 자동 활용에 동의한 것은 아니에요. 조회는 지식 변경·설치·배포의 승인이 아니며, 사용자 지시와 프로젝트 규칙을 우선해요.

## 어떤 자산이 있나요?

| 자산 | 역할 | 살펴보기 |
| --- | --- | --- |
| 개인 개발 원칙 | 구현·설계·실행·위험·테스트 등에 관한 판단 기준 | [개인 원칙](content/personal/lookup-implementation-strategy/knowledge.md) |
| 공통 Skill | 여러 프로젝트에서 재사용하는 작업 절차 | [개발 Workflow](skills/development-workflow/SKILL.md), [도메인 스토리텔링](skills/domain-storytelling/SKILL.md), [인사이트 추출](skills/extract-development-insights/SKILL.md) |
| 활용 정책 | 자산을 언제, 어떤 동의 범위에서 조회할지 결정 | [자산 활용 정책](policies/asset-usage.md) |
| 지식 관리 | 개인 지식의 조회와 승인된 등록·수정·삭제 절차 | [관리 Skill](skills/manage-dev-knowledge/SKILL.md) |

개인 원칙은 Workflow 없이도 사용할 수 있어요. 원격 MCP는 게시된 개인 원칙과 공통 Skill을 **읽기 전용**으로 제공해요. 지식 변경은 원본 저장소와 관리 절차를 통해 진행하며, 관리 Skill은 원격에 게시하지 않아요.

## 더 알아보기

- [로컬 설정](docs/LOCAL-SETUP.md) — 사용자 범위 정책, 로컬 MCP, 네이티브 Workflow Skill 설치
- [개인 지식 관리](skills/manage-dev-knowledge/SKILL.md) — 지식 조회와 승인된 변경 절차
- [제품 비전](docs/VISION.md) · [출발점이 된 문제](docs/PROBLEM.md) — 제품 목표와 책임 경계
- [운영과 배포](docs/DEPLOYMENT.md) — 운영 사용자, 게시 범위, 배포와 복구
- [실사용 검증](test/workflow-evaluation.md) · [개인 원칙 평가](test/principle-evaluation.md) — 실제 에이전트 행동과 검증 범위

로컬에 설치한 Skill은 my-context 저장소의 원본 파일을 참조하고, 원격 MCP는 배포된 Git 커밋의 자산을 제공해요. 두 경로의 버전은 다를 수 있어요. 연결·조회에 문제가 있다면 [로컬 설정의 문제 해결](docs/LOCAL-SETUP.md#문제가-발생했을-때)과 [운영 배포 확인](docs/DEPLOYMENT.md#배포-확인)을 참고해 주세요.
