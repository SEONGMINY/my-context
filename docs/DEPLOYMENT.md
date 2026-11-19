# MCP 연결과 배포

## 운영 사용자 추가

1. Cloudflare Zero Trust에서 **Access controls → Applications → my-context-production**을 열어 주세요.
2. **Access policies → Create new policy**에서 **Allow**를 선택해 주세요. **Include → Emails**에 추가할 사용자의 정확한 로그인 이메일을 넣어 주세요.
3. 정책을 저장하고 운영 앱에 연결해 주세요. 사용자가 Cloudflare 로그인으로 [MCP 연결](../README.md#codex에-연결하기)을 확인하게 해 주세요.

운영 앱에는 파일럿과 공유하는 소유자 정책이 있어요. 추가 사용자는 운영 앱 전용 정책에 넣으면 파일럿의 허용 목록을 그대로 유지할 수 있어요. 허용된 사용자는 운영 MCP에 배포된 모든 자산을 조회할 수 있어요. GitHub 저장소나 Cloudflare 관리자 초대, Worker 재배포는 필요 없어요. [Access 정책](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)

## 배포 설정

| 이름 | 용도 |
| --- | --- |
| `MY_CONTEXT_ACCESS_TEAM_DOMAIN` | Access 팀의 HTTPS 주소예요. |
| `MY_CONTEXT_ACCESS_AUD` | 운영 Access 앱의 Audience 태그예요. |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions가 Worker를 배포할 때만 사용해요. |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions가 배포할 Cloudflare 계정을 지정해요. |

## Managed OAuth 파일럿

`my-context-oauth-pilot`은 로그인 흐름을 확인하는 별도 Worker예요. 허용된 사용자는 브라우저에서 로그인해요. Codex는 Cloudflare Access가 발급한 토큰을 사용해요. 운영 Worker는 별도의 Access 앱과 Audience를 사용해요.

### 파일럿 배포 준비

같은 Cloudflare 계정에 Zero Trust를 설정해 주세요. 운영자에게는 Worker 배포 권한과 Access 앱 편집 권한이 필요해요. Access 무료 플랜은 최대 50명을 지원해요. [Workers의 Access 설정](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) · [Zero Trust 권한](https://developers.cloudflare.com/cloudflare-one/roles-permissions/) · [Cloudflare 요금](https://www.cloudflare.com/plans/)

1. 승인된 테스트 커밋을 선택해 주세요. 처음에는 빈 인덱스나 임시 자산을 사용해 주세요.
2. `npm ci`를 실행해 주세요.
3. `npm run worker:build -- <git-revision>`으로 테스트 커밋을 빌드해 주세요.
4. Access 설정에 Worker가 먼저 필요하다면 `npm run worker -- deploy --config wrangler.oauth.jsonc`를 실행해 주세요. 파일럿은 필수 Access 설정이 없으면 조회를 거부해요.

### Access 앱 만들기

1. Zero Trust에서 파일럿 호스트만 보호하는 **Self-hosted Access 앱**을 만들어 주세요. Wrangler가 표시한 `workers.dev` 호스트 전체를 선택해 주세요.
2. **Allow** 정책에 승인된 사용자 이메일을 추가해 주세요. 사용자는 GitHub 저장소나 Cloudflare 관리 계정에 초대할 필요가 없어요.
3. Cloudflare 로그인 또는 이메일 일회용 코드 중 사용할 로그인 방식을 선택해 주세요.
4. Access 앱의 고급 설정에서 **Managed OAuth**를 켜 주세요. Codex가 동적 등록에 루프백 주소를 사용하면 해당 콜백을 허용해 주세요.
5. Zero Trust 팀 도메인과 **Application Audience (AUD) Tag**를 확인해 주세요.

파일럿 `workers.dev` 주소에서 허용된 Cloudflare 계정으로 Codex에 로그인했어요. 빈 인덱스에서 `chub_list` 응답을 확인했고, 인증 정보가 없거나 유효하지 않은 요청은 `401`로 거부됐어요. 같은 계정의 허용 정책을 잠시 분리한 상태에서 새 로그인도 거부되는지 확인한 뒤 정책을 다시 연결했어요. [호스트 보호](https://developers.cloudflare.com/workers/configuration/cloudflare-access/#protect-a-specific-hostname-custom-domain-or-path) · [Managed OAuth](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/managed-oauth/) · [이메일 로그인](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/) · [AUD 확인](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/#get-your-aud-tag)

### 로그인과 거부 확인

1. 아래 명령의 팀 도메인과 AUD를 파일럿 Access 앱의 값으로 바꿔 주세요.
2. 아래 명령으로 파일럿을 배포해 주세요.

   ```bash
   npm run worker -- deploy --config wrangler.oauth.jsonc \
     --var 'MY_CONTEXT_ACCESS_TEAM_DOMAIN:https://<team>.cloudflareaccess.com' \
           'MY_CONTEXT_ACCESS_AUD:<aud-tag>'
   ```

3. 인증 헤더 없이 파일럿 `/mcp`에 `POST`를 보내 주세요. `401` 응답의 `WWW-Authenticate` 헤더에서 OAuth 검색 정보를 확인해 주세요.
4. Wrangler가 표시한 주소에 `/mcp`를 붙여 Codex에 새 연결을 등록해 주세요. 파일럿 연결에는 공유 Bearer 토큰을 설정하지 마세요.

   ```bash
   codex mcp add my-context-oauth-pilot --url 'https://<pilot-host>/mcp'
   ```

5. 브라우저가 열리면 허용된 이메일로 로그인해 주세요. 브라우저가 열리지 않으면 `codex mcp login my-context-oauth-pilot`을 실행해 주세요. `chub_list`를 호출해 주세요. 임시 자산을 배포했다면 `chub_get`도 호출해 주세요.
6. 별도 로그인 세션에서 허용 목록에 없는 이메일로 접속해 주세요. 조회가 거부되는지 확인해 주세요.
7. 공유 Bearer 토큰만 사용한 파일럿 요청이 거부되는지 확인해 주세요.

Worker는 `Cf-Access-Jwt-Assertion`의 서명, 발급자, AUD, 만료를 확인해요. Access 설정이 없거나 인증 검증에 실패하면 요청을 거부해요. 검증이 끝나기 전까지 운영 연결을 사용해 주세요. [Access 토큰 검증](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) · [Codex OAuth 연결](https://learn.chatgpt.com/docs/extend/mcp)

## 수동 배포

배포에는 저장소 접근 권한, Cloudflare 계정, Node.js 22.22.0 이상이 필요해요.

1. [관리 Skill](../skills/manage-dev-knowledge/SKILL.md)에 따라 변경안을 검토해 주세요.
2. 작업 절차를 배포할 때는 해당 폴더 이름을 [배포 목록](../publish-skills.json)에 넣어 주세요.
3. 승인된 변경을 Git에 커밋해 주세요.
4. 운영 앱의 팀 도메인과 AUD를 셸 변수에 설정하고 저장소 루트에서 아래 명령을 실행해 주세요.

   ```bash
   npm ci &&
   npm run worker:build -- HEAD &&
   npm run worker -- deploy --config wrangler.jsonc \
     --var "MY_CONTEXT_ACCESS_TEAM_DOMAIN:$MY_CONTEXT_ACCESS_TEAM_DOMAIN" \
           "MY_CONTEXT_ACCESS_AUD:$MY_CONTEXT_ACCESS_AUD"
   ```

5. 배포한 MCP에서 `chub_list`를 호출해 주세요.
6. 새로 배포한 파일을 `chub_get`으로 읽어 주세요.

Worker 빌드는 지정한 Git 커밋을 사용해요. 첫 배포에서 Wrangler 로그인 화면이 열리면 배포할 계정으로 로그인해 주세요.

## 운영 배포 복구

배포 전에 `npm run worker -- deployments list --config wrangler.jsonc`로 정상 동작 중인 버전 ID를 확인해 주세요. 문제가 생기면 `npm run worker -- rollback <버전-ID> --config wrangler.jsonc`로 해당 버전을 복구해 주세요. 운영 주소에서 OAuth 로그인과 `chub_list`를 확인해 주세요.

OAuth 전환 전 Bearer 버전으로 돌아가야 한다면 먼저 Worker를 해당 버전으로 복구해 주세요. 그다음 운영 호스트의 Access 보호를 해제하고 기존 연결을 확인해 주세요. 이 복구에는 기존 `MY_CONTEXT_MCP_TOKEN` 비밀이 필요해요. [Worker 버전 복구](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)

## GitHub Actions

PR과 `master` 푸시에서 인증 테스트, 릴리스 통합 테스트, Worker 빌드, Wrangler 드라이런을 실행해요. 이 검증에는 Cloudflare 자격 증명이 필요 없어요. [워크플로 파일](../.github/workflows/worker.yml)

운영 MCP를 OAuth로 전환하고 브라우저 로그인과 배포 복구 방법을 확인한 다음, Actions의 수동 배포를 설정해 주세요.

1. GitHub의 `production` 환경에 `CLOUDFLARE_ACCOUNT_ID`, `MY_CONTEXT_ACCESS_TEAM_DOMAIN`, `MY_CONTEXT_ACCESS_AUD` 변수를 추가해 주세요. 팀 도메인은 `https://`를 포함하고 AUD는 운영 Access 앱의 값을 사용해요.
2. 대상 Cloudflare 계정의 Workers 배포로 범위를 제한한 API 토큰을 만들어 `production` 환경의 `CLOUDFLARE_API_TOKEN` 비밀에 넣어 주세요. [Cloudflare의 GitHub Actions 안내](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
3. 저장소의 Actions 변수 `MY_CONTEXT_PRODUCTION_DEPLOY_ENABLED`를 `true`로 설정해 주세요.
4. Actions의 **Worker CI and deploy**에서 `master`를 선택하고 `deploy_production`을 켜서 실행해 주세요. 같은 커밋의 검증과 운영 OAuth 확인이 통과하면 배포해요.
5. 배포가 끝나면 운영 주소에 연결해 주세요. 새 자산을 배포했다면 Codex에서 해당 자산을 조회해 주세요.

GitHub Actions 없이 자동 배포하려면 [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)에서 기존 Worker를 GitHub에 연결할 수 있어요. 이 경우 Cloudflare가 배포 자격 증명을 관리해요.
