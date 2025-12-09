const projectIdCandidates = [
  'PROJECT_ID',
  'VOICEFLOW_PROJECT_ID',
  'VOICEFLOW_AGENT_ID',
  'VOICEFLOW_ASSISTANT_ID',
  'NEXT_PUBLIC_PROJECT_ID',
];

const apiKeyCandidates = [
  'API_KEY',
  'VOICEFLOW_API_KEY',
  'VOICEFLOW_DM_API_KEY',
  'NEXT_PUBLIC_API_KEY',
];

const versionIdCandidates = ['VERSION_ID', 'VOICEFLOW_VERSION_ID'];

function firstDefined(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

export function getProjectId(): string | undefined {
  return firstDefined(projectIdCandidates);
}

export function getApiKey(): string | undefined {
  return firstDefined(apiKeyCandidates);
}

export function getVersionId(): string | undefined {
  return firstDefined(versionIdCandidates);
}





