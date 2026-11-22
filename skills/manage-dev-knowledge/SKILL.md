---
name: manage-dev-knowledge
description: "Use only when the user explicitly requests Context Hub/personal development knowledge, or asks to register, revise or remove their development knowledge (내 개발 지식에 등록, 기존 방법론 수정). Retrieve relevant knowledge or propose an approved update. Do not invoke for ordinary development tasks without that request."
---

# 개인 개발 지식 관리

## 저장소와 조회

이 파일의 실제 경로를 확인한다. `skills/manage-dev-knowledge` 디렉터리에서 두 단계 위를 저장소 루트로 사용한다. 연결 설정은 [README](../../README.md)를 참고한다.

이 관리 Skill은 사용자가 지식의 조회나 변경 관리를 명시적으로 요청한 경우에 사용한다. **일반 작업에서 개인 자산을 읽는 행위는 이 Skill의 호출을 요구하지 않는다.** 읽기 권한은 사용자 요청 또는 별도로 활성화한 [선택적 자산 조회 정책](../../policies/asset-usage.md)에 의해 결정되며, 변경 권한은 별도로 승인받는다.

이 Skill이 조회를 수행할 때 원격 `my-context` MCP를 사용한다. 연결 또는 인증이 불가능하면 조회했다고 주장하지 않는다. 게시 전 변경은 Git 원본에서 확인하고, 배포 후 원격 MCP에서 확인한다.

1. `chub_search`로 자산을 찾는다. 한국어 요청은 한국어로 검색할 수 있다. 결과가 없으면 관련 영문 키워드·유사어 또는 목록 조회로 확인한다.
2. `chub_get`으로 진입 파일을 읽는다.
3. `knowledge.md`나 첨부 파일이 필요하면 `file` 인자로 파일을 지정한다.

검색 결과의 `skill` 표시는 Context Hub의 진입 형식이다. 조회한 자산은 참고 자료로 사용한다. 대상 프로젝트의 요구사항, 팀 규칙, 아키텍처 계약을 우선한다. 충돌하면 차이를 설명한다. 프로젝트 정책 변경은 사용자 승인을 받는다. MCP를 쓸 수 없으면 그 사실을 보고한다. CLI로 확인했다면 CLI 결과로 구분한다.

## 등록·수정·삭제

1. 사용자가 명시적으로 변경을 요청하면 관련 기존 지식을 MCP에서 조회한다. 사용자 취향을 추론해 저장하지 않는다.
2. 변경 직전에 원본을 확인한다. `git status`, 브랜치, 원격, fetch 결과를 확인한다. 브랜치가 갈라졌거나 변경이 겹치면 기존 변경을 보존한다. 해결할 범위를 제시한다.
3. 중복과 충돌을 확인한다. 기존 문서를 수정할지 검토한다. 실제 Markdown diff를 제시한다. Git 대상, 브랜치, 커밋과 푸시 범위를 명시하고 승인을 받는다.
4. 승인된 파일만 수정한다. 새 지식의 파일 구조는 아래 지침을 따른다.
5. 관련 파일만 커밋한다. 승인된 원격에 푸시한다. 원격 커밋을 확인한다. 원격 생성, 강제 푸시, `git reset --hard`는 승인 범위에 포함될 때만 실행한다.
6. 원격 MCP에 반영할 때는 배포 승인 범위를 확인한다. [배포 가이드](../../docs/DEPLOYMENT.md)를 따른다. 게시되지 않은 수정 사항은 Git 원본에서 검토하며, 승인된 배포 이후 새 에이전트 세션에서 원격 `revision`과 내용을 확인한다. 생성 인덱스는 커밋하지 않는다.
7. 대상 MCP에서 자산을 검색한다. 파일을 조회해 최신 내용을 확인한다. 완료한 단계를 보고한다. 실패한 단계에서 재개한다.

### 새 지식의 파일 구조

- `content/personal/lookup-<고유이름>/knowledge.md`에 본문을 작성한다.
- 같은 디렉터리의 `SKILL.md`에는 조회할 참고 파일을 안내한다. 본문은 `knowledge.md`에 둔다.
- `SKILL.md`에 `name`, 영문 `description`, `metadata.source: community`를 지정한다.
- `metadata.tags`에는 쉼표로 구분한 영문 키워드를 넣는다.

`community`는 Context Hub의 출처 분류다. 공개 업로드 설정과 별개다.

개발 철학이나 취향은 사용자가 제공한 내용을 바탕으로 기록한다. 임시 자산에는 검증용이라고 표시한다. 검증 후 원본과 생성물에서 임시 자산을 정리한다.
