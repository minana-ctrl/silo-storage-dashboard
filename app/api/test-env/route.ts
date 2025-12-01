import { NextResponse } from 'next/server';
import { getApiKey, getProjectId, getVersionId } from '@/lib/env';

export async function GET() {
  return NextResponse.json({
    projectId: getProjectId() ? 'Present' : 'Missing',
    apiKey: getApiKey() ? 'Present' : 'Missing',
    versionId: getVersionId() ? 'Present' : 'Missing',
  });
}

