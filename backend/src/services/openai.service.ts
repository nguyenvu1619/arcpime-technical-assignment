import 'dotenv/config'
import openai from '@config/openai.js'
import { z } from 'zod'

// OpenAI client is centralized in @config/openai

// Zod schemas for validation
const EvidenceSpanSchema = z.object({
  page: z.number(),
  text: z.string(),
})

const ContrastSchema = z.object({
  priorArt: z.string(),
  ourApproach: z.string(),
  whyItMatters: z.string(),
})

const KeyDifferenceSchema = z.object({
  ordinal: z.number(),
  statementMd: z.string(),
  contrast: ContrastSchema,
  evidenceSpans: z.array(EvidenceSpanSchema),
  confidence: z.number().min(0).max(1),
})

const InventorSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(), // Make email optional in case not found
  affiliation: z.string().optional(),
})

const InventionExtractionSchema = z.object({
  isRelevant: z.boolean(),
  relevanceReason: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  keyDifferences: z.array(KeyDifferenceSchema).optional(),
  inventors: z.array(InventorSchema).optional(),
  confidence: z.object({
    title: z.number().min(0).max(1),
    description: z.number().min(0).max(1),
    keyDifferences: z.number().min(0).max(1),
    inventors: z.number().min(0).max(1),
  }).optional()
})

// Export types inferred from Zod schemas
export type KeyDifference = z.infer<typeof KeyDifferenceSchema>
export type Inventor = z.infer<typeof InventorSchema>
export type InventionExtraction = z.infer<typeof InventionExtractionSchema>

export class OpenAIService {
  /**
   * Create an embedding vector for a single text string
   */
  static async embedText(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      return []
    }
    const resp = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    return resp.data[0]?.embedding || []
  }

  /**
   * Extract structured invention data from PDF text using OpenAI
   */
  static async extractInvention(pdfText: string): Promise<InventionExtraction> {
    const systemPrompt = `You are an expert patent analyst. Extract structured invention disclosure information from research papers and technical documents.

FIRST: Determine if the document is relevant for patent disclosure analysis.

A document is RELEVANT if it contains:
- Technical innovations, inventions, or novel approaches
- Research findings with potential commercial applications
- Engineering solutions or improvements
- Scientific discoveries with practical applications
- Technical documentation of new processes, systems, or methods

A document is NOT RELEVANT if it contains:
- Pure theoretical research without practical applications
- Literature reviews or surveys without novel contributions
- Administrative documents, meeting notes, or non-technical content
- Published papers that are purely academic without commercial potential
- Documents that are clearly not invention disclosures

If the document is NOT relevant, set isRelevant to false and provide a brief relevanceReason explaining why.

If the document IS relevant, proceed with extraction:
1. Extract the title (concise, descriptive)
2. Extract a plain-language description (3-5 sentences: problem, approach, impact)
3. Identify key differences/novelties with detailed structured data
4. Extract inventor names and emails (if available)

For key differences, provide ONLY these fields:
- ordinal: number (1, 2, 3...)
- statementMd: string (the novelty statement in markdown)
- contrast: object with priorArt, ourApproach, whyItMatters (all strings)
- evidenceSpans: array of { page: number, text: string } from the PDF
- confidence: number between 0 and 1

For inventors:
- name: string (required)
- email: string (optional, only if found in the document)
- affiliation: string (optional)

Return valid JSON matching this exact schema:
{
  "isRelevant": boolean,
  "relevanceReason"?: string,
  "title": string,
  "description": string,
  "keyDifferences": [
    {
      "ordinal": number,
      "statementMd": string,
      "contrast": {
        "priorArt": string,
        "ourApproach": string,
        "whyItMatters": string
      },
      "evidenceSpans": [{ "page": number, "text": string }],
      "confidence": number
    }
  ],
  "inventors": [
    {
      "name": string,
      "email"?: string,
      "affiliation"?: string
    }
  ],
  "confidence": {
    "title": number,
    "description": number,
    "keyDifferences": number,
    "inventors": number
  }
}`

    const userPrompt = `Extract invention disclosure data from this PDF text:

${pdfText}

Return JSON with: { title, description, keyDifferences: [...], inventors: [...] }`

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      })

      const content = completion.choices[0]?.message?.content || '{}'
      const parsed = JSON.parse(content)

      // Validate with Zod and get typed result
      const validated = InventionExtractionSchema.parse(parsed)
      return validated
    } catch (error) {
      console.error('OpenAI extraction error:', error)
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.issues)
        throw new Error('Invalid extraction data from OpenAI: ' + error.issues.map((e: any) => e.message).join(', '))
      }
      throw new Error('Failed to extract invention data from OpenAI')
    }
  }
}
