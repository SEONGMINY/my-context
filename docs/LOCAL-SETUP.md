# 로컬 Skill 및 선택적 활용 설정

개인 원칙·공통 Skill의 **일상적인 검색·조회는 원격 `my-context` MCP 하나를 사용**해요. 원격 조회만 필요하다면 저장소를 클론하거나 Skill을 설치할 필요가 없어요. [원격 연결](../README.md#시작하기)

로컬 환경은 **지식 원본 변경, 로컬 Skill 직접 호출, 변경 전 테스트**에만 필요합니다. 로컬 `personal-knowledge` MCP와 그 전용 지식 인덱스 설치는 더 이상 지원하지 않아요.

## 사용 목적별 선택

| 하고 싶은 일 | 사용 경로 |
| --- | --- |
| 게시된 원칙·Skill 검색·조회 | 원격 MCP (로그인 필요) |
| 원칙 등록·수정·삭제 | 원격 조회 + 로컬 Git 원본 + [관리 Skill](../skills/manage-dev-knowledge/SKILL.md) |
| 네이티브 Workflow Skill 호출 | 선택적 로컬 Skill 설치 |
| 배포 전 확인 | 저장소의 릴리스·Worker 검증 ([운영 안내](DEPLOYMENT.md)) |

MCP 연결, Skill 설치, 선택적 자동 활용 동의는 서로 다른 동작이에요. 설치했다고 AI가 자동 활용하는 것은 아닙니다.

## 환경

Node.js 버전은 [package.json](../package.json)의 `engines`를 따릅니다(`^20.20.0 || >=22.22.0`). Skill 설치는 심볼릭 링크를 사용하므로 Windows 네이티브 지원은 보장하지 않습니다. 실제 발견·적용은 [E2E 가이드](../test/workflow-evaluation.md)에서 검증합니다.

## 선택적 조회 정책

`policies/asset-usage.md`의 공통 정책을 Codex `~/.codex/AGENTS.md`, Pi `~/.pi/agent/AGENTS.md`, Claude Code `~/.claude/CLAUDE.md`에 관리 구간으로 추가해요. `CODEX_HOME`, `PI_CODING_AGENT_DIR`, `CLAUDE_CONFIG_DIR`이 설정되면 해당 위치를 사용해요.

| 목적 | 명령 |
| --- | --- |
| 기존 정책 확인(쓰기 없음) | `npm run policy:check` |
| 동의한 정책 설치·갱신 | `npm run policy:enable` |
| 관리 구간 제거 | `npm run policy:disable` |

확인 결과는 `disabled`(미설치), `enabled`(현재 정책), `outdated`(이전 정책)로 표시돼요. **기존 개인 원칙 전용 동의를 공통 Skill 자동 활용 동의로 확대하지 않아요.** `outdated`라면 변경된 범위를 검토하고 동의하는 경우에만 다시 활성화해 주세요. 새 정책은 관련 개인 원칙과 공통 Skill(인사이트 추출 포함)의 선택적 활용을 허용하지만, 추가 개인 자료 접근이나 지식 변경 권한을 부여하지 않아요.

설치기는 **세 대상 파일을 먼저 확인**하고 기존 내용을 보존해요. 관리 구간만 변경·제거하며, 예상과 다른 마커·수정된 관리 구간·심볼릭 링크·설치 충돌을 발견하면 덮어쓰지 않고 중단해요. 변경 중 실패하면 이번에 변경한 항목의 복구를 시도하고 복구 실패도 보고해요. 기존 파일에 다른 내용이 있으면 관리 구간만 제거해요.

활성화 후 새 세션에서 사용자 지침 로딩, MCP 연결·인증, 실제 조회를 각각 확인해 주세요. 정책 설정만으로 MCP가 설치되거나 AI의 실제 적용이 보장되지는 않아요. 상세 행동 조건은 [정책 원본](../policies/asset-usage.md)을 따라요.

## Workflow Skill

`npm run install:workflow -- --check`로 확인하고 `npm run install:workflow`로 설치한다. 설치 경로는 `~/.agents/skills/development-workflow`(Codex·Pi), `~/.claude/skills/development-workflow`(Claude Code)이며 동일한 저장소 원본을 가리킨다. 충돌 시 기존 항목을 보존하고 부분 실패 시 이번 설치에서 만든 항목만 복구를 시도한다. 복구 실패는 오류로 보고된다.

새 세션에서 Codex는 `$development-workflow`, Pi는 `/skill:development-workflow`, Claude Code는 `/development-workflow`로 명시 호출한다. 자동 발견과 적용은 에이전트 버전 및 설정에 따라 확인해야 한다.

갱신은 원본의 Git 체크아웃을 검토 후 갱신하고 새 세션에서 호출을 확인한다. 저장소를 이동하거나 제거하려면 `ls -l ~/.agents/skills/development-workflow ~/.claude/skills/development-workflow`로 대상이 이 저장소를 가리키는 링크인지 확인한 뒤 해당 링크만 해제한다. 기존 파일이나 다른 저장소의 링크를 삭제하지 않는다.

설치되어 Skill 목록에 표시되는 것은 자동 활용 동의가 아니다. 기존 개인 원칙 전용 동의는 로컬 공통 Skill 자동 사용 권한이 아니며, 현재 작업에서 my-context 사용을 금지하면 동일 저장소의 로컬 Skill도 사용하지 않아야 한다. 이는 Host의 최초 파일 읽기 전에 적용돼야 하는 행동 계약이며, 메타데이터 문구만으로 파일 접근이 강제 차단되지는 않는다. 실제 Pi 등에서는 새 세션의 로컬 파일 읽기 기록으로 확인한다.

## 개인 지식 관리 Skill (선택)

원본을 수정해야 하는 관리자는 저장소를 체크아웃한 다음 다음 명령으로 **Skill 링크만** 설치할 수 있어요. 원격 MCP는 [README](../README.md#시작하기)의 방법으로 별도로 연결합니다.

```bash
npm run install:user -- --check
npm run install:user
```

설치 위치는 `~/.agents/skills/manage-dev-knowledge`입니다. 기존 파일·다른 Skill을 덮어쓰지 않으며, 새 Codex 세션에서 실제 발견과 호출을 확인합니다. 자산 변경은 Git에서 검토·승인하고, 게시 후 원격 MCP의 `revision`과 본문을 확인해요.

## 이전 로컬 MCP 설정에서 전환

기존에 `personal-knowledge`를 설치했다면 먼저 원격 `my-context` MCP가 실제로 조회되는지 확인하세요.

1. Codex `config.toml`에서 **`[mcp_servers.personal-knowledge]` 섹션이 이 저장소의 `scripts/context-hub-mcp.sh`를 실행하는 기존 관리 항목인지** 확인하세요.
2. 대상이 일치할 때만 해당 섹션과 그에 속한 설정 키를 수동으로 제거하세요. 인접한 다른 MCP 섹션이나 사용자 설정은 유지합니다. 사용자가 수정한 설정이라면 자동 삭제하지 말고 먼저 검토하세요.
3. 기존 관리 Skill 링크 `~/.agents/skills/manage-dev-knowledge`는 보존하세요. 더 이상 필요하지 않은 로컬 인덱스·설정 생성물(`.local/`, `.generated/context-hub/`)은 소유와 내용을 확인한 후에만 정리하세요.
4. 새 Codex 세션에서 원격 `my-context`의 `chub_list`·`chub_get`을 호출하고, `personal-knowledge`가 더 이상 연결되지 않았는지 확인하세요.

이 저장소는 사용자의 기존 Codex 설정을 자동으로 변경하거나 삭제하지 않습니다.

## 문제가 발생했을 때

| 증상 | 먼저 확인할 사항 |
| --- | --- |
| Skill을 찾지 못함 | `--check` 결과, 링크 대상, 새로운 에이전트 세션의 실제 로드 |
| MCP 호출 실패 | 연결 이름, 인증 상태, `chub_list` 실제 호출 |
| 정책 `outdated` | 기존 동의 범위와 새 정책을 비교한 뒤 동의할 때만 갱신 |
| 설치 충돌 | 기존 설정과 심볼릭 링크 소유·대상 확인. 무단 덮어쓰기 금지 |
| 검색 결과 누락 | 운영 자산 범위, 게시 목록, 검색어, 운영 `revision` |
| MCP는 연결되지만 도구가 없음 | 에이전트의 도구 노출, 서버 이름, 새 세션에서 `chub_list` 호출 |
| 자산 조회 오류 | 검색 ID·`revision`을 확인하고 `chub_get`에 정확한 파일 경로 전달 |

진단은 **연결·인증 → `chub_list` 호출 → 자산 게시·`revision` → `chub_search`·`chub_get` → 실제 에이전트 적용** 순서로 진행해요. 인증 실패, 미게시, 버전 차이와 모델 행동 실패를 구분해야 해요.

설치 성공과 에이전트의 실제 도구 사용은 다르다. [E2E 가이드](../test/workflow-evaluation.md)에서 별도로 확인한다.
