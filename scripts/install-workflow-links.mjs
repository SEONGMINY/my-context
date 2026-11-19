import * as fs from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

// plan은 기존 설치 경로에 대한 충돌 검사를 마친 결과다.
// 실패 시 이번 호출에서 생성한 링크와 빈 디렉터리만 되돌린다.
export function applyPlannedSkillLinks(plan, source, fileSystem = fs) {
  const links = [];
  const directories = [];

  try {
    for (const { path, action } of plan) {
      if (action !== 'link') continue;

      const parent = dirname(path);
      const firstCreated = fileSystem.mkdirSync(parent, { recursive: true });
      if (firstCreated) {
        let current = firstCreated;
        directories.push(current);
        for (const segment of relative(firstCreated, parent).split(sep).filter(Boolean)) {
          current = join(current, segment);
          directories.push(current);
        }
      }

      fileSystem.symlinkSync(source, path, 'dir');
      links.push(path);
    }
  } catch (cause) {
    const cleanupErrors = [];

    for (const path of links.reverse()) {
      try {
        fileSystem.unlinkSync(path);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    for (const path of directories.reverse()) {
      try {
        fileSystem.rmdirSync(path);
      } catch (error) {
        if (error.code !== 'ENOENT') cleanupErrors.push(error);
      }
    }

    if (cleanupErrors.length) {
      throw new AggregateError(
        [cause, ...cleanupErrors],
        'Skill 설치 실패 후 일부 변경 사항을 정리하지 못했습니다. 설치 경로를 확인하세요.',
      );
    }
    throw cause;
  }
}
