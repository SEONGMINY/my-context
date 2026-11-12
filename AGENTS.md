# my-context

개인 Markdown 지식을 Git으로 보존하고 기존 Context Hub MCP로 제공한다.

- 작업 재개 시 `tasks/state.json`과 `git status`를 먼저 확인하고 기존 근거에서 이어간다. 작업 상태의 정본은 `tasks/state.json` 하나다.
- `content/`는 지식·검색 진입 파일, `.generated/`는 재생성 가능한 빌드 결과다. `tasks/`는 검색 대상이 아니다.
- 지식 관리 절차 원본은 `skills/manage-dev-knowledge/SKILL.md`다. 사용자 설치 후 다른 프로젝트에서도 호출한다. 운영 방법은 `README.md`를 확인한다.
- 실제 개인 지식 변경과 원격 생성·Push는 명시적인 사용자 승인 범위에서만 수행한다. 검증용 임시 지식은 별도로 표시한다.
