# 로컬 설정

이 문서는 로컬 설치·갱신·제거의 상세 안내다. 원격 MCP만 이용할 때는 저장소 클론이나 Skill 설치가 필요하지 않다. [사용 방법](../README.md)

## 환경

지원 Node.js 버전은 [package.json](../package.json)의 `engines`를 기준으로 한다(`^20.20.0 || >=22.22.0`). 로컬 관리 연결은 `/bin/sh`, 설치기는 심볼릭 링크를 사용한다. 이러한 기능이 없는 환경은 별도 확인이 필요하며 Windows 네이티브 지원을 보장하지 않는다. 에이전트의 실제 발견 및 인증 여부는 [E2E 가이드](../test/workflow-evaluation.md)에 따라 검증한다.

## 선택적 조회 정책

`policies/asset-usage.md`의 공통 정책을 Codex `~/.codex/AGENTS.md`, Pi `~/.pi/agent/AGENTS.md`, Claude Code `~/.claude/CLAUDE.md`에 관리 구간으로 추가한다. `CODEX_HOME`, `PI_CODING_AGENT_DIR`, `CLAUDE_CONFIG_DIR`이 설정되면 해당 위치를 사용한다.

저장소 루트에서 `npm run policy:check`, `npm run policy:enable`, `npm run policy:disable`로 확인·설치/갱신·제거한다. 확인 명령은 쓰지 않으며 `disabled`(미설치), `enabled`(현재 정책), `outdated`(이전 정책)를 보고한다. 새 정책은 개인 원칙뿐 아니라 관련 공통 Skill(인사이트 추출 포함)의 자율적 선택을 허용한다. Skill 선택은 추가 개인 자료 접근이나 지식 변경 권한을 부여하지 않는다. 기존 정책의 동의를 확대하지 않으며, 기존 설치본은 이전 범위로 유지된다. 변경 범위를 검토하고 동의하는 경우에만 `--enable`에 해당하는 명령을 다시 실행해 갱신한다. 모든 대상을 확인한 뒤 변경하며 기존 지침을 보존한다. 제거는 관리 구간만 대상으로 하며 설치 시 새로 만든 파일에 다른 내용이 없을 때만 파일 자체를 삭제한다. 관리 구간이 수정되거나 마커·경계·심볼릭 링크가 예상과 다르면 중단한다. 충돌 시 경로와 기존 내용을 먼저 확인하고 강제로 덮어쓰지 않는다. 정책 갱신 후 새 세션에서 지침 로딩과 MCP 연결·인증·실제 조회를 각각 확인한다. 설정만으로 도구나 MCP가 설치되지 않으며 모델의 적용도 보장되지 않는다. 상세 행동 조건은 [정책 원본](../policies/asset-usage.md)을 따른다.

## Workflow Skill

`npm run install:workflow -- --check`로 확인하고 `npm run install:workflow`로 설치한다. 설치 경로는 `~/.agents/skills/development-workflow`(Codex·Pi), `~/.claude/skills/development-workflow`(Claude Code)이며 동일한 저장소 원본을 가리킨다. 충돌 시 기존 항목을 보존하고 부분 실패 시 이번 설치에서 만든 항목만 복구를 시도한다. 복구 실패는 오류로 보고된다.

새 세션에서 Codex는 `$development-workflow`, Pi는 `/skill:development-workflow`, Claude Code는 `/development-workflow`로 명시 호출한다. 자동 발견과 적용은 에이전트 버전 및 설정에 따라 확인해야 한다.

갱신은 원본의 Git 체크아웃을 검토 후 갱신하고 새 세션에서 호출을 확인한다. 저장소를 이동하거나 제거하려면 `ls -l ~/.agents/skills/development-workflow ~/.claude/skills/development-workflow`로 대상이 이 저장소를 가리키는 링크인지 확인한 뒤 해당 링크만 해제한다. 기존 파일이나 다른 저장소의 링크를 삭제하지 않는다.

설치되어 Skill 목록에 표시되는 것은 자동 활용 동의가 아니다. 기존 개인 원칙 전용 동의는 로컬 공통 Skill 자동 사용 권한이 아니며, 현재 작업에서 my-context 사용을 금지하면 동일 저장소의 로컬 Skill도 사용하지 않아야 한다. 이는 Host의 최초 파일 읽기 전에 적용돼야 하는 행동 계약이며, 메타데이터 문구만으로 파일 접근이 강제 차단되지는 않는다. 실제 Pi 등에서는 새 세션의 로컬 파일 읽기 기록으로 확인한다.

## 로컬 관리 환경

저장소 루트에서 아래 명령을 실행한다. 기존 설정과 충돌하지 않는지 `--check` 결과를 먼저 확인한다.

```bash
npm ci
npm run setup
npm run build
npm run install:user -- --check
npm run install:user
```

설치기는 Codex 설정의 `[mcp_servers.personal-knowledge]`와 `~/.agents/skills/manage-dev-knowledge` 링크를 추가한다. 설정 위치는 `CODEX_HOME` 또는 `~/.codex`다. `npm run build`는 로컬 `content/`를 인덱싱하며 공통 Skill 게시 목록이나 Worker 배포를 갱신하지 않는다. 지식 변경 후 로컬 인덱스를 다시 빌드한다. 새 Codex 세션에서 로컬 MCP의 `chub_list`와 관리 Skill 로딩을 각각 확인한다.

제거 전 `config.toml`의 해당 섹션과 Skill 링크가 이 저장소를 가리키는지 확인한다. 설정의 다른 부분을 보존하며 해당 서버 항목만 제거하고, 이 저장소의 관리 Skill 링크만 해제한다. 자동 제거 명령은 제공하지 않는다. 설정이나 링크가 예상과 다르면 중단하고 수동으로 확인한다. 새 세션에서 제거 여부를 확인한다. 원격 `my-context` 연결과 별개다.
