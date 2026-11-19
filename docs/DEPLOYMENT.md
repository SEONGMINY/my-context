# MCP 연결과 배포

## 토큰 준비

| 이름 | 용도 | 어디에서 받나요? |
| --- | --- | --- |
| `MY_CONTEXT_MCP_TOKEN` | Codex의 조회 요청을 인증해요. | 운영자가 만든 Bearer 토큰이에요. |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions에서 Worker를 배포해요. | Cloudflare의 Account API tokens에서 만들어요. |
| `CLOUDFLARE_ACCOUNT_ID` | 배포할 Cloudflare 계정을 지정해요. | Cloudflare 대시보드에서 확인해요. |

운영 MCP는 공유 Bearer 토큰을 사용해요. 다른 노트북을 연결하려면 운영자에게 현재 토큰을 받아 주세요. 운영 토큰을 처음 만든다면 아래 명령을 사용해 주세요. 토큰 파일은 저장소 밖에 생겨요.

```bash
(
  umask 077
  set -C
  mcp_token=$(openssl rand -hex 32) || exit 1
  mkdir -p "$HOME/.config/my-context" &&
    printf 'MY_CONTEXT_MCP_TOKEN=%s\n' "$mcp_token" > "$HOME/.config/my-context/cloudflare-worker.env"
)
```

파일이 이미 있으면 기존 토큰을 사용해 주세요. 새 토큰으로 바꾸면 Worker와 각 Codex 연결에 같은 새 토큰을 적용해 주세요. [Cloudflare Worker 비밀 설정](https://developers.cloudflare.com/workers/configuration/secrets/)

### Codex 데스크톱

앱의 실행 환경에서 `MY_CONTEXT_MCP_TOKEN`을 읽을 수 있어야 해요. 토큰 파일을 사용하는 환경에서는 `http_headers_helper`로 헤더를 제공할 수 있어요. 이 설정에는 명령을 **문자열**로 넣어 주세요. 명령은 `Authorization` 헤더를 JSON으로 반환해요. [Codex MCP 설정](https://learn.chatgpt.com/docs/extend/mcp)

## Managed OAuth 파일럿

`my-context-oauth-pilot`은 로그인 흐름을 확인하는 별도 Worker예요. 허용된 사용자는 브라우저에서 로그인해요. Codex는 Cloudflare Access가 발급한 토큰을 사용해요. 운영 Worker는 기존 주소와 공유 Bearer 토큰을 계속 사용해요.

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

파일럿 `workers.dev` 주소에서 허용된 Cloudflare 계정으로 Codex에 로그인했어요. 빈 인덱스에서 `chub_list` 응답을 확인했고, 인증 정보가 없거나 유효하지 않은 요청은 `401`로 거부됐어요. 미허용 계정으로 로그인하는 검증도 필요해요. [호스트 보호](https://developers.cloudflare.com/workers/configuration/cloudflare-access/#protect-a-specific-hostname-custom-domain-or-path) · [Managed OAuth](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/managed-oauth/) · [이메일 로그인](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/) · [AUD 확인](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/#get-your-aud-tag)

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
4. 저장소 루트에서 아래 명령을 실행해 주세요.

   ```bash
   npm ci &&
   npm run worker:build -- HEAD &&
   npm run worker -- deploy --secrets-file "$HOME/.config/my-context/cloudflare-worker.env"
   ```

5. 배포한 MCP에서 `chub_list`를 호출해 주세요.
6. 새로 배포한 파일을 `chub_get`으로 읽어 주세요.

Worker 빌드는 지정한 Git 커밋을 사용해요. 첫 배포에서 Wrangler 로그인 화면이 열리면 배포할 계정으로 로그인해 주세요.

## GitHub Actions를 켜기 전에

1. **자산을 넣어 수동 배포해 주세요.** 원칙 하나와 첨부 파일이 있는 작업 절차 하나면 충분해요. 두 노트북에서 같은 MCP 주소로 검색과 파일 조회를 확인해 주세요.
2. **배포 없는 검증을 추가해 주세요.** 임시 자산으로 `worker:build`와 Wrangler 드라이런을 실행해 주세요. 기존 `node scripts/verify-release.mjs`는 로컬 HTTP 경로를 검증해요.
3. **배포 자격 증명을 준비해 주세요.** 대상 계정으로 범위를 제한한 Cloudflare API 토큰을 만들어 주세요. `CLOUDFLARE_API_TOKEN`과 `CLOUDFLARE_ACCOUNT_ID`를 GitHub Actions의 비밀 설정에 추가해 주세요. MCP 토큰은 Worker에 등록된 비밀을 사용해요. [Cloudflare의 GitHub Actions 안내](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
4. **수동 워크플로를 먼저 실행해 주세요.** 검증이 통과한 커밋에서 `npm run worker -- deploy`를 실행해 주세요. 같은 MCP 주소에서 새 자산을 조회해 주세요.
5. **자동 배포를 켜 주세요.** 수동 워크플로 검증이 끝나면 `master`에 반영된 변경에 배포를 연결해 주세요.

GitHub Actions 없이 자동 배포하려면 [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)에서 기존 Worker를 GitHub에 연결할 수 있어요. 이 경우 Cloudflare가 배포 자격 증명을 관리해요.
