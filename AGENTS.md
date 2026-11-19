# my-context

my-context는 여러 프로젝트와 환경에서 개인 개발 지식과 공통 작업 절차를 재사용하는 도구다. 비공개 Git 저장소에 Markdown 원본과 첨부 파일을 보관한다. MCP는 자산을 제공한다. 각 프로젝트가 자산을 적용하고 결과를 검증한다. [제품 비전](docs/VISION.md)

## 저장소 구성

- `content/` — 개인 지식 원본과 검색 진입 파일
- `skills/` — 공통 Skill 원본과 첨부 파일
- `worker/` — 운영 MCP의 인증과 읽기 전용 조회
- `scripts/` — 빌드, 릴리스 검증, 로컬 연결
- `test/` — Worker 인증 테스트
- `docs/`, `README.md` — 제품·운영 문서와 사용 안내

## 작업 기준

- 사용자가 요청할 때만 개인 지식을 조회하거나 변경한다. 지식을 적용할 때는 대상 프로젝트의 규칙을 우선한다. 원본을 변경할 때는 [관리 Skill](skills/manage-dev-knowledge/SKILL.md)을 따른다.
- 검색 인덱스와 Worker 번들은 커밋하지 않는다.
- 코드 변경은 [CI](.github/workflows/worker.yml)의 관련 검사로 검증한다. 운영에 반영할 때는 [배포 가이드](docs/DEPLOYMENT.md)를 따른다.
