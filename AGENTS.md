# my-context

my-context는 여러 프로젝트와 환경에서 개인 개발 지식과 공통 작업 절차를 재사용하는 도구다. Git 저장소에 Markdown 원본과 첨부 파일을 보관한다. MCP는 자산을 제공한다. 각 프로젝트가 자산을 적용하고 결과를 검증한다. [제품 비전](docs/VISION.md)

## 저장소 구성

- `content/` — 개인 지식 원본과 검색 진입 파일
- `skills/` — 공통 Skill 원본과 첨부 파일
- `policies/` — 특정 Skill과 독립적인 사용자 선택형 자산 활용 정책
- `worker/` — 운영 MCP의 인증과 읽기 전용 조회
- `scripts/` — 릴리스 빌드·검증, Skill·정책 설치
- `test/` — 인증·자산·Skill 설치·Workflow·원격 MCP 검증 및 실사용 E2E 가이드
- `docs/`, `README.md` — 제품·운영 문서와 사용 안내

## 변경 종류별 검증

| 변경 | 우선 확인할 검사·근거 |
| --- | --- |
| 안내·운영 문서 | `node --test test/doc-links.test.mjs`, 실제 구현과 설명 대조 |
| 개인 원칙 | `npm run test:integrity`, 의미 변경 시 [원칙 행동 평가](test/principle-evaluation.md) |
| Skill·정책 | `npm run test:workflow`, `npm run test:integrity`, 영향이 있으면 [Workflow E2E](test/workflow-evaluation.md) |
| Worker·릴리스 | `node --test test/worker-auth.test.mjs`, `node scripts/verify-release.mjs`, `npm run worker:build`, `node --test test/worker-mcp-use.test.mjs` |

이 표는 선택의 출발점이며 CI 전체 검사를 대체하지 않는다. 실행하지 않은 검증은 `NOT_RUN`으로 기록한다.

## 작업 기준

- 개인 지식 조회는 명시적 요청이 기본이다. 사용자가 개인 범위에서 [선택적 조회 정책](policies/asset-usage.md)을 활성화한 경우에만 관련 자산을 조건부로 조회할 수 있다. 조회 권한과 지식 변경 승인은 별도이며, 대상 프로젝트의 계약을 우선한다. 지식 변경은 [관리 Skill](skills/manage-dev-knowledge/SKILL.md)을 따른다.
- 검색 인덱스와 Worker 번들은 커밋하지 않는다.
- 자산 변경 시 [관리 Skill](skills/manage-dev-knowledge/SKILL.md) 또는 `skills/` 원본과 [게시 목록](publish-skills.json)을 확인한다. 게시 자산의 필수 첨부는 해당 자산 내부에서 조회 가능해야 하며 외부 출처는 명시적인 URL로 구분한다.
- 변경 영역에 맞춰 [CI](.github/workflows/worker.yml)와 [package.json](package.json)의 검사를 실행한다. 의미적 변경은 [Workflow E2E](test/workflow-evaluation.md) 또는 [원칙 평가](test/principle-evaluation.md)로 구분한다. 검증 대상 리비전·실행 결과·미실행 사유를 PR에 기록한다.
- 운영 반영은 [배포 가이드](docs/DEPLOYMENT.md)를 따른다.
