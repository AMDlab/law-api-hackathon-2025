export interface LawRevision {
  revision_info: {
    law_revision_id: string;
    law_title: string;
    law_type: string;
    law_no: string;
  };
}

export interface LawListResponse {
  laws: LawRevision[];
}

export interface LawDataResponse {
  law_full_text: any; // Using any for now as the structure is complex
}

const API_BASE_URL = 'https://laws.e-gov.go.jp/api/2';

export const BUILDING_STANDARDS_ACT_ID = '325AC0000000201';

export async function fetchLawList(lawId: string): Promise<LawRevision[]> {
  const response = await fetch(`${API_BASE_URL}/laws?law_id=${lawId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch law list: ${response.statusText}`);
  }
  const data: LawListResponse = await response.json();
  return data.laws;
}

export async function fetchLawData(revisionId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/law_data/${revisionId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch law data: ${response.statusText}`);
  }
  const data = await response.json();
  return data.law_full_text;
}

export async function getBuildingStandardsAct() {
  const revisions = await fetchLawList(BUILDING_STANDARDS_ACT_ID);
  if (revisions.length === 0) {
    throw new Error('Building Standards Act not found');
  }
  // Get the latest revision (usually the first one or sorted by date? The API returns list. Usually the first is latest or we check dates.
  // The reference code just takes index 0.
  const latestRevision = revisions[0];
  const lawData = await fetchLawData(latestRevision.revision_info.law_revision_id);
  return lawData;
}

export async function searchLawIdByName(lawName: string): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/laws?law_title=${encodeURIComponent(lawName)}`);
  if (!response.ok) {
    console.error('Failed to search law');
    return null;
  }
  const data: LawListResponse = await response.json();
  if (!data.laws || data.laws.length === 0) return null;
  
  // Try exact match first
  const exact = data.laws.find(l => l.revision_info.law_title === lawName);
  if (exact) {
      // The API returns law_revision_id in revision_info, but we need law_id for future reference or persistence?
      // Actually we just need the revision ID to get text. 
      // But if we want to store "Reference to Law X", we might want the Law ID.
      // The `laws` object has `law_info` usually?
      // Let's check the type again. The reference code uses `law_info.law_id`.
      // I'll assume the structure includes law_info.
      return (exact as any).law_info?.law_id || null;
  }
  
  return (data.laws[0] as any).law_info?.law_id || null;
}

