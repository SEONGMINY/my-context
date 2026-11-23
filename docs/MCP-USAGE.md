# 원격 my-context MCP 연결 및 진단

my-context의 개인 원칙과 Workflow는 원격 MCP에서 검색·조회해요.

## 연결하기

1. Codex에서 `codex mcp add my-context --url https://minylee.my-context.workers.dev/mcp`을 실행합니다.
2. 브라우저 로그인 또는 `codex mcp login my-context`로 인증합니다.
3. 새 에이전트 세션에서 `my-context의 chub_list를 호출해줘`로 연결을 확인합니다.
4. `my-context 사용해서 요구사항을 인터뷰해줘` 또는 `my-context 사용해서 Phase 계획을 세워줘`처럼 자연어로 요청합니다.

Codex 외 호스트에서도 원격 MCP를 연결한 뒤 명시적으로 사용을 요청할 수 있어요. 연결 방식과 도구 발견은 호스트마다 다르므로 실제 호출 여부를 확인해야 해요.

## 조회와 원본 변경은 다릅니다

| 목적 | 방법 |
| --- | --- |
| 개인 원칙·Workflow 검색 | `chub_search` |
| 선택한 자산의 본문·첨부 조회 | `chub_get` |
| 게시된 전체 목록 확인 | `chub_list` |
| 개인 지식 변경 절차 참고 | MCP의 `workflows/manage-dev-knowledge` 조회 |
| 개인 지식 원본 등록·수정·삭제 | 허가된 Git 원본 도구와 사용자 승인 |
| 게시·운영 반영 | 기존 [배포 안내](DEPLOYMENT.md)에 따른 별도 권한과 검증 |

관리 Skill이 게시되어 있어도 원격 MCP는 **읽기 전용**입니다. 지식 변경·푸시·배포를 MCP 조회 성공으로 주장하지 않아요.

## 문제가 발생했을 때

1. 연결·인증 상태를 확인해요.
2. `chub_list`를 실제 호출했는지 확인해요.
3. 관련 키워드로 `chub_search`를 호출하고 결과 ID와 `revision`을 기록해요.
4. 선택한 ID로 `chub_get`을 호출해 본문을 실제 읽었는지 확인해요.
5. 응답이 해당 자산에 근거했는지, 계획만 요청했는데 파일을 수정하지 않았는지 확인해요.

명시적 MCP 호출이 가능한 것과 **명시적 언급 없이 AI가 자율적으로 MCP를 선택하는 것**은 달라요. 자동 선택은 호스트·모델·지침 전달 방식에 따라 달라질 수 있으며 모든 환경에서 보장하지 않아요. 관련 근거와 검증 시나리오는 [E2E 가이드](../test/workflow-evaluation.md)를 참고하세요.

## 개발·관리 작업

저장소 원본 변경이나 릴리스 검증이 필요한 관리자는 Git 작업 환경이 필요해요. Node.js 버전은 [package.json](../package.json)의 `engines`를 따르고, 검증은 [개발 안내](../AGENTS.md)를 사용해요. 일반 사용과 Git 원본 관리는 목적과 권한이 다릅니다.
