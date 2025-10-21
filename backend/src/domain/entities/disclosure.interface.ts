export interface EvidenceSpan {
  page: number
  text: string
}

export interface Contrast {
  priorArt: string
  ourApproach: string
  whyItMatters: string
}

export interface KeyDifference {
  ordinal: number
  statementMd: string
  contrast: Contrast
  evidenceSpans: EvidenceSpan[]
  confidence: number
}

export interface Inventor {
  name: string
  email?: string
  affiliation?: string
}

export interface RawExtraction {
  fileKey?: string
  extractionData?: KeyDifference[]
  confidenceScores?: {
    title?: number
    description?: number
    keyDiffs?: number
    inventors?: number
  }
  evidence?: {
    title?: EvidenceSpan[]
    description?: EvidenceSpan[]
    keyDiffs?: EvidenceSpan[]
    inventors?: EvidenceSpan[]
  }
  deadline?: {
    label: string
    date: string
  }
}

export interface DisclosureEntity {
  id: string
  docketNumber: number
  title: string
  description: string
  keyDifferences: KeyDifference[]
  inventors: Inventor[]
  uri?: string
  rawExtraction?: RawExtraction
  publicPlanned?: boolean
  publicVenue?: string | null
  publicDate?: string | Date | null
  createdAt: Date
  updatedAt: Date
}


