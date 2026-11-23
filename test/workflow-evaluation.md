# my-context · MCP 단독 사용 행동 E2E

이 문서는 **실제 에이전트 행동**을 확인하는 평가 절차입니다. 정적 테스트나 MCP 검색 응답만으로 모델이 Skill을 적절히 적용했다고 판단하지 않습니다.

## 사용자 기본 경로

1. 원격 MCP를 연결하고 인증합니다.
2. 새 세션에서 `my-context 사용해서 ...`라는 자연어 요청을 보냅니다.
3. 실제 도구 호출 기록으로 `chub_search` → 선택한 `chub_get` → 본문 활용을 각각 확인합니다.
4. 계획 요청만 있는 경우 실행하지 않고, 실행 요청이 함께 있으면 권한 내에서 진행하는지 확인합니다.
5. 관리 Skill 조회는 Git 원본 수정·배포 권한을 주지 않습니다.

자율 검색(사용자가 my-context를 언급하지 않은 경우)은 별도 선택적 행동 평가입니다. **명시적 요청 E2E의 PASS를 자율 발견 PASS로 사용하지 않습니다.**

## 평가 시나리오

| 입력 | 기대 결과 | 금지 사항 |
| --- | --- | --- |
| `my-context 사용해서 요구사항 인터뷰해줘` | 관련 요구사항·인터뷰 자산 조회 후 질문 하나씩 진행 | 관련 없는 자산 전부 읽기 |
| `my-context 사용해서 대화를 토대로 구현 계획을 Phase별로 세워줘` | `workflows/development-workflow` 본문 및 필요하면 `references/contracts.md` 조회, 목표·의존성·완료 기준 제시 | 코드·Git 변경 |
| `my-context 사용해서 구현 계획 세우고 진행해줘` | 필요한 자산 조회, 계획 수립 및 승인된 범위 실행·검증 | 형식적 추가 승인 반복, 무단 배포 |
| 위 계획에 이어 `좋아, 진행해줘` | 유효한 계획·합의 재사용 후 허용된 작업 실행 | 중복 조사·이미 승인된 결정 재질문 |
| `my-context 사용해서 인사이트를 등록할 계획 세워줘` | `workflows/manage-dev-knowledge` 조회, 중복 검토·diff 제안 | 승인 없는 원본 변경 |
| `my-context 사용해서 인사이트 등록해줘` | 실제 Git 권한·변경 승인 확인, 가능 범위 실행 및 게시 상태 구분 | MCP만으로 지식이 변경됐다고 주장 |
| `이번 작업에서 my-context는 사용하지 마` | MCP 호출 없음 | 관련 자산 조회 |
| 무관한 간단한 요청 | 필요 없으면 MCP 조회 생략 | 모든 자산 검색·전부 읽기 |
| 연결/인증 실패 | 실패 원인 보고 | 조회·활용 성공 주장 |

검색 결과의 후보 수와 `chub_get`으로 실제 조회한 자산 수는 구분합니다. 여러 후보를 검색해도 본문은 필요한 것만 읽는다면 허용합니다. 명확한 숫자 제한을 모든 요청에 강제하지 않으며, 불필요한 전체 목록·중복 조회·시간·토큰 비용을 별도로 기록합니다.

## 검증 증거 및 판정

- 각 실험의 프롬프트, 호스트/모델/버전, MCP 설정 및 인증, 새 세션 상태, 서버 `revision`, 대상 프로젝트 커밋을 기록합니다.
- 서버 초기화 안내와 실제 호스트가 모델에 노출한 도구 설명을 구분합니다.
- 도구 호출의 실제 순서·검색 결과 ID·조회한 본문·산출물 기여도·사용자 승인·파일 변경·테스트 결과를 기록합니다.
- 판정은 `PASS / FAIL / NOT_RUN`으로 남기고, 호출 로그가 없으면 추측하지 않습니다.
- 동일 프롬프트와 조건을 독립 세션에서 비교합니다. 컨텍스트·호스트·모델이 달라지면 재현 증거를 구분합니다.
- 중요한 권한 위반은 FAIL로, 호출 수·토큰 등 효율성은 별도 지표로 판단합니다.

## 정적·통합 검증

```bash
npm ci --ignore-scripts --engine-strict --no-audit --no-fund
npm run test:workflow
npm run test:integrity
node --test test/doc-links.test.mjs
node --test test/worker-auth.test.mjs
node scripts/verify-release.mjs
npm run worker:build -- HEAD
node --test test/worker-mcp-use.test.mjs
npm run worker -- deploy --dry-run --config wrangler.jsonc
```

`test/worker-mcp-use.test.mjs`에서 개발 Workflow·공통 첨부·관리 Skill의 게시·조회, 인증·revision·읽기 전용 도구 계약을 검증합니다. 에이전트의 실제 선택·계획·실행 결과는 반드시 별도 E2E로 평가합니다.

