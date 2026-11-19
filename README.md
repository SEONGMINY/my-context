# my-context

**프로젝트나 노트북이 바뀌어도 내 개발 원칙과 작업 절차를 다시 쓸 수 있어요.**

my-context는 원칙, 작업 절차, 템플릿, 보조 스크립트를 비공개 Git 저장소에 보관해요. Codex는 요청을 받으면 같은 원격 MCP 주소에서 필요한 내용을 가져와요.

## Codex에 연결하기

노트북마다 MCP 연결을 한 번 등록해요. 운영자가 허용한 이메일로 브라우저에서 로그인해 주세요.

1. 아래 명령으로 연결을 등록해 주세요.

   ```bash
   codex mcp add my-context-cloudflare \
     --url https://my-context.my-context.workers.dev/mcp
   ```

2. 브라우저가 열리면 Cloudflare로 로그인해 주세요. 브라우저가 열리지 않으면 `codex mcp login my-context-cloudflare`를 실행해 주세요.
3. 새 Codex 세션을 열어 주세요.
4. “`my-context-cloudflare`의 `chub_list`를 호출해줘”라고 요청해 주세요.

빈 목록도 연결에 성공한 결과예요. 기존 Bearer 연결을 사용했다면 해당 연결의 토큰 설정을 지우고 다시 등록해 주세요. [사용자 관리와 연결 설정](docs/DEPLOYMENT.md#운영-사용자-추가)

## 사용 예시

```text
my-context에서 내 도메인 스토리텔링 절차를 찾아줘.
그 절차의 템플릿으로 이 프로젝트의 업무 흐름을 정리해줘.
```

조회한 내용은 현재 프로젝트의 규칙에 맞춰 적용해요. 스크립트도 해당 프로젝트에서 실행해요. 검색 결과가 없다면 `testing`처럼 관련 영문 키워드를 써 보세요.

## 조회와 배포

```mermaid
flowchart LR
    git["비공개 Git 저장소"] -->|"승인된 커밋을 빌드"| bundle["검색 인덱스와 파일"]
    bundle -->|"수동 배포"| worker["Cloudflare Worker · 읽기 전용 MCP"]
    laptopA["노트북 A · Codex"] <-->|"인증된 조회"| worker
    laptopB["노트북 B · Codex"] <-->|"인증된 조회"| worker
```

Codex는 Worker에 배포된 버전을 조회해요. 각 노트북에는 MCP 연결만 등록하면 돼요.

개발 원칙은 `content/`에 보관해요. 재사용할 절차와 첨부 파일은 `skills/`에 보관해요. 변경 승인과 수동 배포는 [배포 가이드](docs/DEPLOYMENT.md)를 참고해 주세요.

제품의 방향과 출발점은 [VISION](docs/VISION.md)과 [PROBLEM](docs/PROBLEM.md)에 있어요.
