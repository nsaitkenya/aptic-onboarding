
import { GoogleGenAI, Type } from "@google/genai";
import { EntityType, ExtractionResult } from "../types";

// Always use the process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    entity_type: { type: Type.STRING, description: 'individual or company' },
    documents_processed: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING } 
    },
    extracted_data: {
      type: Type.OBJECT,
      properties: {
        full_name: { type: Type.STRING },
        company_name: { type: Type.STRING },
        kra_pin: { type: Type.STRING },
        registration_number: { type: Type.STRING },
        date_of_incorporation: { type: Type.STRING },
        registered_address: { type: Type.STRING },
        directors: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              id_number: { type: Type.STRING },
              kra_pin: { type: Type.STRING }
            },
            propertyOrdering: ["name", "id_number", "kra_pin"]
          }
        }
      },
      propertyOrdering: ["full_name", "company_name", "kra_pin", "registration_number", "date_of_incorporation", "registered_address", "directors"]
    },
    validation: {
      type: Type.OBJECT,
      properties: {
        conflicts_detected: { type: Type.ARRAY, items: { type: Type.STRING } },
        missing_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
        low_confidence_fields: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      propertyOrdering: ["conflicts_detected", "missing_fields", "low_confidence_fields"]
    },
    confidence_score: {
      type: Type.OBJECT,
      description: "Map of field name to confidence score 0-1",
      properties: {
        full_name: { type: Type.NUMBER },
        company_name: { type: Type.NUMBER },
        kra_pin: { type: Type.NUMBER },
        registration_number: { type: Type.NUMBER }
      },
      propertyOrdering: ["full_name", "company_name", "kra_pin", "registration_number"]
    }
  },
  required: ['entity_type', 'extracted_data', 'validation', 'confidence_score'],
  propertyOrdering: ["entity_type", "documents_processed", "extracted_data", "validation", "confidence_score"]
};

export const extractDataFromDocs = async (
  entityType: EntityType,
  docs: { type: string; content: string }[]
): Promise<ExtractionResult> => {
  const docContents = docs.map(d => `Document Type: ${d.type}\nContent: ${d.content}`).join('\n\n---\n\n');
  
  const prompt = `
    Role: Enterprise-grade document extraction AI for Kenyan compliance.
    Objective: Extract structured data from the provided Kenyan legal documents.
    Entity Type Being Registered: ${entityType}
    
    Rules:
    1. Extract data ONLY if explicitly present.
    2. Do not infer or hallucinate.
    3. Return null for missing values.
    4. Detect conflicts (e.g., if Name on PIN doc differs from Name on ID or CR12).
    5. Evaluate confidence for each field.
    
    Documents to process:
    ${docContents}
  `;

  try {
    // Using gemini-3-pro-preview for complex reasoning and extraction tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: EXTRACTION_SCHEMA
      }
    });

    // response.text is a property, not a method.
    const result = JSON.parse(response.text.trim()) as ExtractionResult;
    return result;
  } catch (error) {
    console.error("Extraction failed:", error);
    throw error;
  }
};
