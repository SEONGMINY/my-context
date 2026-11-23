---
name: manage-dev-knowledge
description: "Guide explicitly requested personal knowledge registration, updates or removal: inspect existing published assets, propose a diff, seek approval, modify authorized Git sources and verify publication. Reading this guidance does not grant write access."
---

# 개인 개발 지식 관리

사용자가 my-context에 지식을 **등록·수정·삭제하거나 기존 지식을 관리해달라고 명시적으로 요청한 경우**에만 이 절차를 적용한다. 일반 개발 작업에서 원칙을 참고하는 것만으로는 이 관리 절차를 실행하지 않는다.

이 Skill은 **읽기 전용 MCP에서 제공하는 작업 지침**이다. Skill을 읽거나 MCP에 로그인해도 로컬 파일, Git 저장소, 원격 배포에 대한 권한이 생기지 않는다. Git 원본 접근과 변경 권한이 실제로 있는 환경에서만 승인된 작업을 진행한다.

## 기존 지식 확인

1. 원격 my-context MCP의 `chub_search`로 기존 자산을 찾는다. 필요하면 한국어·영어 검색어를 조정하거나 `chub_list`를 사용한다. 자산 본문은 `chub_get`으로 확인하고, 개인 원칙의 상세 내용은 `file: "knowledge.md"`로 조회한다.
2. 검색 결과와 실제 본문을 구분한다. 연결·인증 실패나 미게시 자산은 조회 성공으로 표시하지 않는다.
3. 해당 작업에 접근 허용된 대화·프로젝트 자료만 활용한다. 사용자의 추가 비공개 자료에 자동 접근하지 않는다.
4. 기존 지식과의 중복·충돌을 먼저 확인하고, 새 지식 작성이 필요한지 기존 자산 보완으로 충분한지 결정한다.

## 등록·수정·삭제

1. 현재 접근 가능한 **원본 Git 저장소**와 작업 위치, 브랜치·변경 상태·원격 및 최신성을 확인한다. 원본에 접근할 수 없다면 없는 경로나 상태를 추정하지 않고 제한을 알린다.
2. 기존 원칙의 의미·범위와 사용자 발언을 보존한다. 사용자 사실, AI 해석, 제안을 구분한다. **구체적인 변경 내용(diff), 대상 파일, 영향을 받는 자산, 커밋·푸시·배포 범위**를 제안한다.
3. 지식 원본의 변경 및 게시에는 사용자의 명시적 승인과 실제 Git·배포 권한이 필요하다. 검토·초안 요청은 변경 승인으로 취급하지 않는다.
4. 승인된 파일만 수정한다. 충돌·원격 변경이 있으면 무단 덮어쓰기 대신 재검토한다. 커밋·푸시·배포는 허용된 범위와 호스트의 권한 정책에 따라 별도로 실행한다.
5. 게시 후 원격 `chub_search`·`chub_get`에서 새 `revision`과 변경 본문을 검증한다. 게시가 불가능하면 Git 변경 완료와 운영 MCP 반영을 구분한다.

## 개인 원칙 파일 구조

개인 원칙 원본은 `content/personal/lookup-<slug>/SKILL.md` 및 `knowledge.md`에 둔다. 진입 파일의 `name`, 영문 `description`, `metadata.source: community`, 영문 `metadata.tags`를 유효하게 작성한다. 판단 기준의 상세 본문은 `knowledge.md`에 둔다. 이미 존재하는 자산을 우선 검토한다.

관리 Skill을 MCP에서 조회할 수 있다고 해서 MCP 쓰기 도구가 존재하는 것은 아니다. 다른 프로젝트의 소스 코드를 my-context Git 원본이라고 가정하지 않는다. 원본 변경에 필요한 도구·권한이 없으면 변경 제안까지만 진행하고 완료한 단계와 미완료 단계를 구분한다.
