# 개발 Workflow 실사용 E2E 검증

**목적:** `development-workflow`가 실제 Codex·Claude Code·Pi 세션에서 발견되고 사용자 요구를 지키는지 확인한다. 설치·문서·CI 테스트 통과만으로 E2E를 통과 처리하지 않는다.

## 1. 실험 환경과 권한

- 동일한 `my-context` 커밋을 기준으로 실행하고 커밋 SHA와 각 에이전트 버전을 기록한다.
- 각 에이전트는 실제 로그인·모델 사용이 가능한 환경에서 실행해야 한다. 미설치·미인증·실행 불가인 경우 `NOT_RUN`과 사유를 기록한다.
- 실제 Product를 변경하지 말고, 새로운 임시 Git 저장소나 버려도 되는 테스트 프로젝트에서 실험한다.
- 실행 전후 Git 상태와 생성 파일을 확인한다. 외부 배포, 개인 지식 조회, 개인 데이터 접근은 실험 범위에 넣지 않는다.
- 에이전트마다 독립 세션과 별도 테스트 작업 디렉터리를 사용해 앞선 실험의 대화·파일 변경이 결과에 영향을 주지 않게 한다.

## 2. 설치·검색 경로 확인 — N7

저장소 루트에서 다음을 실행한다.

```bash
npm run install:workflow -- --check
npm run install:workflow
npm run test:workflow

test -f "$HOME/.agents/skills/development-workflow/SKILL.md"
test -f "$HOME/.agents/skills/development-workflow/references/contracts.md"
test -f "$HOME/.claude/skills/development-workflow/SKILL.md"
test -f "$HOME/.claude/skills/development-workflow/references/contracts.md"
```

이 검사는 파일 설치와 상대 경로 해석만 검증한다. **에이전트가 발견·로드했다고 주장할 수 없다.** Git 저장소를 이동하거나 삭제하면 기존 심볼릭 링크가 깨질 수 있으므로 다시 확인한다.

에이전트별로 실제 실행 파일이 있는지 확인한 후 **새 세션**을 실행한다.

| 실행 환경 | 새 세션에서 확인할 것 | 주의 |
| --- | --- | --- |
| Codex | Skill 목록에서 `development-workflow` 확인, `$development-workflow` 명시 호출로 본문 사용 확인 | Codex Desktop과 CLI의 동작을 혼동하지 않는다 |
| Claude Code | Skill 목록에서 이름 확인, `/development-workflow` 명시 호출 | 개인 Skill은 `~/.claude/skills`에 설치된다 |
| Pi | 시작 시 Skill 목록 또는 `/skill:development-workflow`로 확인 | `~/.agents/skills`를 지원하는 버전인지 확인 |

`SKILL.md`의 존재, Skill 이름이 목록에 나타나는 것, 실제 본문을 읽고 절차를 따르는 것은 **서로 다른 검증 항목**이다. 호출이 실패하거나 확인 방법을 제공하지 않으면 `FAIL` 또는 `NOT_RUN`의 사유를 증거와 함께 기록한다. 아무 조작 없이 자동 적용되는지도 별도의 새 세션에서 평가한다.

로그에서 호출 시 본문이 컨텍스트에 포함된 것을 확인할 수 있으면, 이후 같은 `SKILL.md`를 다시 읽는 도구 호출을 별도로 센다. 이름과 설명만 제공된 환경에서 최초로 본문을 읽는 호출은 여기에 포함하지 않는다.

## 3. 실제 행동 평가 — N8·N10

`test/fixtures/workflow-scenarios.json`의 12개 사례를 사용한다. 각 사례의 `request`를 실험용 Product에 전달하고, 해당 사례의 `expected`와 `forbidden`을 실제 응답·도구 호출·변경 파일·테스트 증거로 판단한다.

검증할 주요 동작은 다음과 같다.

1. 경량 버그 수정 시 새 Plan/Decision을 의례적으로 만들지 않는가?
2. 중요한 모호성을 질문하고, Project 계약을 공통 Skill보다 우선하는가?
3. 실제 의존성만 연결하고 순환·취소된 선행 조건을 잘못 처리하지 않는가?
4. 테스트 미실행·오래된 증거를 `passed`로 둔갑시키지 않는가?
5. 변경된 중요 결정의 이력·영향을 보존하는가?
6. 인계받은 에이전트가 요약에만 의존하지 않고 실제 계약·코드·증거를 확인하는가?
7. 개인 지식 조회 요청 없이 MCP를 자동 호출하지 않는가?
8. Skill 변경 시 정적 검사와 모델 행동 검증을 혼동하지 않는가?

**주의:** JSON Fixture의 구조가 유효하다는 테스트는 모델 행동 평가가 아니다. 응답에 문구가 등장한 것만으로 통과하지 않는다. 실제 수행 내용과 결과를 확인한다.

## 4. 인계 E2E — N13

같은 테스트 Product에 대해 에이전트 A가 목표·범위·완료 조건과 작업 현황을 정리하고, 다른 에이전트 B가 기존 대화를 보지 않은 상태에서 인계 문서를 받는다.

- A는 원본 링크/경로, 기준 커밋, 수용된 산출물, 미완료 작업, 미검증 항목을 인계한다.
- B는 실제 파일·테스트·현재 Git 상태를 다시 확인한다.
- 일부러 오래된 리비전이나 취소된 선행 Node를 포함해 B가 이를 그대로 신뢰하지 않는지 관찰한다.
- B가 필요한 정보가 없을 때 추측하지 않고 `unknown` 또는 차단 사항으로 처리하는지 확인한다.

Codex→Claude Code, Claude Code→Pi 등의 교차 인계를 수행할 수 없으면 해당 조합을 `NOT_RUN`으로 남긴다. 한 환경의 통과를 다른 환경으로 확장하지 않는다.

## 5. 결과 기록 형식

검증할 때마다 다음 표를 실제 결과로 채운다. 빈 항목을 성공으로 간주하지 않는다.

| 환경·버전 | 기준 커밋 | 발견 | 명시적 로딩 | 행동 시나리오 | 인계 | 증거 | 판단 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Codex | — | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | — | 미검증 |
| Claude Code | — | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | — | 미검증 |
| Pi | — | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN | — | 미검증 |

판정은 `PASS / FAIL / NOT_RUN` 중 하나로 기록한다. 별도 기록에 실제 명령·출력·도구 호출·변경 파일·커밋·테스트 결과를 연결한다. 가능하면 작업 소요 시간·토큰·추가 파일 수·재작업도 적는다.

경량 작업의 비용을 비교할 때는 동일한 모델 설정, 프로젝트 리비전, 작업 요청과 판정 기준을 유지하고, 독립 세션에서 Skill을 비활성화한 결과와 비교한다. 표본 수와 캐시 상태를 함께 기록한다.

**전체 완료 판정:** 세 실행 환경의 필수 검증을 완료하고, 중요한 실패·계약 위반을 해결한 뒤 검증된 리비전에 근거해 보고할 때만 완료로 표시한다. CI에서 실행된 Node 테스트는 Skill 파일·설치 계약·릴리스 검증만 보장한다.
