# 운영과 배포

## 운영 사용자 추가

Cloudflare Zero Trust에서 **Access controls → Applications → my-context**를 열어요. 운영 전용 **Allow** 정책의 **Include → Emails**에 사용자의 로그인 이메일을 넣고 앱에 연결해요.

허용된 사용자는 운영 MCP에 배포된 모든 자산을 조회할 수 있어요. 저장소 초대와 Worker 재배포는 필요 없어요. 새 사용자는 [Codex 연결 방법](../README.md#codex에-연결하기)을 따라 로그인해요.

운영 앱과 파일럿이 공유하는 소유자 정책은 두 앱에 적용돼요. 운영에만 초대할 사람은 운영 전용 정책에 추가해요. [Access 정책 관리](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/policy-management/)

## 승인된 자산 배포

배포 커밋의 `content/` 아래 등록된 지식과 배포 목록에 지정한 `skills/` 항목이 조회 대상이에요. 본문과 함께 포함되는 첨부 파일도 검토해 주세요.

1. [관리 절차](../skills/manage-dev-knowledge/SKILL.md)에 따라 변경을 승인받고 커밋해요. 공통 작업 절차를 배포하려면 [배포 목록](../publish-skills.json)에 폴더 이름을 추가해요.
2. Cloudflare Wrangler에 로그인하고, 운영 Access 앱의 팀 HTTPS 주소와 **Application Audience (AUD) Tag**를 아래 이름의 셸 변수에 설정해요. Node.js 버전은 [package.json](../package.json)의 `engines`를 확인해요.
3. 저장소 루트에서 실행해요. `HEAD`가 배포하려는 커밋인지 확인해요. 빌드는 해당 커밋의 지식과 배포 목록을 사용해요.

   ```bash
   npm ci &&
   npm run worker:build -- HEAD &&
   npm run worker -- deploy --config wrangler.jsonc \
     --var "MY_CONTEXT_ACCESS_TEAM_DOMAIN:${MY_CONTEXT_ACCESS_TEAM_DOMAIN:?Set the Access team URL}" \
           "MY_CONTEXT_ACCESS_AUD:${MY_CONTEXT_ACCESS_AUD:?Set the Access audience}"
   ```

4. 운영 주소에 로그인해 `chub_list`를 호출해요. 새 자산을 배포했다면 `chub_search`로 찾고 `chub_get`으로 본문이나 첨부 파일을 확인해요.

### GitHub Actions로 수동 배포

[Worker 워크플로](../.github/workflows/worker.yml)는 배포 자격 증명 없이 검증할 수 있어요. 운영 배포를 연결할 때는 GitHub의 `production` 환경에 아래 값을 설정해요.

- 환경 변수 `CLOUDFLARE_ACCOUNT_ID`, `MY_CONTEXT_ACCESS_TEAM_DOMAIN`, `MY_CONTEXT_ACCESS_AUD`
- 환경 비밀 `CLOUDFLARE_API_TOKEN`. 운영 Worker에만 **Workers Editor** 권한을 가진 계정 API 토큰을 사용해요. [Cloudflare 권한 안내](https://developers.cloudflare.com/workers/authorization/)

저장소의 Actions 변수 `MY_CONTEXT_PRODUCTION_DEPLOY_ENABLED`를 `true`로 설정해요. **Worker CI and deploy → Run workflow**에서 `master`와 `deploy_production`을 선택해요. 배포 후에는 수동 배포와 같은 방법으로 운영 조회를 확인해요.

## 복구

배포 전에 `npm run worker -- deployments list --config wrangler.jsonc`로 정상 버전 ID를 기록해요. 장애가 발생하면 `npm run worker -- rollback <버전-ID> --config wrangler.jsonc`를 실행한 뒤 운영 주소에서 OAuth 로그인과 조회를 확인해요. [Worker 버전 복구](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)

이전 주소 `my-context.my-context.workers.dev`는 기존 기기의 전환을 위해 남겨 두었어요. 이후 배포는 새 주소에만 적용돼요. 이전 주소를 쓰는 기기는 [Codex 연결](../README.md#codex에-연결하기)을 갱신해요. 이전 연결 이름이 `my-context-cloudflare`라면 새 연결을 확인한 뒤 `codex mcp remove my-context-cloudflare`로 정리해요.

## OAuth 파일럿

OAuth 정책을 시험할 때는 [파일럿 설정](../wrangler.oauth.jsonc)을 사용해요. 승인된 테스트 커밋에 빈 인덱스나 임시 자산을 담아요. 운영 배포 명령의 설정 파일을 `wrangler.oauth.jsonc`로 바꾸고 파일럿 Access 앱의 팀 주소와 AUD를 사용해요.

파일럿 호스트에 적용한 **Self-hosted** Access 앱에서 **Managed OAuth**를 켜요. Codex가 사용하는 로컬 콜백을 허용해요. 새 Codex 연결에서 허용된 사용자의 로그인과 조회, 허용되지 않은 로그인 및 미인증 요청의 거부를 확인해요. [Managed OAuth 설정](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/managed-oauth/)
