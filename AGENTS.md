# my-context

여러 프로젝트에서 개인 개발 지식을 **필요할 때 Context로 활용**하고, 공통 Skill을 재사용할 수 있도록 원본을 관리한다. 지식의 정본은 Private Git의 일반 Markdown이다. MCP는 교체 가능한 조회 인터페이스이며, Product의 규칙과 실행 책임은 각 프로젝트에 남긴다.

## Top-level building blocks

- `content/` — 개인 개발 지식 원본과 Context Hub 검색 진입 파일.
- `skills/` — 여러 프로젝트에서 재사용할 Codex Skill의 원본.
- `scripts/` — Context Hub 빌드, 로컬 설정, 사용자 범위 연결 스크립트.
- `docs/` — 프로젝트 비전과 사용자 문제.
- `README.md` — 사용 방법과 아키텍처 설명.

개인 지식은 사용자 요청 없이 조회하거나 변경하지 않는다. 개인 지식은 프로젝트의 명시적 계약보다 우선하지 않는다. 변경·배포의 상세 절차는 해당 Skill과 README를 참고한다.
