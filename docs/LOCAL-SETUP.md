# 로컬 설정

이 문서는 로컬 설치·갱신·제거의 상세 안내다. 원격 MCP만 이용할 때는 저장소 클론이나 Skill 설치가 필요하지 않다. [사용 방법](../README.md)

## 환경

지원 Node.js 버전은 [package.json](../package.json)의 `engines`를 기준으로 한다(`^20.20.0 || >=22.22.0`). 로컬 관리 연결은 `/bin/sh`, 설치기는 심볼릭 링크를 사용한다. 이러한 기능이 없는 환경은 별도 확인이 필요하며 Windows 네이티브 지원을 보장하지 않는다. 에이전트의 실제 발견 및 인증 여부는 [E2E 가이드](../test/workflow-evaluation.md)에 따라 검증한다.

## 로컬과 원격 중 무엇을 쓰나요?

| 경로 | 자산 범위와 특징 |
| --- | --- |
| 원격 `my-context` MCP | 게시된 개인 원칙과 선택된 공통 Skill. Cloudflare Access 인증, 한국어 보완 검색, 배포 `revision` |
| 로컬 `personal-knowledge` MCP | 저장소의 `content/`를 로컬 빌드. 운영 Worker의 검색 보완·배포 리비전 계약 없음 |
| 로컬 Skill 설치 | 설치된 Skill 본문·첨부. MCP 연결 및 자동 활용 동의와 별개 |

원격 조회만 필요하면 로컬 설정은 필요하지 않다. [원격 연결 안내](../README.md#my-context-mcp-연결하기)

### 경로별 지원 범위

| 기능 | 원격 `my-context` MCP | 로컬 `personal-knowledge` MCP | 로컬 Skill |
| --- | --- | --- | --- |
| 개인 원칙 조회 | 게시된 원칙 | `content/`의 로컬 빌드 | 별도 자동 설치 대상 아님 |
| 공통 Skill | 게시 목록의 Skill | 미포함 | 설치한 Skill만 사용 |
| 배포 리비전 | `revision` 반환 | 운영 revision 계약 없음 | 현재 Git 원본 확인 |
| 한국어 보완 검색 | Worker에서 제공 | 동일 보완 기능 없음 | MCP 검색 API 없음 |
| 지식 변경 | 읽기 전용 | 조회용 | 관리 Skill과 승인 절차로 Git 원본 수정 |

MCP 연결, Skill 설치, 에이전트의 실제 적용은 서로 다른 상태예요. [실사용 E2E](../test/workflow-evaluation.md)에서 구분해 확인해 주세요.


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

## 문제가 발생했을 때

| 증상 | 먼저 확인할 사항 |
| --- | --- |
| Skill을 찾지 못함 | `--check` 결과, 링크 대상, 새로운 에이전트 세션의 실제 로드 |
| MCP 호출 실패 | 연결 이름, 인증 상태, `chub_list` 실제 호출 |
| 정책 `outdated` | 기존 동의 범위와 새 정책을 비교한 뒤 동의할 때만 갱신 |
| 설치 충돌 | 기존 설정과 심볼릭 링크 소유·대상 확인. 무단 덮어쓰기 금지 |
| 검색 결과 누락 | 로컬/운영 자산 범위, 게시 목록, 검색어, 운영 `revision` |
| MCP는 연결되지만 도구가 없음 | 에이전트의 도구 노출, 서버 이름, 새 세션에서 `chub_list` 호출 |
| 자산 조회 오류 | 검색 ID·`revision`을 확인하고 `chub_get`에 정확한 파일 경로 전달 |

진단은 **연결·인증 → `chub_list` 호출 → 자산 게시·`revision` → `chub_search`·`chub_get` → 실제 에이전트 적용** 순서로 진행해요. 인증 실패, 미게시, 버전 차이와 모델 행동 실패를 구분해야 해요.

설치 성공과 에이전트의 실제 도구 사용은 다르다. [E2E 가이드](../test/workflow-evaluation.md)에서 별도로 확인한다.
