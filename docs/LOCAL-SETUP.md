# 에이전트 자동 참고 및 로컬 Skill 설정

개인 원칙·공통 Skill의 **일상적인 검색·조회는 원격 `my-context` MCP 하나를 사용**해요. 원격 조회만 필요하다면 저장소를 클론하거나 Skill을 설치할 필요가 없어요. [원격 연결](../README.md#시작하기)

로컬 환경은 **지식 원본 변경, 로컬 Skill 직접 호출, 변경 전 테스트**에만 필요합니다. 로컬 `personal-knowledge` MCP와 그 전용 지식 인덱스 설치는 더 이상 지원하지 않아요.

## 사용 목적별 선택

| 하고 싶은 일 | 사용 경로 |
| --- | --- |
| 게시된 원칙·Skill 검색·조회 | 원격 MCP (로그인 필요) |
| 원칙 등록·수정·삭제 | 원격 조회 + 로컬 Git 원본 + [관리 Skill](../skills/manage-dev-knowledge/SKILL.md) |
| 네이티브 Workflow Skill 호출 | 선택적 로컬 Skill 설치 |
| 배포 전 확인 | 저장소의 릴리스·Worker 검증 ([운영 안내](DEPLOYMENT.md)) |

MCP 연결, 사용자 지침 설치, Skill 설치는 서로 다른 동작이에요. 자동 참고는 기본 동작이지만 지침 로딩과 실제 활용은 에이전트별 새 세션에서 확인해야 합니다.

## 환경

Node.js 버전은 [package.json](../package.json)의 `engines`를 따릅니다(`^20.20.0 || >=22.22.0`). Skill 설치는 심볼릭 링크를 사용하므로 Windows 네이티브 지원은 보장하지 않습니다. 실제 발견·적용은 [E2E 가이드](../test/workflow-evaluation.md)에서 검증합니다.

## 자동 참고 초기 설정

자동 참고는 기본 ON이에요. 별도의 ON/OFF 선택은 제공하지 않습니다. 원격 MCP를 연결한 뒤 저장소에서 다음 명령을 **한 번** 실행해 에이전트 사용자 지침을 설치하세요.

```bash
npm run setup:agent:check  # 기존 설정 확인만 수행
npm run setup:agent        # Codex · Pi · Claude Code 사용자 지침에 설치
```

사용자 지침 대상은 Codex `~/.codex/AGENTS.md`, Pi `~/.pi/agent/AGENTS.md`, Claude Code `~/.claude/CLAUDE.md`입니다. `CODEX_HOME`, `PI_CODING_AGENT_DIR`, `CLAUDE_CONFIG_DIR`가 설정된 경우 해당 경로를 사용합니다.

이 설치기는 기존 파일을 보존하고 관리 구간만 추가·갱신하며 세 대상의 충돌을 미리 확인해요. 변경된 관리 구간, 깨진 마커, 심볼릭 링크 등이 있으면 안전하게 중단하며, 부분 실패 시 이번 변경을 복구하려고 시도합니다.

이전 선택적 정책이 설치된 환경에서는 `setup:agent:check`에 `outdated`가 표시될 수 있어요. 새 지침 설치 시 관리 구간을 최신화하지만 사용자가 직접 수정한 내용은 무단으로 덮어쓰지 않습니다. 다른 사람의 환경은 저장소 업데이트만으로 바뀌지 않으며, 초기 설정 실행과 사용자가 승인한 범위 내에서만 변경돼요.

설치 이후 새 에이전트 세션에서 지침 파일 로딩, 원격 MCP 연결·인증, 실제 관련 자산 조회를 각각 확인합니다. 단순한 파일 설치만으로 모든 에이전트의 자동 적용이 보장되는 것은 아닙니다. 이번 작업에서 my-context 사용을 금지한 사용자 지시가 있으면 자산을 참고하지 않아야 합니다. [자동 참고 정책](../policies/asset-usage.md)

## Workflow Skill

`npm run install:workflow -- --check`로 확인하고 `npm run install:workflow`로 설치한다. 설치 경로는 `~/.agents/skills/development-workflow`(Codex·Pi), `~/.claude/skills/development-workflow`(Claude Code)이며 동일한 저장소 원본을 가리킨다. 충돌 시 기존 항목을 보존하고 부분 실패 시 이번 설치에서 만든 항목만 복구를 시도한다. 복구 실패는 오류로 보고된다.

새 세션에서 Codex는 `$development-workflow`, Pi는 `/skill:development-workflow`, Claude Code는 `/development-workflow`로 명시 호출한다. 자동 발견과 적용은 에이전트 버전 및 설정에 따라 확인해야 한다.

갱신은 원본의 Git 체크아웃을 검토 후 갱신하고 새 세션에서 호출을 확인한다. 저장소를 이동하거나 제거하려면 `ls -l ~/.agents/skills/development-workflow ~/.claude/skills/development-workflow`로 대상이 이 저장소를 가리키는 링크인지 확인한 뒤 해당 링크만 해제한다. 기존 파일이나 다른 저장소의 링크를 삭제하지 않는다.

설치되어 Skill 목록에 표시되는 것은 실제 본문을 읽거나 적용했다는 증거가 아닙니다. 자동 참고 지침이 적용된 환경에서는 관련 Skill을 자율적으로 선택할 수 있지만, 현재 작업에서 my-context 사용을 금지하면 동일 저장소의 로컬 Skill도 사용하지 않아야 합니다. 이는 Host의 최초 파일 읽기 전에 적용돼야 하는 행동 계약이며, 메타데이터 문구만으로 파일 접근이 강제 차단되지는 않는다. 실제 Pi 등에서는 새 세션의 로컬 파일 읽기 기록으로 확인한다.

## 개인 지식 관리 Skill (선택)

원본을 수정해야 하는 관리자는 저장소를 체크아웃한 다음 명령으로 **Skill 링크만** 설치할 수 있어요. 원격 MCP는 [README](../README.md#시작하기)의 방법으로 별도로 연결합니다.

```bash
npm run install:user -- --check
npm run install:user
```

설치 위치는 `~/.agents/skills/manage-dev-knowledge`입니다. 기존 파일·다른 Skill을 덮어쓰지 않으며, 새 Codex 세션에서 실제 발견과 호출을 확인합니다. 자산 변경은 Git에서 검토·승인하고, 게시 후 원격 MCP의 `revision`과 본문을 확인해요.

## 이전 로컬 MCP 설정에서 전환

기존에 `personal-knowledge`를 설치했다면 아래 순서로 전환하세요. 이 절차는 **안내**이며 실행 중인 사용자의 컴퓨터 설정을 자동 변경하지 않습니다.

1. **먼저 원격 연결을 확인해요.** 기존 로컬 연결은 유지한 채 원격 `my-context`에 로그인하고, `chub_list`의 `revision`과 `chub_get`의 실제 자산 본문을 확인하세요. 원격 조회가 실패하면 전환을 중단합니다.
2. **기존 설정을 백업하고 소유권을 확인해요.** Codex 설정 파일은 `$CODEX_HOME/config.toml` 또는 `~/.codex/config.toml`입니다. 변경 전 파일을 별도로 복사해 두고, `[mcp_servers.personal-knowledge]` 섹션의 `command`/`args`가 **이 저장소의 이전 `scripts/context-hub-mcp.sh`**를 가리키는지 확인하세요.
3. **대상이 일치할 때만 해당 섹션을 해제해요.** `[mcp_servers.personal-knowledge]`와 그 섹션에 속하는 항목만 제거하고, 다음 TOML 섹션부터는 그대로 유지하세요. 다른 서버의 설정·사용자가 변경한 항목이거나 소유권이 불확실하면 삭제하지 말고 수동 검토하세요.
4. **새 세션에서 다시 검증해요.** `my-context`의 `chub_list`·`chub_get`을 다시 호출하고 `personal-knowledge`가 등록 서버 목록에서 사라졌는지 확인하세요. 실패하면 백업한 `config.toml`을 복구하고 원격 인증·연결부터 확인하세요.
5. **로컬 파일은 별도 판단해요.** 기존 관리 Skill 링크 `~/.agents/skills/manage-dev-knowledge`는 보존합니다. `.local/`, `.generated/context-hub/`의 생성물은 소유·내용 및 다른 작업에서 사용하지 않는지 확인한 후에만 정리할 수 있습니다.

이 저장소는 기존 Codex 설정을 자동으로 제거하거나 변경하지 않아요. 전환 성공은 **로컬 서버 삭제 여부가 아니라 새 세션의 실제 원격 조회 결과**로 판단합니다.

## 문제가 발생했을 때

| 증상 | 먼저 확인할 사항 |
| --- | --- |
| Skill을 찾지 못함 | `--check` 결과, 링크 대상, 새로운 에이전트 세션의 실제 로드 |
| MCP 호출 실패 | 연결 이름, 인증 상태, `chub_list` 실제 호출 |
| 지침 `outdated` | 기존 관리 구간을 확인하고 `npm run setup:agent`로 최신화 |
| 설치 충돌 | 기존 설정과 심볼릭 링크 소유·대상 확인. 무단 덮어쓰기 금지 |
| 검색 결과 누락 | 운영 자산 범위, 게시 목록, 검색어, 운영 `revision` |
| MCP는 연결되지만 도구가 없음 | 에이전트의 도구 노출, 서버 이름, 새 세션에서 `chub_list` 호출 |
| 자산 조회 오류 | 검색 ID·`revision`을 확인하고 `chub_get`에 정확한 파일 경로 전달 |

진단은 **연결·인증 → `chub_list` 호출 → 자산 게시·`revision` → `chub_search`·`chub_get` → 실제 에이전트 적용** 순서로 진행해요. 인증 실패, 미게시, 버전 차이와 모델 행동 실패를 구분해야 해요.

설치 성공과 에이전트의 실제 도구 사용은 다르다. [E2E 가이드](../test/workflow-evaluation.md)에서 별도로 확인한다.
