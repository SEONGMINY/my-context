# 운영과 배포

## 운영 사용자 추가

1. Cloudflare Zero Trust에서 **Access controls → Applications → my-context**를 열어 주세요.
2. 운영 전용 **Allow** 정책의 **Include → Emails**에 사용자의 로그인 이메일을 추가해 주세요.
3. 해당 정책을 운영 Access 앱에 연결해 주세요.
4. 사용자에게 [Codex 연결 방법](../README.md#my-context-mcp-연결하기)을 안내해 주세요.

허용된 사용자는 운영 MCP의 모든 게시 자산을 조회할 수 있어요. 저장소 초대와 Worker 재배포는 필요 없어요.

**공개 범위:** 현재 GitHub 저장소는 공개(`public`) 상태예요. 커밋된 Markdown 원본은 MCP 인증과 관계없이 GitHub에서 볼 수 있어요. Cloudflare Access는 **운영 MCP 요청**을 제한할 뿐 GitHub 원본을 비공개로 만들지 않아요. 비공개 정보를 게시해야 한다면 저장소 가시성과 게시 정책부터 별도로 검토해 주세요.

소유자 정책은 운영 Access 앱과 파일럿 Access 앱에 모두 적용돼요. [Access 정책 관리](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/policy-management/)

## 운영 배포

워크플로는 배포할 **Git 커밋**에서 자산을 읽어요. `content/`에서는 `SKILL.md` 또는 `DOC.md` 진입 파일이 있는 자산을 게시하고, `skills/`에서는 [배포 목록](../publish-skills.json)에 지정한 Skill만 게시해요. 각 게시 자산의 첨부 파일도 함께 포함해요. 파일을 저장소에 추가하는 것만으로 MCP에 게시되지는 않아요.

배포 전에 `npm run worker -- deployments list --config wrangler.jsonc`로 정상 버전 ID를 기록해 주세요.

운영 배포 Job은 **수동 실행(`workflow_dispatch`)**, `master` 선택, `deploy_production=true`, GitHub Actions 변수 `MY_CONTEXT_PRODUCTION_DEPLOY_ENABLED=true`가 모두 충족될 때만 실행돼요. `true`가 아니면 검증이 성공해도 운영 배포는 `skipped`예요. 운영 환경에는 `CLOUDFLARE_API_TOKEN`(secret), `CLOUDFLARE_ACCOUNT_ID`, `MY_CONTEXT_ACCESS_TEAM_DOMAIN`, `MY_CONTEXT_ACCESS_AUD`(variables)도 올바르게 설정돼 있어야 해요.

1. [관리 절차](../skills/manage-dev-knowledge/SKILL.md)에 따라 배포할 자산과 첨부 파일을 검토해 주세요.
2. 승인받은 변경을 `master`에 반영해 주세요.
3. GitHub에서 **Actions → Worker CI and deploy → Run workflow**를 열어 주세요.
4. `master`를 선택해 주세요.
5. `deploy_production`을 선택해 주세요.
6. **Run workflow**를 눌러 주세요.

조건이 충족되고 검증을 통과하면 [워크플로](../.github/workflows/worker.yml)가 선택한 커밋을 배포해요. **Validate Worker 성공만으로 운영 배포를 완료했다고 판단하지 마세요.**

### 배포 확인

1. GitHub Actions에서 **Deploy production Worker** Job이 `success`인지 확인해 주세요. `skipped`는 배포 완료가 아니에요.
2. 운영 MCP에 로그인해 `chub_list`를 호출해 주세요.
3. 응답에 `revision`이 있다면 **의도한 배포 커밋 SHA와 일치**하는지 확인해 주세요. 값이 없으면 이전 Worker일 수 있으므로 최신 버전 반영을 확인했다고 주장하지 마세요.
4. 새 자산을 게시했다면 `chub_search`로 검색하고 `chub_get`으로 본문 및 필요한 첨부 파일을 조회해 주세요.

### 배포 자격 증명 교체

1. Cloudflare에서 계정 API 토큰을 발급해 주세요. `minylee` Worker에만 **Individual Workers Editor** 권한을 주세요.
2. 토큰을 GitHub `production` 환경의 `CLOUDFLARE_API_TOKEN` 비밀에 저장해 주세요.

[Cloudflare 권한 안내](https://developers.cloudflare.com/workers/authorization/)

운영 Access 앱을 교체하면 GitHub `production` 환경에서 두 값을 확인해 주세요.

- `MY_CONTEXT_ACCESS_TEAM_DOMAIN`에 Access 팀의 HTTPS 주소를 입력해 주세요.
- `MY_CONTEXT_ACCESS_AUD`에 새 Access 앱의 **Application Audience (AUD) Tag**를 입력해 주세요.

### Wrangler로 배포

GitHub Actions를 사용할 수 없으면 Wrangler로 배포해 주세요.

1. Node.js 버전은 [package.json](../package.json)의 `engines`에서 확인해 주세요.
2. [워크플로 설정](../.github/workflows/worker.yml)의 설치 명령으로 의존성을 설치해 주세요.
3. 배포할 커밋을 빌드해 주세요.
4. Wrangler에 로그인해 주세요.
5. 워크플로의 배포 명령에 운영 Access 앱의 팀 주소와 AUD를 넣어 실행해 주세요.

## 복구

장애가 발생하면 `npm run worker -- rollback <버전-ID> --config wrangler.jsonc`를 실행해 주세요. 복구 후 [배포 확인](#배포-확인) 절차를 따라 주세요. [Worker 버전 복구](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)

## 이전 주소에서 전환

이전 주소 `my-context.my-context.workers.dev`는 기존 연결을 지원해요. 이후 배포는 현재 운영 주소에만 적용돼요.

1. 이전 주소를 사용 중이면 [Codex 연결](../README.md#my-context-mcp-연결하기)을 갱신해 주세요.
2. 새 연결에서 `chub_list`를 호출해 주세요.
3. 이전 연결 이름이 `my-context-cloudflare`라면 `codex mcp remove my-context-cloudflare`를 실행해 주세요.

## OAuth 파일럿

1. OAuth 정책을 시험할 때는 승인된 빈 인덱스나 임시 자산을 사용해 주세요.
2. 파일럿 Access 앱에 **Managed OAuth**를 설정해 주세요.
3. Codex 로컬 콜백을 허용해 주세요.
4. 배포 명령에 [파일럿 설정](../wrangler.oauth.jsonc)을 지정해 주세요.
5. 파일럿 Access 앱의 팀 주소와 AUD를 사용해 배포해 주세요.
6. 허용된 계정으로 파일럿 MCP에 로그인해 주세요.
7. `chub_list`를 호출해 주세요.
8. 허용 목록에 없는 계정의 로그인이 거부되는지 확인해 주세요.

[Managed OAuth 설정](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/managed-oauth/)
