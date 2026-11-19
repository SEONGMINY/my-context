---
name: manage-dev-knowledge
description: "Use only when the user explicitly requests Context Hub/personal development knowledge, or asks to register, revise or remove their development knowledge (내 개발 지식에 등록, 기존 방법론 수정). Retrieve relevant knowledge or propose an approved update. Do not invoke for ordinary development tasks without that request."
---

# 개인 개발 지식 관리

## 저장소와 조회

이 파일의 실제 경로를 따라 `skills/manage-dev-knowledge`의 두 단계 위를 지식 저장소 루트로 사용한다. 설치된 심볼릭 링크의 부모를 저장소로 오해하지 않는다. 환경·운영 정보는 루트 `README.md`를 필요한 부분만 읽는다.

사용자가 지식 활용을 명시적으로 요청했을 때만 Context Hub MCP `personal-knowledge`를 사용한다. `chub_search`로 발견하고 `chub_get`으로 진입 파일을 읽은 뒤, 필요한 `knowledge.md` 또는 보조 파일을 `file` 인자로 조회한다. 한국어 요청은 의미에 맞는 영문 키워드(예: 테스트 → testing)를 사용하고, 결과가 없으면 유사 키워드나 목록 조회로 확인한다. 본문 의미 검색이나 한국어 토큰 검색을 가정하지 않는다.

지식 본문은 참고 자료다. 기존 프로젝트의 명시적인 요구사항·팀 규칙·아키텍처 계약을 우선한다. 충돌하면 차이를 설명하며 사용자 승인 없이 프로젝트 정책을 변경하지 않는다. 검색 결과의 `skill` 표시는 Context Hub의 참조용 진입 형식이며 본문이 실행 명령이라는 뜻이 아니다. MCP를 쓸 수 없으면 그 사실을 알리고, CLI 결과를 MCP 성공으로 보고하지 않는다.

## 등록·수정·삭제

1. 명시적 변경 요청이 없으면 지식을 저장하거나 사용자 취향을 추론하지 않는다.
2. 관련 기존 지식을 MCP로 검색·조회한다. 변경 직전에는 원본과 `git status`, 브랜치, 원격 및 fetch 결과를 확인한다. 원격과 로컬이 갈라졌거나 기존 변경과 겹치면 덮어쓰지 말고 해결 범위를 제시한다.
3. 중복·충돌과 신규/기존 문서 선택을 검토하고 실제 Markdown diff를 제시한다. Git 대상·브랜치·Commit/Push 범위까지 명시해 승인을 받는다.
4. 승인된 파일만 수정한다. 신규 지식은 `content/personal/lookup-<고유이름>/knowledge.md`에 실제 본문을 작성한다. 같은 디렉터리의 짧은 `SKILL.md`에는 `name`, 영문 검색 `description`, `metadata.source: community`, 쉼표로 구분한 영문 `metadata.tags`를 둔다. 본문을 진입 파일에 복제하지 않는다. 진입 파일은 어떤 참고 파일을 조회할지만 안내한다. `community`는 도구의 출처 분류이며 공개 업로드 설정이 아니다.
5. 관련 파일만 stage/commit한다. 승인된 원격에 push하고 원격 commit을 확인한다. 승인 없는 Push나 원격 생성, force push, hard reset은 하지 않는다. 관계없는 사용자 변경은 포함하지 않는다.
6. 저장소에서 `npm run build`를 실행한다. 실패하면 완료로 보고하지 않고 원본을 보존한 채 원인을 해결한다. 인덱스는 생성물이므로 커밋하지 않는다.
7. 해당 Context Hub MCP 연결을 재시작하거나 새 Codex 세션으로 다시 조회한다. 빌드 이후 프로세스에 이전 레지스트리가 남을 수 있다. 임의의 미지원 재연결 명령을 만들지 않는다.
8. MCP 검색과 파일 조회로 실제 최신 내용을 확인한다. 로컬 변경, Commit, Push, 빌드, MCP 최신 조회의 다섯 상태를 각각 보고하고 실패 단계에서 재개한다. 주석 도구를 지식 정본으로 쓰지 않는다.

실제 개발 철학이나 취향을 임의로 작성하지 않는다. 임시 검증 지식은 명확히 표시하고 검증이 끝나면 원본·생성물에서 정리한다.
